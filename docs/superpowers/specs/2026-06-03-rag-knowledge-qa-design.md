# 项目一：RAG 知识库问答系统 — 技术方案

> **日期**: 2026-06-03 | **状态**: 设计完成，待评审 | **关联计划**: [2026-06-02-career-ai-data-engineering-plan.md](../../2026-06-02-career-ai-data-engineering-plan.md)

---

## 一、项目概述

### 1.1 目标

3 周内从零搭建一个可用的 RAG 知识库问答系统，理解 RAG 全链路（非结构化数据处理 → 向量检索 → LLM 生成 → 评估）。

### 1.2 场景

初中学科知识库问答（物理/数学/历史），用户提供几十份 PDF 教材/知识点文件。

### 1.3 技术决策汇总

| 决策点 | 选择 | 理由 |
|--------|------|------|
| LLM | DeepSeek API (`deepseek-chat`) | 用户提供 Key，价格低，中文能力强 |
| Embedding | DeepSeek Embedding API（优先）/ BGE-M3 本地（fallback） | 优先用 DeepSeek，如不支持则本地跑 BGE-M3 |
| 向量数据库 | Chroma（本地持久化模式） | 零依赖，无需服务器，数据存本地磁盘 |
| 开发框架 | LangChain | RAG 生态最成熟 |
| Web 框架 | Gradio（ChatInterface） | 聊天场景开箱即用，非重点不纠结 |
| 数据源 | 用户提供 PDF（初中学科，几十份） | 公开教材/知识点文档 |
| 评估体系 | RAGAS 标准评估（4 指标） | 工业标准，面试可讲 |
| 非结构化处理 | Unstructured + PyPDF | 技能矩阵 🔴 必学项 |

---

## 二、整体架构

```
┌─────────────────────────────────────────────────────────┐
│                    RAG 知识库问答系统                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────┐   ┌──────────┐   ┌───────────────────┐   │
│  │  Gradio  │   │ 评估体系  │   │  知识库管理        │   │
│  │  Web UI  │   │ (RAGAS)  │   │  (文档上传/删除)   │   │
│  └────┬─────┘   └────┬─────┘   └────────┬──────────┘   │
│       │              │                  │               │
│  ┌────┴──────────────┴──────────────────┴──────────┐   │
│  │                 RAG 核心引擎                      │   │
│  │  ┌─────────┐  ┌──────────┐  ┌───────────────┐   │   │
│  │  │ 检索器   │  │ 生成器    │  │ Prompt 模板    │   │   │
│  │  │Retriever│→│Generator │  │               │   │   │
│  │  └────┬────┘  └────┬─────┘  └───────────────┘   │   │
│  │       │            │                             │   │
│  └───────┼────────────┼─────────────────────────────┘   │
│          │            │                                  │
│  ┌───────┴────┐  ┌────┴──────────┐                      │
│  │  Chroma    │  │  DeepSeek     │                      │
│  │  向量库    │  │  API (LLM+Emb)│                      │
│  │ (本地持久) │  │               │                      │
│  └────────────┘  └───────────────┘                      │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │          非结构化数据处理 Pipeline                 │   │
│  │  PDF → Loader → TextSplitter → Embedding → Chroma │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 2.1 核心数据流

**离线阶段（一次性，每次新增文档时执行）：**

```
PDF 文件 → Unstructured/PyPDF 解析 → 文本清洗
→ RecursiveCharacterTextSplitter 分块
→ DeepSeek Embedding 向量化 → Chroma 持久化存储
```

**在线阶段（每次用户提问时执行）：**

```
用户问题 → DeepSeek Embedding 向量化
→ Chroma 相似度检索（Top-K=4）
→ 拼接 Prompt 模板 → DeepSeek LLM 生成
→ 返回答案 + 引用来源
```

### 2.2 四大核心模块

| 模块 | 职责 | 输入 | 输出 |
|------|------|------|------|
| **数据 Pipeline** | 文档摄入与向量化 | PDF 文件 | Chroma 向量索引 |
| **检索器** | 语义检索相关文档块 | 用户问题 | Top-K 文档块 |
| **生成器** | Prompt 组装 + LLM 生成 | 问题 + 文档块 | 答案 + 引用来源 |
| **评估器** | 质量度量与迭代指导 | 问答对 + 上下文 | RAGAS 4 指标分数 |

---

## 三、数据 Pipeline 设计

### 3.1 Pipeline 流程

```
PDF 文件
  │
  ▼
