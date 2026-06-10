# RAG 知识库问答系统

基于 RAG (Retrieval-Augmented Generation) 的初中学科知识库问答系统。

## 架构

```
PDF → 非结构化处理 → 分块 → Embedding → Chroma 向量库
                                              ↓
用户问题 → 向量检索 → Prompt 组装 → DeepSeek LLM → 答案 + 引用
```

## 快速开始

### 1. 环境准备

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. 配置 API Key

创建 `~/.ai-env/llm/config.json`:

```json
{
  "deepseek": {
    "api_key": "your-key",
    "base_url": "https://ark.cn-beijing.volces.com/api/v3",
    "model": "deepseek-v4-pro-260425",
    "temperature": 0.1,
    "max_tokens": 1024
  },
  "embedding": {
    "api_model": "doubao-embedding-text-240715"
  }
}
```

### 3. 准备知识库数据

将 PDF 教材文件放入 `data/pdfs/` 目录。

### 4. 构建知识库

```bash
cd backend && python -m src.pipeline
```

### 5. 启动服务

**启动后端 (FastAPI, 端口 8000):**
```bash
cd backend && python app_api.py
```

**启动前端 (React + Vite, 端口 5173):**
```bash
cd frontend && npm install && npm run dev
# 浏览器打开 http://localhost:5173
```

**命令行模式:**
```bash
cd backend && python -m src.rag_chain
```

## 项目结构

```
├── backend/               # Python 后端
│   ├── src/
│   │   ├── config.py      # 配置管理
│   │   ├── pipeline.py    # 数据Pipeline + 4种分块策略
│   │   ├── retriever.py   # 检索器 (相似度/MMR)
│   │   ├── generator.py   # 生成器 (Prompt+LLM+多轮对话)
│   │   ├── rag_chain.py   # RAG 完整链路
│   │   └── evaluator.py   # RAGAS 评估
│   ├── app_api.py         # FastAPI 入口
│   ├── fast_api_optimizations.py  # 中间件
│   ├── explore.py         # Chroma 探索工具
│   └── tests/             # 单元测试 (26个)
├── frontend/              # React SPA 前端
│   ├── src/
│   │   ├── main.jsx       # React 入口
│   │   ├── components/
│   │   │   └── ChatInterface.jsx  # 主聊天组件
│   │   ├── ApiClient.jsx  # API 客户端
│   │   └── ChatCache.js   # 聊天缓存
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── tests/                 # 单元测试 (26个)
├── data/
│   ├── pdfs/              # PDF 知识库
│   └── test_questions.json # 评估测试集 (20题)
└── docs/knowledge/        # 知识点文档 (7篇)
```

## 技术栈

| 组件 | 技术 |
|------|------|
| LLM | 火山引擎 DeepSeek V4 |
| Embedding | 火山引擎 Doubao Embedding (2560维) |
| 向量数据库 | Chroma (本地持久化) |
| 框架 | LangChain |
| 后端 | FastAPI |
| 前端 | React + Vite + Tailwind CSS |
| 评估 | RAGAS (4指标) |
| 非结构化处理 | PyPDF + LangChain TextSplitters |

## 评估结果

| 指标 | 基线 (v0.2) | 说明 |
|------|------------|------|
| Faithfulness | 0.9375 | ✅ 答案高度忠实 |
| Answer Relevancy | 0.9083 | ✅ 答案切题 |
| Context Recall | 0.2375 | ⚠️ 检索覆盖不足 |
| Context Precision | 0.7875 | 📊 中等偏上 |

## 知识点文档

| 序号 | 文档 | 内容 |
|------|------|------|
| 01 | RAG 整体架构 | 离线/在线流程、核心模块 |
| 02 | 数据Pipeline & 分块 | 4种分块策略对比 |
| 03 | Embedding & 向量数据库 | Chroma 使用、向量检索原理 |
| 04 | 检索策略 | 相似度/MMR/混合检索 |
| 05 | Prompt 模板设计 | 模板设计、防幻觉策略 |
| 06 | RAGAS 评估 | 4指标、评估方法论 |
| 07 | 产品化 | Gradio、多轮对话 |

## License

MIT
