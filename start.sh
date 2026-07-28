#!/bin/bash
# 全网影视搜索 TV版 - 一键启动脚本
# 用法: ./start.sh [端口号]

PORT=${1:-9000}
DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "🎬 全网视频搜索 TV Edition v3.0"
echo "================================"
echo ""

# 检查 Node.js
if ! command -v node &>/dev/null; then
  echo "❌ 未安装 Node.js，请先安装: https://nodejs.org"
  exit 1
fi

# 安装依赖
if [ ! -d "$DIR/api/node_modules" ]; then
  echo "📦 安装依赖..."
  cd "$DIR/api" && npm install --production 2>&1 | tail -3
fi

# 获取本机IP
LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || ifconfig 2>/dev/null | grep -oP 'inet \K[\d.]+' | grep -v '127.0.0.1' | head -1)

echo ""
echo "📺 电视端访问地址:"
echo "   http://${LOCAL_IP:-你的IP}:${PORT}"
echo ""
echo "💻 电脑端访问地址:"
echo "   http://localhost:${PORT}"
echo ""
echo "📱 手机端同局域网访问:"
echo "   http://${LOCAL_IP:-你的IP}:${PORT}"
echo ""
echo "按 Ctrl+C 停止服务"
echo "================================"
echo ""

cd "$DIR/api" && PORT=$PORT node server.js
