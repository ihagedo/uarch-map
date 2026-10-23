#!/usr/bin/env python3
"""build.py
Isaac Hagedorn, 2026-10-04
Build the map page from kb/<core>.json and site/layout/<core>.yaml into one self-contained HTML file.
"""

import json
import os
import sys

import yaml

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tools", "kb"))
from model import CONF_NAME, CONF_RANK, KB, ROOT  # noqa: E402

SRC = os.path.join(ROOT, "site", "src")
OUT = os.path.join(ROOT, "build", "site")

# geometry, in SVG user units (1 unit = 1 CSS px at scale 1)
MARGIN = 16
COL_W, COL_GAP = 156, 36  # a gutter holds about three link lanes
HEAD_H = 40  # stage-column header strip
FRAME_PAD, FRAME_LABEL = 11, 26
BOX_HEAD, ROW_H, BOX_FOOT = 30, 17, 9
LINE_H = 12.5  # each extra line of a row whose value wraps
ROW_FONT = 10.5
ROW_TEXT = 156 - 31  # from the confidence pin's column to the value's right edge
STACK_GAP, BAND_GAP = 24, 26  # links can cross between stacked boxes
L1_BOX_H = 132  # a collapsed region at L1


def fmt(value, approx=False, limit=None):
    if value is None:
        return "—"
    if isinstance(value, bool):
        s = "yes" if value else "no"
    else:
        s = str(value)
    if approx and isinstance(value, (int, float)) and not isinstance(value, bool):
        s = "~" + s
    if limit and len(s) > limit:
        s = s[: limit - 1] + "…"
    return s


def conjecture_short(p):
    """A conjecture's bound for a map box: '64-128?' or '~160?'; a plain hole stays a dash."""
    c = p.conjecture
    if not c:
        return fmt(None)
    if c.get("range"):
        lo, hi = c["range"]
        return f"{lo:g}-{hi:g}?"
    if c.get("value") is None:
        return "?"
    return f"{'~' if c.get('approx') else ''}{c['value']}?"


# text width estimates by character class (narrow, wide, capital, digit), in px at a given font size
NARROW = set("iljtfrI.,:;'|!()[] 1")
WIDE = set("mwMW@")
UPPER = set("ABCDEFGHJKLNOPQRSTUVXYZ")


def text_width(s, size, mono=False):
    if mono:
        return len(s) * size * 0.62
    w = sum(
        0.32 if c in NARROW else 0.88 if c in WIDE else 0.68 if c in UPPER else 0.58 if c.isdigit() else 0.54
        for c in s
    )
    return w * size * 1.04


def fit(s, width, mono=False):
    """s cut at a word so it fits width, with an ellipsis."""
    if text_width(s, ROW_FONT, mono) <= width:
        return s
    while s and text_width(s + "…", ROW_FONT, mono) > width:
        s = s[:-1] if " " not in s.strip() else s.rstrip().rsplit(" ", 1)[0]
    return s.rstrip(" ,;") + "…"


def wrap(s, width, lines, mono=True):
    """s in at most `lines` lines of width, broken at spaces; the last line takes an ellipsis if cut."""
    out, cur = [], ""
    for word in s.split(" "):
        t = f"{cur} {word}".strip()
        if text_width(t, ROW_FONT, mono) <= width or not cur:
            cur = t
        else:
            out.append(cur)
            cur = word
    out.append(cur)
    if len(out) > lines:
        out = out[: lines - 1] + [fit(" ".join(out[lines - 1 :]), width, mono)]
    return [fit(x, width, mono) for x in out]


def box_value(p):
    return fmt(p.value, p.approx) if p.known else conjecture_short(p)


def box_rows(block):
    """Each parameter row of a stage box: label and value on one line when they fit, otherwise the label on
    its own line and the value below it, wrapped to three lines at most (the dossier has it in full)."""
    rows, y = [], 0.0
    for p in block.params:
        room = ROW_TEXT - (13 if p.open_disputes else 0)
        label, value = p.label, box_value(p)
        if text_width(label, ROW_FONT) + 8 + text_width(value, ROW_FONT, True) <= room:
            lines, split = [value], False
        else:
            label, lines, split = fit(label, room), wrap(value, ROW_TEXT, 3), True
        h = ROW_H + (LINE_H * len(lines) if split else 0)
        rows.append({"pid": p.id, "y": y, "h": h, "label": label, "value": lines, "split": split})
        y += h
    return rows


def box_height(block):
    return BOX_HEAD + (sum(r["h"] for r in box_rows(block)) if block.params else ROW_H) + BOX_FOOT


