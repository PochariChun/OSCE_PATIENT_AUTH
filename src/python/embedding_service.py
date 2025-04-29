from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, Document
from llama_index.core import Settings
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.vector_stores.faiss import FaissVectorStore
import faiss
import json
import os
import numpy as np

# 加载 BGE-M3 嵌入模型
embed_model = HuggingFaceEmbedding(
    model_name="BAAI/bge-m3",
    embed_batch_size=10
)

# 设置全局设置
Settings.embed_model = embed_model

# 从 JSONL 文件加载数据
def load_data_from_jsonl(file_path):
    documents = []
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            if line.strip() and not line.strip().startswith('//'):
                try:
                    data = json.loads(line)
                    # 创建文档
                    doc_text = f"问题: {data['question']}\n回答: {data['answer']}"
                    if 'variants' in data and data['variants']:
                        variants_text = "\n变体: " + ", ".join(data['variants'])
                        doc_text += variants_text
                    if 'tags' in data and data['tags']:
                        tags_text = "\n标签: " + ", ".join(data['tags'])
                        doc_text += tags_text
                    
                    doc = Document(text=doc_text, metadata=data)
                    documents.append(doc)
                except json.JSONDecodeError:
                    continue
    return documents

# 创建索引
def create_index(documents):
    # 创建 FAISS 索引
    dimension = 1024  # BGE-M3 的维度
    faiss_index = faiss.IndexFlatL2(dimension)
    vector_store = FaissVectorStore(faiss_index=faiss_index)
    
    # 创建索引
    index = VectorStoreIndex.from_documents(
        documents,
        vector_store=vector_store
    )
    
    return index

# 查询
def query_index(index, query_text, top_k=5):
    query_engine = index.as_query_engine(similarity_top_k=top_k)
    response = query_engine.query(query_text)
    
    results = []
    for node in response.source_nodes:
        results.append({
            "text": node.node.text,
            "score": node.score,
            "metadata": node.node.metadata
        })
    
    return results

# 保存索引
def save_index(index, path):
    index.storage_context.persist(persist_dir=path)

# 加载索引
def load_index(path):
    from llama_index.core import StorageContext, load_index_from_storage
    
    # 加载索引
    storage_context = StorageContext.from_defaults(persist_dir=path)
    index = load_index_from_storage(storage_context)
    
    return index

# 主函数
if __name__ == "__main__":
    # 加载数据
    data_path = "../../lib/rag_lookup_data.jsonl"
    documents = load_data_from_jsonl(data_path)
    
    # 创建索引
    index = create_index(documents)
    
    # 保存索引
    save_index(index, "../../lib/faiss_index")
    
    # 测试查询
    results = query_index(index, "小威的妈妈你好", top_k=3)
    for result in results:
        print(f"Score: {result['score']}")
        print(f"Text: {result['text']}")
        print("---") 