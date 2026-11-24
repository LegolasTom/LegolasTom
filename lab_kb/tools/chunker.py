# -*- coding: utf-8 -*-
"""分块器：把提取的 Markdown 文档切成带元数据的检索块。"""
import re
import json
import os

MAX_CHARS = 350      # 单块目标上限
MIN_CHARS = 60       # 短文本（不足则与相邻合并）
OVERLAP = 60         # 长段切分时的重叠字符


def _split_sentences(text):
    parts = re.split(r'(?<=[。！？；])', text)
    return [p.strip() for p in parts if p.strip()]


def _make_chunks_from_paras(paras, section, doc_title, doc_type):
    """把一个章节下的段落聚合成块。"""
    chunks = []
    buf, buf_len = [], 0
    for para in paras:
        if len(para) <= MAX_CHARS:
            if buf and buf_len + len(para) + 1 > MAX_CHARS:
                chunks.append("\n".join(buf))
                buf, buf_len = [para], len(para)
            else:
                buf.append(para)
                buf_len += len(para) + 1
        else:
            if buf:
                chunks.append("\n".join(buf))
                buf, buf_len = [], 0
            # 超长段落按句切分
            tail = ""
            for sentence in _split_sentences(para):
                if len(tail) + len(sentence) + 1 > MAX_CHARS and len(tail) >= MIN_CHARS:
                    chunks.append(tail)
                    tail = tail[-OVERLAP:] + sentence if OVERLAP else sentence
                else:
                    tail = tail + sentence if not tail else tail + sentence
            if tail:
                buf.append(tail)
                buf_len = len(tail)
    if buf:
        chunks.append("\n".join(buf))
    # 合并过短的块
    merged = []
    for c in chunks:
        if merged and len(c) < MIN_CHARS and len(merged[-1]) + len(c) < MAX_CHARS:
            merged[-1] = merged[-1] + "\n" + c
        else:
            merged.append(c)
    chunks = merged

    result = []
    for i, c in enumerate(chunks):
        result.append({
            "text": c,
            "meta": {
                "doc": doc_title,
                "doc_type": doc_type,
                "section": section,
                "seq": i,
            },
            "chars": len(c),
        })
    return result


def parse_md(path):
    """把 md 解析为 [(section_heading, [paragraph,...]), ...]"""
    with open(path, encoding="utf-8") as f:
        text = f.read()
    title, body = None, text
    lines = text.splitlines()
    sections, cur_sec, cur_paras = [], "(未分类)", []
    for raw in lines:
        line = raw.strip()
        if not line:
            continue
        if line.startswith("#"):
            if cur_paras:
                sections.append((cur_sec, cur_paras))
            cur_sec = re.sub(r'^#+\s*', '', line)
            cur_paras = []
            if title is None and cur_sec:
                title = cur_sec
        else:
            cur_paras.append(line)
    if cur_paras:
        sections.append((cur_sec, cur_paras))
    return title, sections


def chunk_document(path, doc_title, doc_type):
    title, sections = parse_md(path)
    chunks = []
    for sec, paras in sections:
        chunks.extend(_make_chunks_from_paras(paras, sec, doc_title, doc_type))
    return chunks


def chunk_all(raw_dir):
    index_path = os.path.join(raw_dir, "_index.json")
    with open(index_path, encoding="utf-8") as f:
        index = json.load(f)
    all_chunks = []
    for key, info in index.items():
        path = os.path.join(raw_dir, f"{key}.md")
        chunks = chunk_document(path, info["title"], info["src_type"])
        for c in chunks:
            c["meta"]["file"] = key
        all_chunks.extend(chunks)
        print(f"[分块] {key}: {len(chunks)} 块")
    return all_chunks


if __name__ == "__main__":
    from pprint import pprint
    chunks = chunk_all(r"e:\pythonProject\temp_20261102_01\lab_kb\data\raw_docs")
    print("\n总块数:", len(chunks))
    for c in chunks[:6]:
        pprint({"doc": c["meta"]["doc"], "section": c["meta"]["section"],
                "chars": c["chars"], "text": c["text"][:80] + "..."})