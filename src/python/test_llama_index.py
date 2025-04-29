# 测试 LlamaIndex 导入
try:
    # 尝试新版本导入
    from llama_index.core import VectorStoreIndex
    print("成功导入 llama_index.core.VectorStoreIndex")
except ImportError:
    try:
        # 尝试旧版本导入
        from llama_index import VectorStoreIndex
        print("成功导入 llama_index.VectorStoreIndex")
    except ImportError:
        print("无法导入 VectorStoreIndex，请检查 LlamaIndex 安装")
        
        # 打印已安装的包
        import pkg_resources
        print("\n已安装的包:")
        for pkg in pkg_resources.working_set:
            if "llama" in pkg.key:
                print(f"{pkg.key}=={pkg.version}") 