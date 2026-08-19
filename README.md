# dsh-voice-input-cn

**DeepSeek Harness Web 语音输入插件（国内可用版）**

在聊天输入框添加麦克风按钮，点击说话即可将语音转为文字填入草稿。基于 **阿里云 DashScope ASR**（国内直连可用），替代原版依赖的 Google Web Speech API（国内无法访问）。

> **本项目 fork 自 [NewDaNew/dsh-voice-input](https://github.com/NewDaNew/dsh-voice-input)**，原版使用 Web Speech API（Google 云端），在国内直连不可用；本版重写了识别引擎为**阿里云 DashScope ASR + 本地 bridge**。

> **🛠 开发工具**：本插件在 **DeepSeek Harness (DSH)** 中开发与调试（代码重构、排障、测试均由 DSH 辅助完成）。DSH 是一个开源 AI 助手框架：https://github.com/deepseek-ai/dsh

---

## ✨ 功能

- 🎤 输入框麦克风按钮，点击开始说话，静音 1.5 秒自动停止
- 📝 识别文字**实时填入输入框**（光标位置插入，不覆盖已有草稿）
- 🔀 中文 / English 语言切换
- 📨 可选"识别后自动发送"
- 🔌 本地 bridge（Python）中转，国内直连阿里云，低延迟

## 🧱 架构

```
浏览器插件 (lib/client.js)
  ├─ AudioWorklet 采集麦克风 16kHz PCM
  ├─ 流式发送 → ws://127.0.0.1:8765
  └─ 本地 bridge (bridge/voice-bridge.py)
       └─ 阿里云 DashScope paraformer-realtime-v2 识别
```

**为什么需要本地 bridge？**
DashScope 的 ASR WebSocket 握手依赖官方 SDK 的内部鉴权逻辑，浏览器裸 WebSocket 直连会 401。bridge 用官方 Python SDK 处理鉴权，浏览器只负责录音和显示。

## 📦 安装

### 1. 安装插件

```bash
dsh plugin --profile web add github:Schumchanvi/dsh-voice-input-cn
```

或用 dshmarket 安装（如果已上架）。

### 2. 安装 bridge 依赖（Python 3.10+）

```bash
pip install dashscope websockets
```

### 3. 启动 bridge

```bash
# 前台运行
python bridge/voice-bridge.py

# 或 Windows 开机自启（双击注册到启动文件夹）
wscript bridge/start-voice-bridge.vbs
```

bridge 默认监听 `127.0.0.1:8765`（仅本机，不暴露公网）。

### 4. 配置 API Key

1. 刷新 DSH 页面
2. 点击输入框旁的麦克风按钮 → 右侧小箭头（⌄）打开设置
3. 填入 **DashScope API Key**（[阿里云百炼获取](https://bailian.console.aliyun.com/)）
4. 选择语言，保存

## 🎤 使用

1. 点击麦克风按钮开始
2. 正常说话（文字会实时填入输入框）
3. 停顿 1.5 秒或再次点击 → 自动结束
4. 若开启"自动发送"则直接提交，否则可继续编辑后手动发送

## 🔧 配置项（设置菜单）

| 项 | 说明 |
|---|---|
| DashScope API Key | 阿里云百炼 API Key（存 localStorage）|
| 识别后自动发送 | 识别完成自动提交草稿 |
| 识别语言 | 自动 / 中文 / English |

## 📝 与原版的区别

| | 原版 (dsh-voice-input) | 本版 (dsh-voice-input-cn) |
|---|---|---|
| 识别引擎 | Web Speech API（Google 云端）| 阿里云 DashScope ASR |
| 国内可用 | ❌ 不可用 | ✅ 直连可用 |
| 架构 | 纯浏览器 | 浏览器 + 本地 Python bridge |
| 识别体验 | 一次性返回 | 流式实时填入 |
| 静音停止 | 无 | ✅ 1.5s 自动停止 |
| 光标插入 | 追加末尾 | ✅ 光标位置插入 |

## ⚠️ 安全说明

- **API Key 存于浏览器 localStorage**，本插件不上传 key 到任何第三方；但同一浏览器内的其他脚本可读取，请勿在共享电脑使用
- bridge 仅监听 `127.0.0.1`，不对外网开放
- 音频仅发送至阿里云 DashScope 识别，不留存

## 🐛 常见问题

**Q: 显示"连接本地语音服务失败"**
A: bridge 没启动。运行 `python bridge/voice-bridge.py`，确认端口 8765 已监听。

**Q: 识别不出内容 / "呃呃啊啊"**
A: 检查麦克风权限（浏览器 + Windows）；确认 Key 有效（阿里云百炼控制台可测试）；确认音频不是静音。

**Q: 显示"无可用麦克风"**
A: 这是浏览器 `getUserMedia` 的 `NotFoundError`。检查 Windows 麦克风隐私设置、默认输入设备、驱动状态（Intel 智音端点幽灵化时需重装驱动）。

**Q: 延迟高**
A: 识别为流式，理论上说完即出；若延迟明显，检查网络到阿里云的延迟，或换用更近的区域节点。

**Q: 报 `NO_VALID_AUDIO_ERROR`**
A: bridge 只接受**裸 PCM**（16kHz 单声道 int16）。如果你用自建脚本/客户端直连，别拼 WAV 头；本插件内置的 AudioWorklet 已输出纯 PCM，正常情况下不会出现此错误。

**Q: 有回音/自己说话被识别**
A: 麦克风流**不允许**连回 `AudioContext.destination`（回放）。本插件已断开该连接；若你魔改过，检查 worklet 是否接了 destination。

**Q: 文字被填了两次 / 重复插入**
A: 这是"停止提交"与"空闲提交"双触发的经典 bug。本插件统一由 `onState("idle")` 提交一次，手动点停不会再提交；若你魔改过，检查 stop 路径是否也提交了。

**Q: 浏览器直连 DashScope 报 401**
A: 这是预期的。DashScope ASR 的 WebSocket 鉴权在官方 SDK 内部完成，裸 WebSocket 无法携带签名。**必须走本地 bridge**（本仓库 `bridge/voice-bridge.py`）。

**Q: bridge 端口被占用（Windows 报"address already in use"）**
A: 说明已有 bridge 实例在跑（或别的程序占了 8765）。关掉旧的，或用 `set VOICE_BRIDGE_PORT=xxxx` 换端口（同时需在客户端改 `BRIDGE_URL`）。

## 📜 License

MIT（保留原版 fork 版权声明；阿里云 DashScope 服务需遵守其使用条款）
