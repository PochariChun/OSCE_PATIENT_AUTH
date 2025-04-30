#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
使用 Bark 為 dialogue_answers.json 中的每個回答生成台灣媽媽口音的語音
"""

import json
import os
import sys
import time
import re
from pathlib import Path

# 在導入 torch 和 bark 之前修復序列化問題
# 設置環境變量，強制 PyTorch 使用舊的加載行為
os.environ['TORCH_LOAD_WEIGHTS_ONLY'] = '0'

import torch
import jieba
import numpy as np

# 添加安全全局變量
import torch.serialization
torch.serialization.add_safe_globals([np.core.multiarray.scalar])

# 現在導入 bark
from bark import SAMPLE_RATE, generate_audio, preload_models
from scipy.io.wavfile import write as write_wav

# 設置 GPU 使用 (如果可用)
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"使用設備: {device}")

# 使用 Bark 預設的中文女性語音提示詞
# 可選的中文女性語音: "v2/zh_speaker_0", "v2/zh_speaker_1", "v2/zh_speaker_3", "v2/zh_speaker_5", "v2/zh_speaker_6", "v2/zh_speaker_9"
TAIWANESE_MOM_PROMPT = "v2/zh_speaker_9"  # 選擇一個聽起來像台灣媽媽的聲音

# 分段處理長文本，避免 OOM
def split_text_into_segments(text, max_length=50):
    """
    將長文本分割成較短的段落，避免 OOM
    
    Args:
        text: 要分割的文本
        max_length: 每段最大字符數
    
    Returns:
        分割後的文本段落列表
    """
    # 使用標點符號作為分割點
    segments = []
    
    # 使用 jieba 分詞
    words = list(jieba.cut(text))
    
    current_segment = []
    current_length = 0
    
    for word in words:
        current_segment.append(word)
        current_length += len(word)
        
        # 如果達到最大長度或遇到句號、問號、感嘆號，則分段
        if current_length >= max_length or word in ['。', '？', '！', '?', '!', '.']:
            segments.append(''.join(current_segment))
            current_segment = []
            current_length = 0
    
    # 添加最後一段
    if current_segment:
        segments.append(''.join(current_segment))
    
    return segments

def generate_audio_for_answers(limit=5):
    """
    為 dialogue_answers.json 中的回答生成語音
    
    Args:
        limit: 每個類別處理的最大回答數量 (用於演示)
    """
    # 獲取腳本所在目錄
    script_dir = Path(os.path.dirname(os.path.abspath(__file__))).resolve()
    
    # 構建輸入和輸出目錄
    input_file = script_dir / "../../lib/dialogue_answers.json"
    output_dir = script_dir / "../../public/audio"
    
    # 確保輸出目錄存在
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # 檢查輸入文件是否存在
    if not input_file.exists():
        print(f"錯誤：找不到輸入文件 {input_file}")
        # 嘗試查找可能的位置
        possible_locations = [
            script_dir / "../../lib/dialogue_answers.json",
            script_dir / "../../../lib/dialogue_answers.json",
            Path(os.getcwd()) / "lib/dialogue_answers.json",
            Path(os.getcwd()) / "src/lib/dialogue_answers.json"
        ]
        for loc in possible_locations:
            if loc.exists():
                print(f"找到可能的數據文件位置：{loc}")
                input_file = loc
                break
        else:
            print("無法找到數據文件，請確保 dialogue_answers.json 存在")
            sys.exit(1)
    
    # 讀取 JSON 文件
    print(f"正在讀取 {input_file}...")
    
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # 預加載 Bark 模型
        print("正在加載 Bark 模型...")
        
        # 使用 weights_only=False 加載模型
        with torch.serialization.safe_load(weights_only=False):
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
                    # 更新 JSON 中的 audioUrl
                    item['audioUrl'] = f"/audio/{file_name}"
                    continue
                
                print(f"生成語音 ({i+1}/{len(category_answers)}): {answer[:30]}...")
                
                try:
                    # 將長文本分段處理，避免 OOM
                    segments = split_text_into_segments(answer)
                    
                    if len(segments) > 1:
                        print(f"將文本分為 {len(segments)} 段處理")
                    
                    # 處理每個段落
                    audio_arrays = []
                    
                    for j, segment in enumerate(segments):
                        print(f"  處理段落 {j+1}/{len(segments)}: {segment}")
                        
                        # 使用 Bark 生成語音，處理可能的參數不兼容問題
                        try:
                            with torch.serialization.safe_load(weights_only=False):
                                segment_audio = generate_audio(
                                    segment,
                                    history_prompt=TAIWANESE_MOM_PROMPT,
                                    text_temp=0.7,
                                    waveform_temp=0.7
                                )
                        except TypeError:
                            # 如果不支持溫度參數，使用默認參數
                            print("  注意: 當前 Bark 版本不支持溫度參數，使用默認設置")
                            with torch.serialization.safe_load(weights_only=False):
                                segment_audio = generate_audio(
                                    segment,
                                    history_prompt=TAIWANESE_MOM_PROMPT
                                )
                        
                        audio_arrays.append(segment_audio)
                        
                        # 短暫暫停，避免過度使用 GPU
                        if j < len(segments) - 1:
                            time.sleep(0.5)
                    
                    # 合併所有音頻段落
                    if len(audio_arrays) > 1:
                        combined_audio = np.concatenate(audio_arrays)
                    else:
                        combined_audio = audio_arrays[0]
                    
                    # 保存語音文件
                    write_wav(output_path, SAMPLE_RATE, combined_audio)
                    
                    print(f"已保存到: {output_path}")
                    
                    # 更新 JSON 中的 audioUrl
                    item['audioUrl'] = f"/audio/{file_name}"
                    
                    # 增加計數器
                    total_processed += 1
                    
                    # 短暫暫停，避免過度使用 GPU
                    time.sleep(1)
                    
                    # 每處理 3 個音頻，清理一次 CUDA 緩存
                    if device == "cuda" and total_processed % 3 == 0:
                        torch.cuda.empty_cache()
                    
                except Exception as e:
                    print(f"生成語音時出錯: {e}")
                    print(f"詳細錯誤: {type(e).__name__}: {str(e)}")
                    import traceback
                    traceback.print_exc()
        
        # 保存更新後的 JSON
        updated_output_file = script_dir / "../../lib/dialogue_answers_with_audio.json"
        with open(updated_output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"\n處理完成！")
        print(f"總共生成了 {total_processed} 個語音文件")
        print(f"更新後的 JSON 已保存到 {updated_output_file}")
        
    except Exception as e:
        print(f"錯誤：{e}")
        print(f"詳細錯誤: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
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