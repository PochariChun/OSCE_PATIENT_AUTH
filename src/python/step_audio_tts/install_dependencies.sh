#!/bin/bash
# 安装 Step-Audio-TTS-3B 所需的依赖

# 安装基本依赖
pip install torch transformers==4.36.0 scipy tqdm

# 安装 Hugging Face Hub (用于下载模型)
pip install huggingface_hub

# 安装音频处理库
pip install librosa soundfile

# 如果需要 GPU 支持，确保安装了正确版本的 PyTorch
# 可以根据需要取消下面的注释
# pip install torch==2.0.0+cu118 -f https://download.pytorch.org/whl/torch_stable.html 