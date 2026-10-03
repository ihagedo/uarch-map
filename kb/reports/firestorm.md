# firestorm knowledge base

blocks 37, links 35, params 81, claims 122, sources 4, mechanisms 6

## By status

- inferred: 5
- measured: 42
- open: 34

## By confidence

- high: 5
- low: 5
- medium: 37
- none: 34

## Holes (34)

- l1i.line (l1i): L1I line size
- itlb.entries (itlb): iTLB entries
- btb.l0_entries (btb): Zero-bubble BTB entries
- btb.l1_entries (btb): Second-level BTB entries
- btb.taken_bubble (btb): Taken-branch bubble (L1 tier)
- btb.assoc (btb): BTB associativity
- dirpred.kind (dirpred): Direction predictor type
- dirpred.history (dirpred): Global history length
- dirpred.capacity (dirpred): Direction predictor capacity
- dirpred.mispredict_penalty (dirpred): Mispredict penalty
- ras.depth (ras): Return stack depth
- indpred.capacity (indpred): Indirect predictor capacity
- ftq.present (ftq): Decoupled fetch present
- ftq.depth (ftq): Fetch target queue depth
- ftq.fdip (ftq): Fetch-directed prefetch present
- iq.depth (iq): Fetch-to-decode queue depth
- rename.security_tag (rename): Register mapping security tag
- int_prf.headroom (int_prf): Integer rename headroom
- dispatch.int_entries (dispatch): Integer dispatch buffer
- dispatch.mul_entries (dispatch): Multiply dispatch buffer
- sched_int.entries_per_queue (sched_int): Integer scheduler queue size
- sched_int.queues (sched_int): Integer scheduler queue count
- sched_fp.entries_per_queue (sched_fp): FP scheduler queue size
- lsu.forwarding (lsu): Store-to-load forwarding
- l1d.assoc (l1d): L1D associativity
- l1d.load_bw (l1d): L1D load bandwidth
- dtlb.l1_entries (dtlb): L1 dTLB entries
- dtlb.l1_org (dtlb): L1 dTLB organisation
- mshr.outstanding (mshr): Outstanding L1D misses (MLP)
- prefetch.kinds (prefetch): Prefetcher kinds
- l2.inner_slice (l2): Per-core inner L2 slice
- slc.size (slc): SLC capacity
- slc.latency (slc): SLC hit latency
- memctrl.dram_latency (memctrl): DRAM latency

## Open disputes (5)

- int_prf.total: measured on the A14  [c-dj-int-prf, c-at-int-prf]
- fp_prf.total: measured on the A14  [c-dj-fp-prf, c-at-fp-prf]
- eu_int.count: measured on the A14  [c-dj-int-units, c-at-int-units]
- lq.entries: range 148-154 (midpoint given); measured on the A14, probe not described  [c-dj-lsq-lq-130, c-at-lq]
- sq.entries: measured on the A14, probe not described  [c-dj-lsq-sq-60, c-at-sq]

## Problems (0)