┌─────────────────────────────┐
│ 1. 文档加载 (Loader)         │
│    - UnstructuredPDFLoader  │
│      或 PyPDFLoader         │
│    - 提取文本 + 元数据       │
│    - 元数据: 文件名/页码     │
│    输出: List[Document]     │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│ 2. 文本清洗（可选）          │
│    - 去除多余换行/空格       │
│    - 去除页眉页脚            │
│    - 中文文本规范化          │
│    输出: List[Document]     │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│ 3. 文档分块 (Splitter)       │
│    - RecursiveCharacterText │
│      Splitter               │
│    - chunk_size: 1000(默认) │
│    - chunk_overlap: 200     │
│    输出: List[Document]     │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│ 4. 向量化 + 存储             │
│    - DeepSeek Embedding     │
│    - Chroma 持久化存储       │
│    - 元数据保留:             │
│      文件名/页码/学科        │
│    输出: VectorStore        │
└─────────────────────────────┘
```

### 3.2 第1周：基础分块（先跑通）

| 参数 | 默认值 | 说明 |
|------|--------|------|
| 分块器 | `RecursiveCharacterTextSplitter` | LangChain 最常用的分块器 |
| `chunk_size` | 1000 | 字符数 |
| `chunk_overlap` | 200 | 重叠字符数，保持上下文连贯 |
| 分隔符 | `["\n\n", "\n", "。", ".", " "]` | 优先级递减，中文句号是关键 |

### 3.3 第2周：高级分块策略实验

除了基础参数调优（chunk_size: 500/1000/1500, overlap: 100/200/300），第2周重点实验三种高级分块策略：

#### 策略 A：语义分块（Semantic Chunking）

```
原理：
  计算相邻句子的 Embedding 相似度
  → 相似度骤降的位置 = 语义边界
  → 在语义边界处切分

优势：
  - 每个块内部语义连贯，不会把同一话题切到两块
  - 不受固定字符数限制，自然段落边界

实现方式：
  - LangChain 的 SemanticChunker
  - 或自己实现：句子 Embedding → 相似度曲线 → 找谷底 → 切分

对比实验：
  语义分块 vs 固定大小分块 → 用 RAGAS context_recall 评判
```

#### 策略 B：按文档结构分块（Structural Chunking）

```
原理：
  利用 PDF/文档的标题层级（H1/H2/H3）作为天然边界
  每个章节/小节 = 一个 chunk

优势：
  - 保留文档逻辑结构，检索结果有上下文
  - 特别适合教材类文档（本身就有清晰的章节结构）

实现方式：
  - 先用 Unstructured 提取文档结构（标题层级）
  - 按标题层级切分，保留父标题作为 metadata
  - metadata 示例: {"h1": "第三章 力学", "h2": "3.1 牛顿第一定律"}

对比实验：
  结构分块 vs 固定大小分块 → 用 RAGAS context_precision 评判
```

#### 策略 C：小2大分块（Parent Document Retriever）

```
原理：
  检索用小块（精准定位），生成时带父块（完整上下文）

流程：
  原始文档（大块，如 2000 字符）
    │
    ├─→ 切分为小块（如 500 字符）→ 向量化 → Chroma（用于检索）
    │
    └─→ 保留大块原文 → 单独存储（用于生成）

检索时：
  用户问题 → 检索小块 → 找到 Top-K 小块
  → 回溯小块对应的父块（大块）
  → 将父块作为 context 传给 LLM 生成

