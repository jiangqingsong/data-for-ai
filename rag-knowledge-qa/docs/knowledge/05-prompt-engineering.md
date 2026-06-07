# Prompt 模板设计

> 学习时间: 2026-06-07 | 所属阶段: 第1周

## 一、核心概念

RAG 场景的 Prompt 设计核心原则:

1. **角色设定:** 明确告诉 LLM 它是谁（"初中学科知识问答助手"）
2. **约束条件:** 限定基于参考资料回答，不能凭记忆编造
3. **诚实机制:** 不知道就说不知道，防止幻觉
4. **格式要求:** 引用来源、适合目标受众（初中生）

**为什么 RAG 的 Prompt 比普通对话重要？**
- 普通对话：LLM 自由发挥，幻觉是 feature（创意）
- RAG 问答：LLM 必须忠于检索结果，幻觉是 bug（编造）

## 二、关键代码/用法

**本项目的 Prompt 模板:**

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

**文档格式化:**
```python
def format_docs(docs):
    """将检索结果格式化为 Prompt 可用的上下文"""
    parts = []
    for i, doc in enumerate(docs, 1):
        source = doc.metadata.get("source", "未知来源")
        page = doc.metadata.get("page", "?")
        parts.append(f"[{i}] 来源: {source} (第{page}页)\n{doc.page_content}")
    return "\n\n".join(parts)
```

**LLM 调用参数:**
```python
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    model="deepseek-v4-pro-260425",  # 火山引擎
    temperature=0.1,                  # 低温度 = 确定性输出
    max_tokens=1024,
    openai_api_key=Config.DEEPSEEK_API_KEY,
    openai_api_base=Config.DEEPSEEK_BASE_URL,
)
response = llm.invoke(prompt)
```

## 三、实验记录 & 踩坑

### 观察 1: 诚实机制真的有效

- **测试:** 问"牛顿第一定律是什么？"（九年级教材不包含）
- **结果:** LLM 回答"参考资料中未找到相关信息"
- **验证:** Prompt 第 2 条规则起了作用

### 观察 2: 检索不足时 LLM 会"诚实但啰嗦"

- **测试:** `top_k=4` 问"欧姆定律"，检索到了相关章节但没到定义页
- **结果:** LLM 说"资料提到了欧姆定律章节，但没有给出具体表述"
- **评价:** 比编造好，但 `top_k=6` 就完美命中了
- **启示:** 检索质量决定 RAG 上限

### 观察 3: temperature=0.1 的表现

- 同一个问题多次问，答案基本一致
- 知识问答场景确实应该用低温度
- 如果是创意写作或对话，temperature=0.7~1.0 更合适

## 四、面试可能会问

**Q: temperature 参数在 RAG 场景应该怎么设？**
A: RAG 是知识问答，要确定性不要创造性，temperature 应设低（0~0.3）。设为 1.0 会导致答案不稳定甚至编造。但也不能设 0（某些 API 的 0 有特殊含义），0.1 是安全起点。

**Q: 什么是 RAG 中的幻觉 (Hallucination)？**
A: LLM 在检索不到相关信息时仍然"编造"了一个看起来合理的答案。比如教材里没有牛顿定律，但 LLM 凭训练记忆"背"出来——这看似正确，但失去了 RAG"基于资料回答"的意义。对抗方法: Prompt 中明确"不知道就说不知道"。

**Q: System Prompt 和 User Prompt 怎么分工？**
A: System Prompt 设规则和角色（"你是谁、遵守什么规则"），User Prompt 传具体问题和上下文。System Prompt 是"宪法"，User Prompt 是"这次的任务"。LangChain 的 ChatOpenAI 支持分别传入 system 和 user 消息，本项目拼接成一个字符串简化实现。
