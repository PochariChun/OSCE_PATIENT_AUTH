import asyncio
import os
import json
import edge_tts
import base64
from datetime import datetime

async def generate_speech(text, voice="zh-TW-HsiaoChenNeural", output_file=None, emotion=None, emotion_degree=None):
    """
    使用Edge TTS生成語音
    
    參數:
        text (str): 要轉換為語音的文本
        voice (str): 要使用的語音名稱
        output_file (str, optional): 輸出文件路徑，如果為None則生成臨時文件
        emotion (str): 情感類型 (sad, happy, angry, etc.)
        emotion_degree (str): 情感程度 (0.01-2.00)
    
    返回:
        str: 音頻文件的路徑
    """
    if output_file is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = f"temp_audio_{timestamp}.mp3"
    
    # 確保輸出目錄存在
    os.makedirs(os.path.dirname(output_file) if os.path.dirname(output_file) else '.', exist_ok=True)
    
    # 如果指定了情感，使用SSML格式
    if emotion:
        # 設置情感程度，如果未指定則使用默認值1.0
        degree = emotion_degree if emotion_degree is not None else 1.0
        # 確保程度在有效範圍內
        degree = max(0.01, min(2.0, degree))
        
        # 構建SSML文本
        ssml = f"""
        <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="zh-TW">
            <voice name="{voice}">
                <mstts:express-as style="{emotion}" styledegree="{degree}">
                    {text}
                </mstts:express-as>
            </voice>
        </speak>
        """
        communicate = edge_tts.Communicate(ssml, voice)
    else:
        communicate = edge_tts.Communicate(text, voice)
    
    await communicate.save(output_file)
    
    return output_file

async def text_to_base64_audio(text, voice="zh-TW-HsiaoChenNeural", emotion=None, emotion_degree=None):
    """
    將文本轉換為Base64編碼的音頻
    
    參數:
        text (str): 要轉換為語音的文本
        voice (str): 要使用的語音名稱
        emotion (str): 情感類型 (sad, happy, angry, etc.)
        emotion_degree (str): 情感程度 (0.01-2.00)
    
    返回:
        str: Base64編碼的音頻數據
    """
    temp_file = await generate_speech(text, voice, None, emotion, emotion_degree)
    
    with open(temp_file, "rb") as audio_file:
        audio_data = audio_file.read()
        base64_audio = base64.b64encode(audio_data).decode("utf-8")
    
    # 刪除臨時文件
    os.remove(temp_file)
    
    return base64_audio

async def process_dialogue_answers(input_file, output_dir, voice="zh-TW-HsiaoChenNeural", emotion=None, emotion_degree=None):
    """
    處理對話答案並生成音頻文件
    
    參數:
        input_file (str): 輸入JSON文件路徑
        output_dir (str): 輸出音頻文件目錄
        voice (str): 要使用的語音名稱
        emotion (str): 情感類型 (sad, happy, angry, etc.)
        emotion_degree (str): 情感程度 (0.01-2.00)
    """
    # 確保輸出目錄存在
    os.makedirs(output_dir, exist_ok=True)
    
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # 處理所有類別中的對話
    total_processed = 0
    for category, items in data.get("categories", {}).items():
        for i, item in enumerate(items):
            if "answer" in item and item["answer"] and "question" in item:
                # 使用問題作為檔案名稱
                question = item["question"]
                # 清理文件名，移除不允許的字符
                safe_question = "".join(c for c in question if c.isalnum() or c in " _-").strip()
                safe_question = safe_question[:50]  # 限制文件名長度
                
                output_file = os.path.join(output_dir, f"{safe_question}.mp3")
                print(f"正在為問題「{question}」生成音頻...")
                await generate_speech(item["answer"], voice, output_file, emotion, emotion_degree)
                
                # 將音頻檔案名稱添加到JSON中
                item["audio_file"] = os.path.basename(output_file)
                
                total_processed += 1
    
    # 保存更新後的JSON
    output_json = os.path.join(output_dir, "dialogue_with_audio.json")
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"已完成處理 {total_processed} 個對話答案，音頻文件保存在 {output_dir}")
    print(f"更新後的JSON已保存到 {output_json}")

async def process_dialogue_answers_with_audio(input_file, output_file, voice="zh-TW-HsiaoChenNeural", emotion=None, emotion_degree=None):
    """
    處理對話答案並添加音頻
    
    參數:
        input_file (str): 輸入JSON文件路徑
        output_file (str): 輸出JSON文件路徑
        voice (str): 要使用的語音名稱
        emotion (str): 情感類型 (sad, happy, angry, etc.)
        emotion_degree (str): 情感程度 (0.01-2.00)
    """
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # 處理所有類別中的對話
    for category, items in data.get("categories", {}).items():
        for item in items:
            if "answer" in item and item["answer"]:
                question = item.get("question", "unknown_question")
                print(f"正在為問題「{question}」生成音頻...")
                item["audio"] = await text_to_base64_audio(item["answer"], voice, emotion, emotion_degree)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"已完成處理並保存到 {output_file}")

def main():
    """命令行入口點"""
    import argparse
    
    parser = argparse.ArgumentParser(description="使用Edge TTS生成語音")
    parser.add_argument("--text", help="要轉換為語音的文本")
    parser.add_argument("--voice", default="zh-TW-HsiaoChenNeural", help="要使用的語音名稱")
    parser.add_argument("--output", help="輸出文件路徑")
    parser.add_argument("--input_json", help="輸入JSON文件路徑")
    parser.add_argument("--output_json", help="輸出JSON文件路徑")
    parser.add_argument("--output_dir", help="輸出音頻文件目錄")
    parser.add_argument("--emotion", help="情感類型 (sad, happy, angry, worried 等)")
    parser.add_argument("--emotion_degree", type=float, help="情感程度 (0.01-2.00)")
    
    args = parser.parse_args()
    
    if args.input_json and args.output_dir:
        asyncio.run(process_dialogue_answers(args.input_json, args.output_dir, args.voice, args.emotion, args.emotion_degree))
    elif args.input_json and args.output_json:
        asyncio.run(process_dialogue_answers_with_audio(args.input_json, args.output_json, args.voice, args.emotion, args.emotion_degree))
    elif args.text:
        output_file = args.output or "output.mp3"
        asyncio.run(generate_speech(args.text, args.voice, output_file, args.emotion, args.emotion_degree))
        print(f"已生成語音文件: {output_file}")
    else:
        parser.print_help()

if __name__ == "__main__":
    main() 