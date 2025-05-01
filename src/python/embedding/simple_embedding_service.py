import sys
import os
import jieba
from opencc import OpenCC
import argparse

# 只在直接運行腳本時才檢查依賴
if __name__ == "__main__":
    import subprocess
    
    def check_and_install_dependencies():
        required_packages = [
            'sentence-transformers',
            'faiss-cpu',
            'jieba',
            'python-Levenshtein',
            'opencc-python-reimplemented'
        ]
        
        for package in required_packages:
            try:
                __import__(package.replace('-', '_').split('[')[0])
            except ImportError:
                print(f"正在安装 {package}...")
                subprocess.check_call([sys.executable, "-m", "pip", "install", package])
                print(f"{package} 安装成功")
    
    # 檢查並安裝依賴
    check_and_install_dependencies()

# 導入所需模塊
try:
    from sentence_transformers import SentenceTransformer
    import faiss
    import json
    import numpy as np
    import pickle
    import re
    import random
except ImportError as e:
    if __name__ == "__main__":
        print(f"錯誤：缺少必要的依賴 - {str(e)}")
        print("請運行 pip install sentence-transformers faiss-cpu jieba python-Levenshtein opencc-python-reimplemented")
        sys.exit(1)
    else:
        # 當作為模塊導入時，將錯誤傳遞給調用者
        raise

# 加载模型 - 改为 text2vec-large-chinese
try:
    print("尝试加载 text2vec-large-chinese 模型...")
    # 尝试使用环境变量中的 Hugging Face 令牌
    hf_token = os.environ.get('HF_TOKEN')
    
    if hf_token:
        print("使用环境变量中的 Hugging Face 令牌")
        model = SentenceTransformer('shibing624/text2vec-large-chinese', token=hf_token)
    else:
        # 尝试直接加载，可能使用本地缓存
        model = SentenceTransformer('shibing624/text2vec-large-chinese')
        
except Exception as e:
    print(f"加载 text2vec-large-chinese 模型失败: {str(e)}")
    print("尝试使用备用模型...")
    
    # 尝试几个备用的公开中文模型
    backup_models = [
        'paraphrase-multilingual-MiniLM-L12-v2',  # 多语言模型，支持中文
        'distiluse-base-multilingual-cased-v1',   # 另一个多语言模型
        'paraphrase-multilingual-mpnet-base-v2'   # 性能更好的多语言模型
    ]
    
    for backup_model in backup_models:
        try:
            print(f"尝试加载备用模型: {backup_model}")
            model = SentenceTransformer(backup_model)
            print(f"成功加载备用模型: {backup_model}")
            break
        except Exception as backup_error:
            print(f"加载备用模型 {backup_model} 失败: {str(backup_error)}")
    else:
        # 如果所有备用模型都失败，提供手动解决方案
        print("\n无法加载任何模型。请尝试以下解决方案:")
        print("1. 登录 Hugging Face: huggingface-cli login")
        print("2. 设置环境变量: export HF_TOKEN=你的令牌")
        print("3. 手动下载模型: git lfs install && git clone https://huggingface.co/shibing624/text2vec-large-chinese")
        print("4. 修改代码使用本地模型路径")
        sys.exit(1)

# 初始化繁簡轉換器
cc_t2s = OpenCC('t2s')  # 繁體轉簡體
cc_s2t = OpenCC('s2t')  # 簡體轉繁體

# 从 JSONL 文件加载数据
def load_data_from_jsonl(file_path):
    documents = []
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            if line.strip() and not line.strip().startswith('//'):
                try:
                    data = json.loads(line)
                    
                    # 数据清洗 - 移除多余空格和标点符号
                    data['question'] = clean_text(data['question'])
                    if 'variants' in data and data['variants']:
                        data['variants'] = [clean_text(v) for v in data['variants']]
                    
                    # 添加原始数据
                    documents.append(data)
                    
                    # 生成额外的变体 (如果没有变体字段或变体数量少于3个)
                    if 'variants' not in data or len(data['variants']) < 3:
                        additional_variants = generate_variants(data['question'])
                        if 'variants' not in data:
                            data['variants'] = []
                        data['variants'].extend([v for v in additional_variants if v not in data['variants']])
                        
                except json.JSONDecodeError:
                    continue
    return documents

