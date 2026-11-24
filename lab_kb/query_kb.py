# -*- coding: utf-8 -*-
"""知识库查询命令行：python query_kb.py "你的问题" [-k 5] [--threshold 0.4]"""
import argparse
import sys

from kb_store import LabKnowledgeBase, format_result


def main():
    ap = argparse.ArgumentParser(description="实验室向量知识库语义查询")
    ap.add_argument("query", help="查询问题")
    ap.add_argument("-k", type=int, default=5, help="返回条数")
    ap.add_argument("--threshold", type=float, default=None, help="最低相似度阈值")
    args = ap.parse_args()

    kb = LabKnowledgeBase()
    results = kb.search(args.query, top_k=args.k, threshold=args.threshold)
    print(f"查询: {args.query}\n")
    if not results:
        print("未检索到相关内容")
    for i, r in enumerate(results, 1):
        print(f"#{i} " + format_result(r))
        print()


if __name__ == "__main__":
    main()