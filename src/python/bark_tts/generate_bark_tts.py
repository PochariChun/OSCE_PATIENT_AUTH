#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
使用 Bark 模型为 dialogue_answers.json 中的每个回答生成语音
并将结果保存到 /audio 目录
"""

import json
import os
import sys
import time
import argparse
from pathlib import Path
import torch
import numpy as np
from scipy.io.wavfile import write as write_wav
from tqdm import tqdm

# 检查 CUDA 是否可用
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"使用设备: {device}")

# 模型信息
MODEL_ID = "suno/bark"
SAMPLE_RATE = 24000  # Bark 的采样率

def download_model():
    """
    下载并加载 Bark 模型
    """
    try:
        from transformers import AutoProcessor, BarkModel
        
        print(f"正在加载 {MODEL_ID} 模型...")
        processor = AutoProcessor.from_pretrained(MODEL_ID)
        model = BarkModel.from_pretrained(MODEL_ID).to(device)
        
        return model, processor
    except Exception as e:
        print(f"加载模型失败: {e}")
        print("\n请确保已安装必要的依赖:")
        print("pip install transformers torch scipy tqdm")
        sys.exit(1)

def generate_audio(text, model, processor, voice_preset="v2/zh_female"):
    """
    使用 Bark 生成语音
    
    Args:
        text: 要转换为语音的文本
        model: 加载的模型
        processor: 文本处理器
        voice_preset: 语音预设
    
    Returns:
        生成的音频数组
    """
    try:
        # 准备输入
        inputs = processor(
            text=text,
            voice_preset=voice_preset,
            return_tensors="pt"
        ).to(device)
        
        # 生成音频
        with torch.no_grad():
            output = model.generate(**inputs)
        
        # 转换为 numpy 数组
        audio = output.cpu().numpy().squeeze()
        
        return audio
    except Exception as e:
        print(f"生成音频失败: {e}")
        import traceback
        traceback.print_exc()
        return None

def generate_audio_for_answers(limit=5):
    """
    为 dialogue_answers.json 中的回答生成语音
    
    Args:
        limit: 每个类别处理的最大回答数量
    """
    # 获取脚本所在目录
    script_dir = Path(os.path.dirname(os.path.abspath(__file__))).resolve()
    
    # 构建输入和输出目录
    input_file = script_dir / "../../lib/dialogue_answers.json"
    output_dir = Path("audio")  # 直接保存到项目根目录下的 audio 文件夹
    
    # 确保输出目录存在
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # 检查输入文件是否存在
    if not input_file.exists():
        print(f"错误：找不到输入文件 {input_file}")
        # 尝试查找可能的位置
        possible_locations = [
            script_dir / "../../lib/dialogue_answers.json",
            script_dir / "../../../lib/dialogue_answers.json",
            Path(os.getcwd()) / "lib/dialogue_answers.json",
            Path(os.getcwd()) / "src/lib/dialogue_answers.json"
        ]
        for loc in possible_locations:
            if loc.exists():
                print(f"找到可能的数据文件位置：{loc}")
                input_file = loc
                break
        else:
            print("无法找到数据文件，请确保 dialogue_answers.json 存在")
            sys.exit(1)
    
    # 读取 JSON 文件
    print(f"正在读取 {input_file}...")
    
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # 加载模型
        model, processor = download_model()
        
        # 处理计数器
        total_processed = 0
        
        # 遍历每个类别的回答
        for category, answers in data['categories'].items():
            print(f"\n处理类别: {category}")
            
            # 限制每个类别处理的数量
            category_answers = answers[:limit]
            
            for i, item in enumerate(category_answers):
                answer = item['answer']
                
                # 为回答生成唯一的文件名
                file_name = f"{category}_{i+1}_{hash(answer) % 10000:04d}.wav"
                output_path = output_dir / file_name
                
                # 如果文件已存在，跳过
                if output_path.exists():
                    print(f"跳过已存在的文件: {file_name}")
                    # 更新 JSON 中的 audioUrl
                    item['audioUrl'] = f"/audio/{file_name}"
                    continue
                
                print(f"生成语音 ({i+1}/{len(category_answers)}): {answer[:30]}...")
                
                try:
                    # 选择合适的语音预设
                    voice_preset = "v2/zh_female"
                    
                    # 生成音频
                    audio = generate_audio(
                        answer, 
                        model, 
                        processor, 
                        voice_preset=voice_preset
                    )
                    
                    if audio is not None:
                        # 保存音频文件
                        write_wav(output_path, SAMPLE_RATE, audio)
                        print(f"已保存到: {output_path}")
                        
                        # 更新 JSON 中的 audioUrl
                        item['audioUrl'] = f"/audio/{file_name}"
                        
                        # 增加计数器
                        total_processed += 1
                    
                    # 短暂暂停，避免过度使用 GPU
                    time.sleep(0.5)
                    
                    # 每处理 3 个音频，清理一次 CUDA 缓存
                    if device == "cuda" and total_processed % 3 == 0:
                        torch.cuda.empty_cache()
                    
                except Exception as e:
                    print(f"生成语音时出错: {e}")
                    print(f"详细错误: {type(e).__name__}: {str(e)}")
                    import traceback
                    traceback.print_exc()
        
        # 保存更新后的 JSON
        updated_output_file = script_dir / "../../lib/dialogue_answers_with_audio.json"
        with open(updated_output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"\n处理完成！")
        print(f"总共生成了 {total_processed} 个语音文件")
        print(f"更新后的 JSON 已保存到 {updated_output_file}")
        
    except Exception as e:
        print(f"错误：{e}")
        print(f"详细错误: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

def install_dependencies():
    """安装必要的依赖"""
    try:
        import importlib.util
        
        # 检查必要的包是否已安装
        required_packages = ['torch', 'transformers', 'scipy', 'tqdm']
        missing_packages = []
        
        for package in required_packages:
            if importlib.util.find_spec(package) is None:
                missing_packages.append(package)
        
        # 安装缺失的包
        if missing_packages:
            print(f"正在安装缺失的依赖: {', '.join(missing_packages)}")
            import subprocess
            subprocess.check_call([sys.executable, "-m", "pip", "install"] + missing_packages)
            print("依赖安装完成")
    except Exception as e:
        print(f"安装依赖失败: {e}")
        sys.exit(1)

if __name__ == "__main__":
    # 安装依赖
    install_dependencies()
    
    # 解析命令行参数
    parser = argparse.ArgumentParser(description='使用 Bark 生成语音')
    parser.add_argument('--limit', type=int, default=5, help='每个类别处理的最大回答数量')
    args = parser.parse_args()
    
    print(f"每个类别将处理最多 {args.limit} 个回答")
    generate_audio_for_answers(args.limit) 