优势：
  - 小块检索精准（不会引入无关内容）
  - 大块生成完整（不会丢失上下文）
  - 这是 RAG 领域的经典模式，面试必聊

实现方式：
  - LangChain 的 ParentDocumentRetriever
  - 小块: chunk_size=500, 用于 Embedding 和检索
  - 父块: chunk_size=2000, 用于生成 context

对比实验：
  Parent Document vs 普通检索 → 用 faithfulness + context_recall 综合评判
```

#### 分块策略对比矩阵

| 策略 | 精准度 | 上下文完整性 | 实现复杂度 | 适合场景 |
|------|--------|------------|-----------|---------|
| 固定大小分块 | ⭐⭐ | ⭐⭐ | ⭐ | 通用基线 |
| 语义分块 | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | 叙述性文本 |
| 按结构分块 | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | 结构化教材 |
| 小2大分块 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | 生产级 RAG |

### 3.4 设计要点

- **分块是 RAG 质量的根基**：分块不好，后面检索和生成再优化也救不回来
- **第1周用固定大小分块跑通**，第2周重点攻克高级分块策略
- **三种策略不是互斥的**：实际项目中可以组合使用（如结构分块 + 小2大）
- **元数据必须保留**：文件名、学科、页码、标题层级，这些是展示"引用来源"的基础
- **Unstructured 库是学习重点**：技能矩阵 🔴 必学的非结构化数据处理能力
- **中文文本清洗**：PDF 解析后可能有乱码、多余空格/换行，需要做基础规范化

---

## 四、检索策略设计

### 4.1 检索流程

```
用户问题: "牛顿第一定律是什么？"
  │
  ▼
┌─────────────────────────────┐
│ 1. Query 向量化              │
│    DeepSeek Embedding       │
│    → query_vector           │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│ 2. 向量检索                  │
│                              │
│  第1周: 余弦相似度检索        │
│    - cosine_similarity      │
│    - Top-K = 4              │
│                              │
│  第2周: MMR 检索             │
│    - 增加结果多样性           │
│    - λ = 0.5 (平衡参数)     │
│                              │
│  第2周(可选): 混合检索        │
│    - 向量检索 + BM25 关键词  │
│    - 互补: 语义 + 精确匹配   │
│                              │
│  输出: List[Document]        │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│ 3. 检索后处理（第2周）        │
│    - 重排序 (Rerank)        │
│    - 相关性过滤（阈值截断）   │
│    输出: List[Document]     │
└─────────────────────────────┘
```

### 4.2 检索策略演进路线

| 阶段 | 策略 | 参数 | 目标 |
|------|------|------|------|
| 第1周 | 余弦相似度 | Top-K=4 | 先跑通，建立基线 |
| 第2周 | MMR 检索 | Top-K=4, λ=0.5 | 提升结果多样性 |
| 第2周(可选) | BM25 混合检索 | 向量权重 0.7 + BM25 0.3 | 关键词 + 语义互补 |
| 第2周(可选) | Rerank 重排序 | — | 精准度再提升 |

### 4.3 设计要点

- **MMR (最大边际相关性)**：在相关性和多样性之间平衡。λ 越大越看重相关性，越小越看重多样性，0.5 是平衡起点
- **混合检索是面试加分项**：向量检索擅长语义但可能漏关键词，BM25 正好互补——这是面试高频话题
- **第2周做对照实验**：同一批问题用不同策略跑，用 RAGAS 指标量化差异
- **Top-K 不是越大越好**：K 太大会引入噪声，降低生成质量；K 太小可能遗漏关键信息

---

## 五、生成器 & Prompt 设计

### 5.1 生成流程

```
检索结果 (4个文档块)
  │
  ▼
