#!/bin/bash
# 啟動: ./run_jieba.sh 


# 啟動 gunicorn，記住它的 PID
gunicorn jieba_server:app -k uvicorn.workers.UvicornWorker --bind 127.0.0.1:8000 --log-level warning &
GUNICORN_PID=$!

# 定義結束時要清掉的行為
cleanup() {
  echo "🔴 終止 gunicorn (PID: $GUNICORN_PID)..."
  kill $GUNICORN_PID
  wait $GUNICORN_PID 2>/dev/null
}

# 設定 trap，當收到 Ctrl+C (INT)、退出 (EXIT)、或錯誤時執行 cleanup
trap cleanup INT TERM EXIT

# 等待 gunicorn 結束
wait $GUNICORN_PID