def geometry(kb, layout):
    cols = {c["id"]: i for i, c in enumerate(layout["columns"])}
    colx = {cid: MARGIN + i * (COL_W + COL_GAP) for cid, i in cols.items()}
    width = 2 * MARGIN + len(cols) * COL_W + (len(cols) - 1) * COL_GAP
    columns = [
        {"id": c["id"], "label": c["label"], "x": colx[c["id"]], "w": COL_W} for c in layout["columns"]
    ]

    placed, frames, boxes = set(), [], {}
    l1_frames = []
    y2 = y1 = MARGIN + HEAD_H
    for band in layout["bands"]:
        band_h2 = band_h1 = 0
        for fr in band["frames"]:
            fid = fr.get("region") or fr["id"]
            used = [cols[c] for c in fr["cells"]]
            x0 = MARGIN + min(used) * (COL_W + COL_GAP) - FRAME_PAD
            x1 = MARGIN + max(used) * (COL_W + COL_GAP) + COL_W + FRAME_PAD
            tallest = 0
            members = []
            for cid, bids in fr["cells"].items():
                y = y2 + FRAME_LABEL + FRAME_PAD
                for bid in bids:
                    if bid not in kb.blocks:
                        raise SystemExit(f"layout: unknown block {bid}")
                    if bid in placed:
                        raise SystemExit(f"layout: block {bid} placed twice")
                    placed.add(bid)
                    b = kb.blocks[bid]
                    h = box_height(b)
                    boxes[bid] = {
                        "x": colx[cid],
                        "y": y,
                        "w": COL_W,
                        "h": h,
                        "frame": fid,
                        "rows": box_rows(b),
                    }
                    members.append(b)
                    y += h + STACK_GAP
                tallest = max(tallest, y - STACK_GAP - y2)
            fh = tallest + FRAME_PAD
            region = kb.blocks.get(fr.get("region"))
            params = [p for b in members for p in b.params]
            frame = {
                "id": fid,
                "label": region.name if region else fr["label"],
                "x": x0,
                "w": x1 - x0,
                "desc": region.description if region else fr.get("description", ""),
                "blocks": [b.id for b in members],
                "params": [p.id for p in params],
                "conf": aggregate(params),
                "known": sum(p.known for p in params),
            }
            frames.append({**frame, "y": y2, "h": fh})
            l1_frames.append({**frame, "y": y1, "h": L1_BOX_H})
            band_h2 = max(band_h2, fh)
            band_h1 = max(band_h1, L1_BOX_H)
        y2 += band_h2 + BAND_GAP
        y1 += band_h1 + BAND_GAP

    expected = {b.id for b in kb.blocks.values() if b.level == 2}
    missing = expected - placed
    if missing:
        raise SystemExit(f"layout: L2 blocks not placed: {sorted(missing)}")
    return {
        "L2": {
            "width": width,
            "height": y2 - BAND_GAP + MARGIN,
            "columns": columns,
            "frames": frames,
            "boxes": boxes,
        },
        "L1": {"width": width, "height": y1 - BAND_GAP + MARGIN, "columns": columns, "frames": l1_frames},
        "bands": [[fr.get("region") or fr["id"] for fr in band["frames"]] for band in layout["bands"]],
        "metrics": {
            "margin": MARGIN,
            "headH": HEAD_H,
            "colGap": COL_GAP,
            "boxHead": BOX_HEAD,
            "rowH": ROW_H,
            "lineH": LINE_H,
            "frameLabel": FRAME_LABEL,
            "framePad": FRAME_PAD,
        },
    }


def structures(kb, layout):
    """L3 views from the layout; fails on any block, param, claim or mechanism the KB lacks."""
    out = {}
    for sid, st in (layout.get("structures") or {}).items():
        for bid in st["blocks"]:
            if bid not in kb.blocks:
                raise SystemExit(f"layout: structure {sid} names unknown block {bid}")
        refs = list((st.get("params") or {}).values())
        refs += [
            v for pr in st.get("probes", []) for k, v in pr.items() if k in ("window", "rows", "per_row")
        ]
        for pid in refs:
            if pid not in kb.params:
                raise SystemExit(f"layout: structure {sid} names unknown param {pid}")
        for mid in st.get("mechanisms") or []:
            if mid not in kb.mechanisms:
                raise SystemExit(f"layout: structure {sid} names unknown mechanism {mid}")
        claims = list((st.get("claims") or {}).values())
        claims += [
            cid
            for row in st.get("apparent") or []
            for k, cid in row.items()
            if k in ("load", "store") and cid
        ]
        claims += [r["claim"] for rs in (st.get("roles") or {}).values() for r in rs]
        for cid in claims:
            if cid not in kb.claims:
                raise SystemExit(f"layout: structure {sid} names unknown claim {cid}")
        out[sid] = dict(st)
    return out


def aggregate(params):
    """Block.confidence's rule over any set of params (a frame)."""
    if not params:
        return "unknown"
    return CONF_NAME[int(sum(CONF_RANK[p.confidence] for p in params) / len(params) + 0.5)]


