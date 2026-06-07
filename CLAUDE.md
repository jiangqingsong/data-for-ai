# DATA for AI — 职业转型与技能提升

## 项目概述

从大数据开发（10年）向 AI 数据工程（DATA for AI）方向转型的实战项目。以项目驱动学习，逐步构建 AI 数据工程核心能力。

## 当前阶段

**项目一执行中** — RAG 知识库问答系统（3周计划）

**当前进度:** Task 1-10 ✅ → Task 11 ⏸️ (等你跑评估) → Task 12 ✅

**第1周 MVP 已完成** 🎉  **第2周代码全部完成，等你跑 RAGAS 基线评估**

**已完成:**
- Task 1-7: 第1周 MVP（项目初始化 / Pipeline / 检索器 / 生成器 / RAG Chain / 知识点文档 ×4）
- Task 8: 高级分块策略（语义/结构/小2大 + 对比实验）
- Task 9: 检索策略对比实验 (similarity vs MMR)
- Task 10: RAGAS 评估体系（evaluator + 20题测试集）
- Task 12: 第2周知识点文档 (04/06)
- Embedding: 火山引擎 `doubao-embedding-text-240715` (2560维)
- 工具: explore.py 交互式 Chroma 向量库探索
- 测试: 26 个测试全部通过

**RAGAS 基线分数 (top_k=4):**
| 指标 | 分数 | 说明 |
|------|------|------|
| Faithfulness | 0.9375 | 优秀，答案高度忠实于上下文 |
| Answer Relevancy | 0.9083 | 优秀，答案切题 |
| Context Recall | 0.2375 | ⚠️ 较弱，检索覆盖不足 |
| Context Precision | 0.7875 | 中等偏上 |
- 数据库: Chroma 本地持久化 (`data/chroma_db/`)
- 数据: `9年级物理-电子课本.pdf` → 188页 → 189个chunk
- Embedding: 火山引擎 doubao-embedding-text-240715, 2560维
- 探索工具: `.venv/Scripts/python explore.py` (search/mmr/stats/sample/page)

## 关键文档

- 转型计划: `docs/2026-06-02-career-ai-data-engineering-plan.md`
- 技术方案: `docs/superpowers/specs/2026-06-03-rag-knowledge-qa-design.md`
- 实施计划: `docs/superpowers/plans/2026-06-03-rag-knowledge-qa-plan.md`

## 👤 用户信息（跨设备同步）

### 职业背景

- **岗位：** 大数据开发工程师，10年经验
- **行业：** 汽车整车制造
- **当前工作内容：** 数据闭环云端数据管理、大模型应用数据支撑、数字化业务数据支撑
- **核心技术栈：** Spark / Flink / Hive / SQL / Python / 数据建模
- **AI/ML 水平：** 有接触但不深（用过 LLM API，了解基本概念）

### 职业转型目标

```
当前：大数据开发工程师（10年）
  │  6-12个月
  ▼
中期：AI 数据工程 / DATA for AI 工程师
  │  2-3年
  ▼
远期：AI 应用数据架构师 / ML Data Platform 负责人
```

**核心定位：** 不做 AI 算法科学家。做 AI 公司需要的数据工程老手——把 AI 落地的数据底座搭稳。

### 当前执行的项目

| 优先级 | 项目 | 周期 | 状态 |
|--------|------|------|------|
| 🔴 当前 | **项目一：RAG 知识库问答系统** | 3周 | 🟢 第1周执行中 |
| 🟡 后续 | **项目二：ExamAI AI数据工程改造版** | 2-3月 | ⏸️ 待项目一完成 |

### 时间投入

- 工作日：每天 1-2 小时（约 21:00-22:30）
- 周末：带娃，不安排学习任务

### 学习优先级

| 优先级 | 技能 | 目标 |
|--------|------|------|
| 🔴 必学 | RAG 架构 | 能独立搭建和优化 |
| 🔴 必学 | 向量数据库（Chroma → Milvus） | 熟练使用 |
| 🔴 必学 | 非结构化数据处理（Unstructured） | 能设计 pipeline |
| 🔴 必学 | LLM 应用开发（LangChain） | Agent 开发 |
| 🟡 重要 | 数据版本管理（LakeFS/DVC） | 了解概念 |
| 🟡 重要 | 特征存储（Feast） | 了解概念 |
| 🟡 重要 | MLOps 数据层 | 系统化理解 |
| 🟢 关注 | Prompt Engineering | 持续跟进 |

### 关键原则

- 以项目驱动学习，不纯看教程
- 每个阶段有可展示的产出（代码/GitHub/文档）
- 和工作深度结合，工作中找练手场景
- 不追热点，聚焦 DATA for AI 核心能力
- **不使用公司内部数据做项目，用公开数据源**

### 两台电脑协作

- 公司电脑 (Windows) + 家用电脑 (Mac)，通过 GitHub 同步
- **CLAUDE.md 是唯一的跨设备上下文文件**
- 新电脑：`git clone git@github.com:jiangqingsong/ExamAI.git`

**换电脑 setup checklist:**
1. `git pull` 拉代码
2. `python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
3. 创建 `~/.ai-env/llm/config.json`（敏感配置，跨平台统一路径）
4. 拷贝 PDF 到 `data/pdfs/`
5. 重建向量库: `python -m src.pipeline`
6. Mac 上运行: `python explore.py` (非 `.venv/Scripts/python`)

## Git

- 仓库: `git@github.com:jiangqingsong/ExamAI.git`
- 分支: `main`

## 技术环境

- **LLM:** 火山引擎 DeepSeek V4 (`deepseek-v4-pro-260425`), base_url: `https://ark.cn-beijing.volces.com/api/v3`
- **Embedding:** 火山引擎 `doubao-embedding-text-240715` (2560维, OpenAI 兼容接口, 需 `tiktoken_enabled=False`)
- **向量库:** Chroma 本地持久化, 数据不入 Git
- **敏感配置:** `~/.ai-env/llm/config.json` (跨平台, 项目外, 不入库)
- **Shell:** Windows 用 Git Bash, Mac 用 zsh
- **Python:** 必须用项目 `.venv/` 下的 Python, 不能用系统 `python3` (Windows Store 假 Python)

> Claude Code 推荐使用终端版 (PowerShell/Git Bash), VS Code 插件版在 Windows 上容易中断长任务。

---

> **下次新 Session 直接说"继续执行项目一 Task N"或"看实施计划，从 Task N 开始"。**
