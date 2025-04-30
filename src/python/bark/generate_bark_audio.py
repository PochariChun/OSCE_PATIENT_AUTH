#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
使用 Bark 為 dialogue_answers.json 中的每個回答生成台灣媽媽口音的語音
"""

import json
import os
import sys
import time
from pathlib import Path
import torch
from bark import SAMPLE_RATE, generate_audio, preload_models
from scipy.io.wavfile import write as write_wav

# 設置 GPU 使用 (如果可用)
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"使用設備: {device}")

# 台灣媽媽的語音提示詞
TAIWANESE_MOM_PROMPT = "[zh] 台灣媽媽的聲音，溫柔但帶著一點擔憂"

def generate_audio_for_answers(limit=5):
    """
    為 dialogue_answers.json 中的回答生成語音
    
    Args:
        limit: 每個類別處理的最大回答數量 (用於演示)
    """
    # 獲取腳本所在目錄
    script_dir = Path(os.path.dirname(os.path.abspath(__file__)))
    
    # 構建輸入和輸出目錄
    input_file = script_dir / "../lib/dialogue_answers.json"
    output_dir = script_dir / "../public/audio"
    
    # 確保輸出目錄存在
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # 檢查輸入文件是否存在
    if not input_file.exists():
        print(f"錯誤：找不到輸入文件 {input_file}")
        sys.exit(1)
    
    # 讀取 JSON 文件
    print(f"正在讀取 {input_file}...")
    
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # 預加載 Bark 模型
        print("正在加載 Bark 模型...")
        preload_models()
        
        # 處理計數器
        total_processed = 0
        
        # 遍歷每個類別的回答
        for category, answers in data['categories'].items():
            print(f"\n處理類別: {category}")
            
            # 限制每個類別處理的數量 (用於演示)
            category_answers = answers[:limit]
            
            for i, item in enumerate(category_answers):
                answer = item['answer']
                
                # 為回答生成唯一的文件名
                file_name = f"{category}_{i+1}_{hash(answer) % 10000:04d}.wav"
                output_path = output_dir / file_name
                
                # 如果文件已存在，跳過
                if output_path.exists():
                    print(f"跳過已存在的文件: {file_name}")
                    continue
                
                print(f"生成語音 ({i+1}/{len(category_answers)}): {answer[:30]}...")
                
                try:
                    # 使用 Bark 生成語音
                    audio_array = generate_audio(
                        answer,
                        history_prompt=TAIWANESE_MOM_PROMPT,
                        text_temp=0.7,
                        waveform_temp=0.7
                    )
                    
                    # 保存語音文件
                    write_wav(output_path, SAMPLE_RATE, audio_array)
                    
                    print(f"已保存到: {output_path}")
                    
                    # 更新 JSON 中的 audioUrl
                    item['audioUrl'] = f"/audio/{file_name}"
                    
                    # 增加計數器
                    total_processed += 1
                    
                    # 短暫暫停，避免過度使用 GPU
                    time.sleep(1)
                    
                except Exception as e:
                    print(f"生成語音時出錯: {e}")
        
        # 保存更新後的 JSON
        updated_output_file = script_dir / "../lib/dialogue_answers_with_audio.json"
        with open(updated_output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"\n處理完成！")
        print(f"總共生成了 {total_processed} 個語音文件")
        print(f"更新後的 JSON 已保存到 {updated_output_file}")
        
    except Exception as e:
        print(f"錯誤：{e}")
        sys.exit(1)

if __name__ == "__main__":
    # 從命令行參數獲取限制數量，默認為 5
    limit = 5
    if len(sys.argv) > 1:
        try:
            limit = int(sys.argv[1])
        except ValueError:
            print(f"警告：無效的限制數量 '{sys.argv[1]}'，使用默認值 5")
    
    print(f"每個類別將處理最多 {limit} 個回答 (演示模式)")
    generate_audio_for_answers(limit) 