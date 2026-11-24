# -*- coding: utf-8 -*-
"""Downscale poster pages for quick visual inspection."""
import pathlib, pymupdf

SRC = pathlib.Path(r"e:\pythonProject\temp_20261102_01\_work\poster_pages")
OUT = pathlib.Path(r"e:\pythonProject\temp_20261102_01\_work\poster_small")
OUT.mkdir(parents=True, exist_ok=True)
for p in sorted(SRC.glob("page_*.png")):
    doc = pymupdf.open(p)
    pix = doc[0].get_pixmap()  # raw
    scale = 520 / pix.width
    mat = pymupdf.Matrix(scale, scale)
    small = doc[0].get_pixmap(matrix=mat)
    small.save(OUT / p.name)
    print(p.name, pix.width, "x", pix.height, "->", small.width, "x", small.height)
    doc.close()