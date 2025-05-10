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
index_dir = os.path.join(script_dir, "../../lib/faiss_index")

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
    top_k = data.get('top_k', 5)  # 預設為 5
    previous_tag = data.get('previous_tag', None)
    
    if not query_text:
        return jsonify({"error": "查詢文本不能為空"}), 400

    results = query_index(index, doc_map, documents, query_text, top_k=top_k + 5)  # 先多取一些以便排序

    formatted_results = []

    def is_upper_alpha(c):
        return isinstance(c, str) and len(c) == 1 and 'A' <= c <= 'Z'

    if previous_tag and is_upper_alpha(previous_tag):
        weighted_results = []
        for result in results:
            metadata = result['metadata']
            current_tag = metadata.get('tag', '')
            original_score = float(result['score'])

            # 預設不加分
            weighted_score = original_score
            if not previous_tag or previous_tag == '':
                # 沒有 previous_tag 時，A 或 B 給滿分，其餘 0.95
                if current_tag in ('A', 'B'):
                    weighted_score = 1.0
                else:
                    weighted_score = 0.95
            elif current_tag == previous_tag:
                weighted_score = original_score * 0.8 + 0.05
            elif is_upper_alpha(current_tag) and current_tag > previous_tag:
                weighted_score = original_score * 0.8 + 0.0495
            else:
                weighted_score = original_score * 0.8 + 0.04



            weighted_results.append({
                "answer": metadata['answer'],
                "question": metadata['question'],
                "score": weighted_score,
                "tags": current_tag,
                "code": metadata.get('code'),
                "answerType": metadata.get('answerType', 'dialogue'),
                "imageToShow": metadata.get('imageToShow'),
                "audioUrl": metadata.get('audioUrl'),
            })

        # 依照加分後分數排序
        weighted_results.sort(key=lambda x: x['score'], reverse=True)
        formatted_results = weighted_results[:top_k]

    else:
        # 無前一標籤 → 不加權
        for result in results[:top_k]:
            metadata = result['metadata']
            formatted_results.append({
                "score": float(result['score']),
                "question": metadata['question'],
                "answer": metadata['answer'],
                "tags": metadata.get('tag', []),
                "code": metadata.get('code'),
                "answerType": metadata.get('answerType', 'dialogue'),
                "imageToShow": metadata.get('imageToShow'),
                "audioUrl": metadata.get('audioUrl'),
            })

    return jsonify({"results": formatted_results})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True) 