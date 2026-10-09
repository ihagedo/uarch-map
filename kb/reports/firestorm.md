# firestorm knowledge base

blocks 37, links 35, params 123, claims 924, sources 22, mechanisms 37

## By status

- derived: 10
- inferred: 21
- measured: 82
- open: 7
- reported: 3

## By confidence

- confirmed: 8
- conjecture: 5
- corroborated: 27
- derived: 10
- inferred: 24
- single: 47
- unknown: 2

## Holes (7)

- l1i.line (l1i): L1I line size
- itlb.entries (itlb): iTLB entries
- dirpred.capacity (dirpred): Direction predictor capacity
- ftq.depth (ftq): Fetch target queue depth
- iq.depth (iq): Fetch-to-decode queue depth
- int_prf.headroom (int_prf): Integer rename headroom
- mshr.outstanding (mshr): Outstanding L1D misses (MLP)

## Open disputes (13)

- fetch.width: Peak per-fetch width; the sustained 8 is c-ox-fetch-8 and c-dj-width. His 2012 patent reading gives 32 bytes, 8 A64 or 16 Thumb instructions (c-mh-v4-a6-fetch-32b), so the 16 may date from Thumb.  [c-dj-width, c-mh-v4-fetch-16]
- btb.assoc: 2 vs 1 at equal rank  [c-mh-v4-nfp-2way, c-mh-v4-m1-nfp-dm]
- rename.mov_imm_limit: Eight per cycle on an 8-wide core is 8 per 8 instructions; Johnson gives 2 per 8 handled by renaming (c-dj-mov-imm)  [c-dj-mov-imm, c-ox-mov-imm-8]
- int_prf.total: measured on the A14  [c-mh-v1-int-prf-add, c-at-int-prf]
- fp_prf.total: measured on the A14  [c-dj-fp-prf, c-at-fp-prf]
- eu_int.count: measured on the A14  [c-ox-int-units, c-at-int-units]
- lq.entries: range 148-154 (midpoint given); measured on the A14, probe not described  [c-dj-lsq-lq-130, c-at-lq]
- sq.entries: measured on the A14, probe not described  [c-dj-stores, c-at-sq]
- dtlb.l1_entries: measured on the A14; the article does not say data or instruction TLB  [c-mh-v2-dtlb, c-at-l1-tlb]
- l2.latency: 17 vs 18 at equal rank  [c-mh-v2-l2-latency-17, c-7cpu-l2-latency]
- l2.latency: Passing figure in the introductory ROB-size discussion, no method stated; 7-cpu gives 18 cycles (c-7cpu-l2-latency). Vol 2 measures the cache hierarchy.  [c-mh-v2-l2-latency-17, c-mh-v1-l2-latency-aside]
- sched_int.total_entries: Disagrees with Johnson's diagram. On Handley's reading, an integer total summed from the diagram's queue sizes (134, c-cc-oryon-m1-int-sched-134) counts each paired queue about twice; he gives no total of his own.  [c-cc-oryon-m1-int-sched-134, c-mh-v1-sched-johnson-2x]
- dispatch.fp_entries: 12 vs 14 at equal rank  [c-mh-v1-dispatch-fp-12, c-mh-v1-dispatch-fp-14]

## Problems (0)

