# Android TV APK 构建指南

## 方法1: 使用在线打包工具 (最简单，无需安装开发环境)

1. 打开 https://appsgeyser.com 或 https://gonative.io
2. 选择 "Website to App"
3. 输入你的云部署地址 (如 https://xxx.onrender.com)
4. 设置应用名称: 全网影视搜索
5. 上传图标: 使用项目中的 icon.svg
6. 选择 Android TV 支持
7. 下载 APK

## 方法2: 使用 Android Studio

1. 安装 Android Studio: https://developer.android.com/studio
2. 打开本项目的 android/ 文件夹
3. 修改 MainActivity.java 中的 URL 为你的服务器地址
4. Build → Generate Signed APK
5. 安装到电视: adb install app.apk

## 方法3: 使用 Cordova (命令行)

```bash
npm install -g cordova
cordova create tv-app com.videosearch.tv 影视搜索
cd tv-app
cordova platform add android
# 替换 www/ 目录内容为本项目的 tv.html
# 修改 config.xml 设置启动URL
cordova build android
# APK 在 platforms/android/app/build/outputs/apk/
```

## 方法4: 一键脚本 (需要 Docker)

```bash
# 使用 bubblewrap 将 PWA 打包为 APK
npm install -g @nickvision/bubblewrap
bubblewrap init --manifest https://你的域名/manifest.json
bubblewrap build
```

## 电视安装 APK

```bash
# 通过 USB
adb install video-search.apk

# 通过网络 (电视需开启ADB)
adb connect 电视IP:5555
adb install video-search.apk
```
