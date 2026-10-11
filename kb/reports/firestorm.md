# firestorm knowledge base

blocks 37, links 35, params 142, claims 1578, sources 38, mechanisms 59

## By status

- derived: 13
- inferred: 25
- measured: 96
- open: 4
- reported: 4

## By confidence

- confirmed: 16
- conjecture: 3
- corroborated: 29
- derived: 13
- inferred: 29
- single: 51
- unknown: 1

## Holes (4)

- ftq.depth (ftq): Fetch target queue depth
- iq.depth (iq): Fetch-to-decode queue depth
- int_prf.headroom (int_prf): Integer rename headroom
- mshr.outstanding (mshr): Outstanding L1D misses (MLP)

## Open disputes (20)

- fetch.width: Peak per-fetch width; the sustained 8 is c-ox-fetch-8 and c-dj-width. His 2012 patent reading gives 32 bytes, 8 A64 or 16 Thumb instructions (c-mh-v4-a6-fetch-32b), so the 16 may date from Thumb.  [c-dj-width, c-mh-v4-fetch-16]
- btb.assoc: 2 vs 1 at equal rank  [c-mh-v4-nfp-2way, c-mh-v4-m1-nfp-dm]
- rename.mov_imm_limit: Eight per cycle on an 8-wide core is 8 per 8 instructions; Johnson gives 2 per 8 handled by renaming (c-dj-mov-imm)  [c-dj-mov-imm, c-ox-mov-imm-8]
- int_prf.total: measured on the A14  [c-mh-v1-int-prf-add, c-at-int-prf]
- fp_prf.total: measured on the A14  [c-dj-fp-prf, c-at-fp-prf]
- eu_int.count: measured on the A14  [c-ox-int-units, c-at-int-units]
- lq.entries: range 148-154 (midpoint given); measured on the A14, probe not described  [c-dj-lsq-lq-130, c-at-lq]
- sq.entries: measured on the A14, probe not described  [c-dj-stores, c-at-sq]
- dtlb.l1_entries: measured on the A14; the article does not say data or instruction TLB  [c-mh-v2-dtlb, c-at-l1-tlb]
- dtlb.l1_org: Disagrees with the 160-entry, 5-way L1 dTLB of c-mh-v2-dtlb and c-mh-v2-dtlb-5way. Handley gives the same 256 x 12 shape for the 3072-entry L2 TLB (c-mh-v2-tlb2-256x12).  [c-mh-v2-dtlb-5way, c-pac-dtlb-12x256]
- l2.latency: 17 vs 18 at equal rank  [c-mh-v2-l2-latency-17, c-7cpu-l2-latency]
- l2.latency: Passing figure in the introductory ROB-size discussion, no method stated; 7-cpu gives 18 cycles (c-7cpu-l2-latency). Vol 2 measures the cache hierarchy.  [c-mh-v2-l2-latency-17, c-mh-v1-l2-latency-aside]
- sched_int.total_entries: Disagrees with Johnson's diagram. On Handley's reading, an integer total summed from the diagram's queue sizes (134, c-cc-oryon-m1-int-sched-134) counts each paired queue about twice; he gives no total of his own.  [c-cc-oryon-m1-int-sched-134, c-mh-v1-sched-johnson-2x]
- dispatch.fp_entries: 12 vs 14 at equal rank  [c-mh-v1-dispatch-fp-12, c-mh-v1-dispatch-fp-14]
- l2.replacement: Disagrees with plain random replacement (c-mh-v2-l2-random-repl) for same-core lines; vol 8 reads a patent as strict LRU (c-mh-v8-l2-lru-patent).  [c-mh-v2-l2-random-repl, c-s2c-l2-repl]
- dtlb.l2_org: Disagrees with the 3072-entry L2 TLB (c-mh-v2-dtlb-l2-3072, c-7cpu-dtlb-l2) and its 3-way, 1024-set shape (c-mh-v2-tlb2-org).  [c-mh-v2-tlb2-org, c-pac-l2tlb-23x2048]
- l2.inclusion: Cross-core test with a control set that leaves the victim alone. Disagrees with the non-inclusive, non-exclusive readings of c-mh-v3-l2-covering-tags-hint and c-mh-v3-dram-fill-l1-only.  [c-mh-v3-l2-covering-tags-hint, c-ilk-l2-inclusive]
- l2.inclusion: Two cores, eviction set split over two L1D sets so AutoLock cannot interfere. Disagrees with the non-inclusive, non-exclusive reading (c-mh-v3-l2-covering-tags-hint, c-mh-v3-dram-fill-l1-only). E-core results said similar.  [c-mh-v3-l2-covering-tags-hint, c-s2c-l2-inclusive]
- l1i.assoc: M1 (P) row, Mac Mini; M1 Pro, M1 Max, A14 and M2 P-cores also show 6 ways. Disagrees with the 12 ways of c-mh-v8-l1i-12way; the registers read by PACMAN say 6 (c-pac-l1i-ways).  [c-mh-v8-l1i-12way, c-ilk-l1i-ways]
- l1i.assoc: Read with a kernel extension. Disagrees with the 12 ways of c-mh-v8-l1i-12way; iLeakage measures 6 (c-ilk-l1i-ways).  [c-mh-v8-l1i-12way, c-pac-l1i-ways]

## Problems (0)

