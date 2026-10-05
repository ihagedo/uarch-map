# firestorm knowledge base

blocks 37, links 35, params 92, claims 263, sources 5, mechanisms 11

## By status

- inferred: 11
- measured: 55
- open: 25
- reported: 1

## By confidence

- high: 13
- low: 12
- medium: 42
- none: 25

## Holes (25)

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
- lsu.forwarding (lsu): Store-to-load forwarding
- l1d.assoc (l1d): L1D associativity
- l1d.load_bw (l1d): L1D load bandwidth
- dtlb.l1_org (dtlb): L1 dTLB organisation
- mshr.outstanding (mshr): Outstanding L1D misses (MLP)
- prefetch.kinds (prefetch): Prefetcher kinds
- l2.inner_slice (l2): Per-core inner L2 slice
- sched_int.total_entries (sched_int): Integer scheduler entries (total)

## Open disputes (9)

- int_prf.total: measured on the A14  [c-mh-v1-int-prf-add, c-at-int-prf]
- fp_prf.total: measured on the A14  [c-dj-fp-prf, c-at-fp-prf]
- eu_int.count: measured on the A14  [c-dj-int-units, c-at-int-units]
- lq.entries: range 148-154 (midpoint given); measured on the A14, probe not described  [c-dj-lsq-lq-130, c-at-lq]
- sq.entries: measured on the A14, probe not described  [c-dj-lsq-sq-60, c-at-sq]
- lsu.disambiguation: LSDP at the mapper; predicted store becomes a dependency of the load vs suspected X29 special case at equal rank  [c-mh-v1-lsdp-mapper, c-dj-lsq-x29-prediction]
- dtlb.l1_entries: measured on the A14; the article does not say data or instruction TLB  [c-7cpu-dtlb-l1, c-at-l1-tlb]
- l2.latency: Passing figure in the introductory ROB-size discussion, no method stated; 7-cpu gives 18 cycles (c-7cpu-l2-latency). Vol 2 measures the cache hierarchy.  [c-7cpu-l2-latency, c-mh-v1-l2-latency-aside]
- dispatch.fp_entries: 12 vs 14 at equal rank  [c-mh-v1-dispatch-fp-12, c-mh-v1-dispatch-fp-14]

## Problems (0)