┌─────────────────────────────────────┐
│         Prompt 模板组装              │
│                                     │
│  System Prompt + Context + Question │
│  → 拼接为一个完整 Prompt            │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│       DeepSeek LLM 生成              │
│                                     │
│  参数:                              │
│  - model: deepseek-chat            │
│  - temperature: 0.1                │
│  - max_tokens: 1024                │
│                                     │
│  输出:                              │
│  - answer: 生成的答案               │
│  - sources: 引用的文档块            │
└─────────────────────────────────────┘
```

### 5.2 Prompt 模板

```python
SYSTEM_PROMPT = """你是初中学科知识问答助手。请严格基于以下参考资料回答问题。

规则：
1. 如果资料中包含答案，准确引用并注明来源
2. 如果资料中不包含答案，请明确说"参考资料中未找到相关信息"
3. 回答要简洁清晰，适合初中生理解
4. 涉及公式、定理时，给出完整表述

参考资料：
{context}"""

USER_PROMPT = """问题：{question}

请回答："""
```

### 5.3 多轮对话（第3周）

第3周产品化时加入对话历史记忆：

```python
CONVERSATION_PROMPT = """你是初中学科知识问答助手。

对话历史：
{chat_history}

参考资料：
{context}

当前问题：{question}

请基于对话上下文和参考资料回答。"""
```

### 5.4 设计要点

- **temperature=0.1**：知识问答场景要确定性，不要创造性，防止幻觉
- **"诚实说不知道"是关键**：防止模型在检索不到时编造答案，这是 RAG 系统的基本素养
- **System Prompt 是调优重点**：第2周会对比不同 Prompt 模板的效果差异
- **多轮对话**：第3周加入，需管理对话历史窗口（最近 N 轮）

---

## 六、RAGAS 评估体系

### 6.1 评估流程

```
┌─────────────────────────────────────────────────────┐
│                  RAGAS 评估流程                       │
│                                                      │
│  测试集: 20个问题 + 标准答案（手动设计）               │
│                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────────┐   │
│  │ 问题 q_i  │ →  │ RAG 系统  │ →  │ 答案 a_i     │   │
│  │ 标准答案  │    │          │    │ 检索上下文 c_i│   │
│  └──────────┘    └──────────┘    └──────┬───────┘   │
│                                         │            │
│                                         ▼            │
│  ┌──────────────────────────────────────────────┐   │
│  │              RAGAS 4 指标                      │   │
│  │                                               │   │
│  │  ① faithfulness     — 答案是否忠于检索上下文？ │   │
│  │  ② answer_relevancy — 答案是否切题？           │   │
│  │  ③ context_recall   — 上下文是否覆盖标准答案？ │   │
│  │  ④ context_precision— 上下文是否噪声少？       │   │
│  │                                               │   │
│  │  综合评分 → 指导迭代方向                       │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 6.2 四指标详解

| 指标 | 衡量什么 | 低分说明 | 优化方向 |
|------|---------|---------|---------|
| **Faithfulness** | 答案是否忠于上下文？是否编造？ | 幻觉严重 | 优化 Prompt，强化"诚实说不知道" |
| **Answer Relevancy** | 答案是否切题？是否答非所问？ | 检索方向偏了 | 优化检索策略、Embedding 质量 |
| **Context Recall** | 检索是否找全了相关信息？ | 分块太粗或检索遗漏 | 调 chunk_size，增加 Top-K |
| **Context Precision** | 检索结果噪声多不多？ | Top-K 太大或相关性差 | 减 Top-K，加 Rerank，加阈值过滤 |

### 6.3 测试集设计

20 个问题覆盖三类：

| 类型 | 示例 | 数量 | 考察点 |
|------|------|------|--------|
| 简单事实型 | "牛顿第一定律是什么？" | ~8 题 | 基础检索 + 准确生成 |
| 概念解释型 | "为什么物体会有惯性？" | ~8 题 | 语义理解 + 多文档块整合 |
| 跨文档综合型 | "对比牛顿第一定律和第三定律" | ~4 题 | 跨文档检索 + 综合生成 |

### 6.4 评估节奏