def view_data(kb, geo):
    def region_of(b):
        while b.parent is not None and b.level > 1:
            b = b.parent
        return b

    return {
        "core": kb.core,
        "counts": {
            "blocks": len(kb.blocks),
            "params": len(kb.params),
            "claims": len(kb.claims),
            "holes": len(kb.holes),
            "sources": len(kb.sources),
            "disputes": len(kb.open_disputes),
            "known": len(kb.params) - len(kb.holes),
        },
        "blocks": {
            b.id: {
                "name": b.name,
                "stage": b.stage,
                "level": b.level,
                "parent": b.parent.id if b.parent else None,
                "region": region_of(b).name if b.parent else None,
                "desc": b.description,
                "conf": aggregate(b.params) if b.params else b.confidence,
                "blackBox": not any(p.known for p in b.params) if b.params else b.black_box,
                "deriv": b.best_derivation,
                "disputed": bool(b.open_disputes),
                "params": [p.id for p in b.params],
            }
            for b in kb.blocks.values()
        },
        "params": {
            p.id: {
                "block": p.block.id,
                "name": p.name,
                "label": p.label,
                "value": fmt(p.value, p.approx),
                "num": p.value
                if isinstance(p.value, (int, float)) and not isinstance(p.value, bool)
                else None,
                "approx": p.approx,
                "short": fmt(p.value, p.approx, limit=9) if p.known else conjecture_short(p),
                "unit": p.unit or "",
                "known": p.known,
                "status": p.status,
                "conf": p.confidence,
                "conj": p.conjecture,
                "judgment": p.judgment,
                "simKey": p.sim_key,
                "mechanism": p.mechanism.id if p.mechanism else None,
                "for": [c.id for c in p.supporting],
                "against": [c.id for c in p.contradicting],
                "disputes": [
                    {
                        "claims": [c.id for c in d.claims],
                        "note": d.note,
                        "resolution": d.resolution,
                        "resolvedBy": d.resolved_by,
                        "ours": d.ours,
                    }
                    for d in p.disputes
                ],
            }
            for p in kb.params.values()
        },
        "claims": {
            c.id: {
                "text": c.text,
                "source": c.source.id,
                "loc": c.loc,
                "deriv": c.derivation,
                "value": fmt(c.value, c.approx) if c.value is not None else None,
                "quote": c.quote,
                "chip": c.chip,
            }
            for c in kb.claims.values()
        },
        "questions": kb.questions,
        "sources": {
            s.id: {
                "cite": s.cite,
                "author": s.cite.rsplit(" ", 1)[0] if s.year else s.cite,
                "title": s.title,
                "type": s.type,
                "url": s.url,
                "ours": s.ours,
                "claims": sum(1 for c in kb.claims.values() if c.source is s),
            }
            for s in kb.sources.values()
        },
        "mechanisms": {
            m.id: {
                "name": m.name,
                "status": m.status,
                "block": m.block.id if m.block else None,
                "chip": m.chip,
                "description": m.description,
                "params": [p.id for p in m.params],
                "claims": [c.id for c in m.claims],
                "simSwitch": m.sim_switch,
                "test": m.detection_rule,
                "ours": m.ours,
                "basis": [c.id for c in m.basis],
                "alternative": m.alternative,
                "judgment": m.judgment,
            }
            for m in kb.mechanisms.values()
        },
        "links": [
            {"from": lk.src.id, "to": lk.dst.id, "kind": lk.kind, "label": lk.label} for lk in kb.links
        ],
        "views": geo,
    }


def main():
    core = sys.argv[1] if len(sys.argv) > 1 else "firestorm"
    kb = KB.load(core)
    with open(os.path.join(ROOT, "site", "layout", f"{core}.yaml")) as fh:
        layout = yaml.safe_load(fh)
    geo = geometry(kb, layout)
    geo["L3"] = structures(kb, layout)
    data = view_data(kb, geo)
    for sid, st in geo["L3"].items():
        for bid in st["blocks"]:
            data["blocks"][bid]["l3"] = sid

    def read(name):
        with open(os.path.join(SRC, name)) as fh:
            return fh.read()

    page = read("page.html")
    payload = json.dumps(data, separators=(",", ":")).replace("</", "<\\/")
    app = read("app.js").replace("/*STRUCTURES*/", read("structures.js"))
    page = page.replace("/*STYLE*/", read("style.css")).replace("/*APP*/", app).replace("{{DATA}}", payload)
    head, body = page.split("<!-- body -->", 1)
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, "index.html"), "w") as fh:
        fh.write(
            '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            f"{head}</head>\n<body>\n{body}</body>\n</html>\n"
        )
    with open(os.path.join(OUT, "artifact.html"), "w") as fh:
        fh.write(head + body)
    size = os.path.getsize(os.path.join(OUT, "index.html"))
    print(
        f"{core}: {len(data['blocks'])} blocks, {len(data['params'])} params, {len(data['claims'])} claims "
        f"-> build/site/index.html ({size // 1024} KiB), build/site/artifact.html"
    )


if __name__ == "__main__":
    main()
