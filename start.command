#!/bin/bash
cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  echo "依存関係をインストールしています..."
  npm install
fi

PORT=5183

echo "開発サーバーを起動しています... (http://127.0.0.1:$PORT)"
( sleep 2 && open "http://127.0.0.1:$PORT" ) &
npm run dev -- --port "$PORT" --strictPort
