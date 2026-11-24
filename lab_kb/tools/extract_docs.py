# -*- coding: utf-8 -*-
"""从 docx / pptx 中提取结构化文本并保存为 Markdown。"""
import os
import json
from docx import Document
from pptx import Presentation

SRC = {
    "简介": r"c:\Users\link\.trae-cn\attachments\37afd8ff-969d-42c0-a753-a0d209ab64d4_fe20475b-87b3-4318-ab2a-0503364d942a_福建省联迪移动支付研究与应用重点实验室简介.docx",
    "德国市场POS": r"c:\Users\link\.trae-cn\attachments\ce670bef-b823-4bb4-a99f-1ca8f01cc4f7_6bc2c92c-7c1b-4633-9d9c-3242dc94aa46_福建省联迪移动支付技术研究及应用重点实验室研发成果助力德国市场智能 POS 平台建设.docx",
    "2026整改方案": r"c:\Users\link\.trae-cn\attachments\a299f209-6b73-4e2b-b27b-b027f8f51067_d4fdcdc3-90f5-4337-92db-4802b4c225e3_附件：2026年福建省重点实验室整改工作方案【联迪】0910.docx",
    "硬件可靠性测试": r"c:\Users\link\.trae-cn\attachments\80467d49-f2d8-4ebf-9591-c7b0b70b3751_f4f10aaf-280b-464b-a618-e426f8d3e6ff_硬件和可靠性测试详细介绍.pptx",
}

OUT_DIR = r"e:\pythonProject\temp_20261102_01\lab_kb\data\raw_docs"
os.makedirs(OUT_DIR, exist_ok=True)


def extract_docx(path):
    doc = Document(path)
    lines = []
    for p in doc.paragraphs:
        t = p.text.strip()
        if not t:
            continue
        style = (p.style.name or "").lower()
        if "heading" in style or "标题" in style:
            level_emph = {"1": "## ", "2": "### ", "3": "#### "}.get(
                style[-1], "### ")
            lines.append(level_emph + t)
        else:
            lines.append(t)
    # 表格
    for ti, table in enumerate(doc.tables):
        lines.append(f"\n[表格{ti + 1}]")
        for row in table.rows:
            cells = [c.text.strip().replace("\n", " ") for c in row.cells]
            lines.append(" | ".join(cells))
    return "\n".join(lines)


def extract_pptx(path):
    prs = Presentation(path)
    parts = []
    for i, slide in enumerate(prs.slides, 1):
        texts, shapes = [], []
        for shape in slide.shapes:
            if shape.has_text_frame:
                txt = "\n".join(
                    p.text.strip() for p in shape.text_frame.paragraphs if p.text.strip())
                if txt:
                    texts.append(txt)
            if shape.shape_type == 19:  # 表格
                try:
                    for row in shape.table.rows:
                        texts.append(" | ".join(
                            c.text.strip().replace("\n", " ") for c in row.cells))
                except Exception:
                    pass
        body = "\n".join(texts).strip()
        if body:
            parts.append(f"## 幻灯片 {i}\n{body}")
    return "\n\n".join(parts)


def main():
    meta = {"简介": "福建省联迪移动支付研究与应用重点实验室简介",
            "德国市场POS": "研发成果助力德国市场智能POS平台建设",
            "2026整改方案": "2026年福建省重点实验室整改工作方案(联迪)",
            "硬件可靠性测试": "硬件和可靠性测试详细介绍"}
    index = {}
    for key, path in SRC.items():
        ext = os.path.splitext(path)[1].lower()
        md = extract_docx(path) if ext == ".docx" else extract_pptx(path)
        out = os.path.join(OUT_DIR, f"{key}.md")
        with open(out, "w", encoding="utf-8") as f:
            f.write(md)
        index[key] = {"file": key, "title": meta[key], "path": path,
                      "chars": len(md), "src_type": ext.lstrip(".")}
        print(f"[OK] {key}: {len(md)} 字符 -> {out}")
    with open(os.path.join(OUT_DIR, "_index.json"), "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()