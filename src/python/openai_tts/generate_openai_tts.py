#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
使用 OpenAI TTS API 為 dialogue_answers.json 中的每個回答生成台灣女生口音的語音
"""

import json
import os
import sys
import time
import requests
from pathlib import Path
import tempfile

# OpenAI API 設置
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")  # 從環境變量獲取 API 密鑰

# 台灣女生的語音設置
VOICE_ID = "nova"  # OpenAI 的女聲選項: alloy, echo, fable, onyx, nova, shimmer

def generate_audio_with_openai_tts(text, output_path, voice_id=VOICE_ID):
    """
    使用 OpenAI TTS API 生成語音
    
    Args:
        text: 要轉換為語音的文本
        output_path: 輸出音頻文件的路徑
        voice_id: 語音 ID
    
    Returns:
        成功返回 True，失敗返回 False
    """
    try:
        # 檢查 API 密鑰
        if not OPENAI_API_KEY:
            print("錯誤: 未設置 OPENAI_API_KEY 環境變量")
            return False
        
        # 設置 API 請求
        url = "https://api.openai.com/v1/audio/speech"
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        data = {
            "model": "tts-1",
            "input": text,
            "voice": voice_id
        }
        
        # 發送請求
        print(f"正在使用 OpenAI TTS API 生成語音...")
        response = requests.post(url, headers=headers, json=data)
        
        # 檢查響應
        if response.status_code != 200:
            print(f"錯誤: API 請求失敗: {response.status_code} {response.text}")
            return False
        
        # 保存音頻文件
        with open(output_path, "wb") as f:
            f.write(response.content)
        
        print(f"已保存到: {output_path}")
        return True
    
    except Exception as e:
        print(f"生成語音失敗: {e}")
        import traceback
        traceback.print_exc()
        return False

def generate_audio_for_answers(limit=5):
    """
    為 dialogue_answers.json 中的每個回答生成語音
    
    Args:
        limit: 每個類別處理的最大數量
    """
    # 獲取腳本目錄
    script_dir = Path(__file__).resolve().parent
    
    # 創建輸出目錄
    output_dir = script_dir / "../../public/audio"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # 查找 dialogue_answers.json
    input_file = script_dir / "../../lib/dialogue_answers.json"
    
    # 如果找不到，嘗試其他可能的位置
    if not input_file.exists():
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
    
    # 檢查 API 密鑰
    if not OPENAI_API_KEY:
        print("錯誤: 未設置 OPENAI_API_KEY 環境變量")
        print("請設置環境變量: export OPENAI_API_KEY='您的API密鑰'")
        sys.exit(1)
    
    # 讀取 JSON 文件
    print(f"正在讀取 {input_file}...")
    
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
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
                file_name = f"{category}_{i+1}_{hash(answer) % 10000:04d}.mp3"
                output_path = output_dir / file_name
                
                # 如果文件已存在，跳過
                if output_path.exists():
                    print(f"跳過已存在的文件: {file_name}")
                    # 更新 JSON 中的 audioUrl
                    item['audioUrl'] = f"/audio/{file_name}"
                    continue
                
                print(f"生成語音 ({i+1}/{len(category_answers)}): {answer[:30]}...")
                
                try:
                    # 生成音頻
                    success = generate_audio_with_openai_tts(answer, output_path)
                    
                    if not success:
                        print("生成失敗，跳過此回答")
                        continue
                    
                    # 更新 JSON 中的 audioUrl
                    item['audioUrl'] = f"/audio/{file_name}"
                    
                    # 增加計數器
                    total_processed += 1
                    
                    # 短暫暫停，避免 API 限制
                    time.sleep(1)
                    
                except Exception as e:
                    print(f"生成語音時出錯: {e}")
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