/**
 * dsh-voice-input-cn — client bundle (阿里云 DashScope ASR 本地桥接版).
 *
 * Voice input for the DeepSeek Harness web GUI. Registers a mic button into
 * the `conversation.input.right` slot of the composer.
 *
 * Engine: local Python bridge (bridge/voice-bridge.py in this repo) which calls
 * Alibaba Cloud DashScope paraformer-realtime-v2 over the official SDK.
 *  - getUserMedia captures mic audio -> AudioWorklet -> 16 kHz PCM int16
 *  - streams PCM over WebSocket to ws://127.0.0.1:8765
 *  - bridge returns interim/final transcripts
 *
 * The API key is stored in localStorage (key: dsh.voiceInput.dashscopeKey).
 */
window.__ModuleLoader__.load({
	id: "dsh-voice-input-cn",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		let { createElement: h, useEffect, useRef, useState, useCallback } = require("react");

		//#region helpers
		const PLUGIN_ID = "dsh-voice-input-cn";
		const STORAGE_AUTO_SEND = "dsh.voiceInput.autoSend";
		const STORAGE_LANG = "dsh.voiceInput.lang";
		const STORAGE_KEY = "dsh.voiceInput.dashscopeKey";
		const BRIDGE_URL = "ws://127.0.0.1:8765";

		function defaultLang() {
			try {
				const nav = (navigator.language || "zh-CN").toLowerCase();
				if (nav.startsWith("zh")) return "zh-CN";
				if (nav.startsWith("en")) return "en-US";
				return navigator.language || "zh-CN";
			} catch {
				return "zh-CN";
			}
		}

		function readPref(key, fallback) {
			try {
				const raw = localStorage.getItem(key);
				return raw === null ? fallback : raw;
			} catch {
				return fallback;
			}
		}

		function writePref(key, value) {
			try {
				localStorage.setItem(key, value);
			} catch {
				/* storage unavailable — ignore */
			}
		}

		function effectiveLang(pref) {
			return pref === "auto" || pref === void 0 || pref === "" ? defaultLang() : pref;
		}
		//#endregion

		//#region css
		const CSS_ID = "dsh-voice-input-cn/style";
		if (typeof document !== "undefined" && document.querySelector('style[data-plugin-css="' + CSS_ID + '"]') === null) {
			const css = [
				".dvi-group{position:relative;display:inline-flex;align-items:center;height:28px;border-radius:14px;background:transparent}",
				".dvi-group:hover{background:var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12))}",
				".dvi-btn{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border:none;background:transparent;color:var(--dsw-alias-label-secondary, #7a7f8a);cursor:pointer;border-radius:14px}",
				".dvi-btn:hover:not(:disabled){color:var(--dsw-alias-label-primary, #1a1d23)}",
				".dvi-btn:disabled{cursor:not-allowed;opacity:.45}",
				".dvi-btn--listening{color:#fff !important;background:var(--dsw-alias-state-error-primary, #d92d20);animation:dvi-pulse 1.2s ease-in-out infinite}",
				".dvi-caret{display:inline-flex;align-items:center;justify-content:center;width:16px;height:28px;padding:0;border:none;background:transparent;color:var(--dsw-alias-label-tertiary, #9aa0aa);cursor:pointer;border-radius:0 14px 14px 0}",
				".dvi-caret:hover{color:var(--dsw-alias-label-secondary, #7a7f8a)}",
				".dvi-caret svg{transition:transform .15s ease}",
				".dvi-caret--open svg{transform:rotate(180deg)}",
				"@keyframes dvi-pulse{0%,100%{box-shadow:0 0 0 0 rgba(217,45,32,.35)}50%{box-shadow:0 0 0 6px rgba(217,45,32,0)}}",
				".dvi-bubble{position:absolute;right:0;bottom:calc(100% + 8px);z-index:40;min-width:88px;width:max-content;max-width:min(320px, 72vw);padding:8px 12px;border:1px solid var(--dsw-alias-border-l1, #2b2f38);border-radius:10px;background:var(--dsw-alias-bg-popover, #202127);color:var(--dsw-alias-label-primary, #e8eaed);font-size:13px;line-height:20px;white-space:pre-wrap;word-break:break-word;text-align:left;box-shadow:0 8px 24px rgba(0,0,0,.28)}",
				".dvi-bubble--hint{color:var(--dsw-alias-label-tertiary, #9aa0aa)}",
				".dvi-bubble--err{color:var(--dsw-alias-state-error-primary, #f97066)}",
				".dvi-menu{position:absolute;right:0;top:calc(100% + 6px);z-index:40;min-width:260px;padding:10px;border:1px solid var(--dsw-alias-border-l1, #2b2f38);border-radius:12px;background:var(--dsw-alias-bg-popover, #202127);box-shadow:0 8px 24px rgba(0,0,0,.28)}",
				".dvi-menuRow{display:flex;align-items:center;gap:8px;padding:6px 4px}",
				".dvi-menuRow + .dvi-menuRow{border-top:1px solid var(--dsw-alias-border-l1, #262a33)}",
				".dvi-menuLabel{flex:1;min-width:0;color:var(--dsw-alias-label-secondary, #9aa0aa);font-size:12px;line-height:18px;user-select:none}",
				".dvi-menuSelect{height:26px;padding:0 8px;border-radius:8px;border:1px solid var(--dsw-alias-border-l1, #2b2f38);background:var(--dsw-alias-bg-module-platform, #17181c);color:var(--dsw-alias-label-primary, #e8eaed);font-size:12px;font-family:inherit}",
				".dvi-menuCheck{accent-color:var(--dsw-static-deepseek-500, #4d6bfe);width:14px;height:14px}",
				".dvi-menuInput{flex:1;min-width:0;height:26px;padding:0 8px;border-radius:8px;border:1px solid var(--dsw-alias-border-l1, #2b2f38);background:var(--dsw-alias-bg-module-platform, #17181c);color:var(--dsw-alias-label-primary, #e8eaed);font-size:12px;font-family:monospace}"
			].join("");
			const tag = document.createElement("style");
			tag.dataset.plugin = PLUGIN_ID;
			tag.dataset.pluginCss = CSS_ID;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		//#endregion

		//#region icons
		const ICON_MIC = h("svg", {
			viewBox: "0 0 16 16",
			width: "15",
			height: "15",
			"aria-hidden": true,
			fill: "currentColor"
		}, h("path", { d: "M8 1.25a2.375 2.375 0 0 0-2.375 2.375v3.75a2.375 2.375 0 0 0 4.75 0v-3.75A2.375 2.375 0 0 0 8 1.25Zm-4.875 7a.75.75 0 0 1 1.5 0 3.375 3.375 0 0 0 6.75 0 .75.75 0 0 1 1.5 0 4.875 4.875 0 0 1-4.125 4.826v1.424a.75.75 0 0 1-1.5 0v-1.424a4.875 4.875 0 0 1-4.125-4.826Z" }));
		const ICON_CARET = h("svg", {
			viewBox: "0 0 16 16",
			width: "10",
			height: "10",
			"aria-hidden": true,
			fill: "currentColor"
		}, h("path", { d: "M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" }));
		//#endregion

		//#region bridge asr engine (AudioWorklet -> PCM -> local bridge)
		const PCM_WORKLET = `
			class PCMProcessor extends AudioWorkletProcessor {
				constructor() {
					super();
					this.buffer = new Int16Array(0);
				}
				process(inputs) {
					const ch = inputs[0];
					if (ch && ch[0]) {
						const data = ch[0];
						const buf = new Int16Array(data.length);
						for (let i = 0; i < data.length; i++) {
							let s = Math.max(-1, Math.min(1, data[i]));
							buf[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
						}
						// 累积到 4800 采样（300ms）再发，兼顾延迟与消息量
						const merged = new Int16Array(this.buffer.length + buf.length);
						merged.set(this.buffer, 0);
						merged.set(buf, this.buffer.length);
						this.buffer = merged;
						if (this.buffer.length >= 4800) {
							this.port.postMessage(this.buffer.buffer, [this.buffer.buffer]);
							this.buffer = new Int16Array(0);
						}
					}
					return true;
				}
			}
			registerProcessor('pcm-processor', PCMProcessor);
		`;

		class BridgeASR {
			constructor({ apiKey, lang, onResult, onError, onState }) {
				this.apiKey = apiKey;
				this.lang = lang;
				this.onResult = onResult;
				this.onError = onError;
				this.onState = onState;
				this.ws = null;
				this.audioCtx = null;
				this.stream = null;
				this.workletNode = null;
				this.pcmBuffers = [];
				this.recording = false;
				this.silenceTimer = null;
				this.silenceMs = 0;
				this.lastSpeechTime = 0;
			}

			async start() {
				if (this.recording) return;
				const self = this;
				this._closing = false;
				this.pcmBuffers = [];
				try {
					this.stream = await navigator.mediaDevices.getUserMedia({
						audio: {
							echoCancellation: true,
							noiseSuppression: true,
							autoGainControl: true,
							channelCount: 1,
							sampleRate: 16000
						}
					});
				} catch (err) {
					if (self.onError) self.onError("无法获取麦克风：" + (err && err.message ? err.message : String(err)));
					return;
				}
				try {
					this.audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
					await this.audioCtx.audioWorklet.addModule(URL.createObjectURL(new Blob([PCM_WORKLET], { type: "application/javascript" })));
					const src = this.audioCtx.createMediaStreamSource(this.stream);
					this.workletNode = new AudioWorkletNode(this.audioCtx, "pcm-processor");
					this.workletNode.port.onmessage = (e) => {
						// 流式：PCM 转发给 bridge
						if (self.ws && self.ws.readyState === WebSocket.OPEN) {
							self.ws.send(e.data);
						}
						// 静音检测：计算本段 RMS 能量，连续静音超过阈值自动停止
						try {
							const data = new Int16Array(e.data);
							let sum = 0;
							for (let i = 0; i < data.length; i++) {
								const v = data[i];
								sum += v * v;
							}
							const rms = data.length > 0 ? Math.sqrt(sum / data.length) : 0;
							const now = Date.now();
							if (rms > 200) {
								// 有声音：记录最后出声时间
								self.lastSpeechTime = now;
							} else if (self.lastSpeechTime > 0) {
								// 静音：用真实时间差判断（不依赖 chunk 大小）
								const silentFor = now - self.lastSpeechTime;
								if (silentFor >= 1500 && self.recording) {
									// 连续静音 1.5 秒 → 自动停止
									self.lastSpeechTime = 0;
									self.autoStopped = true;
									if (self.onAutoStop) self.onAutoStop();
								}
							}
						} catch { /* ignore */ }
					};
					src.connect(this.workletNode);
					// 不连接 destination —— 否则麦克风声音实时回放造成回音
					this.recording = true;
					if (self.onState) self.onState("recording");
					this.openBridge();
				} catch (err) {
					if (self.onError) self.onError("音频处理初始化失败：" + (err && err.message ? err.message : String(err)));
					this.cleanup();
				}
			}

			openBridge() {
				const self = this;
				try {
					this.ws = new WebSocket(BRIDGE_URL);
					this.ws.binaryType = "arraybuffer";
				} catch (e) {
					if (self.onError) self.onError("无法连接本地语音服务（请先启动 voice-bridge.py）");
					return;
				}
				this.ws.onopen = () => {
					self.ws.send(JSON.stringify({ type: "config", key: self.apiKey, lang: self.lang }));
					self.ws.send(JSON.stringify({ type: "start" }));
				};
				this.ws.onmessage = (ev) => {
					if (typeof ev.data !== "string") return;
					try {
						const msg = JSON.parse(ev.data);
						if (msg.type === "interim") {
							if (self.onResult) self.onResult(msg.text, false);
						} else if (msg.type === "final") {
							if (self.onResult) self.onResult(msg.text, true);
						} else if (msg.type === "error") {
							if (self.onError) self.onError(msg.message);
							self.stop();
						}
					} catch { /* ignore */ }
				};
				this.ws.onerror = () => {
					if (self.onError) self.onError("连接本地语音服务失败（请确认 voice-bridge.py 正在运行）");
				};
				this.ws.onclose = () => {
					// 仅在非主动关闭时提示（stop() 主动关闭不报错）
					if (!self._closing) {
						if (self.onError) self.onError("本地语音服务已断开（voice-bridge.py 是否仍在运行？）");
						self.cleanup();
					}
				};
			}

			stop() {
				const self = this;
				// 标记主动关闭，避免 onclose 误报"服务已断开"
				this._closing = true;
				// flush remaining PCM
				if (this.ws && this.ws.readyState === WebSocket.OPEN) {
					this.flushPcm();
					this.ws.send(JSON.stringify({ type: "stop" }));
				}
				// give bridge a moment then close
				setTimeout(() => self.close(), 800);
			}

			flushPcm() {
				const self = this;
				if (this.pcmBuffers.length === 0) return;
				const total = this.pcmBuffers.reduce((a, b) => a + b.length, 0);
				const merged = new Int16Array(total);
				let off = 0;
				for (const buf of this.pcmBuffers) { merged.set(buf, off); off += buf.length; }
				this.pcmBuffers = [];
				if (this.ws && this.ws.readyState === WebSocket.OPEN) {
					this.ws.send(merged.buffer);
				}
			}

			close() {
				try { if (this.ws) this.ws.close(); } catch { /* ignore */ }
				this.ws = null;
				try { if (this.workletNode) this.workletNode.disconnect(); } catch { /* ignore */ }
				this.workletNode = null;
				try { if (this.stream) this.stream.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
				this.stream = null;
				try { if (this.audioCtx) this.audioCtx.close(); } catch { /* ignore */ }
				this.audioCtx = null;
				this.recording = false;
				if (this.onState) this.onState("idle");
			}

			cleanup() {
				this.close();
			}
		}
		//#endregion

		//#region component
		function VoiceInputButton({ useSession, useInput, inputActions }) {
			const [listening, setListening] = useState(false);
			const [interim, setInterim] = useState("");
			const [error, setError] = useState(null);
			const [menuOpen, setMenuOpen] = useState(false);
			const [autoSend, setAutoSend] = useState(() => readPref(STORAGE_AUTO_SEND, "0") === "1");
			const [lang, setLang] = useState(() => readPref(STORAGE_LANG, "auto"));
			const [apiKey, setApiKey] = useState(() => readPref(STORAGE_KEY, ""));

			const asrRef = useRef(null);
			const stateRef = useRef({ final: "", interim: "" });
			const actionsRef = useRef(inputActions);
			const draftRef = useRef("");
			const autoSendRef = useRef(autoSend);
			const langRef = useRef(lang);
			const apiKeyRef = useRef(apiKey);
			const listeningRef = useRef(false);
			const errorTimerRef = useRef(null);

			const draft = useInput((s) => (s === void 0 ? void 0 : s.draft)) ?? "";
			const phase = useInput((s) => (s === void 0 ? void 0 : s.phase)) ?? "plain";
			const removed = useSession((s) => (s === void 0 ? void 0 : s.removed)) ?? false;

			useEffect(() => { actionsRef.current = inputActions; }, [inputActions]);
			useEffect(() => { draftRef.current = draft; }, [draft]);
			useEffect(() => { autoSendRef.current = autoSend; }, [autoSend]);
			useEffect(() => { langRef.current = lang; }, [lang]);
			useEffect(() => { apiKeyRef.current = apiKey; }, [apiKey]);

			useEffect(() => {
				if (error === null) return;
				errorTimerRef.current = setTimeout(() => setError(null), 5000);
				return () => {
					if (errorTimerRef.current !== null) clearTimeout(errorTimerRef.current);
				};
			}, [error]);

			useEffect(() => () => {
				const asr = asrRef.current;
				asrRef.current = null;
				if (asr !== null) { try { asr.cleanup(); } catch { /* ignore */ } }
			}, []);

			const stopListening = useCallback(() => {
				const asr = asrRef.current;
				asrRef.current = null;
				listeningRef.current = false;
				setListening(false);
				// 不在此提交文本——统一由 onState("idle") 提交，避免双填
				if (asr !== null) { try { asr.stop(); } catch { /* ignore */ } }
			}, []);

			const stopListeningRef = useRef(stopListening);
			stopListeningRef.current = stopListening;

			// 从 DOM 读取输入框当前光标位置（selectionStart）
			const readCaret = useCallback(() => {
				try {
					const el = document.activeElement;
					if (el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT")) {
						return el.selectionStart !== null && el.selectionStart !== void 0 ? el.selectionStart : void 0;
					}
					// 兜底：找 composer 的 textarea
					const ta = document.querySelector('textarea[data-composer], textarea[placeholder*="发送"], textarea');
					if (ta && ta.selectionStart !== null && ta.selectionStart !== void 0) return ta.selectionStart;
					return void 0;
				} catch {
					return void 0;
				}
			}, []);

			// 在草稿指定位置插入文本（与 DSH 的 insertPathIntoDraft 同规则，但避免多余空格）
			const spliceDraft = useCallback((draft, insert, caret) => {
				const at = caret === void 0 ? draft.length : Math.min(Math.max(caret, 0), draft.length);
				const before = draft.slice(0, at);
				const after = draft.slice(at);
				const needBefore = before !== "" && !/\s$/.test(before);
				const needAfter = after !== "" && !/^\s/.test(after);
				// 插入文本自身 trim 掉首尾空格，分隔符由规则控制
				const cleaned = String(insert).trim();
				return before + (needBefore ? " " : "") + cleaned + (needAfter ? " " : "") + after;
			}, []);

			const startListening = useCallback(() => {
				if (listeningRef.current) return;
				const key = (apiKeyRef.current || "").trim();
				if (key === "") {
					setError("请先在设置里填写 DashScope API Key");
					return;
				}
				setError(null);
				// 保存语音前的草稿 + 光标位置，识别结果在光标处插入
				const baseDraft = draftRef.current || "";
				const caret = readCaret();
				stateRef.current = { final: "", interim: "", baseDraft, caret };
				const asr = new BridgeASR({
					apiKey: key,
					lang: effectiveLang(langRef.current),
					onResult: (text, isFinal) => {
						const actions = actionsRef.current;
						if (isFinal) {
							// 最终结果：一次性在光标位置插入
							stateRef.current.final += text;
							if (actions && typeof actions.setDraft === "function") {
								const base = stateRef.current.baseDraft || "";
								const spoken = stateRef.current.final.trim();
								const next = spliceDraft(base, spoken, stateRef.current.caret);
								actions.setDraft(next);
							}
							setInterim("");
						} else {
							// 中间结果：实时预览（同样在光标处插入），但基于 baseDraft 重建
							stateRef.current.interim = text;
							if (actions && typeof actions.setDraft === "function") {
								const base = stateRef.current.baseDraft || "";
								const spoken = String(text || "").trim();
								const next = spliceDraft(base, spoken, stateRef.current.caret);
								actions.setDraft(next);
							}
							setInterim("");
						}
					},
					onError: (msg) => {
						setError(msg);
						setListening(false);
						listeningRef.current = false;
						asrRef.current = null;
					},
					onState: (st) => {
						if (st === "recording") setListening(true);
						if (st === "idle") {
							setListening(false);
							listeningRef.current = false;
							const final = stateRef.current.final.trim();
							stateRef.current = { final: "", interim: "" };
							setInterim("");
							if (final !== "" && autoSendRef.current && typeof actionsRef.current?.submit === "function") {
								setTimeout(() => { try { actionsRef.current.submit(); } catch { /* ignore */ } }, 60);
							}
						}
					},
					onAutoStop: () => {
						// 静音自动停止（等价于用户点停止）
						if (listeningRef.current) {
							stopListeningRef.current();
						}
					}
				});
				asrRef.current = asr;
				listeningRef.current = true;
				asr.start();
			}, [readCaret, spliceDraft]);

			const toggleListening = useCallback(() => {
				if (listeningRef.current) stopListening();
				else startListening();
			}, [startListening, stopListening]);

			const toggleMenu = useCallback(() => {
				setMenuOpen((open) => !open);
			}, []);

			useEffect(() => {
				if (!menuOpen) return;
				const onDown = (event) => {
					const el = event.target;
					if (el instanceof Node && el.closest !== void 0 && el.closest(".dvi-group") !== null) return;
					setMenuOpen(false);
				};
				document.addEventListener("pointerdown", onDown, true);
				return () => document.removeEventListener("pointerdown", onDown, true);
			}, [menuOpen]);

			const busy = phase === "adjudicating" || phase === "submitting";
			const hasKey = (apiKey || "").trim() !== "";
			const disabled = removed || busy;
			const showBubble = listening || error !== null;
			const bubbleText = error !== null
				? error
				: "正在聆听…";
			const langLabel = lang === "auto" ? "自动（" + defaultLang() + "）" : lang === "zh-CN" ? "中文" : lang === "en-US" ? "English" : lang;

			return h("span", { className: "dvi-group", "data-voice-input": "" },
				h("button", {
					type: "button",
					className: "dvi-btn" + (listening ? " dvi-btn--listening" : ""),
					"aria-label": listening ? "停止语音输入" : "语音输入",
					title: hasKey
						? (listening ? "停止语音输入（再次点击提交）" : "语音输入（点击开始说话）")
						: "未配置 API Key，点击右侧设置填写",
					disabled,
					onMouseDown: (e) => e.preventDefault(),
					onClick: toggleListening
				}, ICON_MIC),
				h("button", {
					type: "button",
					className: "dvi-caret" + (menuOpen ? " dvi-caret--open" : ""),
					"aria-label": "语音输入设置",
					title: "语音输入设置",
					disabled,
					onMouseDown: (e) => e.preventDefault(),
					onClick: toggleMenu
				}, ICON_CARET),
				showBubble && h("div", {
					className: "dvi-bubble" + (error !== null ? " dvi-bubble--err" : interim === "" && error === null ? " dvi-bubble--hint" : ""),
					role: error !== null ? "alert" : "status"
				}, bubbleText),
				menuOpen && h("div", {
					className: "dvi-menu",
					role: "menu"
				},
					h("div", { className: "dvi-menuRow" },
						h("label", { className: "dvi-menuLabel", htmlFor: "dvi-key" }, "DashScope API Key"),
						h("input", {
							id: "dvi-key",
							type: "password",
							className: "dvi-menuInput",
							placeholder: "sk-...",
							value: apiKey,
							onChange: (e) => {
								setApiKey(e.target.value);
								writePref(STORAGE_KEY, e.target.value);
							}
						})
					),
					h("div", { className: "dvi-menuRow" },
						h("label", { className: "dvi-menuLabel", htmlFor: "dvi-bridge" }, "本地服务"),
						h("span", { className: "dvi-menuLabel", style: { fontSize: "11px", color: "var(--dsw-alias-label-tertiary, #9aa0aa)" } }, "需先运行 bridge（见 README）"),
					),
					h("div", { className: "dvi-menuRow" },
						h("label", { className: "dvi-menuLabel", htmlFor: "dvi-auto-send" }, "识别后自动发送"),
						h("input", {
							id: "dvi-auto-send",
							type: "checkbox",
							className: "dvi-menuCheck",
							checked: autoSend,
							onChange: (e) => {
								setAutoSend(e.target.checked);
								writePref(STORAGE_AUTO_SEND, e.target.checked ? "1" : "0");
							}
						})
					),
					h("div", { className: "dvi-menuRow" },
						h("label", { className: "dvi-menuLabel", htmlFor: "dvi-lang" }, "识别语言"),
						h("select", {
							id: "dvi-lang",
							className: "dvi-menuSelect",
							value: lang,
							onChange: (e) => {
								setLang(e.target.value);
								writePref(STORAGE_LANG, e.target.value);
							}
						},
							h("option", { value: "auto" }, "自动"),
							h("option", { value: "zh-CN" }, "中文 (zh-CN)"),
							h("option", { value: "en-US" }, "English (en-US)")
						)
					),
					h("div", { className: "dvi-menuRow" },
						h("span", { className: "dvi-menuLabel" }, "当前语言：" + langLabel)
					)
				)
			);
		}
		//#endregion

		//#region plugin entry
		const inject = ["slots"];

		function apply(ctx) {
			ctx.slots.inject("conversation.input.right", () => ctx.slots.register({
				name: "conversation.input.right",
				id: "voice-input",
				order: 5
			}, VoiceInputButton));
		}
		//#endregion

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
