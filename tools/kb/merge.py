#!/usr/bin/env python3
"""merge.py
Isaac Hagedorn, 2026-10-02
Merge the seed and claim files into kb/<core>.json, deriving each parameter's value, confidence and
disputes. Also writes the report and the simulator config.
"""

import glob
import json
import os
import re
import sys

import yaml
import jsonschema

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RANK = {"measured": 0, "documented": 1, "derived": 2, "inferred": 3, "reported": 4}
TOL = 0.05


# a plain (unquoted) YAML value with " #" in it is silently cut at the "#"
INLINE_COMMENT = re.compile(r"^\s+(?:- )?[A-Za-z_]+: (?![\'\"|>\[{])\S.*?\s#")
BLOCK_START = re.compile(r"^(\s*)(?:- )?[A-Za-z_]+: [|>][-+]?\s*$")


def inline_comments(path):
    hits, block = [], None  # indent of the key that opened a block scalar
    with open(path) as fh:
        for n, line in enumerate(fh, 1):
            indent = len(line) - len(line.lstrip())
            if block is not None and (indent > block or not line.strip()):
                continue  # block scalar text: "#" is literal
            block = None
            m = BLOCK_START.match(line)
            if m:
                block = len(m.group(1))
            elif INLINE_COMMENT.match(line):
                hits.append(n)
    return hits


def load_yaml_dir(pattern):
    out = []
    for p in sorted(glob.glob(pattern)):
        with open(p) as fh:
            d = yaml.safe_load(fh) or {}
        d["_file"] = os.path.relpath(p, ROOT)
        out.append(d)
    return out


def author_of(src):
    return (src.get("group") or src.get("author") or src.get("title") or "").strip().lower()


def close(a, b):
    if a is None or b is None:
        return False
    try:
        a, b = float(a), float(b)
    except (TypeError, ValueError):
        return a == b
    if a == b:
        return True
    return abs(a - b) <= TOL * max(abs(a), abs(b))


def agree(a, b):
    """Close values, or one value inside the other claim's range."""
    if close(a.get("value"), b.get("value")):
        return True
    for x, y in ((a, b), (b, a)):
        r, v = x.get("range"), y.get("value")
        if r and isinstance(v, (int, float)) and not isinstance(v, bool):
            if min(r) * (1 - TOL) <= v <= max(r) * (1 + TOL):
                return True
    return False


def round_zeros(v):
    """Trailing zeros of a whole number (2200 -> 2, 623 -> 0); rounder means less specific."""
    if isinstance(v, bool) or not isinstance(v, (int, float)) or v != int(v) or v == 0:
        return 0
    v, n = abs(int(v)), 0
    while v % 10 == 0:
        v, n = v // 10, n + 1
    return n


