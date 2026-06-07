# RAGAS 评估体系

> 学习时间: 2026-06-07 | 所属阶段: 第2周

## 一、核心概念

**RAGAS (RAG Assessment)** — RAG 系统的标准评估框架，使用 LLM-as-Judge 自动打分。

**四个指标:**

| 指标 | 衡量什么 | 低分说明 | 优化方向 |
|------|---------|---------|---------|
| **Faithfulness** | 答案是否忠于上下文？ | 幻觉严重 | 优化 Prompt，强化诚实机制 |
| **Answer Relevancy** | 答案是否切题？ | 检索方向偏了 | 优化检索策略、Embedding |
| **Context Recall** | 检索是否找全了？ | 分块太粗或检索遗漏 | 调 chunk_size，增加 top_k |
| **Context Precision** | 检索噪声多不多？ | top_k 太大或相关性差 | 减 top_k，加 Rerank |

**评估流程:**

```
测试集(20题+标准答案) → 跑RAG → 收集(问题/答案/上下文/标准答案)
→ RAGAS 打分 → 4指标报告
```

**为什么需要评估？**
- MVP 跑通后，"感觉不好"需要量化——哪个指标低就优化哪个
- 每次调参后重跑评估，确认"优化"是真的改善了还是换了一种方式变差
- 面试时有数据支撑：基线 X 分 → 优化后 Y 分，提升了 Z%

## 二、关键代码/用法

**运行评估:**

```bash
# 完整评估（20题，约需 10-20 分钟）
python -m src.evaluator

# 保存为基线
python -m src.evaluator --save

# 优化后对比
python -m src.evaluator --compare
```

**评估器使用:**

```python
from src.evaluator import RAGEvaluator

evaluator = RAGEvaluator()

# 跑评估
scores = evaluator.evaluate_from_file("data/test_questions.json")
evaluator.print_report(scores)
# 输出:
# ============================================================
# RAGAS 评估报告
# ============================================================
#   忠实度 (Faithfulness)           : 0.8500  [█████████████████░░░]
#   答案相关性 (Answer Relevancy)    : 0.7800  [███████████████░░░░░]
#   ...

# 对比优化前后
baseline = {"faithfulness": 0.70, "answer_relevancy": 0.72}
optimized = {"faithfulness": 0.85, "answer_relevancy": 0.78}
comparison = evaluator.compare(baseline, optimized)
# faithfulness: 0.70 → 0.85 (↑ 21.4%)
```

**测试集设计（20 题覆盖三类）:**

| 类型 | 数量 | 示例 | 考察点 |
|------|------|------|--------|
| 简单事实型 | ~9 题 | "欧姆定律是什么？" | 基础检索 + 准确引用 |
| 概念解释型 | ~9 题 | "串联和并联有什么区别？" | 语义理解 + 多块整合 |
| 跨文档综合型 | ~2 题 | "比较串并联，说明为什么家庭用并联？" | 跨文档检索 + 综合推理 |

## 三、实验记录 & 踩坑

### 踩坑 1: ragas 版本兼容性

- **现象:** `from ragas.metrics import faithfulness` 报 `ModuleNotFoundError: langchain_community.chat_models.vertexai`
- **原因:** ragas 0.4.3 依赖了 `ChatVertexAI`，但没有声明为必需依赖
- **解决:** `pip install langchain-google-vertexai`
- **教训:** ragas 的依赖管理不太严谨，新环境部署时可能遇到

### 踩坑 2: 评估器初始化触发 ragas import

- **问题:** 测试中 `RAGEvaluator()` 就会触发 ragas import，导致所有测试失败
- **解决:** metrics 改为延迟初始化（`@property`），只有实际评估时才加载 ragas

### 设计决策: 20 题全部用教材内容

- 全部基于九年级物理教材的实际内容设计
- 避免"教材里没有"的问题干扰评估
- 标准答案手动编写，确保准确性

## 四、面试可能会问

**Q: 你的 RAG 系统质量如何度量？**
A: 使用 RAGAS 四个指标。Faithfulness 衡量是否编造，Answer Relevancy 衡量是否答非所问，Context Recall/Precision 衡量检索质量。从基线出发，通过实验驱动优化——这是工程思维的核心。

**Q: 评估指标和用户满意度一致吗？**
A: 不一定。自动指标是必要的但不是充分的。Faithfulness 高不代表答案"好用"——比如答案正确但太啰嗦。最终还需要人工评估。但自动指标可以快速迭代，成本极低。

**Q: LLM-as-Judge 靠谱吗？**
A: 这是 RAGAS 的核心思路——用 LLM 给另一个 LLM 的输出打分。有争议但工程上非常实用。关键是用多个指标交叉验证，而不是只看一个分数。RAGAS 的四指标设计就是出于这个考虑。
