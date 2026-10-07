# firestorm knowledge base

blocks 37, links 35, params 111, claims 524, sources 6, mechanisms 19

## By status

- inferred: 16
- measured: 75
- open: 19
- reported: 1

## By confidence

- high: 19
- low: 17
- medium: 56
- none: 19

## Holes (19)

- l1i.line (l1i): L1I line size
- itlb.entries (itlb): iTLB entries
- btb.l0_entries (btb): Zero-bubble BTB entries
- btb.l1_entries (btb): Second-level BTB entries
- btb.taken_bubble (btb): Taken-branch bubble (L1 tier)
- btb.assoc (btb): BTB associativity
- dirpred.kind (dirpred): Direction predictor type
- dirpred.history (dirpred): Global history length
- dirpred.capacity (dirpred): Direction predictor capacity
- ras.depth (ras): Return stack depth
- indpred.capacity (indpred): Indirect predictor capacity
- ftq.present (ftq): Decoupled fetch present
- ftq.depth (ftq): Fetch target queue depth
- ftq.fdip (ftq): Fetch-directed prefetch present
- iq.depth (iq): Fetch-to-decode queue depth
- rename.security_tag (rename): Register mapping security tag
- int_prf.headroom (int_prf): Integer rename headroom
- mshr.outstanding (mshr): Outstanding L1D misses (MLP)
- sched_int.total_entries (sched_int): Integer scheduler entries (total)

## Open disputes (8)

- int_prf.total: measured on the A14  [c-mh-v1-int-prf-add, c-at-int-prf]
- fp_prf.total: measured on the A14  [c-dj-fp-prf, c-at-fp-prf]
- eu_int.count: measured on the A14  [c-dj-int-units, c-at-int-units]
- lq.entries: range 148-154 (midpoint given); measured on the A14, probe not described  [c-dj-lsq-lq-130, c-at-lq]
- sq.entries: measured on the A14, probe not described  [c-dj-lsq-sq-60, c-at-sq]
- dtlb.l1_entries: measured on the A14; the article does not say data or instruction TLB  [c-mh-v2-dtlb, c-at-l1-tlb]
- l2.latency: Passing figure in the introductory ROB-size discussion, no method stated; 7-cpu gives 18 cycles (c-7cpu-l2-latency). Vol 2 measures the cache hierarchy.  [c-7cpu-l2-latency, c-mh-v1-l2-latency-aside]
- dispatch.fp_entries: 12 vs 14 at equal rank  [c-mh-v1-dispatch-fp-12, c-mh-v1-dispatch-fp-14]

## Problems (0)