# 清洗文本
def clean_text(text):
    # 移除多余空格
    text = re.sub(r'\s+', ' ', text).strip()
    # 标准化标点符号
    text = re.sub(r'[，。！？；：""''【】（）]', lambda x: {
        '，': ',', '。': '.', '！': '!', '？': '?', 
        '；': ';', '：': ':', '"': '"', '"': '"',
        ''': "'", ''': "'", '【': '[', '】': ']',
        '（': '(', '）': ')'
    }.get(x.group(), x.group()), text)
    return text

# 生成问题变体
def generate_variants(question):
    variants = []
    
    # 1. 词序变换
    words = list(jieba.cut(question))
    if len(words) > 3:
        for i in range(min(3, len(words))):
            shuffled = words.copy()
            # 保持句子开头和结尾不变，只打乱中间部分
            middle = shuffled[1:-1]
            random.shuffle(middle)
            shuffled[1:-1] = middle
            variants.append(''.join(shuffled))
    
    # 2. 同义词替换 (繁体中文版)
    synonyms = {
        '小孩': ['孩子', '小朋友', '小孩子', '兒童'],
        '媽媽': ['母親', '媽', '娘親'],
        '爸爸': ['父親', '爹地', '爸', '爹'],
        '醫生': ['醫師', '大夫', '醫者'],
        '生病': ['患病', '不舒服', '身體不適', '有病'],
        '肚子': ['腹部', '肚腹', '腹'],
        '拉肚子': ['腹瀉', '拉稀', '肚子不舒服', '腸胃炎'],
        '發燒': ['發熱', '體溫升高', '溫度高', '燒'],
        '嘔吐': ['吐', '嘔', '噁心吐', '反胃'],
        '不舒服': ['難受', '不適', '不好受', '不對勁']
    }
    
    # 添加繁简转换变体
    simplified = cc_t2s.convert(question)
    if simplified != question:
        variants.append(simplified)
    
    for word, replacements in synonyms.items():
        if word in question:
            for replacement in replacements:
                variant = question.replace(word, replacement)
                if variant != question:
                    variants.append(variant)
                    # 也添加简体版本
                    variants.append(cc_t2s.convert(variant))
    
    # 3. 添加/删除礼貌用语
    polite_prefixes = ['請問', '麻煩問一下', '不好意思', '想請教', '勞駕', '冒昧請問']
    has_polite = any(question.startswith(prefix) for prefix in polite_prefixes)
    
    if has_polite:
        # 如果已有礼貌用语，创建一个没有的变体
        for prefix in polite_prefixes:
            if question.startswith(prefix):
                variants.append(question[len(prefix):].strip())
    else:
        # 如果没有礼貌用语，添加一些
        for prefix in polite_prefixes:
            variants.append(f"{prefix}，{question}")
    
    # 返回去重后的变体
    return list(set(variants))

# 创建索引
def create_index(documents):
    # 提取问题和变体
    texts = []
    doc_map = {}
    
    for i, doc in enumerate(documents):
        # 添加主问题
        texts.append(doc['question'])
        doc_map[len(texts) - 1] = i
        
        # 添加变体问题
        if 'variants' in doc and doc['variants']:
            for variant in doc['variants']:
                texts.append(variant)
                doc_map[len(texts) - 1] = i
        
        # 添加问题和答案的组合 (可以捕获更多语义信息)
        combined_text = f"问题: {doc['question']} 回答: {doc['answer'][:100]}"
        texts.append(combined_text)
        doc_map[len(texts) - 1] = i
    
    # 创建嵌入 - 使用批处理以提高效率
    batch_size = 32
    all_embeddings = []
    
    for i in range(0, len(texts), batch_size):
        batch_texts = texts[i:i+batch_size]
        # 使用更强的编码参数
        batch_embeddings = model.encode(
            batch_texts, 
            normalize_embeddings=True,
            show_progress_bar=True,
            convert_to_numpy=True,
            batch_size=batch_size
        )
        all_embeddings.append(batch_embeddings)
    
    embeddings = np.vstack(all_embeddings)
    
    # 创建更高级的 FAISS 索引
    dimension = embeddings.shape[1]
    
    # 使用 IndexIVFFlat 以提高大规模检索效率
    if len(texts) > 1000:
        # 聚类中心数量 - 通常为数据点数量的平方根
        nlist = int(np.sqrt(len(texts)))
        quantizer = faiss.IndexFlatIP(dimension)
        index = faiss.IndexIVFFlat(quantizer, dimension, nlist, faiss.METRIC_INNER_PRODUCT)
        # 需要训练
        index.train(embeddings)
        index.add(embeddings)
        # 设置搜索时探索的聚类数
        index.nprobe = min(nlist, 10)
    else:
        # 数据量小时使用简单的 IndexFlatIP
        index = faiss.IndexFlatIP(dimension)
        index.add(embeddings)
    
    return index, doc_map, documents

