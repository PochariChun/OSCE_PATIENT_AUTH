import os
import json
import argparse
import asyncio
import torch
import soundfile as sf
import numpy as np
from datetime import datetime
from pathlib import Path

# 確保 F5-TTS 已安裝
try:
    from f5_tts.infer.pipeline import F5TTSPipeline
    from f5_tts.infer.config import InferenceConfig
except ImportError:
    raise ImportError("請先安裝 F5-TTS: pip install f5-tts")

class F5TTSGenerator:
    def __init__(self, model_name="F5TTS_v1_Base", device=None):
        """
        初始化 F5-TTS 生成器
        
        參數:
            model_name (str): 要使用的模型名稱，默認為 "F5TTS_v1_Base"
            device (str): 要使用的設備，如 "cuda", "cpu" 等，默認為自動選擇
        """
        if device is None:
            device = "cuda" if torch.cuda.is_available() else "cpu"
        
        self.device = device
        self.model_name = model_name
        
        # 初始化 F5-TTS 推理管道
        print(f"正在加載 {model_name} 模型...")
        self.pipeline = F5TTSPipeline(model_name=model_name, device=device)
        print(f"模型加載完成，使用設備: {device}")
    
    def generate_speech(self, ref_audio, ref_text, gen_text, output_file=None, top_k=None, top_p=None, temperature=None):
        """
        生成語音
        
        參數:
            ref_audio (str): 參考音頻文件路徑
            ref_text (str): 參考音頻的文本內容
            gen_text (str): 要生成的文本內容
            output_file (str): 輸出音頻文件路徑，如果為 None 則自動生成
            top_k (int): 採樣時的 top-k 值
            top_p (float): 採樣時的 top-p 值
            temperature (float): 採樣時的溫度
        
        返回:
            str: 生成的音頻文件路徑
        """
        if output_file is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = f"f5tts_output_{timestamp}.wav"
        
        # 確保輸出目錄存在
        os.makedirs(os.path.dirname(os.path.abspath(output_file)) if os.path.dirname(output_file) else '.', exist_ok=True)
        
        # 創建推理配置
        config = InferenceConfig()
        
        # 設置採樣參數
        if top_k is not None:
            config.top_k = top_k
        if top_p is not None:
            config.top_p = top_p
        if temperature is not None:
            config.temperature = temperature
        
        # 使用 Sway Sampling 策略
        config.use_sway_sampling = True
        
        print(f"正在生成語音: {gen_text[:50]}...")
        
        # 生成語音
        audio_array = self.pipeline.infer(
            prompt_audio=ref_audio,
            prompt_text=ref_text,
            target_text=gen_text,
            config=config
        )
        
        # 保存音頻
        sf.write(output_file, audio_array, 24000)
        
        print(f"語音生成完成: {output_file}")
        return output_file

async def generate_audio_for_answer(generator, ref_audio, ref_text, answer, question, output_dir):
    """
    為單個回答生成音頻文件
    
    參數:
        generator: F5TTSGenerator 實例
        ref_audio (str): 參考音頻文件路徑
        ref_text (str): 參考音頻的文本內容
        answer (str): 回答文本
        question (str): 問題文本，用於命名文件
        output_dir (str): 輸出目錄
    
    返回:
        str: 生成的音頻文件路徑
    """
    # 清理文件名，移除不允許的字符
    safe_question = "".join(c for c in question if c.isalnum() or c in " _-").strip()
    safe_question = safe_question[:50]  # 限制文件名長度
    
    output_file = os.path.join(output_dir, f"{safe_question}.wav")
    return generator.generate_speech(ref_audio, ref_text, answer, output_file)

