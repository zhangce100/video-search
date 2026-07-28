# 🎬 全网影视搜索 v3.0

聚合 **40个平台** 的视频/影视资源。支持手机、电视、电脑多端使用。

## 🚀 快速开始

### 本机运行
```bash
cd api && npm install && node server.js
```
打开 http://localhost:9000

### 局域网使用 (电视/手机)
```bash
# 启动后，电视/手机浏览器访问:
# http://你的电脑IP:9000
```

## ☁️ 云部署 (脱离电脑)

### Render.com (免费推荐)
1. Fork 本项目到 GitHub
2. 访问 [render.com](https://render.com) 注册
3. New → Web Service → 连接 GitHub
4. Build: `cd api && npm install`
5. Start: `node api/server.js`
6. 获得公网地址，任何设备都能访问

### Railway.app
1. 访问 [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. 自动部署，获得公网地址

### Docker
```bash
docker build -t video-search .
docker run -p 9000:9000 video-search
```

## 📱 安装到手机/电视

### PWA 安装 (推荐)
1. 手机/电视浏览器打开部署地址
2. 浏览器会提示"添加到主屏幕"
3. 点击安装，图标出现在桌面
4. 像原生APP一样使用

### Android TV APK
1. 在线打包: 使用 [appsgeyser.com](https://appsgeyser.com)
2. 输入部署地址 → 生成 APK → 安装到电视
3. 详见 `APK_BUILD.md`

## 📺 电视遥控器操作

| 按键 | 功能 |
|------|------|
| ▲▼◀▶ | 移动焦点 |
| 确认/OK | 选择/打开 |
| 返回 | 关闭弹窗 |
| / | 聚焦搜索框 |

## 📁 项目结构

```
video-search/
├── tv.html          📺 电视版 (PWA)
├── index.html       💻 电脑/手机版
├── sw.js            🔧 Service Worker
├── manifest.json    📱 PWA 配置
├── icon.svg         🎨 应用图标
├── start.sh         🚀 一键启动
├── deploy.sh        ☁️ 部署向导
├── Dockerfile       🐳 Docker
├── APK_BUILD.md     📲 APK构建指南
├── render.yaml      ☁️ Render配置
└── api/
    ├── server.js    🔌 API服务
    └── package.json
```

## 🔌 API 接口

```bash
GET /search?q=关键词&cat=all&page=1&page_size=20
GET /sources    # 平台列表
GET /trending   # 热门推荐
GET /health     # 健康检查
```

## ⚙️ 可选 API Key

```bash
export PIXABAY_API_KEY=***    # 免费视频素材
export PEXELS_API_KEY=***     # 免费视频素材
export TMDB_API_KEY=***       # 影视数据库
export OMDB_API_KEY=***       # 电影数据库
export VIMEO_API_KEY=***      # Vimeo视频
```
