#!/usr/bin/env python3
"""model.py
Isaac Hagedorn, 2026-10-04
Object model over kb/<core>.json, used by the site build.
"""

import json
import os
from dataclasses import dataclass, field

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CONF_RANK = {
    "unknown": 0,
    "conjecture": 1,
    "inferred": 2,
    "derived": 3,
    "single": 4,
    "corroborated": 5,
    "confirmed": 6,
}
CONF_NAME = {v: k for k, v in CONF_RANK.items()}
DERIV_RANK = {"measured": 0, "documented": 1, "derived": 2, "inferred": 3, "reported": 4}


@dataclass(eq=False)
class Source:
    id: str
    type: str
    title: str
    author: str = ""
    year: int | None = None
    url: str = ""
    notes: str = ""

    @property
    def cite(self):
        """Short citation, e.g. 'Johnson 2023'."""
        name = (self.author or self.title).split(",")[0].strip()
        return f"{name} {self.year}" if self.year else name


@dataclass(eq=False)
class Claim:
    id: str
    text: str
    source: Source
    loc: str
    derivation: str
    method: str | None = None
    value: object = None
    unit: str | None = None
    approx: bool = False
    hedge: str = ""
    quote: str = ""
    filler: str = ""
    chip: str = "m1"
    notes: str = ""
    entered: str = ""


@dataclass(eq=False)
class Dispute:
    claims: list
    note: str
    resolution: str | None = None
    resolved_by: str | None = None

    @property
    def open(self):
        return not self.resolution


@dataclass(eq=False)
class Param:
    id: str
    name: str
    block: "Block" = None
    value: object = None
    unit: str | None = None
    approx: bool = False
    status: str = "open"
    confidence: str = "unknown"
    sim_key: str | None = None
    mechanism: "Mechanism" = None
    supporting: list = field(default_factory=list)
    contradicting: list = field(default_factory=list)
    disputes: list = field(default_factory=list)
    conjecture: dict | None = None

    @property
    def label(self):
        """Compact label for a map box: the id after the block prefix."""
        return self.id.split(".", 1)[-1].replace("_", " ")

    @property
    def known(self):
        return self.value is not None

    @property
    def open_disputes(self):
        return [d for d in self.disputes if d.open]


@dataclass(eq=False)
class Mechanism:
    id: str
    name: str
    status: str
    description: str = ""
    params: list = field(default_factory=list)
    claims: list = field(default_factory=list)
    sim_switch: str | None = None
    detection_rule: str = ""


@dataclass(eq=False)
class Block:
    id: str
    name: str
    stage: str
    level: int = 2
    parent: "Block" = None
    children: list = field(default_factory=list)
    params: list = field(default_factory=list)
    description: str = ""

    def walk(self):
        yield self
        for c in self.children:
            yield from c.walk()

    @property
    def all_params(self):
        return [p for b in self.walk() for p in b.params]

    @property
    def black_box(self):
        """No parameter here or below has a value yet."""
        return not any(p.known for p in self.all_params)

    @property
    def confidence(self):
        """Mean confidence over every parameter here and below (a hole counts as unknown), rounded half up."""
        ps = self.all_params
        if not ps:
            return "unknown"
        mean = sum(CONF_RANK[p.confidence] for p in ps) / len(ps)
        return CONF_NAME[int(mean + 0.5)]

    @property
    def best_derivation(self):
        known = [p.status for p in self.all_params if p.status in DERIV_RANK]
        return min(known, key=DERIV_RANK.get) if known else None

    @property
    def open_disputes(self):
        return [(p, d) for p in self.all_params for d in p.open_disputes]


@dataclass(eq=False)
class Link:
    src: Block
    dst: Block
    kind: str
    label: str = ""


