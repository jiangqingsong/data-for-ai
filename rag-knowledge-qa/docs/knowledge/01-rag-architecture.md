# RAG 整体架构

> 学习时间: 2026-06-07 | 所属阶段: 第1周

## 一、核心概念

**RAG (Retrieval-Augmented Generation)** = 检索增强生成。

**问题背景:** LLM 的知识截止于训练数据，无法回答最新/私有领域问题。RAG 在 LLM 生成前先检索外部知识库，把相关知识"喂"给 LLM。

**核心流程:**

```
离线阶段（建库）:
  文档 → 分块 → Embedding 向量化 → 存入向量数据库

在线阶段（问答）:
  用户问题 → 向量检索 → 拼接 Prompt → LLM 生成 → 答案 + 引用来源
```

**为什么叫"增强生成"？** LLM 本身是生成模型，RAG 用检索结果增强了它的生成能力——让 LLM 基于真实资料回答，而不是凭记忆编造。

## 二、关键代码/用法

```python
# 本项目 RAG 的最简调用
from src.rag_chain import RAGChain

chain = RAGChain()
result = chain.ask("欧姆定律的内容是什么？")
print(result["answer"])
# => 导体中的电流跟导体两端的电压成正比，跟导体的电阻成反比。
#    用公式表示为 I = U / R
for src in result["sources"]:
    print(f"  - {src['source']} (第{src['page']}页)")
```

**本项目架构:**

```
src/
├── config.py       # 配置管理 (~/.ai-env/llm/config.json)
├── pipeline.py     # 离线: PDF→清洗→分块→向量化
├── retriever.py    # 在线: 相似度检索 / MMR 检索
├── generator.py    # 在线: Prompt 模板 + LLM 调用
└── rag_chain.py    # 串联: 检索→生成→返回答案
```

## 三、实验记录 & 踩坑

### 踩坑 1: 火山引擎 Embedding API 兼容性

- **现象:** 直接调 `OpenAIEmbeddings` 报错
- **原因:** 火山引擎 API 不接受 `tiktoken` token IDs，需要传原始文本
- **解决:** 设置 `tiktoken_enabled=False`, `check_embedding_ctx_length=False`

### 踩坑 2: 配置管理从 .env 迁移到 JSON

- **原因:** 跨平台（Windows/Mac）共享配置更方便，且多项目可复用
- **方案:** `~/.ai-env/llm/config.json` 统一存储敏感信息，不入 Git

### 踩坑 3: 检索 Top-K 的权衡

- `top_k=4` 默认值对某些问题不够：欧姆定律在第 89 页，top_k=4 没命中
- `top_k=6` 就命中了，但太多会引入噪声
- **经验:** 这是后续优化重点（Task 10 评估会量化）

## 四、面试可能会问

**Q: RAG 和微调的区别？**
A: RAG 是外挂知识库，不改模型权重，知识可随时更新。微调是改变模型参数，适合学习模式/风格。两者互补——微调让模型"会说"，RAG 让模型"知道说什么"。

**Q: RAG 的核心挑战是什么？**
A: ① 检索质量（检索不准，生成就不可能对）② 分块策略（太大不精准，太小缺上下文）③ 延迟（检索+生成两段）④ 幻觉（检索不到时编造答案）。

**Q: 你的 RAG 系统是怎么做"诚实机制"的？**
A: Prompt 中明确要求"如果资料中不包含答案，请明确说'参考资料中未找到相关信息'"。实测有效：问"牛顿第一定律"（九年级教材不包含），系统诚实说没找到。
