#!/bin/bash
# 全网影视搜索 - 云部署脚本
# 支持: Render / Railway / Vercel / 任何支持Node.js的平台

echo ""
echo "🎬 全网影视搜索 - 部署向导"
echo "=============================="
echo ""
echo "选择部署方式:"
echo ""
echo "  1) Render.com (免费，推荐)"
echo "  2) Railway.app (免费额度)"
echo "  3) 生成Android TV APK"
echo "  4) 本机局域网启动"
echo ""
read -p "请选择 [1-4]: " choice

case $choice in
  1)
    echo ""
    echo "📋 Render.com 部署步骤:"
    echo ""
    echo "1. 访问 https://render.com 注册账号"
    echo "2. 点击 'New' → 'Web Service'"
    echo "3. 连接你的 GitHub 仓库"
    echo "4. 设置:"
    echo "   - Build Command: cd api && npm install"
    echo "   - Start Command: node api/server.js"
    echo "   - Environment: Node"
    echo "   - Plan: Free"
    echo ""
    echo "或者直接用 render.yaml (已生成)"
    echo ""
    # Generate render.yaml
    cat > render.yaml << 'EOF'
services:
  - type: web
    name: video-search
    env: node
    buildCommand: cd api && npm install
    startCommand: node api/server.js
    plan: free
    envVars:
      - key: PORT
        value: 10000
EOF
    echo "✅ 已生成 render.yaml，推送到 GitHub 后在 Render 创建服务即可"
    ;;
  2)
    echo ""
    echo "📋 Railway.app 部署步骤:"
    echo ""
    echo "1. 访问 https://railway.app 注册"
    echo "2. 点击 'New Project' → 'Deploy from GitHub'"
    echo "3. 选择仓库，自动检测 Node.js"
    echo "4. 设置 PORT 环境变量"
    echo ""
    # Generate railway.toml
    cat > railway.toml << 'EOF'
[build]
builder = "nixpacks"
buildCommand = "cd api && npm install"

[deploy]
startCommand = "node api/server.js"
EOF
    echo "✅ 已生成 railway.toml"
    ;;
  3)
    echo ""
    echo "📋 生成 Android TV APK"
    echo ""
    # Check if we have the tools
    if ! command -v java &>/dev/null; then
      echo "⚠️ 需要安装 Java JDK"
      echo "   Ubuntu: sudo apt install default-jdk"
      echo "   Mac: brew install openjdk"
      echo ""
    fi
    echo "已生成 Android 项目模板，请查看 android/ 目录"
    echo "详细步骤: 用 Android Studio 打开 android/ 文件夹，构建APK"
    ;;
  4)
    echo ""
    echo "启动局域网服务..."
    cd "$(dirname "$0")/api"
    PORT=9000 node server.js
    ;;
esac
