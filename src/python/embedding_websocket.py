import asyncio
import websockets
import json
import os
import sys

# 直接導入所需函數，跳過依賴檢查
from simple_embedding_service import load_index, query_index

# 加載索引
script_dir = os.path.dirname(os.path.abspath(__file__))
index_dir = os.path.join(script_dir, "../../lib/faiss_index")

try:
    print(f"正在加載索引：{index_dir}")
    index, doc_map, documents = load_index(index_dir)
    print("索引加載成功")
except Exception as e:
    print(f"索引加載失敗: {str(e)}")
    print("請先運行 simple_embedding_service.py --rebuild-index 創建索引")
    sys.exit(1)

async def handle_query(websocket, path):
    async for message in websocket:
        try:
            data = json.loads(message)
            query_text = data.get('query', '')
            top_k = data.get('top_k', 3)
            
            if not query_text:
                await websocket.send(json.dumps({"error": "查詢文本不能為空"}))
                continue
            
            results = query_index(index, doc_map, documents, query_text, top_k=top_k)
            
            # 格式化結果
            formatted_results = []
            for result in results:
                formatted_results.append({
                    "score": float(result['score']),
                    "question": result['metadata']['question'],
                    "answer": result['metadata']['answer']
                })
            
            await websocket.send(json.dumps({"results": formatted_results}))
        except Exception as e:
            await websocket.send(json.dumps({"error": str(e)}))

start_server = websockets.serve(handle_query, "0.0.0.0", 8765)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever() 