"""atlas_pages.py
Isaac Hagedorn, 2026-11-03
Builds the atlas: one page per map from site/atlas, the map cards for the world map, and the coverage table.
"""

import html
import json
import os
import re
import shutil

import yaml

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ATLAS = os.path.join(ROOT, "site", "atlas")
SRC = os.path.join(ROOT, "site", "src")
OUT = os.path.join(ROOT, "build", "site")
SYMBOL = {"have": ("✓", "have"), "gap": ("·", "gap"), "n/a": ("", "na")}  # anything else: next to draw
WHOLE = {"chip", "pcluster", "ecluster", "core"}  # map blocks that mean the whole world map


def esc(s):
    return html.escape(str(s or ""))


def load(kb):
    with open(os.path.join(ATLAS, "atlas.yaml")) as fh:
        atlas = yaml.safe_load(fh)
    for m in atlas["maps"]:
        for f in m["figures"]:
            for b in f.get("blocks") or []:
                if b not in kb.blocks:
                    raise SystemExit(f"atlas figure {f['id']}: unknown block {b}")
            for mid in f.get("mechanisms") or []:
                if mid not in kb.mechanisms:
                    raise SystemExit(f"atlas figure {f['id']}: unknown mechanism {mid}")
            w = f.get("walkthrough")
            if w:
                with open(os.path.join(ATLAS, w["file"])) as fh:
                    f["walk"] = yaml.safe_load(fh)
        for s in m["sheets"]:
            if s["block"] not in kb.blocks:
                raise SystemExit(f"atlas sheet {s['block']}: unknown block")
    return atlas


def svg_inline(path, fid):
    """The SVG scaled to its container, its ids prefixed so figures on one page do not share markers."""
    with open(os.path.join(ATLAS, path)) as fh:
        svg = fh.read()
    width = re.search(r'<svg[^>]*?\swidth="([\d.]+)"', svg).group(1)
    svg = re.sub(r'<svg([^>]*?)\swidth="[\d.]+"\sheight="[\d.]+"', r"<svg\1", svg, count=1)
    svg = re.sub(r'(\sid="|url\(#)', rf"\g<1>{fid}-", svg)
    return svg, width


def hue_of(layout, geo):
    """Block id to the colour key the world map draws it with."""
    hues = {bid: key for key, bids in (layout.get("palette") or {}).items() for bid in bids}
    for bid, bx in geo["L2"]["boxes"].items():
        hues.setdefault(bid, bx["frame"])
    for f in geo["L2"]["frames"]:
        hues.setdefault(f["id"], f["id"])
    return hues


def rect(cls, r, hue, rx):
    return (
        f'<rect class="{cls}" x="{r["x"]}" y="{r["y"]}" width="{r["w"]}" height="{r["h"]}" rx="{rx}" '
        f'style="--hue: var(--c-{hue})"/>'
    )


def locator(geo, hues, blocks, href):
    """The world map in miniature with this map's blocks lit; links to the world map."""
    L2 = geo["L2"]
    lit = set(blocks)
    whole = bool(lit & WHOLE)
    parts = [f'<rect class="lbg" width="{L2["width"]}" height="{L2["height"]}" rx="8"/>']
    parts += [rect("lf lit" if whole or f["id"] in lit else "lf", f, hues[f["id"]], 6) for f in L2["frames"]]
    for bid, bx in L2["boxes"].items():
        on = whole or bid in lit or bx["frame"] in lit
        parts.append(rect("lb lit" if on else "lb", bx, hues[bid], 4))
    return (
        f'<a class="locator" href="{href}"><svg viewBox="0 0 {L2["width"]} {L2["height"]}" '
        f'aria-label="Where this map sits on the world map">{"".join(parts)}</svg></a>'
    )