def merge(core):
    kb = {
        "core": core,
        "isa": "",
        "blocks": [],
        "links": [],
        "params": {},
        "claims": {},
        "sources": {},
        "mechanisms": {},
        "questions": {},
    }
    problems = []

    descriptions, conjectures, judgments, questions, resolutions = {}, {}, {}, {}, []
    for seed in load_yaml_dir(os.path.join(ROOT, "kb", "seed", core, "*.yaml")):
        kb["isa"] = seed.get("isa", kb["isa"]) or kb["isa"]
        kb["blocks"] += seed.get("blocks", [])
        kb["links"] += seed.get("links", [])
        for k, v in (seed.get("params") or {}).items():
            kb["params"][k] = {"claims": [], "disputes": [], **v}
        kb["sources"].update(seed.get("sources") or {})
        for k, v in (seed.get("mechanisms") or {}).items():
            kb["mechanisms"][k] = {"claims": [], **v}
        descriptions.update(seed.get("descriptions") or {})
        conjectures.update(seed.get("conjectures") or {})
        judgments.update(seed.get("judgments") or {})
        resolutions += seed.get("resolutions") or []
        for bid, qs in (seed.get("questions") or {}).items():
            for qid, q in qs.items():
                questions[qid] = {"block": bid, **q}
    by_id = {b["id"]: b for b in kb["blocks"]}
    for bid, text in descriptions.items():
        if bid in by_id:
            by_id[bid]["description"] = " ".join(str(text).split())
        else:
            problems.append(f"description for unknown block {bid}")

    sessions = load_yaml_dir(os.path.join(ROOT, "kb", "claims", "inbox", "*.yaml"))
    for sess in sessions:
        for n in inline_comments(os.path.join(ROOT, sess["_file"])):
            problems.append(f"{sess['_file']}:{n}: unquoted value with ' #' is cut at the '#'; quote it")
        kb["sources"].update(sess.get("new_sources") or {})
        kb["blocks"] += sess.get("new_blocks") or []
        kb["links"] += sess.get("new_links") or []
        for k, v in (sess.get("new_params") or {}).items():
            kb["params"].setdefault(k, {"claims": [], "disputes": [], **v})
        for k, v in (sess.get("new_mechanisms") or {}).items():
            kb["mechanisms"].setdefault(k, {"claims": [], **v})
    for sess in sessions:
        default_src = sess.get("source")
        for c in sess.get("claims") or []:
            cid = c.pop("id")
            if cid in kb["claims"]:
                problems.append(f"duplicate claim id {cid} in {sess['_file']}")
                continue
            c.setdefault("source", default_src)
            c.setdefault("supports", [])
            c.setdefault("chip", "m1")
            c.setdefault("entered", str(sess.get("session", "")))
            kb["claims"][cid] = c
            for pid in c["supports"]:
                if pid not in kb["params"]:
                    problems.append(f"claim {cid} supports unknown param {pid} ({sess['_file']})")
                    continue
                kb["params"][pid]["claims"].append(cid)
            for pid in c.get("contradicts") or []:
                if pid in kb["params"]:
                    kb["params"][pid]["claims"].append(cid)
        for r in sess.get("resolutions") or []:
            p = kb["params"].get(r["param"])
            if p is None:
                problems.append(f"resolution for unknown param {r['param']}")
                continue
            p.setdefault("_resolutions", []).append(r)
        for mid, cids in (sess.get("mechanism_claims") or {}).items():
            if mid in kb["mechanisms"]:
                kb["mechanisms"][mid]["claims"] += cids
    # our resolutions (conjectures.yaml) settle disputes the way a claim file's do, marked ours
    for r in resolutions:
        p = kb["params"].get(r["param"])
        if p is None:
            problems.append(f"resolution for unknown param {r['param']}")
            continue
        p.setdefault("_resolutions", []).append({**r, "ours": True})

    for pid, p in kb["params"].items():
        supporting = [
            (cid, kb["claims"][cid])
            for cid in p["claims"]
            if cid in kb["claims"]
            and pid in kb["claims"][cid].get("supports", [])
            and kb["claims"][cid].get("chip", "m1") == "m1"
        ]
        contradicting = [
            cid
            for cid in p["claims"]
            if cid in kb["claims"] and pid in (kb["claims"][cid].get("contradicts") or [])
        ]
        if not supporting:
            p["status"] = "open"
            p.setdefault("value", None)
            p["disputes"] = p.get("disputes", [])
            p["confidence"] = "unknown"
            if pid in conjectures:
                p["confidence"] = "conjecture"
                p["conjecture"] = {"basis": [], **conjectures[pid]}
            continue
        if pid in conjectures:
            problems.append(f"conjecture for {pid}, which now has a value; drop it")
        # our own measurements: they set a value only where nothing published is measured, documented or
        # derived; next to a published value they support it or open a dispute marked ours
        mine = [(cid, c) for cid, c in supporting if kb["sources"].get(c["source"], {}).get("ours")]
        published = [(cid, c) for cid, c in supporting if (cid, c) not in mine]
        by_us = bool(mine) and not any(RANK[c["derivation"]] <= RANK["derived"] for _, c in published)
        ranked = (mine if by_us else published) or supporting

        def key(item):
            cid, c = item
            year = kb["sources"].get(c["source"], {}).get("year") or 9999
            return (
                RANK[c["derivation"]],
                0 if c.get("method") else 1,
                0 if c.get("value") is not None else 1,
                1 if c.get("range") else 0,
                round_zeros(c.get("value")),
                year,
                c.get("entered", ""),
            )

        ranked.sort(key=key)
        best_cid, best = ranked[0]
        p["value"] = best.get("value", p.get("value"))
        if "unit" in best and "unit" not in p:
            p["unit"] = best["unit"]
        if best.get("approx"):
            p["approx"] = True
        p["status"] = best["derivation"]

        disputes = [d for d in p.get("disputes", []) if not d.get("_auto")]
        top_rank = RANK[best["derivation"]]
        peers = [(cid, c) for cid, c in ranked if RANK[c["derivation"]] == top_rank]
        for cid, c in peers[1:]:
            if c.get("value") is not None and not agree(best, c):
                disputes.append(
                    {
                        "claims": [best_cid, cid],
                        "_auto": True,
                        "note": f"{best.get('value')} vs {c.get('value')} at equal rank",
                        "resolution": None,
                        "resolved_by": None,
                    }
                )
        against = [(cid, kb["claims"][cid], False) for cid in contradicting]
        if not by_us:
            against += [
                (cid, c, True) for cid, c in mine if c.get("value") is not None and not agree(best, c)
            ]
        for cid, c, ours_run in against:
            d = {
                "claims": [best_cid, cid],
                "_auto": True,
                "note": c.get("notes")
                or ("our measurement disagrees" if ours_run else "explicit contradiction"),
                "resolution": None,
                "resolved_by": None,
            }
            if ours_run or kb["sources"].get(c["source"], {}).get("ours"):
                d["ours"] = True
            disputes.append(d)
        for r in p.pop("_resolutions", []):
            hit = [d for d in disputes if set(r.get("claims", [])) == set(d["claims"])]
            if not hit:
                problems.append(f"resolution for {pid} matches no dispute: {r.get('claims')}")
            for d in hit:
                d["resolution"] = r["resolution"]
                d["resolved_by"] = r.get("resolved_by")
                if r.get("ours"):
                    d["ours"] = True
        for d in disputes:
            d.pop("_auto", None)
        p["disputes"] = disputes
        open_disputes = [d for d in disputes if not d.get("resolution")]

        # each author counts once, at their strongest agreeing claim
        by_author = {}
        for _, c in published:
            if c.get("value") is None or agree(best, c):
                a = author_of(kb["sources"].get(c["source"], {}))
                by_author[a] = min(by_author.get(a, 9), RANK[c["derivation"]])
        measured = {a for a, r in by_author.items() if r <= RANK["documented"]}
        documented = any(r == RANK["documented"] for r in by_author.values())
        independent = {a for a, r in by_author.items() if r <= RANK["derived"]}
        if len(measured) >= 3 or (documented and len(measured) >= 2):
            conf = "confirmed"
        elif measured and len(independent) >= 2:
            conf = "corroborated"
        elif measured:
            conf = "single"
        elif independent:
            conf = "derived"
        else:
            conf = "inferred"
        if open_disputes and conf == "confirmed":
            conf = "corroborated"
        if by_us:
            conf = "ours"
        p["confidence"] = conf

    block_ids = {b["id"] for b in kb["blocks"]}
    for b in kb["blocks"]:
        if b.get("parent") and b["parent"] not in block_ids:
            problems.append(f"block {b['id']} has unknown parent {b['parent']}")
        for pid in b.get("params", []):
            if pid not in kb["params"]:
                problems.append(f"block {b['id']} lists unknown param {pid}")
    for pid, p in kb["params"].items():
        if p["block"] not in block_ids:
            problems.append(f"param {pid} belongs to unknown block {p['block']}")
    for lk in kb["links"]:
        for end in ("from", "to"):
            if lk[end] not in block_ids:
                problems.append(f"link {lk['from']}->{lk['to']} references unknown block {lk[end]}")
    for cid, c in kb["claims"].items():
        if c["source"] not in kb["sources"]:
            problems.append(f"claim {cid} cites unknown source {c['source']}")
        if not c.get("loc"):
            problems.append(f"claim {cid} has no loc")
    for mid, m in kb["mechanisms"].items():
        if m.get("block") not in block_ids:
            problems.append(f"mechanism {mid} has no known block ({m.get('block')})")
        if m.get("ours") and not m.get("basis"):
            problems.append(f"mechanism {mid} is ours but rests on no claim")
        if m.get("status") == "conjecture" and not m.get("ours"):
            problems.append(f"mechanism {mid} is a conjecture but not marked ours")
        for cid in m.get("basis") or []:
            if cid not in kb["claims"]:
                problems.append(f"mechanism {mid} rests on unknown claim {cid}")
        for cid in m["claims"]:
            if cid not in kb["claims"]:
                problems.append(f"mechanism {mid} cites unknown claim {cid}")
    # a question's state: its best published answer, else ours, else open
    LATER = {"post-m1", "m2", "m3", "m4"}
    mech_rank = {"measured": 0, "absent": 0, "inferred": 1, "speculative": 2, "conjecture": 2}
    for qid, q in questions.items():
        if q["block"] not in block_ids:
            problems.append(f"question {qid} has unknown block {q['block']}")
        published, ours = [], False
        for aid in q.get("answers") or []:
            if aid in kb["mechanisms"]:
                m = kb["mechanisms"][aid]
                if m.get("ours"):
                    ours = True
                    continue
                r = mech_rank[m["status"]]
                published.append(max(r, 2) if m.get("chip", "m1") in LATER else r)
            elif aid in kb["params"]:
                p = kb["params"][aid]
                if p.get("confidence") == "ours":
                    ours = True
                elif p.get("value") is not None:
                    published.append(0 if p["status"] in ("measured", "documented", "derived") else 1)
                elif p.get("confidence") == "conjecture":
                    ours = True
            else:
                problems.append(f"question {qid} names unknown answer {aid}")
        state = (
            ["measured", "inferred", "patent"][min(published)] if published else "ours" if ours else "open"
        )
        kb["questions"][qid] = {**q, "answers": q.get("answers") or [], "state": state}
    for tid, j in judgments.items():
        target = kb["params"].get(tid) or kb["mechanisms"].get(tid)
        if target is None:
            problems.append(f"judgment for unknown param or mechanism {tid}")
            continue
        target["judgment"] = {"basis": [], **j}
        for cid in j.get("basis") or []:
            if cid not in kb["claims"]:
                problems.append(f"judgment on {tid} cites unknown claim {cid}")
    for pid, cj in conjectures.items():
        if pid not in kb["params"]:
            problems.append(f"conjecture for unknown param {pid}")
        for cid in cj.get("basis") or []:
            if cid not in kb["claims"]:
                problems.append(f"conjecture for {pid} cites unknown claim {cid}")

    with open(os.path.join(ROOT, "kb", "schema", "core.schema.json")) as fh:
        schema = json.load(fh)
    try:
        jsonschema.validate(kb, schema)
    except jsonschema.ValidationError as e:
        problems.append(f"schema: {e.message} at {'/'.join(str(x) for x in e.absolute_path)}")

    return kb, problems


