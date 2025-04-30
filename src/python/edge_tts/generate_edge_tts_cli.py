import subprocess
from pathlib import Path

TEXT = "昨天晚上開始腹瀉發燒，到今天中午總共拉五次，早上還吐了兩次"
VOICE = "zh-TW-HsiaoChenNeural"
STYLE = "sad"

# 輸出位置
OUTPUT_DIR = Path("audio")
OUTPUT_DIR.mkdir(exist_ok=True)
OUTPUT_FILE = OUTPUT_DIR / f"output_{STYLE}_{VOICE.replace('-', '_')}.mp3"

# SSML 內容
SSML_TEXT = f"""
<speak version='1.0' xml:lang='zh-TW'>
  <voice name='{VOICE}'>
    <mstts:express-as style='{STYLE}' xmlns:mstts='https://www.w3.org/2001/mstts'>
      {TEXT}
    </mstts:express-as>
  </voice>
</speak>
"""

# 寫入 SSML 檔案（副檔名需為 .ssml 才會被正確識別為 SSML）
SSML_FILE = Path("tmp.ssml")
SSML_FILE.write_text(SSML_TEXT.strip(), encoding="utf-8")

# 執行 edge-tts CLI
cmd = [
    "edge-tts",
    "--file", str(SSML_FILE),
    "--write-media", str(OUTPUT_FILE)
]

subprocess.run(cmd, check=True)
print(f"✅ 語音檔已輸出：{OUTPUT_FILE}")