class KB:
    def __init__(self, data):
        self.core = data["core"]
        self.isa = data.get("isa", "")
        self.sources = {
            k: Source(
                id=k,
                type=v.get("type", ""),
                title=v.get("title", k),
                author=v.get("author", ""),
                year=v.get("year"),
                url=v.get("url", ""),
                notes=v.get("notes", ""),
            )
            for k, v in data["sources"].items()
        }
        self.claims = {
            k: Claim(
                id=k,
                text=v["text"],
                source=self.sources[v["source"]],
                loc=v["loc"],
                derivation=v["derivation"],
                method=v.get("method"),
                value=v.get("value"),
                unit=v.get("unit"),
                approx=bool(v.get("approx")),
                hedge=v.get("hedge", ""),
                quote=v.get("quote", ""),
                filler=v.get("filler", ""),
                chip=v.get("chip", "m1"),
                notes=v.get("notes", ""),
                entered=v.get("entered", ""),
            )
            for k, v in data["claims"].items()
        }
        self.blocks = {
            b["id"]: Block(
                id=b["id"],
                name=b["name"],
                stage=b["stage"],
                level=b.get("level", 2),
                description=b.get("description", ""),
            )
            for b in data["blocks"]
        }
        for b in data["blocks"]:
            if b.get("parent"):
                blk = self.blocks[b["id"]]
                blk.parent = self.blocks[b["parent"]]
                blk.parent.children.append(blk)
        self.mechanisms = {
            k: Mechanism(
                id=k,
                name=v["name"],
                status=v.get("status", ""),
                description=" ".join(v.get("description", "").split()),
                claims=[self.claims[c] for c in v.get("claims", []) if c in self.claims],
                sim_switch=v.get("sim_switch"),
                detection_rule=v.get("detection_rule", ""),
            )
            for k, v in data["mechanisms"].items()
        }
        self.params = {}
        for k, v in data["params"].items():
            p = Param(
                id=k,
                name=v["name"],
                block=self.blocks[v["block"]],
                value=v.get("value"),
                unit=v.get("unit"),
                approx=bool(v.get("approx")),
                status=v.get("status", "open"),
                confidence=v.get("confidence", "unknown"),
                conjecture=v.get("conjecture"),
                sim_key=v.get("sim_key"),
                mechanism=self.mechanisms.get(v.get("mechanism")),
            )
            cs = [self.claims[c] for c in v.get("claims", []) if c in self.claims]
            p.supporting = [c for c in cs if k in data["claims"][c.id].get("supports", [])]
            p.contradicting = [c for c in cs if k in (data["claims"][c.id].get("contradicts") or [])]
            p.disputes = [
                Dispute(
                    claims=[self.claims[c] for c in d["claims"]],
                    note=d.get("note", ""),
                    resolution=d.get("resolution"),
                    resolved_by=d.get("resolved_by"),
                )
                for d in v.get("disputes", [])
            ]
            p.block.params.append(p)
            self.params[k] = p
        for k, v in data["mechanisms"].items():
            self.mechanisms[k].params = [self.params[p] for p in v.get("params", []) if p in self.params]
        self.links = [
            Link(
                src=self.blocks[lk["from"]],
                dst=self.blocks[lk["to"]],
                kind=lk["kind"],
                label=lk.get("label", ""),
            )
            for lk in data["links"]
        ]

    @classmethod
    def load(cls, core="firestorm", root=ROOT):
        with open(os.path.join(root, "kb", f"{core}.json")) as fh:
            return cls(json.load(fh))

    @property
    def roots(self):
        return [b for b in self.blocks.values() if b.parent is None]

    @property
    def holes(self):
        return [p for p in self.params.values() if not p.known]

    @property
    def open_disputes(self):
        return [(p, d) for p in self.params.values() for d in p.open_disputes]


if __name__ == "__main__":
    kb = KB.load()
    for b in kb.blocks.values():
        if b.level == 2:
            known = sum(p.known for p in b.params)
            print(
                f"{b.id:10} {b.confidence:7} {'black box' if b.black_box else '':9} "
                f"{known}/{len(b.params)} known"
            )
