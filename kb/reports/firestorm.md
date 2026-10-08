# firestorm knowledge base

blocks 37, links 35, params 117, claims 682, sources 8, mechanisms 26

## By status

- inferred: 23
- measured: 79
- open: 12
- reported: 3

## By confidence

- high: 19
- low: 26
- medium: 60
- none: 12

## Holes (12)

- l1i.line (l1i): L1I line size
- itlb.entries (itlb): iTLB entries
- dirpred.capacity (dirpred): Direction predictor capacity
- ras.depth (ras): Return stack depth
- indpred.capacity (indpred): Indirect predictor capacity
- ftq.depth (ftq): Fetch target queue depth
- iq.depth (iq): Fetch-to-decode queue depth
- rename.security_tag (rename): Register mapping security tag
- int_prf.headroom (int_prf): Integer rename headroom
- mshr.outstanding (mshr): Outstanding L1D misses (MLP)
- btb.l0_footprint (btb): Zero-bubble code footprint
- sched_int.total_entries (sched_int): Integer scheduler entries (total)

## Open disputes (12)

- fetch.width: Peak per-fetch width; the sustained 8 is c-ox-fetch-8 and c-dj-width. His 2012 patent reading gives 32 bytes, 8 A64 or 16 Thumb instructions (c-mh-v4-a6-fetch-32b), so the 16 may date from Thumb.  [c-dj-width, c-mh-v4-fetch-16]
- btb.assoc: 2 vs 1 at equal rank  [c-mh-v4-nfp-2way, c-mh-v4-m1-nfp-dm]
- int_prf.total: measured on the A14  [c-mh-v1-int-prf-add, c-at-int-prf]
- fp_prf.total: measured on the A14  [c-dj-fp-prf, c-at-fp-prf]
- eu_int.count: measured on the A14  [c-dj-int-units, c-at-int-units]
- lq.entries: range 148-154 (midpoint given); measured on the A14, probe not described  [c-dj-lsq-lq-130, c-at-lq]
- sq.entries: measured on the A14, probe not described  [c-dj-lsq-sq-60, c-at-sq]
- dtlb.l1_entries: measured on the A14; the article does not say data or instruction TLB  [c-mh-v2-dtlb, c-at-l1-tlb]
- l2.latency: 17 vs 18 at equal rank  [c-mh-v2-l2-latency-17, c-7cpu-l2-latency]
- l2.latency: Passing figure in the introductory ROB-size discussion, no method stated; 7-cpu gives 18 cycles (c-7cpu-l2-latency). Vol 2 measures the cache hierarchy.  [c-mh-v2-l2-latency-17, c-mh-v1-l2-latency-aside]
- dispatch.fp_entries: 12 vs 14 at equal rank  [c-mh-v1-dispatch-fp-12, c-mh-v1-dispatch-fp-14]
- dtlb.l2_org: 3-way, 1024 sets, hashed index vs 12-way, 256 sets at equal rank  [c-mh-v2-tlb2-org, c-mh-v2-tlb2-256x12]

## Problems (0)

