import os
import json
import argparse
import asyncio
import subprocess
from pathlib import Path

async def generate_audio_for_answer(ref_audio, ref_text, answer, question, output_dir):
    """
    为单个回答生成音频文件
    
    参数:
        ref_audio (str): 参考音频文件路径
        ref_text (str): 参考音频的文本内容
        answer (str): 回答文本
        question (str): 问题文本，用于命名文件
        output_dir (str): 输出目录
    
    返回:
        str: 生成的音频文件路径
    """
    # 清理文件名，移除不允许的字符
    safe_question = "".join(c for c in question if c.isalnum() or c in " _-").strip()
    safe_question = safe_question[:50]  # 限制文件名长度
    
    output_file = os.path.join(output_dir, f"{safe_question}.wav")
    
    # 调用 F5-TTS 命令行工具
    cmd = [
        "f5-tts_infer-cli",
        "--model", "F5TTS_v1_Base",
        "--ref_audio", ref_audio,
        "--ref_text", ref_text,
        "--gen_text", answer,
        "--output", output_file
    ]
    
    process = subprocess.run(cmd, capture_output=True, text=True)
    
    if process.returncode != 0:
        print(f"错误: {process.stderr}")
        return None
    
    return output_file

async def process_dialogue_answers(input_file, output_dir, ref_audio, ref_text):
    """
    处理所有对话答案并生成音频
    """
    # 确保输出目录存在
    os.makedirs(output_dir, exist_ok=True)
    
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # 遍历所有类别和问题
    for category, items in data.get("categories", {}).items():
        for item in items:
            if "answer" in item and item["answer"]:
                question = item.get("question", "unknown_question")
                answer = item["answer"]
                
                print(f"处理问题: {question}")
                output_file = await generate_audio_for_answer(ref_audio, ref_text, answer, question, output_dir)
                
                if output_file:
                    # 记录结果
                    item["audio_file"] = os.path.basename(output_file)
                    print(f"已生成音频: {output_file}")
    
    # 保存更新后的数据
    output_json = os.path.join(output_dir, "dialogue_with_audio.json")
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"已更新JSON数据: {output_json}")

async def main():
    parser = argparse.ArgumentParser(description="使用 F5-TTS 生成语音")
    parser.add_argument("--ref_audio", required=True, help="参考音频文件路径")
    parser.add_argument("--ref_text", required=True, help="参考音频的文本内容")
    parser.add_argument("--input", help="输入 JSON 文件路径")
    parser.add_argument("--output_dir", default="public/audiott5", help="输出音频文件目录")
    
    args = parser.parse_args()
    
    # 确保提供了输入文件
    if not args.input:
        parser.error("必须提供 --input 参数")
    
    await process_dialogue_answers(args.input, args.output_dir, args.ref_audio, args.ref_text)

if __name__ == "__main__":
    asyncio.run(main()) 