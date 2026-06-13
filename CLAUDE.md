# DATA for AI — 职业转型与技能提升

## 项目概述

从大数据开发（10年）向 AI 数据工程（DATA for AI）方向转型的实战项目。以项目驱动学习，逐步构建 AI 数据工程核心能力。

## 当前阶段

**项目一** — RAG 知识库问答系统 ✅ 三周计划完成，进入迭代优化阶段

**当前进度:** Task 1-15 ✅ → 迭代5-6: 知识库管理 + UI升级 + 多知识库联动

**2026-06-11 更新（迭代5-6）:**
- 🆕 知识库管理: 后端 6 个 KB 管理 API（list/create/delete/stats/upload/pipeline）+ 前端 11 个 KB 组件
- 🆕 多知识库架构: `subdir` 参数贯穿全链路（RAGChain → Retriever → Config），PDF 和向量库按子目录分存
  - `data/pdfs/{kb_name}/` + `data/chroma_db/{kb_name}/`
  - 问答界面新增知识库选择器，切换后检索对应向量库
- 🆕 Pipeline 进度追踪: 后端 ThreadPoolExecutor 异步执行，前端轮询进度条（加载→清洗→分块→向量化）
- 🆕 文档溯源面板: 点击引用标签 → 右侧面板显示 PDF 原文页内容（pymupdf 按页提取）
- 🆕 推荐问题: 从 PDF 目录/TOC 自动提取章节标题，生成自然语言问句
- 🆕 知识库创建/删除乐观更新: 弹窗即时关闭，列表即时反映，后台静默同步，失败回滚+Toast提示
- 🆕 Pipeline 日志系统: `src/pipeline_logger.py`，日志写文件(`logs/{kb}_{timestamp}.log`)+内存缓冲区+控制台
  - 新增 API `GET /api/knowledge-bases/{name}/pipeline/logs` 返回实时日志
  - 前端进度条：成功/失败用不同颜色区分，失败态可展开 traceback 详情，可查看运行日志
- 🆕 Pipeline 启动前诊断: 检查目录存在性、PDF 有效性、文件列表，全部写入日志
- 🎨 UI 全面升级: 三列布局（侧栏+对话+溯源面板）、对话气泡、引用标签 `(参考资料N 第M页)`
- 🔧 Config 重构: `PDF_DIR` → `PDF_BASE_DIR`，新增 `get_pdf_dir(subdir)` / `get_chroma_dir(subdir)` 类方法
- 🔧 Pipeline CLI 升级: 支持 `--subdir` 参数 + argparse，`file_filter` 改为可选位置参数
- 🔧 explore.py 支持 `--subdir` 探索不同向量库
- 📝 生成器 prompt 新增引用格式规则: `(参考资料N 第M页)`

**2026-06-10 更新:**
- 🔧 修复: 后端代码移到 `backend/` 后相对路径问题（chroma_db、pdfs 路径修正为 `../data/`）
- 🔧 修复: 扫描版 PDF 支持 — `load_pdfs()` 改用 pymupdf + EasyOCR，自动检测扫描页并 OCR
- 📦 新依赖: `pymupdf`, `easyocr`, `Pillow`（已加入 requirements.txt）
- ⚠️ EasyOCR 在 Intel Mac CPU 上很慢（321页约50-90分钟），推荐在 Windows+1050Ti 上跑 pipeline
- 向量库跨平台同步: Windows 上 `tar -czf chroma_db.tar.gz data/chroma_db/` → 传到 Mac 解压

**已全部完成:**
- 第1周: Task 1-7 MVP（Pipeline / 检索器 / 生成器 / RAG Chain / 知识点 ×4）
- 第2周: Task 8-12 优化（高级分块 / 检索对比 / RAGAS 评估 / 知识点 ×2）
- 第3周: Task 13-15 产品化（React Web UI / 多轮对话 / README / 知识点 ×1）
- 迭代5: 知识库管理页面 + 问答知识库联动 + Pipeline进度追踪
- 迭代6: UI视觉升级 — 对话气泡、引用标签、输入栏重构、文档溯源面板
- 后端: `cd backend && python app_api.py` → http://localhost:8000
- 前端: `cd frontend && npm run dev` → http://localhost:5173
- 测试: `cd backend && python -m pytest tests/ -v` 26 passed

