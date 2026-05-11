# 隐私保护健康数据采集与管理系统

## 目录说明

- `source-code/vue-privacy-demo/`：作品源码，包含 Vue3 前端与 Tauri 桌面端工程。
- `executable/Privacy LDP Demo_0.1.0_x64-setup.exe`：Windows 安装包，推荐用于直接安装体验。
- `executable/Privacy LDP Demo_0.1.0_x64_en-US.msi`：Windows MSI 安装包，作为备用安装格式。

## 直接运行

双击 `executable/Privacy LDP Demo_0.1.0_x64-setup.exe`，按提示安装后运行系统。

## 源码运行

进入源码目录：

```powershell
cd source-code\vue-privacy-demo
npm install
npm run tauri:dev
```

## 重新打包

```powershell
cd source-code\vue-privacy-demo
npm install
npm run tauri:build
```

打包产物位于：

```text
src-tauri\target\release\bundle\
```

## 环境要求

- Node.js
- Rust 工具链
- Windows WebView2 Runtime

Windows 10/11 通常已内置或可自动安装 WebView2 Runtime。
