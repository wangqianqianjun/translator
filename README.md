# AI Translator - Chrome 智能翻译插件

一款基于 AI 的 Chrome 浏览器翻译插件，支持划词翻译和全文翻译，让网页翻译更智能、更自然。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Chrome](https://img.shields.io/badge/Chrome-Extension-green.svg)
![Manifest](https://img.shields.io/badge/Manifest-V3-orange.svg)

## ✨ 功能特性

### 划词翻译
- 选中文本后显示翻译按钮
- 点击按钮弹出翻译窗口
- 支持复制译文
- 翻译窗口保持显示，不会自动消失

### 全文翻译
- 一键翻译整个网页
- 译文显示在原文下方，保持原网页布局
- 继承原文样式（字体、颜色、大小）
- 支持显示/隐藏译文切换
- 高性能批量翻译（100条/批，5并发）

### 悬浮球
- 可拖动的快捷操作球
- 支持翻译选中文本、翻译页面、显示/隐藏译文
- 位置自动保存

### 其他功能
- 右键菜单快速翻译
- 定制化翻译 Prompt
- 深色/浅色主题切换
- 支持多种目标语言

## 🚀 安装使用

### 1. 下载插件

```bash
git clone https://github.com/your-username/translator.git
cd translator
```

### 2. 加载到 Chrome

1. 打开 Chrome 浏览器
2. 地址栏输入 `chrome://extensions/`
3. 开启右上角「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择 `translator` 文件夹

### 3. 配置 API

1. 点击浏览器工具栏中的插件图标
2. 点击「打开设置」
3. 填写 API 配置：
   - **API 地址**: 如 `https://api.openai.com/v1/chat/completions`
   - **API Key**: 你的 API 密钥
   - **模型名称**: 如 `gpt-4o-mini`
4. 选择目标翻译语言
5. 点击「保存设置」

## 📖 使用方法

### 划词翻译

1. 在网页中选中需要翻译的文字
2. 点击出现的「翻译」按钮
3. 查看翻译结果，可点击复制
4. 按 `Esc` 或点击 × 关闭翻译窗口

### 全文翻译

**方式一：悬浮球**
1. 点击页面右下角的悬浮球
2. 选择「翻译整个页面」

**方式二：插件菜单**
1. 点击浏览器工具栏的插件图标
2. 点击「翻译当前页面」

**方式三：右键菜单**
1. 在页面空白处右键
2. 选择「翻译整个页面」

### 显示/隐藏译文

翻译完成后：
1. 点击悬浮球
2. 选择「隐藏译文」或「显示译文」
3. 译文会被保留，再次显示无需重新翻译

### 主题切换

1. 打开设置页面
2. 点击右上角的 ☀️/🌙 图标切换主题

## ⚙️ 支持的 API

支持任何兼容 OpenAI Chat Completions API 的服务：

| 服务 | API 地址示例 |
|------|-------------|
| OpenAI | `https://api.openai.com/v1/chat/completions` |
| Azure OpenAI | `https://your-resource.openai.azure.com/...` |
| Claude (兼容) | 使用兼容层 |
| Ollama | `http://localhost:11434/v1/chat/completions` |
| LM Studio | `http://localhost:1234/v1/chat/completions` |

## 🌍 支持的语言

- 简体中文
- 繁体中文
- English
- 日本語
- 한국어
- Français
- Deutsch
- Español
- Русский

## 📁 项目结构

```
translator/
├── manifest.json          # Chrome 扩展配置
├── background/
│   └── background.js      # 后台脚本，处理 API 调用
├── content/
│   ├── content.js         # 内容脚本，页面交互
│   └── content.css        # 翻译 UI 样式
├── popup/
│   ├── popup.html         # 弹出菜单
│   ├── popup.css
│   └── popup.js
├── options/
│   ├── options.html       # 设置页面
│   ├── options.css
│   └── options.js
├── icons/                  # 插件图标
└── scripts/
    └── generate-icons.js  # 图标生成脚本
```

## 🎨 自定义 Prompt

在设置页面可以自定义翻译 Prompt，使用 `{targetLang}` 变量插入目标语言：

```
You are a professional translator. Translate the given text to {targetLang}.
Rules:
1. Provide ONLY the translation
2. Keep technical terms in original form
3. Translate naturally, not literally
```

## 🔧 开发

```bash
# 安装依赖（可选，用于生成图标）
npm install

# 生成精美图标
npm run icons

# 打包发布
npm run zip
```

## 📄 License

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**Made with ❤️**

