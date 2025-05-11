# semantic_rerank_query.py
"""
（e5-large + FAISS）
結合 text2vec + FAISS + multilingual-e5 rerank 的查詢模組

- 模型精度	          較慢但對句間語意辨別較強
                    使用 e5-large 作查詢比對
                    較慢但較準確

- 設計: 結合 text2vec + FAISS + multilingual-e5 rerank 的查詢

- 使用方式：
    from semantic_rerank_query import semantic_query_with_rerank
    results = semantic_query_with_rerank(query, index, doc_map, documents)
"""

import re
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

# 載入模型（text2vec for indexing + multilingual-e5 for rerank）
text2vec_model = SentenceTransformer("shibing624/text2vec-large-chinese")
e5_model = SentenceTransformer("intfloat/multilingual-e5-large")

# 文本清洗與標準化
def clean_text(text):
    return re.sub(r'\s+', ' ', text.strip())

def normalize_query(query):
    return re.sub(r"(嗎|嘛)?[？?]?$", "", query.strip())

# 基礎 text2vec 嵌入 + FAISS 初篩

def get_top_k_candidates(query, index, doc_map, documents, k=10):
    query = clean_text(normalize_query(query))
    query_vec = text2vec_model.encode([query], normalize_embeddings=True)
    scores, indices = index.search(query_vec, k)

    results = []
    for i in range(len(indices[0])):
        idx = indices[0][i]
        if idx >= 0 and idx < len(doc_map):
            doc_idx = doc_map[idx]
            doc = documents[doc_idx]
            results.append({
                "doc_idx": doc_idx,
                "score": float(scores[0][i]),
                "metadata": doc
            })
    return results

# 使用 E5 模型 rerank

def rerank_top_k_with_e5(query, candidates):
    e5_query = f"query: {query}"
    e5_passages = [f"passage: {item['metadata']['question']}" for item in candidates]

    query_emb = e5_model.encode([e5_query], normalize_embeddings=True)
    passage_embs = e5_model.encode(e5_passages, normalize_embeddings=True)

    sims = cosine_similarity(query_emb, passage_embs)[0]
    reranked = sorted(zip(sims, candidates), key=lambda x: x[0], reverse=True)

    for sim, item in reranked:
        item['rerank_score'] = float(sim)
    return [item for _, item in reranked]

# 查詢主流程

def semantic_query_with_rerank(query, index, doc_map, documents, top_k=10, return_k=3):
    candidates = get_top_k_candidates(query, index, doc_map, documents, k=top_k)
    reranked = rerank_top_k_with_e5(query, candidates)
    return reranked[:return_k]
