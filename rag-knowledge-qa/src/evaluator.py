"""RAGAS 评估模块 — 4 指标量化 RAG 系统质量

用法:
    python -m src.evaluator              # 运行完整评估
    python -m src.evaluator --compare    # 对比两次评估结果
"""
import json
from typing import List, Dict, Any


class RAGEvaluator:
    """RAGAS 评估器

    用法:
        evaluator = RAGEvaluator()
        scores = evaluator.evaluate_from_file("data/test_questions.json")
        evaluator.print_report(scores)
    """

    def __init__(self):
        from src.config import Config
        from langchain_openai import ChatOpenAI, OpenAIEmbeddings

        self.llm = ChatOpenAI(
            model=Config.LLM_MODEL,
            temperature=0.1,
            openai_api_key=Config.DEEPSEEK_API_KEY,
            openai_api_base=Config.DEEPSEEK_BASE_URL,
        )
        self.embeddings = OpenAIEmbeddings(
            model=Config.EMBEDDING_API_MODEL,
            openai_api_key=Config.DEEPSEEK_API_KEY,
            openai_api_base=Config.DEEPSEEK_BASE_URL,
            tiktoken_enabled=False,
            check_embedding_ctx_length=False,
        )
        # metrics 延迟初始化（避免 ragas 兼容性问题在测试中暴露）
        self._metrics = None

    def _init_metrics(self):
        """初始化 RAGAS 指标（延迟导入，避免 import 时触发 ragas 兼容性问题）"""
        from ragas.metrics import (
            faithfulness,
            answer_relevancy,
            context_recall,
            context_precision,
        )
        return [
            faithfulness,
            answer_relevancy,
            context_recall,
            context_precision,
        ]

    @property
    def metrics(self):
        if self._metrics is None:
            self._metrics = self._init_metrics()
        return self._metrics

    def _build_dataset(self, eval_data: List[Dict[str, Any]]):
        """将评估数据转换为 RAGAS Dataset 格式"""
        from datasets import Dataset
        records = {
            "question": [],
            "answer": [],
            "contexts": [],
            "ground_truth": [],
        }
        for item in eval_data:
            records["question"].append(item["question"])
            records["answer"].append(item["answer"])
            records["contexts"].append(item["contexts"])
            records["ground_truth"].append(item["ground_truth"])
        return Dataset.from_dict(records)

    def evaluate_from_file(
        self,
        test_file: str = "data/test_questions.json",
    ) -> Dict[str, Any]:
        """从测试文件读取问题，跑 RAG 系统，用 RAGAS 评估

        Args:
            test_file: 测试问题 JSON 文件路径

        Returns:
            评估结果字典，包含每个指标分数和详细数据
        """
        from src.rag_chain import RAGChain
        from ragas import evaluate

        rag_chain = RAGChain()

        # 读取测试问题
        with open(test_file, "r", encoding="utf-8") as f:
            test_data = json.load(f)

        # 逐题跑 RAG
        eval_data = []
        print(f"正在评估 {len(test_data)} 个问题...\n")
        for i, item in enumerate(test_data):
            print(f"[{i+1}/{len(test_data)}] {item['question'][:50]}...", end=" ")
            result = rag_chain.ask(item["question"])

            # 提取 context 文本列表（RAGAS 需要字符串列表）
            contexts = [
                doc.page_content for doc in result["context_docs"]
            ]

            eval_data.append({
                "question": item["question"],
                "answer": result["answer"],
                "contexts": contexts,
                "ground_truth": item["ground_truth"],
            })
            print(f"OK (ctx={len(contexts)} chunks)")

        # 构建 Dataset
        dataset = self._build_dataset(eval_data)

        # 运行 RAGAS 评估
        print(f"\n正在计算 RAGAS 指标...")
        scores = evaluate(
            dataset=dataset,
            metrics=self.metrics,
            llm=self.llm,
            embeddings=self.embeddings,
        )

        # 提取分数
        result = {}
        for metric_name in ["faithfulness", "answer_relevancy",
                            "context_recall", "context_precision"]:
            if metric_name in scores:
                result[metric_name] = round(
                    float(scores[metric_name]), 4
                )

        result["eval_data"] = eval_data
        result["_raw_scores"] = {
            k: float(v) for k, v in scores.items()
            if k != "eval_data"
        }
        return result

    def print_report(self, scores: Dict[str, Any]) -> None:
        """打印评估报告"""
        print("\n" + "=" * 60)
        print("RAGAS 评估报告")
        print("=" * 60)

        metric_labels = {
            "faithfulness": "忠实度 (Faithfulness)",
            "answer_relevancy": "答案相关性 (Answer Relevancy)",
            "context_recall": "上下文召回率 (Context Recall)",
            "context_precision": "上下文精确率 (Context Precision)",
        }

        for key, label in metric_labels.items():
            score = scores.get(key, None)
            if score is not None:
                bar = self._score_bar(score)
                print(f"  {label:32s}: {score:<8.4f} {bar}")
            else:
                print(f"  {label:32s}: N/A")

        print("=" * 60)

    def _score_bar(self, score: float, width: int = 20) -> str:
        """生成分数可视化条"""
        filled = int(score * width)
        return f"[{'█' * filled}{'░' * (width - filled)}]"

    def compare(
        self,
        baseline: Dict[str, Any],
        optimized: Dict[str, Any],
    ) -> Dict[str, Any]:
        """对比基线和优化后的评估结果"""
        comparison = {}
        for metric in ["faithfulness", "answer_relevancy",
                       "context_recall", "context_precision"]:
            base_score = baseline.get(metric, 0)
            opt_score = optimized.get(metric, 0)
            if base_score and opt_score:
                change = (opt_score - base_score) / base_score * 100
            else:
                change = 0
            comparison[metric] = {
                "baseline": base_score,
                "optimized": opt_score,
                "change_pct": round(change, 1),
            }
        return comparison


