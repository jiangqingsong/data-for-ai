# 检索策略

> 学习时间: 2026-06-07 | 所属阶段: 第2周

## 一、核心概念

**检索是 RAG 的质量瓶颈** — 检索到的文档不对，生成就不可能对。

**三种检索策略对比:**

| 策略 | 原理 | 适用场景 |
|------|------|---------|
| 余弦相似度 | 向量夹角余弦值，越接近1越相似 | 基准策略 |
| MMR | 在相关性和多样性间平衡 | 避免检索到重复内容 |
| 混合检索 | 向量(语义) + BM25(关键词) | 精确术语 + 语义理解 |

**MMR 的 λ 参数:**
- λ=1: 纯相似度排序（结果高度相似）
- λ=0: 纯多样性排序（可能跑题）
- λ=0.5: 平衡（推荐起点）

## 二、关键代码/用法

**本项目三种检索方式:**

```python
from src.retriever import Retriever

retriever = Retriever()

# 1. 相似度检索（基准）
docs = retriever.similarity_search("欧姆定律", top_k=4)

# 2. MMR 检索（增加多样性）
docs = retriever.mmr_search("欧姆定律", top_k=4, fetch_k=10, lambda_mult=0.5)

# 3. LangChain Retriever 接口（用于 Chain）
retriever_lc = retriever.get_retriever(search_type="similarity", top_k=4)
```

**检索策略对比实验:**

```python
from src.retriever import Retriever, run_retrieval_comparison

r = Retriever()
queries = ["欧姆定律", "电压 电阻 关系", "能量守恒"]
results = run_retrieval_comparison(r, queries, top_k=4)
# 输出每道题的 similarity 和 MMR 的页面分布 + 重叠数
```

**explore.py 交互式测试检索:**

```bash
python explore.py
>> search 欧姆定律     # 相似度检索
>> mmr 欧姆定律        # MMR 检索
>> top_k 6             # 调整返回数量
```

## 三、实验记录 & 踩坑

### 实验: similarity vs MMR 对比

测试了 3 个查询，MMR 确实引入了不同的页面：

| 查询 | Similarity 页面 | MMR 页面 | 重叠 |
|------|----------------|---------|------|
| 欧姆定律 | 77, 3, 79, 81 | 77, 3, 107, 35 | 2/4 |
| 电压电阻关系 | 78, 3, 77, 61 | 78, 77, 61, 107 | 3/4 |
| 能量守恒 | 185, 33, 91, 31 | 185, 33, 32, 107 | 2/4 |

**发现:** MMR 重叠约 2-3 个页面，同时引入了新页面（107 页出现 3 次），增加了多样性。

### 踩坑: Top-K 太小导致遗漏

- 默认 `top_k=4` 问"欧姆定律"没命中第 89 页的定义
- `top_k=6` 就命中了
- **教训:** 需要在 Task 10 通过 RAGAS context_recall 量化这个问题

## 四、面试可能会问

**Q: 向量检索和关键词检索各有什么优缺点？**
A: 向量检索擅长语义匹配（"汽车"能匹配"轿车"），但可能漏掉精确关键词。关键词检索精确但不懂同义词。混合检索取两者之长——面试时提一下能加分。

**Q: 为什么要用 Rerank？**
A: 第一轮检索（粗排）速度快但精度一般，Rerank（精排）用更强的模型对 Top-K 结果重新排序。是性价比最高的优化手段之一。本项目暂未实现，后续可加。

**Q: fetch_k 和 top_k 的关系？**
A: MMR 先检索 `fetch_k` 个候选（如 10 个），再从中选 `top_k` 个（如 4 个），选的时候平衡相关性和多样性。`fetch_k` 越大候选池越丰富，但计算也越多。
