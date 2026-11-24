# -*- coding: utf-8 -*-
"""知识库查询/检索模块：可被外部 RAG 流程 import。"""
import json
import os

import numpy as np
from fastembed import TextEmbedding

ROOT = os.path.dirname(os.path.abspath(__file__))
STORE_DIR = os.path.join(ROOT, "store")


class LabKnowledgeBase:
    def __init__(self, store_dir=STORE_DIR):
        with open(os.path.join(store_dir, "config.json"), encoding="utf-8") as f:
            self.config = json.load(f)
        self.vectors = np.load(os.path.join(store_dir, "vectors.npy"))
        self.chunks = [json.loads(l) for l in open(
            os.path.join(store_dir, "chunks.jsonl"), encoding="utf-8")]
        self.model = TextEmbedding(self.config["model"])

    def _embed(self, text):
        return np.array(next(self.model.embed([text])), dtype=np.float32)

    def search(self, query, top_k=5, threshold=None):
        """语义检索，返回 [{score, text, meta, chars}]"""
        q = self._embed(query)
        q = q / (np.linalg.norm(q) or 1.0)
        scores = self.vectors @ q  # 已归一化，点积=余弦
        idx = np.argsort(-scores)
        results = []
        for i in idx[:top_k]:
            sc = float(scores[i])
            if threshold is not None and sc < threshold:
                continue
            results.append({"score": sc, **self.chunks[i]})
        return results


def format_result(r, width=200):
    meta = r["meta"]
    text = r["text"].replace("\n", " ")
    if len(text) > width:
        text = text[:width] + "..."
    head = f"[{r['score']:.3f}] {meta['doc']} / {meta['section']} / 块{meta['seq']}"
    return f"{head}\n    {text}"