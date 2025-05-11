# src/python/embedding/completed_embedded_file.py
"""
用法
python src/python/embedding/completed_embedded_file.py --data-path src/lib/rag_lookup_data_cleaned.jsonl --output-index src/lib/faiss_index
python src/python/embedding/completed_embedded_file.py --rebuild-index
"""

"""
query →
text2vec → FAISS Top-K → E5 rerank → 回傳

用 text2vec-large-chinese 生成基礎嵌入（快又好）

用 e5-large 對 top-K 做 rerank（更準確）

"""
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

# 載入模型
text2vec_model = SentenceTransformer("shibing624/text2vec-large-chinese")
e5_model = SentenceTransformer("intfloat/multilingual-e5-large")

# 基礎查詢前處理
def normalize_query(query):
    return re.sub(r"(嗎|嘛)?[？?]?$", "", query.strip())

# 初步篩選 top-k（使用 text2vec）
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
            results.append({"doc_idx": doc_idx, "score": float(scores[0][i]), "metadata": doc})
    return results

# rerank（使用 E5）
def rerank_top_k_with_e5(query, candidates):
    e5_query = f"query: {query}"
    e5_passages = [f"passage: {item['metadata']['question']}" for item in candidates]

    query_emb = e5_model.encode([e5_query], normalize_embeddings=True)
    passage_embs = e5_model.encode(e5_passages, normalize_embeddings=True)

    sims = cosine_similarity(query_emb, passage_embs)[0]
    reranked = sorted(zip(sims, candidates), key=lambda x: x[0], reverse=True)

    # 附加 final_score
    for sim, item in reranked:
        item['rerank_score'] = float(sim)
    return [item for _, item in reranked]

# 完整查詢流程
def semantic_query_with_rerank(query, index, doc_map, documents, top_k=10, return_k=3):
    candidates = get_top_k_candidates(query, index, doc_map, documents, k=top_k)
    reranked = rerank_top_k_with_e5(query, candidates)
    return reranked[:return_k]


if args.interactive:
    print("\n進入交互式查詢模式，輸入 'q' 離開")
    while True:
        query = input("\n請輸入問題：")
        if query.lower() == "q":
            break
        results = semantic_query_with_rerank(query, index, doc_map, documents)
        for i, result in enumerate(results, 1):
            print(f"\n--- 結果 {i} ---")
            print(f"問題: {result['metadata']['question']}")
            print(f"回答: {result['metadata']['answer']}")
            print(f"得分: text2vec={result['score']:.4f}, rerank={result['rerank_score']:.4f}")
