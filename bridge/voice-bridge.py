#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DashScope ASR 本地中转服务 (voice-bridge)
=========================================
让浏览器插件通过本地 WebSocket 调用阿里云 DashScope 语音识别。

协议:
  浏览器 -> 本服务 (ws://127.0.0.1:8765)
    1. 发送 JSON: {"type": "config", "key": "sk-xxx", "lang": "zh"}
    2. 发送 JSON: {"type": "start"}
    3. 发送二进制音频帧 (PCM 16k mono int16) 或直接发整个 WAV bytes
    4. 发送 JSON: {"type": "stop"}
  本服务 -> 浏览器
    识别中间结果: {"type": "interim", "text": "..."}
    最终结果:     {"type": "final", "text": "..."}
    错误:         {"type": "error", "message": "..."}

依赖: pip install dashscope websockets
启动: python bridge/voice-bridge.py   （在仓库根目录下运行）
"""
import asyncio
import io
import json
import os
import struct
import wave

try:
    from dashscope.audio.asr import Recognition, RecognitionCallback
except ImportError:
    print("缺少 dashscope SDK，请先: pip install dashscope")
    raise SystemExit(1)

try:
    import websockets
except ImportError:
    print("缺少 websockets 库，请先: pip install websockets")
    raise SystemExit(1)

HOST = "127.0.0.1"
PORT = 8765


class BridgeCallback(RecognitionCallback):
    """接收 DashScope 识别事件并转发给浏览器（线程安全）。"""

    def __init__(self, send_fn):
        super().__init__()
        self._send = send_fn  # 线程安全的发送函数（call_soon_threadsafe）

    def on_open(self):
        print("[bridge] 阿里云 WS 已连接")

    def on_close(self):
        print("[bridge] 阿里云 WS 已关闭")

    def on_complete(self):
        print("[bridge] 识别完成")

    def on_error(self, result):
        code = getattr(result, "code", "?")
        msg = getattr(result, "message", "?")
        print(f"[bridge] 识别错误: {code} {msg}")
        self._send({"type": "error", "message": f"{code}: {msg}"})

    def on_event(self, result):
        try:
            sentence = result.get_sentence()
        except Exception:
            sentence = {}
        if not isinstance(sentence, dict):
            return
        text = sentence.get("text")
        if not text:
            return
        is_end = False
        try:
            is_end = RecognitionResult_is_end(sentence)
        except Exception:
            is_end = sentence.get("is_sentence_end", False)
        msg = {"type": "final" if is_end else "interim", "text": text}
        self._send(msg)


def RecognitionResult_is_end(sentence):
    # 尝试多种判断字段
    for k in ("is_sentence_end", "sentence_end", "end", "is_end"):
        if k in sentence:
            return bool(sentence[k])
    return False


class ClientSession:
    def __init__(self, websocket):
        self.ws = websocket
        self.key = None
        self.lang = "zh"
        self.rec = None
        self.collecting = False
        self._done = False

    async def send(self, payload):
        try:
            await self.ws.send(json.dumps(payload, ensure_ascii=False))
        except Exception:
            pass

    async def handle_config(self, data):
        self.key = (data.get("key") or "").strip()
        lang = data.get("lang") or "auto"
        self.lang = "en" if str(lang).startswith("en") else "zh"
        if self.key:
            os.environ["DASHSCOPE_API_KEY"] = self.key
            print(f"[bridge] key 已设置 (len={len(self.key)})")

    async def handle_start(self):
        if not self.key:
            await self.send({"type": "error", "message": "未设置 API Key"})
            return
        import dashscope
        dashscope.api_key = self.key
        self.collecting = True
        self._done = False
        # 启动流式识别会话
        try:
            cb = BridgeCallback(self._threadsafe_send)
            self.rec = Recognition(
                model="paraformer-realtime-v2",
                format="pcm",
                sample_rate=16000,
                language_hints=[self.lang],
                callback=cb,
            )
            await asyncio.to_thread(self.rec.start)
            print("[bridge] 流式识别会话已启动 (format=pcm)")
        except Exception as e:
            print(f"[bridge] 启动识别失败: {e}")
            await self.send({"type": "error", "message": f"识别启动失败: {e}"})
            self.collecting = False
            self.rec = None

    def _audio_rms(self, data: bytes) -> int:
        """纯 Python 计算 16bit PCM 的 RMS 能量（Python 3.14 无 audioop）。"""
        if len(data) < 2:
            return 0
        import array
        samples = array.array("h")
        samples.frombytes(data[: len(data) - (len(data) % 2)])
        if len(samples) == 0:
            return 0
        total = 0
        for s in samples:
            total += s * s
        return int((total / len(samples)) ** 0.5)

    def handle_audio(self, payload: bytes):
        if not self.collecting or self.rec is None:
            return
        # 音频能量统计（诊断用）
        try:
            data = bytes(payload)
            rms = self._audio_rms(data)
            self._audio_energy = max(getattr(self, '_audio_energy', 0), rms)
            self._audio_bytes = getattr(self, '_audio_bytes', 0) + len(data)
        except Exception:
            pass
        # 纯 PCM 流式发送（不带头，阿里云原生支持 pcm 格式）
        try:
            self.rec.send_audio_frame(bytes(payload))
        except Exception as e:
            print(f"[bridge] 发送音频帧失败: {e}")

    async def handle_stop(self):
        if not self.collecting:
            return
        self.collecting = False
        if self.rec is None:
            return
        energy = getattr(self, '_audio_energy', 0)
        nbytes = getattr(self, '_audio_bytes', 0)
        print(f"[bridge] 识别结束: 收到 {nbytes} 字节, 峰值能量 {energy}")
        # 先把剩余尾部音频发完（如果有缓冲帧）
        try:
            await asyncio.to_thread(self.rec.stop)
            print("[bridge] 识别会话已结束")
        except Exception as e:
            print(f"[bridge] 结束识别失败: {e}")
        # 等回调完成（最多 3 秒）
        for _ in range(30):
            if self._done:
                break
            await asyncio.sleep(0.1)
        self.rec = None

    def _threadsafe_send(self, payload):
        """从 DashScope 后台线程安全地发送消息到浏览器。"""
        if payload.get("type") in ("final", "complete"):
            self._done = True
        loop = _MAIN_LOOP
        if loop is not None and loop.is_running():
            loop.call_soon_threadsafe(lambda: asyncio.ensure_future(self.send(payload)))
        else:
            print(f"[bridge] (无事件循环，丢弃消息: {payload})")


async def handler(websocket):
    print(f"[bridge] 浏览器连接: {websocket.remote_address}")
    session = ClientSession(websocket)
    try:
        async for message in websocket:
            if isinstance(message, str):
                try:
                    data = json.loads(message)
                except json.JSONDecodeError:
                    continue
                mtype = data.get("type")
                if mtype == "config":
                    await session.handle_config(data)
                elif mtype == "start":
                    await session.handle_start()
                elif mtype == "stop":
                    await session.handle_stop()
            else:
                session.handle_audio(message)
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        print("[bridge] 浏览器断开")


_MAIN_LOOP = None  # 全局主事件循环引用，供后台线程发送消息




async def main():
    global _MAIN_LOOP
    _MAIN_LOOP = asyncio.get_running_loop()
    async with websockets.serve(handler, HOST, PORT):
        print(f"[bridge] DashScope ASR 中转服务已启动: ws://{HOST}:{PORT}")
        print("[bridge] 按 Ctrl+C 停止")
        await asyncio.Future()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[bridge] 已停止")
