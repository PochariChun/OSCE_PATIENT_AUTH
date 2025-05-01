from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sys

# 修改導入方式，避免每次都檢查依賴
sys.dont_write_bytecode = True  # 避免生成 .pyc 文件

# 添加父目錄到路徑
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 直接導入所需函數，跳過依賴檢查
from embedding.simple_embedding_service import load_index, query_index

app = Flask(__name__)
CORS(app)  # 允許跨域請求

# 加載索引
script_dir = os.path.dirname(os.path.abspath(__file__))
index_dir = os.path.join(script_dir, "../../../lib/faiss_index")

print(f"正在加載索引：{index_dir}")
try:
    index, doc_map, documents = load_index(index_dir)
    print("索引加載成功")
except Exception as e:
    print(f"索引加載失敗: {str(e)}")
    print("請先運行 simple_embedding_service.py --rebuild-index 創建索引")
    sys.exit(1)

@app.route('/query', methods=['POST'])
def query():
    data = request.json
    query_text = data.get('query', '')
    top_k = data.get('top_k', 3)
    
    if not query_text:
        return jsonify({"error": "查詢文本不能為空"}), 400
    
    results = query_index(index, doc_map, documents, query_text, top_k=top_k)
    
    # 格式化結果
    formatted_results = []
    for result in results:
        formatted_results.append({
            "score": float(result['score']),
            "question": result['metadata']['question'],
            "answer": result['metadata']['answer'],
            "tags": result['metadata'].get('tags', []),
            "code": result['metadata'].get('code', None),
            "answerType": result['metadata'].get('answerType', 'dialogue'),  # 提供默認值
            # 可選字段
            "imageToShow": result['metadata'].get('imageToShow', None),
            "audioUrl": result['metadata'].get('audioUrl', None)
        })
    
    return jsonify({"results": formatted_results})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True) 