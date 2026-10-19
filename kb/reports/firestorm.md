# firestorm knowledge base

blocks 40, links 37, params 158, claims 2133, sources 69, mechanisms 182

## By status

- derived: 12
- documented: 4
- inferred: 19
- measured: 119
- open: 3
- reported: 1

## By confidence

- confirmed: 26
- conjecture: 3
- corroborated: 31
- derived: 12
- inferred: 20
- single: 66

## Holes (3)

- ftq.depth (ftq): Fetch target queue depth
- iq.depth (iq): Fetch-to-decode queue depth
- mshr.outstanding (mshr): Outstanding L1D misses (MLP)

## Open disputes (14)

- fetch.width: Peak per-fetch width; the sustained 8 is c-ox-fetch-8 and c-dj-width. His 2012 patent reading gives 32 bytes, 8 A64 or 16 Thumb instructions (c-mh-v4-a6-fetch-32b), so the 16 may date from Thumb.  [c-dj-width, c-mh-v4-fetch-16]
- fetch.width: Agrees with c-mh-v4-fetch-16. The same loop kept within one page is limited by the back end instead.  [c-dj-width, c-jia-fetch-16]
- rename.mov_imm_limit: Eight per cycle on an 8-wide core is 8 per 8 instructions; Johnson gives 2 per 8 handled by renaming (c-dj-mov-imm)  [c-dj-mov-imm, c-ox-mov-imm-8]
- sched_int.entries_per_queue: Against the 13 of c-mh-v1-sched-int-13; the split of the 50 and the 42 is left open.  [c-mh-v1-sched-int-13, c-jia-sched-int-units]
- sched_int.entries_per_queue: Against the 13 per multiply queue of c-mh-v1-sched-int-13.  [c-mh-v1-sched-int-13, c-jc-mul-sched-28]
- sched_fp.entries_per_queue: Against the 18 of c-mh-v1-sched-18, which holds Johnson's sizes about twice too large.  [c-mh-v1-sched-18, c-jia-sched-fp-36]
- sched_fp.entries_per_queue: Same data as c-jia-sched-fp-36, here with one 12-entry FP queue rather than two of 6.  [c-mh-v1-sched-18, c-jc-fp-sched-36]
- lq.entries: range 148-154 (midpoint given); measured on the A14, probe not described  [c-dj-lsq-lq-130, c-at-lq]
- sched_int.total_entries: Disagrees with Johnson's diagram. On Handley's reading, an integer total summed from the diagram's queue sizes (134, c-cc-oryon-m1-int-sched-134) counts each paired queue about twice; he gives no total of his own.  [c-jia-sched-int-134, c-mh-v1-sched-johnson-2x]
- lsu.store_load_latency: Latency per forwarded store and load in his test; c-mh-v1-store-load-pair-6 gives 6.  [c-mh-v1-store-load-pair-6, c-jia-stlf-latency]
- sched_ls.queues: Against the four 12-entry queues of c-mh-v1-sched-ls-split-queues.  [c-mh-v1-sched-ls-4x12, c-jia-sched-ls-unified]
- dispatch.fp_entries: 12 vs 14 at equal rank  [c-mh-v1-dispatch-fp-12, c-mh-v1-dispatch-fp-14]
- memctrl.dram_load_bw: 64 vs 58 at equal rank  [c-mh-v2-slc-dram-load-64, c-at-mini-dram-read-bw]
- slc.replacement: Lines placed by GPU reads. Disagrees with EXAM's pseudo-random finding (c-exam-repl-random) and with the patent reading c-mh-v3-slc-replacement.  [c-exam-repl-random, c-slac-repl-lru]

## Problems (0)