def report(kb, problems):
    P = kb["params"]
    by_status = {}
    by_conf = {}
    for p in P.values():
        by_status[p["status"]] = by_status.get(p["status"], 0) + 1
        by_conf[p["confidence"]] = by_conf.get(p["confidence"], 0) + 1
    lines = (
        [
            f"# {kb['core']} knowledge base",
            "",
            f"blocks {len(kb['blocks'])}, links {len(kb['links'])}, params {len(P)}, "
            f"claims {len(kb['claims'])}, sources {len(kb['sources'])}, mechanisms {len(kb['mechanisms'])}",
            "",
            "## By status",
            "",
        ]
        + [f"- {k}: {v}" for k, v in sorted(by_status.items())]
        + ["", "## By confidence", ""]
        + [f"- {k}: {v}" for k, v in sorted(by_conf.items())]
    )
    holes = [pid for pid, p in P.items() if p["status"] == "open"]
    lines += ["", f"## Holes ({len(holes)})", ""] + [
        f"- {h} ({P[h]['block']}): {P[h]['name']}" for h in holes
    ]
    disputes = [(pid, d) for pid, p in P.items() for d in p["disputes"] if not d.get("resolution")]
    lines += ["", f"## Open disputes ({len(disputes)})", ""]
    for pid, d in disputes:
        lines.append(f"- {pid}: {d['note']}  [{', '.join(d['claims'])}]")
    lines += ["", f"## Problems ({len(problems)})", ""] + [f"- {x}" for x in problems]
    return "\n".join(lines) + "\n"


