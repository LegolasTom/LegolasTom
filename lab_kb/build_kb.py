# -*- coding: utf-8 -*-
"""构建向量化知识库：分块 -> 向量化 -> 持久化到 store。"""
import json
import os

import numpy as np
from fastembed import TextEmbedding

ROOT = os.path.dirname(os.path.abspath(__file__))
RAW_DIR = os.path.join(ROOT, "data", "raw_docs")
STORE_DIR = os.path.join(ROOT, "store")
CHUNK_DIR = os.path.join(ROOT, "data")

MODEL_NAME = "BAAI/bge-small-zh-v1.5"
BATCH = 32


def main():
    import sys
    sys.path.insert(0, os.path.join(ROOT, "tools"))
    from chunker import chunk_all

    chunks = chunk_all(RAW_DIR)
    print(f"[构建] 共 {len(chunks)} 个文本块，开始向量化（模型 {MODEL_NAME}）...")

    model = TextEmbedding(MODEL_NAME)
    texts = [c["text"] for c in chunks]
    vectors = np.vstack([np.array(v, dtype=np.float32)
                         for v in model.embed(texts, batch_size=BATCH)])
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    vectors = vectors / norms  # 归一化，查询时直接点积即余弦相似度

    os.makedirs(STORE_DIR, exist_ok=True)
    np.save(os.path.join(STORE_DIR, "vectors.npy"), vectors)
    with open(os.path.join(STORE_DIR, "chunks.jsonl"), "w", encoding="utf-8") as f:
        for c in chunks:
            f.write(json.dumps(c, ensure_ascii=False) + "\n")
    config = {
        "model": MODEL_NAME,
        "dim": int(vectors.shape[1]),
        "num_chunks": int(vectors.shape[0]),
        "normalized": True,
        "built_at": "2026-11-02",
    }
    with open(os.path.join(STORE_DIR, "config.json"), "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)

    print(f"[完成] 向量维度 {vectors.shape[1]}，共 {vectors.shape[0]} 块，已保存到 {STORE_DIR}")


if __name__ == "__main__":
    main()