| 时间点 | 动作 |
|--------|------|
| 第1周末 | 跑通 RAGAS，记录**基线分数** |
| 第2周末 | 优化后重新评估，输出**优化前后对比报告** |
| 第3周末 | 最终版本评估，记录 v1.0 分数 |

### 6.5 设计要点

- 测试集问题**手动设计**，确保覆盖不同难度和类型
- **基线分数是面试素材**：展示你如何从基线出发，通过实验驱动优化
- 4 个指标分别指导不同优化方向，不要只看总分

---

## 七、项目目录结构

```
rag-knowledge-qa/
├── .env.example              # API Key 配置模板
├── .gitignore
├── requirements.txt          # Python 依赖
├── README.md                 # 项目介绍 + 架构图 + 使用说明
│
├── data/
│   ├── pdfs/                 # 用户提供的 PDF 文件（gitignore）
│   └── chroma_db/            # Chroma 持久化存储（gitignore）
│
├── src/
│   ├── __init__.py
│   ├── config.py             # 配置管理（API Key、模型参数）
│   ├── pipeline.py           # 数据 Pipeline：加载→清洗→分块→向量化
│   ├── retriever.py          # 检索器：相似度/MMR/混合检索
│   ├── generator.py          # 生成器：Prompt 模板 + LLM 调用
│   ├── rag_chain.py          # 串联检索+生成的完整 Chain
│   └── evaluator.py          # RAGAS 评估脚本
│
├── app.py                    # Gradio Web 界面入口
│
├── notebooks/                # 实验 Notebook（可选）
│   └── experiments.ipynb
│
├── tests/
│   ├── test_pipeline.py
│   ├── test_retriever.py
│   ├── test_generator.py
│   └── test_evaluator.py
│
└── docs/
    └── knowledge/            # 知识点文档（边做边写）
        ├── 01-rag-architecture.md
        ├── 02-data-pipeline.md
        ├── 03-embedding-vectorstore.md
        ├── 04-retrieval-strategies.md
        ├── 05-prompt-engineering.md
        ├── 06-rag-evaluation.md
        └── 07-productization.md
```

---

## 八、技术栈清单

```txt
# requirements.txt
langchain>=0.3.0
langchain-community>=0.3.0
chromadb>=0.5.0
unstructured>=0.15.0
pypdf>=4.0.0
python-dotenv>=1.0.0
ragas>=0.2.0
gradio>=4.0.0
pandas>=2.0.0
openai>=1.0.0              # DeepSeek API 兼容 OpenAI SDK
```

---

## 九、三周阶段规划

### 9.1 第1周：最简 RAG 跑通（MVP）

> **目标**：100 行代码跑通全链路，命令行能回答问题

| 天 | 主题 | 具体任务 | 预估 |
|----|------|---------|------|
| Day 1 | 环境搭建 | ① 创建项目目录 `rag-knowledge-qa/` ② `pip install` 依赖 ③ 配置 `.env`（DeepSeek API Key） ④ 验证 DeepSeek Chat API ⑤ 验证 DeepSeek Embedding API 是否可用 → 不可用则启用 BGE-M3 fallback | 1-2h |
| Day 2 | 文档加载 | ① 用 LangChain Document Loader 加载 PDF ② 理解 Document 对象结构（page_content + metadata） ③ 用 Unstructured 做文本清洗 | 1-2h |
| Day 3 | 分块+向量化 | ① RecursiveCharacterTextSplitter 分块（chunk_size=1000, overlap=200） ② DeepSeek Embedding 向量化 ③ 存入 Chroma 持久化存储 | 1-2h |
| Day 4 | 检索+生成 | ① 实现余弦相似度检索（Top-K=4） ② 实现 RAG Chain：检索→拼 Prompt→LLM 生成 ③ 测试几个问题，观察回答质量 | 1-2h |
| Day 5 | 整理总结 | ① 代码整理、加注释 ② 写知识点文档（01/02/03/05） ③ 提交 GitHub | 1-2h |