def main():
    core = sys.argv[1] if len(sys.argv) > 1 else "firestorm"
    kb, problems = merge(core)
    os.makedirs(os.path.join(ROOT, "kb", "reports"), exist_ok=True)
    os.makedirs(os.path.join(ROOT, "sim", "config"), exist_ok=True)
    with open(os.path.join(ROOT, "kb", f"{core}.json"), "w") as fh:
        json.dump(kb, fh, indent=2)
    with open(os.path.join(ROOT, "kb", "reports", f"{core}.md"), "w") as fh:
        fh.write(report(kb, problems))
    sim = {
        pid: {"value": p.get("value"), "sim_key": p["sim_key"], "confidence": p["confidence"]}
        for pid, p in kb["params"].items()
        if p.get("sim_key")
    }
    with open(os.path.join(ROOT, "sim", "config", f"{core}.json"), "w") as fh:
        json.dump(sim, fh, indent=2)
    print(
        f"{core}: {len(kb['params'])} params, {len(kb['claims'])} claims, "
        f"{sum(1 for p in kb['params'].values() if p['status'] == 'open')} holes, "
        f"{len(problems)} problems -> kb/{core}.json, kb/reports/{core}.md"
    )
    for x in problems:
        print("  !", x)
    return 1 if any(x.startswith("schema") for x in problems) else 0


if __name__ == "__main__":
    sys.exit(main())
