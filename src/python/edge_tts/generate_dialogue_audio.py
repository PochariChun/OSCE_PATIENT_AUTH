import asyncio
import os
import json
import argparse
import hashlib
from generate_edge_tts_audio import generate_speech
import jsonlines
# zh-CN-XiaoyiNeural, zh-CN-XiaoxiaoNeural
async def generate_audio_for_answer(answer, question, output_dir, voice="zh-TW-HsiaoChenNeural"):
    """
    為單個回答生成音頻文件
    
    參數:
        answer (str): 回答文本
        question (str): 問題文本，用於命名文件
        output_dir (str): 輸出目錄
        voice (str): 要使用的語音名稱
    
    返回:
        str: 生成的音頻文件路徑
    """
    # 清理文件名，移除不允許的字符
    safe_question = "".join(c for c in question if c.isalnum() or c in " _-").strip()
    safe_question = safe_question[:50]  # 限制文件名長度
    
    output_file = os.path.join(output_dir, f"{safe_question}.mp3")
    await generate_speech(answer, voice, output_file)
    return output_file

async def process_single_answer(input_file, output_dir, question_text=None, index=None, voice="zh-TW-HsiaoChenNeural"):
    """
    處理單個回答並生成音頻
    
    參數:
        input_file (str): 輸入JSON文件路徑
        output_dir (str): 輸出音頻文件目錄
        question_text (str): 要處理的問題文本（如果提供）
        index (int): 要處理的問題索引（如果提供）
        voice (str): 要使用的語音名稱
    """
    # 確保輸出目錄存在
    os.makedirs(output_dir, exist_ok=True)
    
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    found = False
    
    # 遍歷所有類別和問題
    for category, items in data.get("categories", {}).items():
        for i, item in enumerate(items):
            # 檢查是否匹配問題文本或索引
            if ((question_text and "question" in item and question_text.lower() in item["question"].lower()) or
                (index is not None and i == index)):
                
                if "answer" in item and item["answer"]:
                    question = item.get("question", "unknown_question")
                    answer = item["answer"]
                    
                    print(f"處理問題: {question}")
                    output_file = await generate_audio_for_answer(answer, question, output_dir, voice)
                    
                    # 記錄結果
                    item["audio_file"] = os.path.basename(output_file)
                    print(f"已生成音頻: {output_file}")
                    found = True
                    
                    # 如果使用索引，找到後就退出
                    if index is not None:
                        break
        
        # 如果使用索引且已找到，退出外層循環
        if index is not None and found:
            break
    
    if not found:
        print("未找到匹配的問題")
        return
    
    # 保存更新後的數據
    output_json = os.path.join(output_dir, "dialogue_with_audio.json")
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"已更新JSON數據: {output_json}")

