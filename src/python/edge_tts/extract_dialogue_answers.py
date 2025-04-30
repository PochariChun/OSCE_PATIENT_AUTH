import json
import asyncio
from generate_edge_tts_audio import process_dialogue_answers

async def extract_and_generate_audio():
    """从RAG查询数据中提取对话答案并生成音频"""
    # 读取RAG查询数据
    with open('src/lib/rag_lookup_data.jsonl', 'r', encoding='utf-8') as f:
        rag_data = [json.loads(line) for line in f]
    
    # 提取对话答案
    dialogue_answers = []
    for item in rag_data:
        if "query" in item and "answer" in item:
            dialogue_answers.append({
                "question": item["query"],
                "answer": item["answer"]
            })
    
    # 保存对话答案到临时文件
    temp_file = "temp_dialogue_answers.json"
    with open(temp_file, 'w', encoding='utf-8') as f:
        json.dump(dialogue_answers, f, ensure_ascii=False, indent=2)
    
    # 处理对话答案并添加音频
    output_file = "src/lib/dialogue_answers_with_audio.json"
    await process_dialogue_answers(temp_file, output_file, voice="zh-CN-XiaoxiaoNeural")
    
    print(f"已提取 {len(dialogue_answers)} 个对话答案并生成音频")

if __name__ == "__main__":
    asyncio.run(extract_and_generate_audio()) 