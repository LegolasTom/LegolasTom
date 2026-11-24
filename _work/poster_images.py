# -*- coding: utf-8 -*-
"""Dump per-page text blocks + embedded image bboxes of the poster, to plan device crops."""
import pathlib, pymupdf, json

PDF = r"c:\Users\link\.trae-cn\attachments\4cb8dcfb-44d1-4c8a-b071-6f6ad9afb752_b8e6f463-e073-4478-a51e-1fc8c65d5deb_实验室海报.pdf"
OUT = pathlib.Path(r"e:\pythonProject\temp_20261102_01\_work")
doc = pymupdf.open(PDF)

report = {}
for i, page in enumerate(doc):
    imgs = page.get_image_info(xrefs=True)
    info = []
    for im in imgs:
        r = im["bbox"]
        info.append({
            "bbox": [round(v, 1) for v in r],
            "size": im.get("size") or 0,
            "width": im.get("width"), "height": im.get("height"),
            "name": (im.get("name") or "" )[:40],
            "xres": im.get("xres"), "yres": im.get("yres"),
        })
    report[f"page_{i:02d}"] = {
        "rect": [page.rect.width, page.rect.height],
        "images": info,
    }
(out := OUT / "poster_imginfo.json").write_text(json.dumps(report, ensure_ascii=False, indent=1))
print("images per page:", {k: len(v["images"]) for k, v in report.items()})