async def process_dialogue_answers(input_file, output_dir, voice="zh-TW-HsiaoChenNeural"):
    """
    處理所有對話答案並生成音頻
    
    參數:
        input_file (str): 輸入JSON文件路徑
        output_dir (str): 輸出音頻文件目錄
        voice (str): 要使用的語音名稱
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
                
                print(f"處理問題: {question}")
                output_file = await generate_audio_for_answer(answer, question, output_dir, voice)
                
                # 記錄結果
                item["audio_file"] = os.path.basename(output_file)
                print(f"已生成音頻: {output_file}")
    
    # 保存更新後的數據
    output_json = os.path.join(output_dir, "dialogue_with_audio.json")
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"已更新JSON數據: {output_json}")

async def process_custom_text(text, output_dir, filename="custom_audio", voice="zh-TW-HsiaoChenNeural"):
    """
    處理自定義文本並生成音頻
    
    參數:
        text (str): 要轉換為語音的文本
        output_dir (str): 輸出音頻文件目錄
        filename (str): 輸出文件名（不含擴展名）
        voice (str): 要使用的語音名稱
    """
    # 確保輸出目錄存在
    os.makedirs(output_dir, exist_ok=True)
    
    output_file = os.path.join(output_dir, f"{filename}.mp3")
    await generate_speech(text, voice, output_file)
    print(f"已生成自定義音頻: {output_file}")
    return output_file

async def process_jsonl_answers(input_file, output_dir, voice="zh-TW-HsiaoChenNeural"):
    """
    為JSONL文件中的所有回答生成音頻
    
    參數:
        input_file (str): 輸入JSONL文件路徑
        output_dir (str): 輸出音頻文件目錄
        voice (str): 要使用的語音名稱
    """
    # 確保輸出目錄存在
    os.makedirs(output_dir, exist_ok=True)
    
    # 創建一個字典來跟踪已處理的回答，避免重複生成
    processed_answers = {}
    
    # 讀取JSONL文件 - 使用更健壯的方法
    data = []
    with open(input_file, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:  # 跳過空行
                print(f"警告: 第 {line_num} 行為空，已跳過")
                continue
            
            try:
                item = json.loads(line)
                data.append(item)
            except json.JSONDecodeError as e:
                print(f"警告: 第 {line_num} 行包含無效的JSON: {e}")
                print(f"問題行內容: {line[:100]}...")
                continue
    
    print(f"成功讀取了 {len(data)} 條記錄")
    
    # 處理每個回答
    for i, item in enumerate(data):
        if "answer" in item and item["answer"]:
            answer = item["answer"]
            
            # 使用回答的哈希值作為文件名，確保相同回答使用相同文件
            answer_hash = hashlib.md5(answer.encode('utf-8')).hexdigest()
            
            # 檢查是否已經處理過這個回答
            if answer_hash in processed_answers:
                # 重用已有的音頻文件
                item["audioUrl"] = processed_answers[answer_hash]
                print(f"重用音頻 ({i+1}/{len(data)}): {processed_answers[answer_hash]}")
            else:
                # 生成新的音頻文件
                output_file = f"{answer_hash}.mp3"
                full_path = os.path.join(output_dir, output_file)
                
                print(f"處理回答 ({i+1}/{len(data)}): {answer[:30]}...")
                await generate_speech(answer, voice, full_path)
                
                # 記錄音頻URL（相對路徑）
                audio_url = f"/audio/{output_file}"
                item["audioUrl"] = audio_url
                processed_answers[answer_hash] = audio_url
                
                print(f"已生成音頻: {full_path}")
    
    # 保存更新後的數據
    output_jsonl = os.path.join(output_dir, "rag_lookup_data_with_audio.jsonl")
    with open(output_jsonl, 'w', encoding='utf-8') as f:
        for item in data:
            f.write(json.dumps(item, ensure_ascii=False) + '\n')
    
    print(f"已更新JSONL數據: {output_jsonl}")
    print(f"總共處理了 {len(data)} 條記錄，生成了 {len(processed_answers)} 個唯一音頻文件")

async def main():
    parser = argparse.ArgumentParser(description="為對話回答生成音頻")
    parser.add_argument("--input", help="輸入文件路徑 (JSON或JSONL)")
    parser.add_argument("--output_dir", default="audio", help="輸出音頻文件目錄")
    parser.add_argument("--voice", default="zh-TW-HsiaoChenNeural", help="要使用的語音名稱")
    parser.add_argument("--question", help="要處理的特定問題文本（部分匹配）")
    parser.add_argument("--index", type=int, help="要處理的問題索引")
    parser.add_argument("--all", action="store_true", help="處理所有問題")
    parser.add_argument("--text", help="直接將指定文本轉換為語音")
    parser.add_argument("--filename", default="custom_audio", help="自定義文本的輸出文件名")
    parser.add_argument("--jsonl", action="store_true", help="處理JSONL格式文件")
    
    args = parser.parse_args()
    
    # 處理自定義文本
    if args.text:
        await process_custom_text(args.text, args.output_dir, args.filename, args.voice)
        return
    
    # 確保提供了輸入文件
    if not args.input:
        parser.error("必須提供 --input 參數，除非使用 --text 參數")
    
    # 處理JSONL文件
    if args.jsonl:
        await process_jsonl_answers(args.input, args.output_dir, args.voice)
    # 處理單個問題或所有問題
    elif args.question or args.index is not None:
        await process_single_answer(args.input, args.output_dir, args.question, args.index, args.voice)
    elif args.all or (not args.question and args.index is None):
        await process_dialogue_answers(args.input, args.output_dir, args.voice)

if __name__ == "__main__":
    asyncio.run(main()) 