# Gradio 产品化

> 学习时间: 2026-06-07 | 所属阶段: 第3周

## 一、核心概念

**产品化的意义:** 从脚本到产品，让非技术人员也能使用你的 RAG 系统。

**Gradio 的选择理由:**
- ChatInterface 组件开箱即用，自动管理对话历史
- 和 HuggingFace 生态无缝对接（可一键部署到 HuggingFace Spaces）
- 支持多轮对话、流式输出、自定义组件
- 比 Streamlit 更适合 ML/DL 场景

## 二、关键代码/用法

**启动 Web UI:**
```bash
python app.py
# 浏览器打开 http://localhost:7860
```

**ChatInterface 核心用法:**
```python
import gradio as gr

with gr.Blocks(title="RAG 知识库问答系统") as demo:
    with gr.Tab("💬 问答"):
        gr.ChatInterface(
            fn=ask_question,                    # 处理函数
            additional_inputs=[                 # 额外参数
                gr.Slider(1, 10, value=4, label="Top-K"),
                gr.Radio(["similarity", "mmr"], label="检索策略"),
            ],
        )
    with gr.Tab("⚙️ 管理"):
        # 知识库管理面板
        ...

demo.launch(server_name="0.0.0.0", server_port=7860)
```

**多轮对话支持:**
```python
# generator.py 中追加了对话历史 Prompt
CONVERSATION_SYSTEM_PROMPT = """...
规则：
4. 注意结合对话历史理解用户意图（如追问、指代等）
..."""

def generate_with_history(self, question, context_docs, chat_history):
    # 只保留最近 5 轮，拼接进 Prompt
    ...
```

## 三、实验记录 & 踩坑

### 踩坑 1: Gradio 6.x 与旧版 API 差异

- **现象:** 文档中的 `gr.themes.Soft()` 在新版中不存在
- **解决:** 去掉 theme 参数，使用默认主题
- **经验:** Gradio 版本更新快，API 变化大，看官方文档比看旧教程靠谱

### 观察: 多轮对话的实现取舍

- 方案 A: 每次检索都重新执行（本项目选择）— 简单但每次多调一次 API
- 方案 B: 只在第一轮检索，后续复用上下文 — 省 API 但可能丢失信息
- 本项目选 A，因为 189 个 chunk 量很小，检索成本可忽略

## 四、面试可能会问

**Q: RAG 系统产品化需要注意什么？**
A: ① 响应延迟（检索+生成两段，用户要等 2-5 秒）② 知识库更新机制（新增文档后需重建向量库）③ 引用来源展示（增加可信度）④ 错误处理（API 超时/限流的友好提示）⑤ 多轮对话的上下文管理。

**Q: Gradio vs Streamlit 怎么选？**
A: Gradio 擅长 ML/DL 场景（模型 demo、ChatBot），ChatInterface 开箱即用。Streamlit 更通用（数据看板、表单），自由度更高。本项目选 Gradio 因为 ChatInterface 省了 80% 的前端工作。

**Q: 多轮对话中的检索策略需要调整吗？**
A: 需要。追问时用户可能用"它""这个"等指代词，直接用原始 query 检索效果差。改进方案：用 LLM 先改写 query（Query Rewriting），把"它的公式是什么"改写成"欧姆定律的公式是什么"，再检索。
