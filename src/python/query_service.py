import sys
import json
from embedding_service import load_index, query_index
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.core import Settings

# 设置嵌入模型
embed_model = HuggingFaceEmbedding(
    model_name="BAAI/bge-m3",
    embed_batch_size=10
)
Settings.embed_model = embed_model

# 主函数
def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No query provided"}))
        sys.exit(1)
    
    query = sys.argv[1]
    
    try:
        # 加载索引
        index = load_index("../../lib/faiss_index")
        
        # 查询
        results = query_index(index, query, top_k=5)
        
        # 格式化结果
        formatted_results = []
        for result in results:
            formatted_results.append({
                "score": result["score"],
                "metadata": result["metadata"]
            })
        
        # 输出 JSON 结果
        print(json.dumps(formatted_results))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main() 