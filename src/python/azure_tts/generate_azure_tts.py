import os
import asyncio
import argparse
import json
import azure.cognitiveservices.speech as speechsdk
from datetime import datetime

# 請替換為您的 Azure 語音服務金鑰和區域
SPEECH_KEY = os.environ.get("AZURE_SPEECH_KEY", "your_azure_speech_key")
SPEECH_REGION = os.environ.get("AZURE_SPEECH_REGION", "eastasia")

def generate_speech(text, voice_name, output_file):
    """
    使用 Azure 語音服務生成語音
    
    參數:
        text (str): 要轉換為語音的文本
        voice_name (str): 要使用的語音名稱
        output_file (str): 輸出音頻文件路徑
    
    返回:
        bool: 是否成功生成
    """
    # 確保輸出目錄存在
    os.makedirs(os.path.dirname(os.path.abspath(output_file)), exist_ok=True)
    
    # 創建語音配置
    speech_config = speechsdk.SpeechConfig(subscription=SPEECH_KEY, region=SPEECH_REGION)
    
    # 設置語音
    speech_config.speech_synthesis_voice_name = voice_name
    
    # 設置輸出格式為 MP3
    speech_config.set_speech_synthesis_output_format(
        speechsdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3
    )
    
    # 創建音頻輸出配置
    audio_config = speechsdk.audio.AudioOutputConfig(filename=output_file)
    
    # 創建語音合成器
    synthesizer = speechsdk.SpeechSynthesizer(
        speech_config=speech_config, 
        audio_config=audio_config
    )
    
    # 合成語音
    result = synthesizer.speak_text_async(text).get()
    
    # 檢查結果
    if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
        print(f"語音合成成功: {output_file}")
        return True
    elif result.reason == speechsdk.ResultReason.Canceled:
        cancellation_details = result.cancellation_details
        print(f"語音合成取消: {cancellation_details.reason}")
        if cancellation_details.reason == speechsdk.CancellationReason.Error:
            print(f"錯誤詳情: {cancellation_details.error_details}")
        return False
    else:
        print(f"未知錯誤: {result.reason}")
        return False

def generate_speech_with_ssml(ssml, output_file):
    """
    使用 SSML 生成語音
    
    參數:
        ssml (str): SSML 文本
        output_file (str): 輸出音頻文件路徑
    
    返回:
        bool: 是否成功生成
    """
    # 確保輸出目錄存在
    os.makedirs(os.path.dirname(os.path.abspath(output_file)), exist_ok=True)
    
    # 創建語音配置
    speech_config = speechsdk.SpeechConfig(subscription=SPEECH_KEY, region=SPEECH_REGION)
    
    # 設置輸出格式為 MP3
    speech_config.set_speech_synthesis_output_format(
        speechsdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3
    )
    
    # 創建音頻輸出配置
    audio_config = speechsdk.audio.AudioOutputConfig(filename=output_file)
    
    # 創建語音合成器
    synthesizer = speechsdk.SpeechSynthesizer(
        speech_config=speech_config, 
        audio_config=audio_config
    )
    
    # 合成語音
    result = synthesizer.speak_ssml_async(ssml).get()
    
    # 檢查結果
    if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
        print(f"語音合成成功: {output_file}")
        return True
    elif result.reason == speechsdk.ResultReason.Canceled:
        cancellation_details = result.cancellation_details
        print(f"語音合成取消: {cancellation_details.reason}")
        if cancellation_details.reason == speechsdk.CancellationReason.Error:
            print(f"錯誤詳情: {cancellation_details.error_details}")
        return False
    else:
        print(f"未知錯誤: {result.reason}")
        return False

def create_ssml(text, voice_name, style=None, rate="0%", pitch="0%"):
    """
    創建 SSML 文本
    
    參數:
        text (str): 要轉換為語音的文本
        voice_name (str): 要使用的語音名稱
        style (str): 語音風格，如 "cheerful", "sad" 等
        rate (str): 語速，如 "-10%", "0%", "+10%"
        pitch (str): 音調，如 "-10%", "0%", "+10%"
    
    返回:
        str: SSML 文本
    """
    ssml = f"""
    <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="zh-TW">
        <voice name="{voice_name}">
    """
    
    if style:
        ssml += f'<mstts:express-as style="{style}">'
    
    ssml += f'<prosody rate="{rate}" pitch="{pitch}">{text}</prosody>'
    
    if style:
        ssml += '</mstts:express-as>'
    
    ssml += """
        </voice>
    </speak>
    """
    
    return ssml

