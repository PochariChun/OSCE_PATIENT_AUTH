import sys
import os
from simple_embedding_service import load_index, query_index

# 獲取索引路徑
script_dir = os.path.dirname(os.path.abspath(__file__))
index_dir = os.path.join(script_dir, "../../lib/faiss_index")

# 檢查索引是否存在
if not os.path.exists(index_dir):
    print(f"錯誤：找不到索引目錄 {index_dir}")
    sys.exit(1)

# 加載索引
print(f"正在加載索引：{index_dir}")
index, doc_map, documents = load_index(index_dir)
print("索引加載成功")

# 進行交互式查詢
while True:
    query = input("\n請輸入您的問題 (輸入'q'退出): ")
    if query.lower() == 'q':
        break
    
    print("\n正在搜索相關回答...")
    results = query_index(index, doc_map, documents, query, top_k=3)
    
    if not results:
        print("未找到相關回答")
    else:
        print("\n找到以下相關回答：")
        for i, result in enumerate(results, 1):
            print(f"\n--- 結果 {i} (相似度: {result['score']:.4f}) ---")
            print(f"問題: {result['metadata']['question']}")
            print(f"回答: {result['metadata']['answer']}") 