**第1周产出：**
- 命令行版 RAG，能回答知识库问题了
- 知识点文档 × 4：RAG架构、数据Pipeline、Embedding+向量库、Prompt模板
- GitHub 首次提交

**第1周知识点文档：**
- `01-rag-architecture.md` — RAG 整体架构、离线/在线流程
- `02-data-pipeline.md` — 非结构化数据处理 + 分块策略（固定/语义/结构/小2大）
- `03-embedding-vectorstore.md` — Embedding 原理 + Chroma 使用
- `05-prompt-engineering.md` — Prompt 模板设计

### 9.2 第2周：检索质量优化

> **目标**：从"能跑"到"跑得好"，用数据驱动优化

| 天 | 主题 | 具体任务 | 预估 |
|----|------|---------|------|
| Day 1 | 分块策略实验 | ① 基础参数调优: chunk_size(500/1000/1500) + overlap(100/200/300) ② 实现语义分块 (SemanticChunker) ③ 实现按文档结构分块 ④ 实现小2大分块 (ParentDocumentRetriever) ⑤ 记录不同策略效果 | 1-2h |
| Day 2 | 检索策略优化 | ① 实现 MMR 检索（λ=0.5） ② 对比 相似度 vs MMR 效果 ③ 可选：BM25 混合检索 | 1-2h |
| Day 3 | 评估体系搭建 | ① 准备 20 个测试问题 + 标准答案 ② 写 RAGAS 评估脚本 ③ 跑第一版基线评估 | 1-2h |
| Day 4 | 迭代优化 | ① 根据 RAGAS 指标调整参数 ② 对比优化前后的评估分数 ③ 可选：加入 Rerank | 1-2h |
| Day 5 | 整理总结 | ① 更新代码 ② 写知识点文档（04/06） ③ 输出优化对比报告 ④ 提交 GitHub | 1-2h |

**第2周产出：**
- 优化后的检索器（支持多种策略切换）
- RAGAS 评估脚本 + 20 题测试集
- 优化前后对比报告（基线 → 优化后）
- 知识点文档 × 2：检索策略、RAG评估

**第2周知识点文档：**
- `04-retrieval-strategies.md` — 相似度检索、MMR、混合检索、Rerank
- `06-rag-evaluation.md` — RAGAS 4 指标、评估方法论

### 9.3 第3周：产品化

> **目标**：从脚本到可演示的 Web 应用

| 天 | 主题 | 具体任务 | 预估 |
|----|------|---------|------|
| Day 1-2 | Web 界面 | ① 用 Gradio ChatInterface 搭建 Web UI ② 功能：输入问题→显示回答→显示参考来源 ③ 美化界面 | 2-4h |
| Day 3-4 | 高级功能 | ① 多轮对话支持（对话历史记忆） ② 知识库管理（上传文档、删除、重新向量化） ③ 知识库列表（切换不同学科知识库） | 2-4h |
| Day 5 | 收尾 | ① 完整测试 ② 最终版 RAGAS 评估 ③ 写 README（项目介绍、架构图、使用说明） ④ 写知识点文档（07） ⑤ 提交 GitHub，打 v1.0 Tag | 1-2h |

**第3周产出：**
- Gradio Web 应用（可演示）
- 多轮对话 + 知识库管理
- 完整 README + 架构图
- 知识点文档 × 1：产品化
- GitHub v1.0 Tag

**第3周知识点文档：**
- `07-productization.md` — Gradio ChatInterface、多轮对话、部署注意事项

---

## 十、知识点文档体系

### 10.1 文档结构

```
docs/knowledge/
├── 01-rag-architecture.md       # RAG 整体架构
├── 02-data-pipeline.md          # 非结构化数据处理
├── 03-embedding-vectorstore.md  # Embedding + 向量数据库
├── 04-retrieval-strategies.md   # 检索策略
├── 05-prompt-engineering.md     # Prompt 模板设计
├── 06-rag-evaluation.md         # RAGAS 评估体系
└── 07-productization.md         # Gradio 产品化
```

