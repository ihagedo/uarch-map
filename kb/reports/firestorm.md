# firestorm knowledge base

blocks 40, links 37, params 153, claims 1813, sources 48, mechanisms 171

## By status

- derived: 13
- documented: 1
- inferred: 25
- measured: 106
- open: 4
- reported: 4

## By confidence

- confirmed: 14
- conjecture: 4
- corroborated: 32
- derived: 13
- inferred: 29
- single: 61

## Holes (4)

- ftq.depth (ftq): Fetch target queue depth
- iq.depth (iq): Fetch-to-decode queue depth
- int_prf.headroom (int_prf): Integer rename headroom
- mshr.outstanding (mshr): Outstanding L1D misses (MLP)

## Open disputes (21)

- fetch.width: Peak per-fetch width; the sustained 8 is c-ox-fetch-8 and c-dj-width. His 2012 patent reading gives 32 bytes, 8 A64 or 16 Thumb instructions (c-mh-v4-a6-fetch-32b), so the 16 may date from Thumb.  [c-dj-width, c-mh-v4-fetch-16]
- l1i.size: A comment in proc_reg.h. The measured and cache-register value is 192 KiB (c-pac-l1i-size, c-ilk-l1i-size).  [c-7cpu-l1i, c-xnu-fs-l1i-256]
- btb.assoc: 2 vs 1 at equal rank  [c-mh-v4-nfp-2way, c-mh-v4-m1-nfp-dm]
- rename.mov_imm_limit: Eight per cycle on an 8-wide core is 8 per 8 instructions; Johnson gives 2 per 8 handled by renaming (c-dj-mov-imm)  [c-dj-mov-imm, c-ox-mov-imm-8]
- int_prf.total: measured on the A14  [c-mh-v1-int-prf-add, c-at-int-prf]
- fp_prf.total: measured on the A14  [c-dj-fp-prf, c-at-fp-prf]
- eu_int.count: measured on the A14  [c-ox-int-units, c-at-int-units]
- lq.entries: range 148-154 (midpoint given); measured on the A14, probe not described  [c-dj-lsq-lq-130, c-at-lq]
- sq.entries: measured on the A14, probe not described  [c-dj-stores, c-at-sq]
- l1d.size: A comment in proc_reg.h. Every measurement gives 128 KiB (l1d.size).  [c-7cpu-l1d-size, c-xnu-fs-l1d-160]
- dtlb.l1_entries: measured on the A14; the article does not say data or instruction TLB  [c-mh-v2-dtlb, c-at-l1-tlb]
- dtlb.l1_org: Disagrees with the 160-entry, 5-way L1 dTLB of c-mh-v2-dtlb and c-mh-v2-dtlb-5way. Handley gives the same 256 x 12 shape for the 3072-entry L2 TLB (c-mh-v2-tlb2-256x12).  [c-mh-v2-dtlb-5way, c-pac-dtlb-12x256]
- l2.latency: 17 vs 18 at equal rank  [c-mh-v2-l2-latency-17, c-7cpu-l2-latency]
- l2.latency: Passing figure in the introductory ROB-size discussion, no method stated; 7-cpu gives 18 cycles (c-7cpu-l2-latency). Vol 2 measures the cache hierarchy.  [c-mh-v2-l2-latency-17, c-mh-v1-l2-latency-aside]
- sched_int.total_entries: Disagrees with Johnson's diagram. On Handley's reading, an integer total summed from the diagram's queue sizes (134, c-cc-oryon-m1-int-sched-134) counts each paired queue about twice; he gives no total of his own.  [c-cc-oryon-m1-int-sched-134, c-mh-v1-sched-johnson-2x]
- dispatch.fp_entries: 12 vs 14 at equal rank  [c-mh-v1-dispatch-fp-12, c-mh-v1-dispatch-fp-14]
- dtlb.l2_org: Disagrees with the 3072-entry L2 TLB (c-mh-v2-dtlb-l2-3072, c-7cpu-dtlb-l2) and its 3-way, 1024-set shape (c-mh-v2-tlb2-org).  [c-mh-v2-tlb2-org, c-pac-l2tlb-23x2048]
- slc.replacement: Lines placed by GPU reads. Disagrees with EXAM's pseudo-random finding (c-exam-repl-random) and with the patent reading c-mh-v3-slc-replacement.  [c-mh-v3-slc-replacement, c-slac-repl-lru]
- l1i.assoc: M1 (P) row, Mac Mini; M1 Pro, M1 Max, A14 and M2 P-cores also show 6 ways. Disagrees with the 12 ways of c-mh-v8-l1i-12way; the registers read by PACMAN say 6 (c-pac-l1i-ways).  [c-mh-v8-l1i-12way, c-ilk-l1i-ways]
- l1i.assoc: Read with a kernel extension. Disagrees with the 12 ways of c-mh-v8-l1i-12way; iLeakage measures 6 (c-ilk-l1i-ways).  [c-mh-v8-l1i-12way, c-pac-l1i-ways]
- l1i.assoc: The 6-way follows both sizes, as in the other cores' comments. Agrees with c-pac-l1i-ways and c-ilk-l1i-ways against the inferred 12.  [c-mh-v8-l1i-12way, c-xnu-fs-l1i-6way]

## Problems (0)

