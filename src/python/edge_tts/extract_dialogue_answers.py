#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# src/python/edge_tts/extract_dialogue_answers.py
"""
提取 rag_lookup_data.jsonl 中的對話型回答
將所有 answerType 不為 "narration" 或沒有 answerType 的回答提取出來
並將結果保存到 lib 目錄下
"""

import json
import os
import sys
from collections import defaultdict

def extract_dialogue_answers():
    # 獲取腳本所在目錄
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 構建輸入和輸出文件路徑
    input_file = os.path.join(script_dir, "../../lib/rag_lookup_data_cleaned.jsonl")
    output_file = os.path.join(script_dir, "../../lib/dialogue_answers.json")
    
    # 檢查輸入文件是否存在
    if not os.path.exists(input_file):
        print(f"錯誤：找不到輸入文件 {input_file}")
        sys.exit(1)
    
    # 讀取 JSONL 文件
    print(f"正在讀取 {input_file}...")
    
    # 用於存儲唯一回答
    unique_answers = set()
    
    # 用於按類別分組的回答
    categorized_answers = defaultdict(list)
    
    # 計數器
    total_items = 0
    dialogue_items = 0
    
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                
                # 跳過空行和註釋行
                if not line or line.startswith('//'):
                    continue
                
                total_items += 1
                
                # 解析 JSON
                try:
                    item = json.loads(line)
                    
                    # 檢查是否有 answer 字段
                    if 'answer' not in item:
                        continue
                    
                    answer = item['answer']
                    answer_type = item.get('answerType', '')
                    
                    # 檢查 answerType 是否不為 "narration" 或沒有 answerType
                    if answer_type != 'narration':
                        # 如果回答不在唯一回答集中，則添加
                        if answer not in unique_answers:
                            unique_answers.add(answer)
                            
                            # 獲取標籤（如果有）
                            tags = item.get('tags', [])
                            
                            # 確定分類
                            category = 'general'
                            if tags:
                                if '病情詢問' in tags:
                                    category = 'condition'
                                elif '家屬溝通' in tags:
                                    category = 'family'
                                elif '護理指導' in tags:
                                    category = 'instruction'
                            
                            # 添加到分類字典
                            categorized_answers[category].append({
                                'answer': answer,
                                'tags': tags,
                                'question': item.get('question', '')
                            })
                            
                            dialogue_items += 1
                    
                except json.JSONDecodeError as e:
                    print(f"警告：無法解析行 '{line[:50]}...'：{e}")
                    continue
        
        # 將結果保存到輸出文件
        result = {
            'total': dialogue_items,
            'categories': {
                'condition': categorized_answers['condition'],
                'family': categorized_answers['family'],
                'instruction': categorized_answers['instruction'],
                'general': categorized_answers['general']
            }
        }
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        
        print(f"處理完成！")
        print(f"總共處理了 {total_items} 個項目")
        print(f"提取了 {dialogue_items} 個對話型回答")
        print(f"結果已保存到 {output_file}")
        
        # 打印每個類別的數量
        for category, items in categorized_answers.items():
            print(f"類別 '{category}': {len(items)} 個回答")
        
    except Exception as e:
        print(f"錯誤：{e}")
        sys.exit(1)

if __name__ == "__main__":
    extract_dialogue_answers() 