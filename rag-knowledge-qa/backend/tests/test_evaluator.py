"""评估器测试 — RAGAS 评估体系"""
import pytest
from unittest.mock import patch, MagicMock


def test_evaluator_initialization():
    """评估器应能正常初始化（不触发 ragas import）"""
    from src.evaluator import RAGEvaluator
    evaluator = RAGEvaluator()
    assert evaluator is not None
    assert evaluator.llm is not None
    assert evaluator.embeddings is not None
    # metrics 延迟到实际评估时才加载


def test_score_bar():
    """分数可视化条应正确生成"""
    from src.evaluator import RAGEvaluator
    evaluator = RAGEvaluator()
    bar = evaluator._score_bar(0.75, width=10)
    assert len(bar) >= 10
    assert "█" in bar
    # 0.75 对应 10*0.75=7.5 → 7个实心
    assert bar.count("█") == 7


def test_score_bar_zero():
    """0分应全部空心"""
    from src.evaluator import RAGEvaluator
    evaluator = RAGEvaluator()
    bar = evaluator._score_bar(0.0, width=10)
    assert "█" not in bar
    assert "░" in bar


def test_score_bar_full():
    """满分应全部实心"""
    from src.evaluator import RAGEvaluator
    evaluator = RAGEvaluator()
    bar = evaluator._score_bar(1.0, width=10)
    assert "░" not in bar


def test_compare_returns_change_pct():
    """对比函数应计算变化百分比"""
    from src.evaluator import RAGEvaluator
    evaluator = RAGEvaluator()
    baseline = {"faithfulness": 0.6, "answer_relevancy": 0.7}
    optimized = {"faithfulness": 0.8, "answer_relevancy": 0.8}
    comparison = evaluator.compare(baseline, optimized)
    assert comparison["faithfulness"]["change_pct"] > 0
    assert comparison["answer_relevancy"]["change_pct"] > 0
    assert comparison["faithfulness"]["baseline"] == 0.6
    assert comparison["faithfulness"]["optimized"] == 0.8


def test_compare_with_improvement():
    """提升应显示正百分比"""
    from src.evaluator import RAGEvaluator
    evaluator = RAGEvaluator()
    baseline = {"context_precision": 0.5}
    optimized = {"context_precision": 0.6}
    comparison = evaluator.compare(baseline, optimized)
    assert comparison["context_precision"]["change_pct"] == 20.0


def test_compare_with_decline():
    """下降应显示负百分比"""
    from src.evaluator import RAGEvaluator
    evaluator = RAGEvaluator()
    baseline = {"context_recall": 0.5}
    optimized = {"context_recall": 0.4}
    comparison = evaluator.compare(baseline, optimized)
    assert comparison["context_recall"]["change_pct"] == -20.0