### 10.2 文档模板

每篇知识点文档统一格式：

```markdown
# 标题

> 学习时间: YYYY-MM-DD | 所属阶段: 第X周

## 一、核心概念
（是什么、为什么、解决什么问题）

## 二、关键代码/用法
（核心代码片段 + 注释说明）

## 三、实验记录 & 踩坑
（遇到的问题 + 原因 + 解决方案）

## 四、面试可能会问
（这个知识点面试怎么考、怎么答）
```

### 10.3 知识点与周次对应

| 周次 | 产出的知识点文档 |
|------|-----------------|
| 第1周 | 01-RAG架构、02-数据Pipeline、03-Embedding+向量库、05-Prompt模板 |
| 第2周 | 04-检索策略、06-RAG评估 |
| 第3周 | 07-产品化 |

---

## 十一、配置文件设计

### 11.1 环境变量（.env）

```bash
# DeepSeek API
DEEPSEEK_API_KEY=sk-your-key-here
DEEPSEEK_BASE_URL=https://api.deepseek.com

# Chroma
CHROMA_PERSIST_DIR=./data/chroma_db

# Model 参数
LLM_MODEL=deepseek-chat
LLM_TEMPERATURE=0.1
LLM_MAX_TOKENS=1024

# 检索参数
RETRIEVER_TOP_K=4
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
```

### 11.2 config.py

```python
# src/config.py
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # DeepSeek
    DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
    DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")

    # LLM
    LLM_MODEL = os.getenv("LLM_MODEL", "deepseek-chat")
    LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.1"))
    LLM_MAX_TOKENS = int(os.getenv("LLM_MAX_TOKENS", "1024"))

    # Chroma
    CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./data/chroma_db")

    # Retriever
    RETRIEVER_TOP_K = int(os.getenv("RETRIEVER_TOP_K", "4"))
    CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "1000"))
    CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "200"))
```

---

## 十二、风险与应对

| 风险 | 可能性 | 应对 |
|------|--------|------|
| DeepSeek Embedding API 不可用 | 中 | Day 1 先验证；不可用则 fallback 到 BGE-M3 本地 Embedding（`pip install sentence-transformers`） |
| DeepSeek API 不稳定/限流 | 中 | 加 retry 机制，本地缓存已生成的答案 |
| PDF 解析质量差（扫描件） | 中 | 先用文本型 PDF，扫描件需 OCR（超出范围） |
| Chroma 持久化数据损坏 | 低 | pipeline.py 可重新构建，数据源（PDF）不会丢 |
| 时间不够 | 中 | 砍功能保核心：第1周必须跑通，第3周可简化高级功能 |
| 中文分块效果不好 | 中 | 第2周实验对比参数，必要时手动调整分隔符 |

---

## 十三、成功标准

### 13.1 第1周验收

- [ ] 运行 `python src/rag_chain.py` 能输入问题并得到回答
- [ ] 回答引用来源（显示出自哪个 PDF）
- [ ] 知识点文档 4 篇完成
- [ ] GitHub 提交

### 13.2 第2周验收

- [ ] 检索策略支持相似度/MMR 切换
- [ ] RAGAS 评估脚本可运行，输出 4 指标分数
- [ ] 优化后至少 2 个指标比基线提升 10%+
- [ ] 知识点文档 2 篇完成

### 13.3 第3周验收

- [ ] Gradio Web 界面可访问，输入问题返回答案
- [ ] 多轮对话正常工作
- [ ] README 完整（架构图 + 使用说明 + 技术栈 + 评估结果）
- [ ] GitHub v1.0 Tag
- [ ] 知识点文档 1 篇完成
- [ ] 全套 7 篇知识点文档完整

---

> **下一步**：评审通过后，用 writing-plans 生成详细的每日实施计划。