def chips(kb, f, hues, world):
    out = []
    for b in f.get("blocks") or []:
        out.append(
            f'<a class="tag block" href="{world}#{b}" data-bid="{b}" '
            f'style="--hue: var(--c-{hues.get(b, "edge")})">{esc(kb.blocks[b].name)}</a>'
        )
    for m in f.get("mechanisms") or []:
        mech = kb.mechanisms[m]
        out.append(
            f'<a class="tag mech st-{esc(mech.status)}" href="{world}#{mech.block.id}" data-mech="{m}">'
            f"{esc(mech.name)}</a>"
        )
    return "".join(out)


def walk_html(f):
    w = f.get("walk")
    if not w:
        return ""
    items = []
    for st in w["steps"]:
        tag = "" if st.get("status") == "agreed" else '<span class="draft">draft</span>'
        items.append(
            f'<li><button type="button" class="step" data-step="{st["n"]}">'
            f'<span class="n">{st["n"]}</span>{esc(st["title"])}{tag}</button></li>'
        )
    return f'<ol class="walk">{"".join(items)}</ol><div class="say" hidden></div>'


def figure_html(kb, f, hues, world):
    svg, width = svg_inline(f["file"], f["id"])
    kinds = "".join(f'<span class="kind">{esc(k)}</span>' for k in f.get("kinds") or [])
    dr = f.get("drawio")
    src = ""
    if dr:
        src = (
            f'<a class="src" href="../drawio/{esc(os.path.basename(dr["file"]))}" download>'
            f"draw.io · {esc(dr['page'])}</a>"
        )
    return (
        f'<article class="figure" id="{f["id"]}" data-fig="{f["id"]}">'
        f'<header><h2>{esc(f["title"])}</h2><p class="kinds">{kinds}'
        f'<button type="button" class="full-toggle" aria-pressed="false">1:1</button></p></header>'
        f'<div class="fig-scroll" style="--full: {width}px">{svg}</div>'
        f'<div class="rail"><p class="tags">{chips(kb, f, hues, world)}{src}</p>{walk_html(f)}</div>'
        f"</article>"
    )


def sheet_html(s):
    svg, width = svg_inline(s["file"], f"sheet-{s['block']}")
    return (
        f'<article class="sheet" id="sheet-{s["block"]}">'
        f'<div class="fig-scroll" style="--full: {width}px">{svg}</div></article>'
    )


def nav(maps, i):
    prev = maps[i - 1] if i > 0 else None
    nxt = maps[i + 1] if i + 1 < len(maps) else None
    a = f'<a href="../{prev["id"]}/">← {esc(prev["name"])}</a>' if prev else "<span></span>"
    b = f'<a href="../{nxt["id"]}/">{esc(nxt["name"])} →</a>' if nxt else "<span></span>"
    return f'<nav class="atlas-nav">{a}<a href="../../">World map</a>{b}</nav>'


def page_data(kb, atlas, m):
    figs = {}
    for f in m["figures"]:
        figs[f["id"]] = {"hot": f.get("hot") or [], "walk": (f.get("walk") or {}).get("steps")}
    where = {f["id"]: mm["id"] for mm in atlas["maps"] for f in mm["figures"]}
    where.update({f"block-{s['block']}": mm["id"] for mm in atlas["maps"] for s in mm["sheets"]})
    return {
        "map": m["id"],
        "figures": figs,
        "where": where,
        "blocks": {b.id: b.name for b in kb.blocks.values()},
        "mechBlock": {mid: mm.block.id for mid, mm in kb.mechanisms.items() if mm.block},
    }


def map_page(kb, atlas, geo, hues, i, tpl):
    maps = atlas["maps"]
    m = maps[i]
    world = "../../"
    first = next((b for b in m["blocks"] if b in geo["L2"]["boxes"]), None)
    figures = "".join(figure_html(kb, f, hues, world) for f in m["figures"])
    body = (
        f'<header class="masthead"><p class="eyebrow"><a href="{world}">Firestorm Atlas</a> · '
        f'Map {m["n"]} of {len(maps)}</p><h1>{esc(m["name"])}</h1><p class="sub">{esc(m["subtitle"])}</p>'
        f"{nav(maps, i)}</header>"
        f"{locator(geo, hues, m['blocks'], f'{world}#{first}' if first else world)}"
        f'<section class="figures">{figures}</section>'
    )
    if m["sheets"]:
        sheets = "".join(sheet_html(s) for s in m["sheets"])
        body += f'<section class="sheets"><h2>Blocks</h2>{sheets}</section>'
    body += nav(maps, i)
    payload = json.dumps(page_data(kb, atlas, m), separators=(",", ":")).replace("</", "<\\/")
    return tpl.replace("{{TITLE}}", esc(m["name"])).replace("{{BODY}}", body).replace("{{DATA}}", payload)