# # 添加问题分类函数
# def classify_question(question):
#     # 定義不同類型的問題特徵 (繁體中文版)
#     question_types = {
#         'symptom': ['症狀', '不舒服', '難受', '疼', '痛', '發燒', '腹瀉', '嘔吐', '咳嗽', '不適'],
#         'treatment': ['治療', '吃藥', '用藥', '處理', '怎麼辦', '如何處理', '該怎麼', '醫治'],
#         'cause': ['原因', '為什麼', '怎麼會', '是不是因為', '導致', '引起'],
#         'duration': ['多久', '多長時間', '幾天', '什麼時候', '何時', '時間'],
#         'severity': ['嚴重', '危險', '需要去醫院', '需要就醫', '緊急', '嚴重性'],
#         'prevention': ['預防', '避免', '防止', '不要', '別', '如何避免'],
#         'general': ['是什麼', '介紹', '告訴我', '解釋', '說明']
#     }
    
#     # 檢查問題屬於哪些類型
#     question_classes = []
    
#     # 轉換為簡體進行匹配 (因為特徵詞可能是簡體)
#     simplified_question = cc_t2s.convert(question)
    
#     for q_type, features in question_types.items():
#         # 檢查繁體和簡體版本
#         if any(feature in question for feature in features) or any(feature in simplified_question for feature in features):
#             question_classes.append(q_type)
    
#     # 如果沒有匹配任何類型，歸為一般問題
#     if not question_classes:
#         question_classes = ['general']
    
#     return question_classes

# # 添加繁體中文醫學術語同義詞映射
# medical_synonyms = {
#     '腹瀉': ['拉肚子', '肚子不好', '大便稀', '大便次數多', '水樣便', '稀便', '腸胃炎'],
#     '嘔吐': ['吐', '噁心吐', '吐出來', '反胃', '嘔'],
#     '發熱': ['發燒', '體溫高', '溫度高', '燒', '發高燒'],
#     '腹痛': ['肚子痛', '肚子疼', '腹部疼痛', '肚子不舒服', '腹絞痛'],
#     '頭痛': ['頭疼', '腦袋痛', '腦袋疼', '偏頭痛'],
#     '咳嗽': ['咳', '乾咳', '咳痰', '咳嗽不止'],
#     '脫水': ['缺水', '水分不足', '沒有水分', '體液流失'],
#     '食慾不振': ['不想吃東西', '沒胃口', '不想吃飯', '沒有食慾'],
#     '疫苗': ['預防針', '防疫針', '接種', '預防注射'],
#     '藥物': ['藥', '藥品', '吃的藥', '服用的藥']
# }

# # 添加繁體中文症狀-疾病映射
# symptom_disease_map = {
#     '腹瀉+嘔吐+發熱': ['胃腸炎', '腸胃感染', '食物中毒'],
#     '腹瀉+嘔吐': ['胃腸功能紊亂', '消化不良'],
#     '發熱+咳嗽': ['上呼吸道感染', '感冒', '流感'],
#     '腹痛+腹瀉': ['腸炎', '腸易激綜合徵'],
#     '頭痛+發熱': ['感染', '病毒感染', '細菌感染']
# }

