#!/bin/bash

echo "🚀 Vue3 AAC開発サーバーを起動中..."

# ポート3000をクリア
lsof -ti:3000 | xargs kill -9 2>/dev/null || echo "ポート3000は空いています"

# ポート3001をクリア  
lsof -ti:3001 | xargs kill -9 2>/dev/null || echo "ポート3001は空いています"

echo "📦 依存関係をチェック中..."
npm install

echo "🔥 Viteサーバーを起動中..."
echo "👁️ 視線追跡AACアプリケーション"
echo "🌐 アクセス: http://localhost:3001/"
echo "⚠️  カメラ許可を忘れずに！"
echo ""

# Viteを起動（ポート3001、ホスト設定）
npm run dev -- --port 3001 --host