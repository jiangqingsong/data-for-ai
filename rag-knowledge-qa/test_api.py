#!/usr/bin/env python3
"""测试API响应时间"""
import time
import requests


def test_api_performance():
    """测试API性能"""
    print("=== API 性能测试 ===\n")

    # 测试健康检查
    print("1. 健康检查:")
    start_time = time.time()
    response = requests.get("http://localhost:5000/api/health")
    elapsed = time.time() - start_time
    print(f"   响应时间: {elapsed:.3f}s")
    print(f"   状态码: {response.status_code}")
    print(f"   响应: {response.text}\n")

    # 测试系统状态
    print("2. 系统状态:")
    start_time = time.time()
    response = requests.get("http://localhost:5000/api/system/status")
    elapsed = time.time() - start_time
    print(f"   响应时间: {elapsed:.3f}s")
    print(f"   状态码: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   服务状态: {data.get('status')}")
        print(f"   向量数量: {data.get('vector_count')}\n")

    # 测试知识库统计
    print("3. 知识库统计:")
    start_time = time.time()
    response = requests.get("http://localhost:5000/api/knowledge/stats")
    elapsed = time.time() - start_time
    print(f"   响应时间: {elapsed:.3f}s")
    print(f"   状态码: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   向量数量: {data.get('vector_count')}\n")

    # 测试问答API
    print("4. 问答API测试:")
    questions = [
        "欧姆定律是什么?",
        "牛顿第一定律的内容?",
        "浮力的计算公式?",
    ]

    for question in questions:
        print(f"\n   问题: {question}")
        start_time = time.time()
        try:
            response = requests.post(
                "http://localhost:5000/api/chat",
                json={
                    "question": question,
                    "top_k": 4,
                    "search_type": "similarity"
                }
            )
            elapsed = time.time() - start_time
            print(f"   响应时间: {elapsed:.3f}s")
            print(f"   状态码: {response.status_code}")

            if response.status_code == 200:
                data = response.json()
                print(f"   回答长度: {len(data.get('answer', ''))} 字符")
                print(f"   参考来源: {len(data.get('sources', []))} 个")
            else:
                print(f"   错误: {response.text}")

        except Exception as e:
            elapsed = time.time() - start_time
            print(f"   请求失败: {e}")
            print(f"   耗时: {elapsed:.3f}s")


if __name__ == "__main__":
    test_api_performance()
