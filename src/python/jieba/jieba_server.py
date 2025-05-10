"""
# 啟動
gunicorn jieba_server:app -k uvicorn.workers.UvicornWorker --log-level warning
"""


from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import jieba

app = FastAPI()

# 允許跨來源請求（開發階段可用 *，正式上線建議改成指定域名）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 常數定義
MAX_TEXT_LENGTH = 500  # 最長 500 字（依需求可調整）

@app.get("/cut")
def cut(text: str = Query(..., min_length=1, max_length=MAX_TEXT_LENGTH)):
    try:
        # 嘗試強制解碼以防萬一（通常 FastAPI 已幫忙處理 UTF-8）
        text.encode('utf-8').decode('utf-8')
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="請提供合法的 UTF-8 字串")

    words = list(jieba.cut(text))
    return {"words": words}
