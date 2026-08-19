# dsh-voice-input-cn

**DeepSeek Harness Web 璇煶杈撳叆鎻掍欢锛堝浗鍐呭彲鐢ㄧ増锛?*

鍦ㄨ亰澶╄緭鍏ユ娣诲姞楹﹀厠椋庢寜閽紝鐐瑰嚮璇磋瘽鍗冲彲灏嗚闊宠浆涓烘枃瀛楀～鍏ヨ崏绋裤€傚熀浜?**闃块噷浜?DashScope ASR**锛堝浗鍐呯洿杩炲彲鐢級锛屾浛浠ｅ師鐗堜緷璧栫殑 Google Web Speech API锛堝浗鍐呮棤娉曡闂級銆?
> **鏈」鐩?fork 鑷?[NewDaNew/dsh-voice-input](https://github.com/NewDaNew/dsh-voice-input)**锛屽師鐗堜娇鐢?Web Speech API锛圙oogle 浜戠锛夛紝鍦ㄥ浗鍐呯洿杩炰笉鍙敤锛涙湰鐗堥噸鍐欎簡璇嗗埆寮曟搸涓?*闃块噷浜?DashScope ASR + 鏈湴 bridge**銆?
---

## 鉁?鍔熻兘

- 馃帳 杈撳叆妗嗛害鍏嬮鎸夐挳锛岀偣鍑诲紑濮嬭璇濓紝闈欓煶 1.5 绉掕嚜鍔ㄥ仠姝?- 馃摑 璇嗗埆鏂囧瓧**瀹炴椂濉叆杈撳叆妗?*锛堝厜鏍囦綅缃彃鍏ワ紝涓嶈鐩栧凡鏈夎崏绋匡級
- 馃攢 涓枃 / English 璇█鍒囨崲
- 馃摠 鍙€?璇嗗埆鍚庤嚜鍔ㄥ彂閫?
- 馃攲 鏈湴 bridge锛圥ython锛変腑杞紝鍥藉唴鐩磋繛闃块噷浜戯紝浣庡欢杩?
## 馃П 鏋舵瀯

```
娴忚鍣ㄦ彃浠?(lib/client.js)
  鈹溾攢 AudioWorklet 閲囬泦楹﹀厠椋?16kHz PCM
  鈹溾攢 娴佸紡鍙戦€?鈫?ws://127.0.0.1:8765
  鈹斺攢 鏈湴 bridge (bridge/voice-bridge.py)
       鈹斺攢 闃块噷浜?DashScope paraformer-realtime-v2 璇嗗埆
```

**涓轰粈涔堥渶瑕佹湰鍦?bridge锛?*
DashScope 鐨?ASR WebSocket 鎻℃墜渚濊禆瀹樻柟 SDK 鐨勫唴閮ㄩ壌鏉冮€昏緫锛屾祻瑙堝櫒瑁?WebSocket 鐩磋繛浼?401銆俠ridge 鐢ㄥ畼鏂?Python SDK 澶勭悊閴存潈锛屾祻瑙堝櫒鍙礋璐ｅ綍闊冲拰鏄剧ず銆?
## 馃摝 瀹夎

### 1. 瀹夎鎻掍欢

```bash
dsh plugin --profile web add github:<浣犵殑鐢ㄦ埛鍚?/dsh-voice-input-cn
```

鎴栫敤 dshmarket 瀹夎锛堝鏋滃凡涓婃灦锛夈€?
### 2. 瀹夎 bridge 渚濊禆锛圥ython 3.10+锛?
```bash
pip install dashscope websockets
```

### 3. 鍚姩 bridge

```bash
# 鍓嶅彴杩愯
python bridge/voice-bridge.py

# 鎴?Windows 寮€鏈鸿嚜鍚紙鍙屽嚮娉ㄥ唽鍒板惎鍔ㄦ枃浠跺す锛?wscript bridge/start-voice-bridge.vbs
```

bridge 榛樿鐩戝惉 `127.0.0.1:8765`锛堜粎鏈満锛屼笉鏆撮湶鍏綉锛夈€?
### 4. 閰嶇疆 API Key

1. 鍒锋柊 DSH 椤甸潰
2. 鐐瑰嚮杈撳叆妗嗘梺鐨勯害鍏嬮鎸夐挳 鈫?鍙充晶灏忕澶达紙鈱勶級鎵撳紑璁剧疆
3. 濉叆 **DashScope API Key**锛圼闃块噷浜戠櫨鐐艰幏鍙朷(https://bailian.console.aliyun.com/)锛?4. 閫夋嫨璇█锛屼繚瀛?
## 馃帳 浣跨敤

1. 鐐瑰嚮楹﹀厠椋庢寜閽紑濮?2. 姝ｅ父璇磋瘽锛堟枃瀛椾細瀹炴椂濉叆杈撳叆妗嗭級
3. 鍋滈】 1.5 绉掓垨鍐嶆鐐瑰嚮 鈫?鑷姩缁撴潫
4. 鑻ュ紑鍚?鑷姩鍙戦€?鍒欑洿鎺ユ彁浜わ紝鍚﹀垯鍙户缁紪杈戝悗鎵嬪姩鍙戦€?
## 馃敡 閰嶇疆椤癸紙璁剧疆鑿滃崟锛?
| 椤?| 璇存槑 |
|---|---|
| DashScope API Key | 闃块噷浜戠櫨鐐?API Key锛堝瓨 localStorage锛墊
| 璇嗗埆鍚庤嚜鍔ㄥ彂閫?| 璇嗗埆瀹屾垚鑷姩鎻愪氦鑽夌 |
| 璇嗗埆璇█ | 鑷姩 / 涓枃 / English |

## 馃摑 涓庡師鐗堢殑鍖哄埆

| | 鍘熺増 (dsh-voice-input) | 鏈増 (dsh-voice-input-cn) |
|---|---|---|
| 璇嗗埆寮曟搸 | Web Speech API锛圙oogle 浜戠锛墊 闃块噷浜?DashScope ASR |
| 鍥藉唴鍙敤 | 鉂?涓嶅彲鐢?| 鉁?鐩磋繛鍙敤 |
| 鏋舵瀯 | 绾祻瑙堝櫒 | 娴忚鍣?+ 鏈湴 Python bridge |
| 璇嗗埆浣撻獙 | 涓€娆℃€ц繑鍥?| 娴佸紡瀹炴椂濉叆 |
| 闈欓煶鍋滄 | 鏃?| 鉁?1.5s 鑷姩鍋滄 |
| 鍏夋爣鎻掑叆 | 杩藉姞鏈熬 | 鉁?鍏夋爣浣嶇疆鎻掑叆 |

## 鈿狅笍 瀹夊叏璇存槑

- **API Key 瀛樹簬娴忚鍣?localStorage**锛屾湰鎻掍欢涓嶄笂浼?key 鍒颁换浣曠涓夋柟锛涗絾鍚屼竴娴忚鍣ㄥ唴鐨勫叾浠栬剼鏈彲璇诲彇锛岃鍕垮湪鍏变韩鐢佃剳浣跨敤
- bridge 浠呯洃鍚?`127.0.0.1`锛屼笉瀵瑰缃戝紑鏀?- 闊抽浠呭彂閫佽嚦闃块噷浜?DashScope 璇嗗埆锛屼笉鐣欏瓨

## 馃悰 甯歌闂

**Q: 鏄剧ず"杩炴帴鏈湴璇煶鏈嶅姟澶辫触"**
A: bridge 娌″惎鍔ㄣ€傝繍琛?`python bridge/voice-bridge.py`锛岀‘璁ょ鍙?8765 宸茬洃鍚€?
**Q: 璇嗗埆涓嶅嚭鍐呭 / "鍛冨憙鍟婂晩"**
A: 妫€鏌ラ害鍏嬮鏉冮檺锛堟祻瑙堝櫒 + Windows锛夛紱纭 Key 鏈夋晥锛堥樋閲屼簯鐧剧偧鎺у埗鍙板彲娴嬭瘯锛夛紱纭闊抽涓嶆槸闈欓煶銆?
**Q: 鏄剧ず"鏃犲彲鐢ㄩ害鍏嬮"**
A: 杩欐槸娴忚鍣?`getUserMedia` 鐨?`NotFoundError`銆傛鏌?Windows 楹﹀厠椋庨殣绉佽缃€侀粯璁よ緭鍏ヨ澶囥€侀┍鍔ㄧ姸鎬侊紙Intel 鏅洪煶绔偣骞界伒鍖栨椂闇€閲嶈椹卞姩锛夈€?
**Q: 寤惰繜楂?*
A: 璇嗗埆涓烘祦寮忥紝鐞嗚涓婅瀹屽嵆鍑猴紱鑻ュ欢杩熸槑鏄撅紝妫€鏌ョ綉缁滃埌闃块噷浜戠殑寤惰繜锛屾垨鎹㈢敤鏇磋繎鐨勫尯鍩熻妭鐐广€?
## 馃摐 License

MIT锛堜繚鐣欏師鐗?fork 鐗堟潈澹版槑锛涢樋閲屼簯 DashScope 鏈嶅姟闇€閬靛畧鍏朵娇鐢ㄦ潯娆撅級