def process_dialogue_answers(input_file, output_dir, voice_name="zh-TW-HsiaoYuNeural"):
    """
    處理對話答案並生成音頻
    
    參數:
        input_file (str): 輸入JSON文件路徑
        output_dir (str): 輸出音頻文件目錄
        voice_name (str): 要使用的語音名稱
    """
    # 確保輸出目錄存在
    os.makedirs(output_dir, exist_ok=True)
    
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # 遍歷所有類別和問題
    for category, items in data.get("categories", {}).items():
        for item in items:
            if "answer" in item and item["answer"]:
                question = item.get("question", "unknown_question")
                answer = item["answer"]
                
                # 清理文件名，移除不允許的字符
                safe_question = "".join(c for c in question if c.isalnum() or c in " _-").strip()
                safe_question = safe_question[:50]  # 限制文件名長度
                
                output_file = os.path.join(output_dir, f"{safe_question}.mp3")
                
                print(f"處理問題: {question}")
                
                # 創建 SSML
                ssml = create_ssml(answer, voice_name)
                
                # 生成語音
                success = generate_speech_with_ssml(ssml, output_file)
                
                if success:
                    # 記錄結果
                    item["audio_file"] = os.path.basename(output_file)
                    print(f"已生成音頻: {output_file}")
    
    # 保存更新後的數據
    output_json = os.path.join(output_dir, "dialogue_with_audio.json")
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"已更新JSON數據: {output_json}")

def process_custom_text(text, output_dir, filename="custom_audio", voice_name="zh-TW-HsiaoYuNeural", style=None, rate="0%", pitch="0%"):
    """
    處理自定義文本並生成音頻
    
    參數:
        text (str): 要轉換為語音的文本
        output_dir (str): 輸出音頻文件目錄
        filename (str): 輸出文件名（不含擴展名）
        voice_name (str): 要使用的語音名稱
        style (str): 語音風格
        rate (str): 語速
        pitch (str): 音調
    """
    # 確保輸出目錄存在
    os.makedirs(output_dir, exist_ok=True)
    
    output_file = os.path.join(output_dir, f"{filename}.mp3")
    
    # 創建 SSML
    ssml = create_ssml(text, voice_name, style, rate, pitch)
    
    # 生成語音
    success = generate_speech_with_ssml(ssml, output_file)
    
    if success:
        print(f"已生成自定義音頻: {output_file}")
        return output_file
    else:
        print(f"生成自定義音頻失敗")
        return None

def list_available_voices():
    """
    列出可用的語音
    """
    speech_config = speechsdk.SpeechConfig(subscription=SPEECH_KEY, region=SPEECH_REGION)
    speech_synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=None)
    
    result = speech_synthesizer.get_voices_async().get()
    
    if result.reason == speechsdk.ResultReason.VoicesListRetrieved:
        voices = result.voices
        
        print("\n可用的語音列表:")
        print("=" * 80)
        print(f"{'語音名稱':<40} {'語言':<10} {'性別':<8} {'類型'}")
        print("-" * 80)
        
        # 過濾繁體中文語音
        zh_tw_voices = [v for v in voices if v.locale.startswith("zh-TW")]
        
        for voice in zh_tw_voices:
            print(f"{voice.short_name:<40} {voice.locale:<10} {voice.gender:<8} {voice.voice_type}")
        
        print("=" * 80)
    else:
        print(f"無法獲取語音列表: {result.reason}")

def main():
    parser = argparse.ArgumentParser(description="使用 Azure 語音服務生成語音")
    parser.add_argument("--input", help="輸入JSON文件路徑")
    parser.add_argument("--output_dir", default="audio", help="輸出音頻文件目錄")
    parser.add_argument("--voice", default="zh-TW-HsiaoYuNeural", help="要使用的語音名稱")
    parser.add_argument("--text", help="直接將指定文本轉換為語音")
    parser.add_argument("--filename", default="custom_audio", help="自定義文本的輸出文件名")
    parser.add_argument("--style", help="語音風格，如 cheerful, sad 等")
    parser.add_argument("--rate", default="0%", help="語速，如 -10%, 0%, +10%")
    parser.add_argument("--pitch", default="0%", help="音調，如 -10%, 0%, +10%")
    parser.add_argument("--list_voices", action="store_true", help="列出可用的語音")
    
    args = parser.parse_args()
    
    # 檢查環境變數
    if SPEECH_KEY == "your_azure_speech_key":
        print("錯誤: 請設置 AZURE_SPEECH_KEY 環境變數")
        return
    
    # 列出可用的語音
    if args.list_voices:
        list_available_voices()
        return
    
    # 處理自定義文本
    if args.text:
        process_custom_text(
            args.text, 
            args.output_dir, 
            args.filename, 
            args.voice, 
            args.style, 
            args.rate, 
            args.pitch
        )
        return
    
    # 確保提供了輸入文件
    if not args.input:
        parser.error("必須提供 --input 參數，除非使用 --text 參數或 --list_voices")
    
    # 處理對話答案
    process_dialogue_answers(args.input, args.output_dir, args.voice)

if __name__ == "__main__":
    main() 