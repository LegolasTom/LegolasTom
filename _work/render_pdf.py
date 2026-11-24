# -*- coding: utf-8 -*-
"""Render lab poster PDF pages to PNG (one per page) under _work/poster_pages/."""
import os, pathlib, pymupdf

PDF = r"c:\Users\link\.trae-cn\attachments\4cb8dcfb-44d1-4c8a-b071-6f6ad9afb752_b8e6f463-e073-4478-a51e-1fc8c65d5deb_实验室海报.pdf"
OUT = pathlib.Path(r"e:\pythonProject\temp_20261102_01\_work\poster_pages")
OUT.mkdir(parents=True, exist_ok=True)

doc = pymupdf.open(PDF)
print("pages:", len(doc))
for i, page in enumerate(doc):
    if i >= 12:
        break
    r = page.rect
    print(f"page {i}: {r.width:.0f}x{r.height:.0f}pt")
    mat = pymupdf.Matrix(200 / 72, 200 / 72)  # 200 dpi
    pix = page.get_pixmap(matrix=mat, alpha=False)
    fp = OUT / f"page_{i:02d}.png"
    pix.save(fp)
    print("  ->", fp, pix.width, "x", pix.height)