# 修改 query_index 函数，添加繁體中文支持
def query_index(index, doc_map, documents, query_text, top_k=5):
    # 查詢預處理
    query_text = clean_text(query_text)
    
    # 創建多種查詢變體
    query_variants = [query_text]
    
    # 添加簡體變體
    simplified_query = cc_t2s.convert(query_text)
    if simplified_query != query_text:
        query_variants.append(simplified_query)
    
    # 添加繁體變體
    traditional_query = cc_s2t.convert(query_text)
    if traditional_query != query_text:
        query_variants.append(traditional_query)
    
    # 對每個查詢變體進行嵌入和搜索
    all_results = []
    
    for query_variant in query_variants:
        # 創建查詢嵌入
        query_embedding = model.encode([query_variant], normalize_embeddings=True)
        
        # 搜索
        scores, indices = index.search(query_embedding, top_k)
        
        # 收集結果
        for i in range(len(indices[0])):
            idx = indices[0][i]
            score = scores[0][i]
            
            if idx >= 0 and idx < len(doc_map):
                doc_idx = doc_map[idx]
                doc = documents[doc_idx]
                
                # 計算額外的相似度分數
                text_similarity = calculate_text_similarity(query_text, doc['question'])
                
                # 組合分數 (嵌入相似度 + 文本相似度)
                combined_score = 0.7 * score + 0.3 * text_similarity
                
                all_results.append({
                    "doc_idx": doc_idx,
                    "score": float(combined_score),
                    "embedding_score": float(score),
                    "text_similarity": float(text_similarity),
                    "metadata": doc
                })
    
    # 去重並按分數排序
    seen_docs = set()
    final_results = []
    
    for result in sorted(all_results, key=lambda x: x["score"], reverse=True):
        if result["doc_idx"] not in seen_docs:
            seen_docs.add(result["doc_idx"])
            final_results.append(result)
            
            # 只保留前 top_k 個結果
            if len(final_results) >= top_k:
                break
    
    return final_results

# 計算文本相似度，支持繁體中文
def calculate_text_similarity(text1, text2):
    # 將兩個文本都轉換為簡體，以便更好地匹配
    simplified_text1 = cc_t2s.convert(text1)
    simplified_text2 = cc_t2s.convert(text2)
    
    # 使用 Jaccard 相似度
    set1 = set(jieba.cut(simplified_text1))
    set2 = set(jieba.cut(simplified_text2))
    
    intersection = len(set1.intersection(set2))
    union = len(set1.union(set2))
    
    if union == 0:
        return 0
    
    jaccard_sim = intersection / union
    
    # 計算編輯距離相似度
    edit_sim = calculate_edit_distance_similarity(simplified_text1, simplified_text2)
    
    # 組合兩種相似度
    return 0.7 * jaccard_sim + 0.3 * edit_sim

# 計算編輯距離相似度
def calculate_edit_distance_similarity(text1, text2):
    import Levenshtein
    
    # 計算編輯距離
    distance = Levenshtein.distance(text1, text2)
    
    # 計算相似度 (1 - 歸一化距離)
    max_len = max(len(text1), len(text2))
    if max_len == 0:
        return 1.0  # 兩個空字符串視為完全相似
    
    return 1.0 - (distance / max_len)

# 提取關鍵詞，支持繁體中文
def extract_keywords(text):
    # 轉換為簡體以便使用 jieba 的 TF-IDF
    simplified_text = cc_t2s.convert(text)
    
    # 使用 jieba 的 TF-IDF 提取關鍵詞
    import jieba.analyse
    keywords = jieba.analyse.extract_tags(simplified_text, topK=5)
    
    # 將關鍵詞轉回繁體
    traditional_keywords = [cc_s2t.convert(k) for k in keywords]
    
    return traditional_keywords

# 计算标签匹配分数
def calculate_tag_match(question_classes, tags):
    # 将标签转换为小写以进行不区分大小写的比较
    tags_lower = [tag.lower() for tag in tags]
    
    # 计算匹配的类别数量
    matches = sum(1 for qc in question_classes if any(qc in tag for tag in tags_lower))
    
    # 返回匹配比例
    return matches / len(question_classes) if question_classes else 0

# 保存索引
def save_index(index, doc_map, documents, path):
    os.makedirs(path, exist_ok=True)
    
    # 保存 FAISS 索引
    faiss.write_index(index, os.path.join(path, "faiss.index"))
    
    # 保存文档映射和文档
    with open(os.path.join(path, "doc_map.pkl"), "wb") as f:
        pickle.dump(doc_map, f)
    
    with open(os.path.join(path, "documents.pkl"), "wb") as f:
        pickle.dump(documents, f)