**RAGAS 基线分数 (top_k=4):**
| 指标 | 分数 | 说明 |
|------|------|------|
| Faithfulness | 0.9375 | 优秀，答案高度忠实于上下文 |
| Answer Relevancy | 0.9083 | 优秀，答案切题 |
| Context Recall | 0.2375 | ⚠️ 较弱，检索覆盖不足 |
| Context Precision | 0.7875 | 中等偏上 |

> 分析: 检索覆盖是主要瓶颈。top_k=4 常遗漏关键页（如欧姆定律定义在第89页但没被检索到）。下一轮优化方向: top_k → 6 或使用语义分块。

### 项目架构

```
data-for-ai/
├── data/
│   ├── pdfs/              # PDF_BASE_DIR，按知识库分子目录
│   │   ├── 9年级物理-电子课本.pdf   # 默认知识库
│   │   └── {kb_name}/     # 新建知识库的 PDF 目录
│   └── chroma_db/         # 向量库，按知识库分子目录
│       ├── ...            # 默认向量库文件
│       └── {kb_name}/     # 新建知识库的向量库
├── rag-knowledge-qa/
│   ├── backend/
│   │   ├── app_api.py     # FastAPI 主入口 (870行，含KB管理API)
│   │   ├── explore.py     # 向量库探索工具 (支持 --subdir)
│   │   └── src/
│   │       ├── config.py  # 配置 + get_pdf_dir()/get_chroma_dir()
│   │       ├── pipeline.py # PDF→向量库 (支持 --subdir)
│   │       ├── retriever.py # 检索器 (支持 subdir)
│   │       ├── generator.py # LLM 生成器 (引用格式规则)
│   │       └── rag_chain.py # RAG 编排 (支持 subdir)
│   └── frontend/
│       └── src/components/  # 26个 React 组件
│           ├── App.jsx          # 根组件 (570行，全局状态)
│           ├── ThreeColumnLayout.jsx  # 三列布局
│           ├── ChatView.jsx     # 对话视图
│           ├── InputBar.jsx     # 输入栏（含KB选择器）
│           ├── RightPanel.jsx   # 文档溯源面板
│           ├── KBLeftPanel.jsx  # KB列表面板
│           ├── KBRightPanel.jsx # KB详情面板
│           └── ...              # 更多KB管理组件
```

- 数据库: Chroma 本地持久化 (`data/chroma_db/`)，支持多知识库子目录
- 数据: `9年级物理-电子课本.pdf` → 188页 → 189个chunk
- Embedding: 火山引擎 doubao-embedding-text-240715, 2560维
- 探索工具: `cd backend && python explore.py [--subdir kb_name]` (search/mmr/stats/sample/page)
- Pipeline: `cd backend && python -m src.pipeline [--subdir kb_name] [file_filter]`
- 前端构建: `cd frontend && npm run build` → `frontend/dist/`

### 知识库管理 API 速查

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/knowledge-bases` | 列出所有知识库 |
| POST | `/api/knowledge-bases` | 创建知识库 `{name}` |
| DELETE | `/api/knowledge-bases/{name}` | 删除知识库及所有数据 |
| GET | `/api/knowledge-bases/{name}/stats` | 获取KB统计（文档数/向量数/chunks） |
| POST | `/api/knowledge-bases/{name}/upload` | 上传PDF到知识库 |
| POST | `/api/knowledge-bases/{name}/pipeline` | 触发Pipeline（异步） |
| GET | `/api/knowledge-bases/{name}/pipeline/status` | 查询Pipeline进度 |

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
| 🔴 当前 | **项目一：RAG 知识库问答系统** | 3周+迭代 | 🟢 迭代优化中 |
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
4. 拷贝 PDF 到 `data/pdfs/`（或按知识库分目录: `data/pdfs/{kb_name}/`）
5. 重建向量库: `cd backend && python -m src.pipeline`（默认库）或 `python -m src.pipeline --subdir kb_name`（指定知识库）
   - Windows+GPU 推荐，Mac CPU 很慢（EasyOCR）
   - 或从另一台电脑打包传输: `tar -czf chroma_db.tar.gz data/chroma_db/`
6. 前端: `cd frontend && npm install && npm run dev`
7. 探索工具: `cd backend && python explore.py [--subdir kb_name]`

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
