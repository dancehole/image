# Image Bed - GitHub 图床管理系统

一个基于 GitHub 的图床管理系统，提供图片浏览、上传、压缩、水印等功能。

## 🌟 功能特性

- **图片浏览**：网格/列表视图切换、分类筛选、搜索、排序、批量操作
- **图片上传**：拖拽上传、点击上传、上传队列管理
- **图片压缩**：前端 Canvas 压缩，可调节质量和最大宽度
- **水印功能**：文字水印，自定义位置、透明度、字体大小、颜色
- **图片管理**：预览放大、重命名、删除、批量删除、复制链接
- **本地索引**：索引生成、导出/导入、GitHub 同步
- **上传历史**：记录最近 200 条上传记录，一键复制链接
- **存储统计**：侧边栏显示存储空间使用情况
- **链接格式**：支持 URL、Markdown、HTML、BBCode 四种格式

## 🏗️ 项目架构

```
image【图床】/
├── index.html          # 主页面（单页应用）
├── README.md           # 项目文档
├── .gitignore          # Git 忽略配置
├── .github/workflows/
│   └── deploy.yml      # GitHub Actions 部署配置
├── css/
│   └── style.css       # 样式文件
├── js/
│   ├── app.js          # 主应用逻辑
│   ├── config.js       # 配置管理（localStorage）
│   ├── github-api.js   # GitHub API 封装
│   ├── image-utils.js  # 图片处理（压缩+水印）
│   ├── gallery.js      # 图片画廊浏览
│   └── upload.js       # 上传功能
├── common/             # 公共图片目录
├── notebooks/          # 笔记图片目录
└── danceholeLabs/      # 实验室图片目录
```

## 🚀 快速开始

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/dancehole/image.git

# 进入目录
cd image

# 使用任意 HTTP 服务器启动
python -m http.server 8080
# 或
npx serve

# 访问
open http://localhost:8080
```

### GitHub Pages 部署

项目已配置 GitHub Actions，推送到 `main` 分支自动部署到 GitHub Pages。

访问地址：https://dancehole.github.io/image/

## ⚙️ 配置说明

1. 打开设置页面
2. 填写 GitHub Token（需要 repo 权限）
3. 填写用户名、仓库名、分支
4. 点击保存设置和测试连接
5. 点击同步按钮从 GitHub 获取图片列表

## 📦 技术栈

- **前端框架**：原生 HTML/CSS/JavaScript + jQuery
- **API**：GitHub REST API
- **CDN**：jsDelivr（图片加速）
- **存储**：localStorage（本地配置缓存）
- **部署**：GitHub Pages + GitHub Actions

## 📄 许可证

MIT License

## 🤝 作者

**dancehole**

- GitHub: https://github.com/dancehole
- Repository: https://github.com/dancehole/image
