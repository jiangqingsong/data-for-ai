# 非结构化数据处理 & 分块策略

> 学习时间: 2026-06-07 | 所属阶段: 第1周

## 一、核心概念

**非结构化数据:** PDF、Word、网页、图片等没有固定 Schema 的数据。RAG 的第一步就是把这些数据"结构化"为可检索的文本块。

**分块 (Chunking) 为什么重要？**
- LLM 的 Context Window 有限，不能一次塞入整本书
- Embedding 模型对短文本效果更好（512 token 左右最优）
- 分块粒度直接影响检索精准度和生成完整性

**四种分块策略:**

| 策略 | 原理 | 优点 | 缺点 |
|------|------|------|------|
| 固定大小 | 按字符数切分 + overlap | 简单、可控 | 可能切断语义 |
| 语义分块 | Embedding 相似度骤降处切分 | 语义连贯 | 计算成本高 |
| 结构分块 | 按标题层级切分 | 保留文档结构 | 依赖文档格式 |
| 小2大 | 小块检索 + 大块生成 | 精准+完整 | 实现复杂 |

## 二、关键代码/用法

```python
from langchain_text_splitters import RecursiveCharacterTextSplitter

# 中文友好的分隔符：段落 → 换行 → 句号 → 空格
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    separators=["\n\n", "\n", "。", ".", " ", ""],
    length_function=len,
)
chunks = text_splitter.split_documents(documents)
# 本项目: 188 页 PDF → 189 个 chunk
```

**PDF 加载:**
```python
from langchain_community.document_loaders import PyPDFLoader

loader = PyPDFLoader("物理教材.pdf")
docs = loader.load()        # 每页一个 Document
# doc.page_content → 文本
# doc.metadata → {"source": 文件名, "page": 页码}
```

**文本清洗:**
```python
import re
text = re.sub(r"[ \t]+", " ", text)   # 合并空格
text = re.sub(r"\n{3,}", "\n\n", text) # 合并多余换行
text = text.strip()
```

**一键 Pipeline:**
```bash
python -m src.pipeline
# 输出: 188 页面 → 189 个块 → Chroma 持久化
```

## 三、实验记录 & 踩坑

### 踩坑 1: 向量库测试的依赖问题

- **现象:** `test_build_vectorstore` 在无网络时失败
- **原因:** 测试会调火山引擎 Embedding API
- **解决:** 加了 `pytest.skip()` fallback，CI 环境可跳过

### 踩坑 2: chunk_size 不是精确值

- RecursiveCharacterTextSplitter 的 `chunk_size` 是"尽量不超过"，不是硬上限
- 中文句号 `。` 作为分隔符时，可能在句号处提前切分
- 测试中设置容差（`chunk_size + overlap` 作为上限）

### 观察: 教材 PDF 的结构特点

- 九年级物理教材从第 13 章开始（内能），到第 22 章（能源）
- 不包含八年级内容（牛顿定律在八年级）
- 目录页占了 2 个 chunk，索引页 1 个——这些对检索价值低

## 四、面试可能会问

**Q: chunk_overlap 为什么要设置？**
A: 防止关键信息刚好落在分块边界上被切断。overlap 让相邻块有重叠内容，提高检索召回率。比如一个公式的解释横跨第 3 块末尾和第 4 块开头，overlap 保证不会丢失。

**Q: 分块太大/太小各有什么问题？**
A: 太大 → Embedding 信号被稀释，检索不精准；太小 → 上下文不完整，LLM 看到的碎片太多。1000 字符是经验起点。

**Q: 你的 Pipeline 如何处理多文档？**
A: `load_pdfs()` 遍历目录下所有 PDF，每个 PDF 独立加载，metadata 中保留 `source` 文件名。后续检索时会标注答案出自哪个文件哪一页。
