import pkg_resources
import importlib
import sys

# 打印 Python 版本
print(f"Python 版本: {sys.version}")

# 打印已安装的 LlamaIndex 相关包
print("\n已安装的 LlamaIndex 相关包:")
for pkg in pkg_resources.working_set:
    if "llama" in pkg.key.lower():
        print(f"{pkg.key}=={pkg.version}")

# 尝试导入并打印可用的模块
print("\n尝试导入模块:")

try:
    from llama_index.core import Settings
    print("✓ 成功导入 llama_index.core.Settings")
except ImportError as e:
    print(f"✗ 导入 llama_index.core.Settings 失败: {e}")

try:
    from llama_index.embeddings.huggingface import HuggingFaceEmbedding
    print("✓ 成功导入 llama_index.embeddings.huggingface.HuggingFaceEmbedding")
except ImportError as e:
    print(f"✗ 导入 llama_index.embeddings.huggingface.HuggingFaceEmbedding 失败: {e}")

try:
    from llama_index.vector_stores.faiss import FaissVectorStore
    print("✓ 成功导入 llama_index.vector_stores.faiss.FaissVectorStore")
except ImportError as e:
    print(f"✗ 导入 llama_index.vector_stores.faiss.FaissVectorStore 失败: {e}")

# 检查 llama_index 包的结构
print("\nllama_index 包结构:")
try:
    import llama_index
    print(f"llama_index.__path__: {llama_index.__path__}")
    
    # 尝试列出 llama_index 的子模块
    print("\nllama_index 子模块:")
    for finder, name, ispkg in pkgutil.iter_modules(llama_index.__path__, llama_index.__name__ + '.'):
        print(name)
except ImportError as e:
    print(f"导入 llama_index 失败: {e}")
except Exception as e:
    print(f"检查 llama_index 结构时出错: {e}") 