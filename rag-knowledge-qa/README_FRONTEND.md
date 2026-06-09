# RAG 知识库问答系统 - 前端界面

## 概述

这是一个现代化的 RAG 知识库问答系统前端界面，采用 React + Tailwind CSS 构建。设计风格参考了 Linear、Notion 和 Vercel 的现代设计语言，具有干净、留白充足、层次分明的特点。

## 功能特性

### 🎨 设计特点

- **现代感设计**：参考 Linear / Notion / Vercel 的设计语言
- **专业气质**：智能助手风格，简洁专业，不过于花哨
- **响应式布局**：完美适配宽屏和窄屏（≥1024px）
- **优雅动画**：流畅的过渡效果和微交互

### 📱 界面功能

#### 1. 问答界面
- 智能聊天对话，区分用户和 AI 消息气泡
- 支持多行输入，Shift+Enter 换行
- 实时思考动画，模拟 AI 思考过程
- 高级设置面板：
  - 检索数量 (Top-K) 滑块调整（1-10）
  - 检索策略选择：similarity / MMR

#### 2. 知识库管理
- 知识库统计展示（知识块数量、文档数量）
- 知识库内容搜索
- 最近更新的知识块列表
- 完整知识库浏览入口

#### 3. 系统信息
- 实时系统状态监控
- RAGAS 评估分数可视化展示
- 技术栈标签展示
- 版本和更新时间信息

## 技术栈

- **React 18**：现代化前端框架
- **Tailwind CSS 3**：实用优先的 CSS 框架
- **Lucide React**：精美简约的图标库
- **Vite**：快速的开发构建工具
- **ESLint**：代码质量检查

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:3000` 查看应用。

### 构建生产版本

```bash
npm run build
```

### 预览生产构建

```bash
npm run preview
```

## 项目结构

```
rag-knowledge-qa/
├── ChatInterface.jsx      # 主组件文件
├── index.js              # 应用入口
├── index.css             # 全局样式和 Tailwind 配置
├── index.html            # HTML 模板
├── vite.config.js        # Vite 配置
├── tailwind.config.js    # Tailwind CSS 配置
├── postcss.config.js     # PostCSS 配置
└── package.json          # 项目配置
```

## 主要组件说明

### ChatInterface.jsx

主组件包含以下核心功能：

#### 状态管理
- `messages`: 聊天消息列表
- `inputMessage`: 用户输入内容
- `isLoading`: AI 思考状态
- `sidebarOpen`: 侧边栏展开状态
- `showAdvancedSettings`: 高级设置面板状态
- `topK`: 检索数量配置
- `retrievalStrategy`: 检索策略配置
- `activeTab`: 当前选中的标签页

#### 核心函数
- `handleSendMessage`: 处理消息发送
- `renderMessages`: 渲染聊天消息
- `renderChatInterface`: 渲染聊天界面
- `renderKnowledgeBase`: 渲染知识库管理界面
- `renderSystemInfo`: 渲染系统信息界面

## 设计系统

### 颜色方案

- **主色调**: 蓝色系 (#3b82f6, #2563eb, #1d4ed8)
- **背景色**: 浅灰色 (#f9fafb)
- **文本色**: 深灰色 (#1f2937, #4b5563)
- **状态色**: 绿色 (运行中)、红色 (错误)、黄色 (警告)

### 排版

- **字体**: Inter, 系统无衬线字体
- **标题层级**: 
  - 主标题: text-xl font-bold
  - 副标题: text-lg font-semibold
  - 内容: text-base font-normal
  - 小字: text-sm font-normal

### 间距系统

- 主要间距: 4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px
- 使用 Tailwind CSS 的间距类: space-y-*, gap-*, p-*, m-*

### 动画效果

- **淡入动画**: `animate-fadeIn`
- **打字机效果**: `animate-typing`
- **脉冲动画**: `animate-pulse`
- **平滑滚动**: `scroll-behavior: smooth`

## API 集成

当前版本使用模拟数据，需要集成后端 API：

### 接口示例

```javascript
// 发送消息
const sendMessage = async (message, topK, strategy) => {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      top_k: topK,
      retrieval_strategy: strategy,
    }),
  });
  return response.json();
};

// 获取知识库统计
const getKnowledgeStats = async () => {
  const response = await fetch('/api/knowledge/stats');
  return response.json();
};

// 获取系统状态
const getSystemStatus = async () => {
  const response = await fetch('/api/system/status');
  return response.json();
};
```

## 自定义配置

### 修改颜色主题

在 `tailwind.config.js` 中修改：

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        50: '#eff6ff',
        100: '#dbeafe',
        // ... 其他颜色
      },
    },
  },
}
```

### 调整检索数量范围

在 `ChatInterface.jsx` 中修改滑块属性：

```javascript
<input
  type="range"
  min="1"
  max="10"  // 修改最大值
  value={topK}
  onChange={(e) => setTopK(Number(e.target.value))}
/>
```

### 修改 API 代理配置

在 `vite.config.js` 中修改：

```javascript
server: {
  proxy: {
    '/api': {
      target: 'http://your-backend-url:port',
      changeOrigin: true,
    },
  },
}
```

## 浏览器支持

- Chrome (推荐)
- Firefox
- Safari
- Edge

## 性能优化

1. **React.memo**：优化组件渲染性能
2. **虚拟滚动**：大量聊天记录时考虑使用 react-virtualized
3. **代码分割**：使用 React.lazy 和 Suspense
4. **图片优化**：使用 WebP 格式和适当压缩
5. **缓存策略**：合理使用 localStorage 和 sessionStorage

## 无障碍支持

- 使用语义化 HTML 标签
- 适当的 ARIA 属性
- 键盘导航支持
- 高对比度模式支持
- 屏幕阅读器兼容性

## 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

MIT License

## 更新日志

### v1.0.0 (2026-06-09)
- 初始版本发布
- 现代化 React + Tailwind CSS 界面
- 完整的聊天、知识库管理和系统信息功能
- 响应式设计和优雅的动画效果