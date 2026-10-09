# Writing claims

Claims from one source go in one YAML file in `kb/claims/inbox/`, named after the source. The file
opens with three comment lines: its name, the source's author and year, and one sentence on what it
covers. `python3 tools/kb/merge.py firestorm` merges the files, and `kb/reports/firestorm.md` shows
the result: values, holes, open disputes.

## File shape

```yaml
# handley-vol1-retire.yaml
# Maynard Handley, 2025
# Retire queue, register files and history file (M1 Explainer vol 1).
session: handley-vol1-retire           # the file name; becomes each claim's `entered`
source: handley-vol1                   # default source for claims below (override per claim)

claims:
  - id: c-mh-v1-nop-window             # c-<author>-<slug>, unique across the KB
    text: Trouble at 2228 with NOPs, so the ROB size is somewhere between the two tested values
    loc: p088                          # page, #anchor, table id, or patent column
    quote: "We see trouble at 2228 between these two"    # verbatim, found at loc
    method: wong-probe                 # wong-probe | counter | pointer-chase | stride-sweep | branch-sweep |
                                       # throughput | contention | drain-timing | patent-reading | vendor-doc |
                                       # secondhand | simulation | other
    filler: nop                        # for wong-probe claims
    derivation: measured               # measured | documented | derived | inferred | reported
    value: 2228
    unit: instructions
    approx: true
    range: [2178, 2274]                # optional: when the author gives a range; value is the midpoint or his pick
    hedge: "somewhere between these two"   # the author's own words, verbatim
    supports: [retire.nop_window]      # param ids this claim gives a value for
    contradicts: []                    # param ids whose current value this claim disagrees with
    chip: m1                           # m1 (default) | m2 | m3 | m4 | a14 | icestorm
    notes: ""

new_params:                            # only when a claim needs a field the skeleton lacks
  retire.nop_window: {block: retire, name: NOP window, unit: instructions}

new_blocks: []                         # same shape as kb/seed/firestorm/structure.yaml
new_links: []
new_sources:                           # e.g. a patent the source cites
  us10353454b2:
    type: patent
    title: "..."
    assignee: Apple
    number: US10353454B2
    url: https://patents.google.com/patent/US10353454B2/en
    cited_by: [handley-vol1:p088]

new_mechanisms: {}                     # same shape as kb/seed/firestorm/params.yaml mechanisms
mechanism_claims:                      # attach claims to existing mechanisms
  retire_groups: [c-mh-v1-nop-window]

resolutions:                           # settle a dispute the merge opened
  - param: int_prf.total
    claims: [c-dj-int-prf, c-mh-v1-int-prf-movimm]
    resolution: "418 is the limit for partially eliminated immediate moves; 380-394 is the register file"
    resolved_by: c-mh-v1-int-prf-add    # claim id or PoC id
```

## What counts as a claim

One statement about the core that carries a number, a mechanism, or a structure, from one
place in one source. Split compound statements. If the author gives the method, record it;
if not, leave `method` out and the merge ranks the claim below one that has it.

Derivation:

- **measured**: the author ran an experiment on the hardware and says so.
- **documented**: Apple states it (optimization guide, driver, patent that names the mechanism).
- **derived**: a number the author computes or fits from measurements under a stated model rather
  than reading it off directly (118 stores minus 58 scheduler entries gives a 60-entry queue).
- **inferred**: a mechanism proposed to explain a measurement, usually via a patent.
- **reported**: a number repeated from another source with no independent measurement.
  Handley reproducing a Chips and Cheese graph is `reported` with `method: secondhand`.

## Conventions

- Every claim carries a verbatim `quote` (5-40 words, "..." to skip text) that can be found at its
  `loc`.
- `loc` for a single-page web source is the heading anchor of its section.
- A number the author repeats from someone else (article, diagram, tweet) is `reported` with
  `method: secondhand` and never goes in `contradicts`; the original source's claim carries any
  disagreement. An aside on someone else's figure supports and contradicts nothing.
- Firestorm core facts measured on the A14 or an M1 Pro/Max are the same core: chip m1, with the chip
  named in `notes`. Chip-level facts (L2, SLC, memory, clocks) take the chip they were measured on.
- A range goes in `range: [lo, hi]`; `value` is the author's pick or the midpoint. Use the param's unit;
  never convert between time and cycles.
- Quote any value that contains " #" (an AArch64 immediate, a heading anchor): unquoted, YAML cuts it
  at the "#". The merge reports such lines.

## What not to do

- Do not set `confidence`; the merge derives it.
- Do not put an M2 number in `supports` for a Firestorm param; tag `chip: m2` and it is kept
  for later chips without affecting M1 values.
- Do not resolve a dispute by deleting a claim. Add a `resolutions` entry with a reason.
- Do not edit `kb/firestorm.json`.

## How the merge decides

- Value: the best-ranked supporting claim. Measured beats documented beats derived beats inferred
  beats reported. Ties go, in order, to a claim with a method, one with a value, a stated figure over a
  range midpoint, the more specific number (623 before 630), the earlier publication, and then
  file order.
- Status: the best derivation among supporting claims, else open.
- Confidence counts authors whose claims agree with the value, each at their strongest claim:
  - confirmed: three or more authors measured it, or Apple documents it and another author's
    measurement agrees;
  - corroborated: two or more authors, at least one of them measuring or documenting it;
  - single: one author's measurement or document;
  - derived: only derived claims;
  - inferred: only inferences or repeats;
  - conjecture: a hole that related claims bound (`kb/seed/firestorm/conjectures.yaml`);
  - unknown: a hole with nothing to go on.
- Agreement: values within 5 %, or one inside the other claim's `range`.
- Dispute: two supporting claims of equal rank disagree by more than 5 %, or a claim lists the param
  in `contradicts`. An open dispute caps confidence at corroborated.
- A conjecture gives a bound and the claims it rests on, never a value. The merge flags one whose
  param has since gained a claim.

## Reading order

Read by block, not by source, starting where the evidence is firmest: retire and rename, then
execution, load-store and the caches, then fetch and prediction.
