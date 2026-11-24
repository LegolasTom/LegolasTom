# -*- coding: utf-8 -*-
"""Crop embedded photos from the poster per page; attach nearest caption text for auto-naming."""
import json, pathlib, pymupdf

PDF = r"c:\Users\link\.trae-cn\attachments\4cb8dcfb-44d1-4c8a-b071-6f6ad9afb752_b8e6f463-e073-4478-a51e-1fc8c65d5deb_实验室海报.pdf"
WORK = pathlib.Path(r"e:\pythonProject\temp_20261102_01\_work")
CROPS = WORK / "crops"
CROPS.mkdir(parents=True, exist_ok=True)
info_all = json.loads((WORK / "poster_imginfo.json").read_text(encoding="utf-8"))
doc = pymupdf.open(PDF)

SCALE = 200 / 72  # matching earlier page renders at 200dpi

manifest = {}
for pno in range(len(doc)):
    page = doc[pno]
    key = f"page_{pno:02d}"
    imgs = info_all[key]["images"]
    # text blocks for caption proximity
    blocks = [b for b in page.get_text("blocks") if b[6] == 0]
    page_manifest = []
    seen = set()
    for idx, im in enumerate(imgs):
        x0, y0, x1, y1 = im["bbox"]
        w, h = x1 - x0, y1 - y0
        if w < 90 or h < 90:  # skip logos/icons/background fills
            continue
        # avoid near-duplicate overlapping boxes
        if any((x0 - a[1][0]) ** 2 + (y0 - a[1][1]) ** 2 < 900 and (x1 - a[1][2]) ** 2 + (y1 - a[1][3]) ** 2 < 900 for a in seen):
            continue
        seen.add((idx, (x0, y0, x1, y1)))
        pad = 6
        clip = pymupdf.Rect(max(x0 - pad, 0), max(y0 - pad, 0), min(x1 + pad, page.rect.width), min(y1 + pad, page.rect.height))
        pix = page.get_pixmap(matrix=pymupdf.Matrix(SCALE, SCALE), clip=clip, alpha=False)
        name = f"page_{pno:02d}_img{idx:02d}.png"
        pix.save(str(CROPS / name))
        # nearest caption: text block closest to image bottom-center
        mx, my = (x0 + x1) / 2, y1
        best, bd = None, 1e18
        for b in blocks:
            bx0, by0, bx1, by1, txt, *_ = b
            bxm, bym = (bx0 + bx1) / 2, (by0 + by1) / 2
            # prefer block whose top is below image bottom and horizontally near center
            if by0 >= y1 - 5:
                d = abs(bxm - mx) + max(0, by0 - y1) * 2
                if d < bd:
                    bd, best = d, txt.strip().replace("\n", " ")
            else:  # also consider block above (title-style)
                d = abs(bxm - mx) + (y0 - by1)
                if d < bd and d < 120:
                    bd, best = d, txt.strip().replace("\n", " ")
        page_manifest.append({
            "crop": name,
            "bbox_pt": [round(x0, 0), round(y0, 0), round(x1, 0), round(y1, 0)],
            "size_pt": [round(w, 0), round(h, 0)],
            "pixels": pix.width,
            "caption": best[:80] if best else None,
        })
    manifest[key] = page_manifest

(WORK / "crops_manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1))
for k, v in manifest.items():
    print(k, [(m["crop"], m["pixels"], m["caption"]) for m in v])