def cards(atlas, geo, hues):
    """The map cards under the world map: a locator each, the name and one line."""
    out = []
    for m in atlas["maps"]:
        loc = locator(geo, hues, m["blocks"], "")
        svg = loc[loc.index("<svg") : -4]
        out.append(
            f'<a class="map-card" href="atlas/{m["id"]}/">{svg}<span class="map-n">{m["n"]}</span>'
            f"<b>{esc(m['name'])}</b><span>{esc(m['subtitle'])}</span></a>"
        )
    return "".join(out)


def index_data(atlas):
    """What the world map's dossier needs: the figures and sheet that draw each block."""
    figs, sheets = {}, {}
    for m in atlas["maps"]:
        for f in m["figures"]:
            figs[f["id"]] = {
                "title": f["title"],
                "map": m["id"],
                "name": m["name"],
                "blocks": f.get("blocks") or [],
            }
        for s in m["sheets"]:
            sheets[s["block"]] = m["id"]
    return {"figures": figs, "sheets": sheets}


def coverage_page(tpl):
    with open(os.path.join(ATLAS, "coverage.json")) as fh:
        cov = json.load(fh)
    kinds = cov["kinds"]
    rows = []
    for bid, b in cov["blocks"].items():
        cells = ""
        for k in kinds:
            sym, cls = SYMBOL.get(b["kinds"][k]["status"], ("◌", "next"))
            cells += f'<td class="c-{cls}">{sym}</td>'
        rows.append(
            f'<tr><th class="lvl-{b["level"]}"><a href="../../#{bid}">{esc(b["name"])}</a></th>{cells}'
            f'<td class="n">{len(b["figures"])}</td></tr>'
        )
    head = "".join(f"<th>{esc(k)}</th>" for k in kinds)
    key = "✓ drawn, ◌ next, · to draw"
    body = (
        '<header class="masthead"><p class="eyebrow"><a href="../../">Firestorm Atlas</a></p>'
        f'<h1>Coverage</h1><p class="sub">{key}</p></header>'
        f'<div class="tbl"><table class="coverage"><thead><tr><th>block</th>{head}<th>figures</th>'
        f"</tr></thead><tbody>{''.join(rows)}</tbody></table></div>"
    )
    return tpl.replace("{{TITLE}}", "Coverage").replace("{{BODY}}", body).replace("{{DATA}}", "{}")


def build(kb, geo, layout, style):
    """Writes the atlas pages, the coverage page and the draw.io copies; returns (cards html, index data)."""
    atlas = load(kb)
    hues = hue_of(layout, geo)
    with open(os.path.join(SRC, "atlas.html")) as fh:
        tpl = fh.read()
    with open(os.path.join(SRC, "atlas.css")) as fh:
        tpl = tpl.replace("/*STYLE*/", style + fh.read())
    with open(os.path.join(SRC, "atlas.js")) as fh:
        tpl = tpl.replace("/*APP*/", fh.read())
    for i in range(len(atlas["maps"])):
        d = os.path.join(OUT, "atlas", atlas["maps"][i]["id"])
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, "index.html"), "w") as fh:
            fh.write(map_page(kb, atlas, geo, hues, i, tpl))
    d = os.path.join(OUT, "atlas", "coverage")
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, "index.html"), "w") as fh:
        fh.write(coverage_page(tpl))
    d = os.path.join(OUT, "atlas", "drawio")
    shutil.rmtree(d, ignore_errors=True)
    shutil.copytree(os.path.join(ATLAS, "drawio"), d)
    return cards(atlas, geo, hues), index_data(atlas)
