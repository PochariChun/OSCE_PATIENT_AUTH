import sys
import json
import jieba
import re
import opencc
from simple_embedding_service import load_index, query_index, clean_text

# 添加繁簡轉換器
cc_t2s = opencc.OpenCC('t2s')  # 繁體轉簡體
cc_s2t = opencc.OpenCC('s2t')  # 簡體轉繁體

# 添加上下文處理，支持繁體中文
def process_with_context(query, history=None):
    # 如果沒有歷史記錄，直接處理查詢
    if not history or len(history) == 0:
        return query
    
    # 提取最近的對話歷史
    recent_history = history[-3:] if len(history) > 3 else history
    
    # 檢查是否有指代詞
    pronouns = ['這個', '那個', '它', '他', '她', '這', '那', '其', '這些', '那些']
    has_pronoun = any(p in query for p in pronouns)
    
    if has_pronoun:
        # 嘗試從歷史記錄中解析指代
        context = ' '.join([msg['content'] for msg in recent_history if msg['role'] == 'user'])
        
        # 提取關鍵實體
        entities = extract_entities(context)
        
        # 替換查詢中的指代詞
        for pronoun in pronouns:
            if pronoun in query and entities:
                # 用最相關的實體替換指代詞
                query = query.replace(pronoun, entities[0])
                break
    
    # 檢查是否有省略
    if len(query) < 10 and recent_history:
        # 如果查詢很短，可能是省略了上下文
        last_user_msg = next((msg['content'] for msg in reversed(recent_history) if msg['role'] == 'user'), None)
        if last_user_msg:
            # 提取上一個用戶消息的關鍵詞
            last_keywords = extract_keywords_from_text(last_user_msg)
            current_keywords = extract_keywords_from_text(query)
            
            # 如果當前查詢沒有包含上一個消息的關鍵詞，添加上下文
            missing_keywords = [k for k in last_keywords if k not in current_keywords]
            if missing_keywords and len(missing_keywords) <= 2:
                expanded_query = f"{query}，關於{' '.join(missing_keywords)}"
                return expanded_query
    
    return query

# 提取實體，支持繁體中文
def extract_entities(text):
    # 轉換為簡體以便更好地分詞
    simplified_text = cc_t2s.convert(text)
    words = list(jieba.cut(simplified_text))
    
    # 將分詞結果轉回繁體
    traditional_words = [cc_s2t.convert(w) for w in words]
    entities = []
    
    # 醫療相關的關鍵詞 (繁體中文)
    medical_keywords = ['發燒', '腹瀉', '嘔吐', '頭痛', '咳嗽', '感冒', 
                        '肚子', '疼痛', '不適', '症狀', '藥物', '治療']
    
    # 提取可能的實體
    i = 0
    while i < len(traditional_words):
        # 檢查是否是醫療關鍵詞
        if traditional_words[i] in medical_keywords:
            if i > 0 and len(traditional_words[i-1]) > 1:  # 前面有可能的修飾詞
                entities.append(traditional_words[i-1] + traditional_words[i])
            entities.append(traditional_words[i])
        # 檢查是否是名詞短語
        elif i < len(traditional_words) - 1 and len(traditional_words[i]) > 1 and len(traditional_words[i+1]) > 1:
            entities.append(traditional_words[i] + traditional_words[i+1])
        i += 1
    
    return entities

# 從文本中提取關鍵詞
def extract_keywords_from_text(text):
    # 轉換為簡體以便使用 jieba
    simplified_text = cc_t2s.convert(text)
    
    # 使用 jieba 的 TF-IDF 提取關鍵詞
    import jieba.analyse
    keywords = jieba.analyse.extract_tags(simplified_text, topK=3)
    
    # 將關鍵詞轉回繁體
    traditional_keywords = [cc_s2t.convert(k) for k in keywords]
    
    return traditional_keywords

# 主函數
def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "未提供查詢"}))
        sys.exit(1)
    
    query = sys.argv[1]
    history = None
    
    # 檢查是否提供了歷史記錄
    if len(sys.argv) > 2:
        try:
            history = json.loads(sys.argv[2])
        except:
            pass
    
    try:
        # 預處理查詢
        processed_query = clean_text(query)
        
        # 上下文處理
        if history:
            processed_query = process_with_context(processed_query, history)
            print(f"處理後的查詢: {processed_query}")
        
        # 加載索引
        index, doc_map, documents = load_index("../../lib/faiss_index")
        
        # 查詢
        results = query_index(index, doc_map, documents, processed_query, top_k=5)
        
        # 將結果轉換為繁體中文
        for result in results:
            if 'metadata' in result and 'answer' in result['metadata']:
                # 確保答案是繁體中文
                if not is_traditional_chinese(result['metadata']['answer']):
                    result['metadata']['answer'] = cc_s2t.convert(result['metadata']['answer'])
        
        # 輸出 JSON 結果
        print(json.dumps(results, ensure_ascii=False))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

# 檢查文本是否為繁體中文
def is_traditional_chinese(text):
    # 簡單檢查：如果轉換為簡體後與原文不同，則可能是繁體
    return cc_t2s.convert(text) != text

if __name__ == "__main__":
    main() 