async def process_single_answer(generator, input_file, output_dir, ref_audio, ref_text, question_text=None, index=None):
    """
    處理單個回答並生成音頻
    
    參數:
        generator: F5TTSGenerator 實例
        input_file (str): 輸入JSON文件路徑
        output_dir (str): 輸出音頻文件目錄
        ref_audio (str): 參考音頻文件路徑
        ref_text (str): 參考音頻的文本內容
        question_text (str): 要處理的問題文本（如果提供）
        index (int): 要處理的問題索引（如果提供）
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
                    output_file = await generate_audio_for_answer(generator, ref_audio, ref_text, answer, question, output_dir)
                    
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

async def process_dialogue_answers(generator, input_file, output_dir, ref_audio, ref_text):
    """
    處理所有對話答案並生成音頻
    
    參數:
        generator: F5TTSGenerator 實例
        input_file (str): 輸入JSON文件路徑
        output_dir (str): 輸出音頻文件目錄
        ref_audio (str): 參考音頻文件路徑
        ref_text (str): 參考音頻的文本內容
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
                output_file = await generate_audio_for_answer(generator, ref_audio, ref_text, answer, question, output_dir)
                
                # 記錄結果
                item["audio_file"] = os.path.basename(output_file)
                print(f"已生成音頻: {output_file}")
    
    # 保存更新後的數據
    output_json = os.path.join(output_dir, "dialogue_with_audio.json")
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"已更新JSON數據: {output_json}")

async def process_custom_text(generator, text, output_dir, ref_audio, ref_text, filename="custom_audio"):
    """
    處理自定義文本並生成音頻
    
    參數:
        generator: F5TTSGenerator 實例
        text (str): 要轉換為語音的文本
        output_dir (str): 輸出音頻文件目錄
        ref_audio (str): 參考音頻文件路徑
        ref_text (str): 參考音頻的文本內容
        filename (str): 輸出文件名（不含擴展名）
    """
    # 確保輸出目錄存在
    os.makedirs(output_dir, exist_ok=True)
    
    output_file = os.path.join(output_dir, f"{filename}.wav")
    generator.generate_speech(ref_audio, ref_text, text, output_file)
    print(f"已生成自定義音頻: {output_file}")
    return output_file

async def main():
    parser = argparse.ArgumentParser(description="使用 F5-TTS 生成語音")
    parser.add_argument("--model", default="F5TTS_v1_Base", help="要使用的模型名稱")
    parser.add_argument("--device", help="要使用的設備，如 cuda, cpu 等")
    parser.add_argument("--ref_audio", required=True, help="參考音頻文件路徑")
    parser.add_argument("--ref_text", required=True, help="參考音頻的文本內容")
    parser.add_argument("--input", help="輸入 JSON 文件路徑")
    parser.add_argument("--output_dir", default="public/audiott5", help="輸出音頻文件目錄")
    parser.add_argument("--question", help="要處理的特定問題文本（部分匹配）")
    parser.add_argument("--index", type=int, help="要處理的問題索引")
    parser.add_argument("--all", action="store_true", help="處理所有問題")
    parser.add_argument("--text", help="直接將指定文本轉換為語音")
    parser.add_argument("--filename", default="custom_audio", help="自定義文本的輸出文件名")
    parser.add_argument("--top_k", type=int, help="採樣時的 top-k 值")
    parser.add_argument("--top_p", type=float, help="採樣時的 top-p 值")
    parser.add_argument("--temperature", type=float, help="採樣時的溫度")
    
    args = parser.parse_args()
    
    # 初始化 F5-TTS 生成器
    generator = F5TTSGenerator(model_name=args.model, device=args.device)
    
    # 處理自定義文本
    if args.text:
        await process_custom_text(generator, args.text, args.output_dir, args.ref_audio, args.ref_text, args.filename)
        return
    
    # 確保提供了輸入文件
    if not args.input:
        parser.error("必須提供 --input 參數，除非使用 --text 參數")
    
    # 處理單個問題或所有問題
    if args.question or args.index is not None:
        await process_single_answer(generator, args.input, args.output_dir, args.ref_audio, args.ref_text, args.question, args.index)
    elif args.all or (not args.question and args.index is None):
        await process_dialogue_answers(generator, args.input, args.output_dir, args.ref_audio, args.ref_text)

if __name__ == "__main__":
    asyncio.run(main()) 