# 加载索引
def load_index(path):
    # 加载 FAISS 索引
    index = faiss.read_index(os.path.join(path, "faiss.index"))
    
    # 加载文档映射和文档
    with open(os.path.join(path, "doc_map.pkl"), "rb") as f:
        doc_map = pickle.load(f)
    
    with open(os.path.join(path, "documents.pkl"), "rb") as f:
        documents = pickle.load(f)
    
    return index, doc_map, documents

# 主函數
if __name__ == "__main__":
    # 創建命令行參數解析器
    parser = argparse.ArgumentParser(description='中文嵌入式問答服務')
    parser.add_argument('--query', type=str, help='要查詢的問題')
    parser.add_argument('--interactive', action='store_true', help='啟動交互式查詢模式')
    parser.add_argument('--rebuild-index', action='store_true', help='重建索引')
    parser.add_argument('--data-path', type=str, help='數據文件路徑')
    args = parser.parse_args()
    
    # 設置數據路徑
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = args.data_path if args.data_path else os.path.join(script_dir, "../../../lib/rag_lookup_data_cleaned.jsonl")
    index_dir = os.path.join(script_dir, "../../../lib/faiss_index")
    
    # 檢查數據文件是否存在
    if not os.path.exists(data_path):
        print(f"錯誤：找不到數據文件 {data_path}")
        # 嘗試查找可能的位置
        possible_locations = [
            os.path.join(script_dir, "../../../lib/rag_lookup_data_cleaned.jsonl"),
            os.path.join(script_dir, "../../lib/rag_lookup_data_cleaned.jsonl"),
            os.path.join(os.getcwd(), "lib/rag_lookup_data_cleaned.jsonl"),
            os.path.join(os.getcwd(), "src/lib/rag_lookup_data_cleaned.jsonl"),
            os.path.join(script_dir, "../../../lib/rag_lookup_data.jsonl"),
            os.path.join(script_dir, "../../lib/rag_lookup_data.jsonl"),
            os.path.join(os.getcwd(), "lib/rag_lookup_data.jsonl"),
            os.path.join(os.getcwd(), "src/lib/rag_lookup_data.jsonl")
        ]
        for loc in possible_locations:
            if os.path.exists(loc):
                print(f"找到可能的數據文件位置：{loc}")
                data_path = loc
                break
        else:
            print("無法找到數據文件，請使用 --data-path 指定正確的路徑")
            sys.exit(1)
    
    # 加載或重建索引
    if args.rebuild_index or not os.path.exists(index_dir):
        print(f"使用數據文件：{data_path}")
        documents = load_data_from_jsonl(data_path)
        index, doc_map, documents = create_index(documents)
        save_index(index, doc_map, documents, index_dir)
        print(f"索引已保存到：{index_dir}")
    else:
        print(f"加載現有索引：{index_dir}")
        index, doc_map, documents = load_index(index_dir)
    
    # 處理查詢
    if args.interactive:
        # 交互式模式
        print("\n進入交互式查詢模式，輸入'q'退出")
        while True:
            query = input("\n請輸入您的問題: ")
            if query.lower() == 'q':
                break
            
            results = query_index(index, doc_map, documents, query, top_k=3)
            if not results:
                print("未找到相關回答")
            else:
                for i, result in enumerate(results, 1):
                    print(f"\n--- 結果 {i} (相似度: {result['score']:.4f}) ---")
                    print(f"問題: {result['metadata']['question']}")
                    print(f"回答: {result['metadata']['answer']}")
    elif args.query:
        # 單次查詢模式
        results = query_index(index, doc_map, documents, args.query, top_k=3)
        for result in results:
            print(f"分數: {result['score']}")
            print(f"問題: {result['metadata']['question']}")
            print(f"回答: {result['metadata']['answer']}")
            print("---")
    else:
        # 默認測試查詢
        print("執行默認測試查詢: '小威的妈妈你好'")
        results = query_index(index, doc_map, documents, "小威的妈妈你好", top_k=3)
        for result in results:
            print(f"分數: {result['score']}")
            print(f"問題: {result['metadata']['question']}")
            print(f"回答: {result['metadata']['answer']}")
            print("---") 