def main():
    """命令行入口 — 运行 RAGAS 评估"""
    import argparse

    parser = argparse.ArgumentParser(description="RAGAS 评估")
    parser.add_argument(
        "--compare", action="store_true",
        help="对比基线 (data/baseline_scores.json) 和当前评估"
    )
    parser.add_argument(
        "--save", action="store_true",
        help="保存当前评估结果为基线"
    )
    args = parser.parse_args()

    evaluator = RAGEvaluator()

    if args.compare:
        # 对比模式
        if not __import__("os").path.exists("data/baseline_scores.json"):
            print("未找到基线文件 data/baseline_scores.json")
            print("请先运行评估并保存基线: python -m src.evaluator --save")
            return

        with open("data/baseline_scores.json", "r", encoding="utf-8") as f:
            baseline = json.load(f)

        print("运行当前评估...")
        current = evaluator.evaluate_from_file("data/test_questions.json")

        comparison = evaluator.compare(baseline, current)

        print("\n" + "=" * 60)
        print("优化前后对比报告")
        print("=" * 60)
        for metric, data in comparison.items():
            change = data["change_pct"]
            arrow = "↑" if change > 0 else "↓" if change < 0 else "→"
            print(
                f"  {metric:25s}: {data['baseline']:.4f}"
                f" → {data['optimized']:.4f}"
                f"  ({arrow} {abs(change):.1f}%)"
            )
        print("=" * 60)

    else:
        # 评估模式
        scores = evaluator.evaluate_from_file("data/test_questions.json")
        evaluator.print_report(scores)

        if args.save:
            save_data = {
                k: v for k, v in scores.items() if k != "eval_data"
            }
            with open("data/baseline_scores.json", "w", encoding="utf-8") as f:
                json.dump(save_data, f, ensure_ascii=False, indent=2)
            print(f"\n基线已保存到 data/baseline_scores.json")


if __name__ == "__main__":
    main()
