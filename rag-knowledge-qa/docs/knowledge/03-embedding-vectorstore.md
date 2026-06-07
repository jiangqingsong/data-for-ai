# Embedding 与向量数据库

> 学习时间: 2026-06-07 | 所属阶段: 第1周

## 一、核心概念

**Embedding (向量化):** 将文本映射到高维向量空间。语义相似的文本，向量距离近；语义无关的文本，向量距离远。

**向量数据库:** 专门存储和检索向量的数据库。核心能力是 ANN (近似最近邻) 搜索——在海量向量中快速找到最相似的 Top-K。

**Chroma 的特点:**
- 轻量级，Python 原生，零配置
- 支持内存模式和持久化模式（本项目用持久化）
- 底层使用 HNSW 索引（分层可导航小世界图，一种高效的 ANN 算法）
- 不适合生产大规模场景（那时该用 Milvus）

**本项目配置:**
- Embedding 模型: 火山引擎 `doubao-embedding-text-240715`
- 向量维度: 2560
- 存储: Chroma 本地持久化 (`data/chroma_db/`)
- 数据量: 189 个 chunk（1 本九年级物理教材）

## 二、关键代码/用法

**创建向量库:**
```python
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma

embeddings = OpenAIEmbeddings(
    model="doubao-embedding-text-240715",
    openai_api_key=Config.DEEPSEEK_API_KEY,
    openai_api_base=Config.DEEPSEEK_BASE_URL,
    tiktoken_enabled=False,  # 火山引擎兼容
)

vectorstore = Chroma.from_documents(
    documents=chunks,
    embedding=embeddings,
    persist_directory="./data/chroma_db",
)
```

**从已有向量库加载:**
```python
vectorstore = Chroma(
    persist_directory="./data/chroma_db",
    embedding_function=embeddings,
)
```

**检索:**
```python
# 相似度检索
results = vectorstore.similarity_search("欧姆定律", k=4)

# MMR 检索（增加多样性）
results = vectorstore.max_marginal_relevance_search(
    "欧姆定律", k=4, fetch_k=10, lambda_mult=0.5
)
```

**探索向量库:**
```bash
python explore.py
# search <query>   — 相似度检索
# mmr <query>      — MMR 检索
# stats            — 统计信息
# sample 5         — 随机采样
# page 89          — 查看某页所有 chunk
```

## 三、实验记录 & 踩坑

### 踩坑 1: BGE-M3 本地 Embedding 不可用

- **计划:** DeepSeek Embedding API 优先，BGE-M3 本地 fallback
- **实际:** 公司网络限制，HuggingFace 模型下载失败
- **决策:** 放弃本地 fallback，纯用火山引擎 API
- **影响:** 每次调 Embedding 都需联网，但 189 个 chunk 量很小，速度没问题

### 踩坑 2: 火山引擎 Embedding 的 tiktoken 问题

- **现象:** `OpenAIEmbeddings` 默认用 tiktoken 计算 token 数，传给火山引擎 API 时报错
- **解决:** 必须设置 `tiktoken_enabled=False` 和 `check_embedding_ctx_length=False`

### 观察: 2560 维向量的存储

- 189 个 2560 维向量 → chroma.sqlite3 约 5MB
- 如果是 10000+ 文档，建议换 Milvus

## 四、面试可能会问

**Q: 为什么不用传统数据库做向量检索？**
A: 传统数据库的 B-Tree 索引在 2560 维向量上效率极低（维度灾难）。向量数据库使用 HNSW/IVF 等 ANN 算法，在近似精度下实现毫秒级检索。

**Q: Chroma 和 Milvus 怎么选？**
A: Chroma 适合开发和小规模（<10万向量），Python 原生，零运维。Milvus 适合生产大规模，分布式架构，支持混合检索。两者 API 相似，迁移成本低。

**Q: Embedding 模型的维度是什么意思？**
A: 2560 维就是每个文本被表示为 2560 个浮点数。维度越高，表达能力越强，但存储和计算成本也越高。doubao-embedding 的 2560 维是当前主流水平（OpenAI text-embedding-3-small 是 1536 维）。
