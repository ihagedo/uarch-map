# firestorm knowledge base

blocks 37, links 35, params 80, claims 98, sources 3, mechanisms 4

## By status

- inferred: 4
- measured: 32
- open: 42
- reported: 2

## By confidence

- high: 4
- low: 6
- medium: 28
- none: 42

## Holes (42)

- pcluster.clock_max (pcluster): Maximum clock
- l1i.size (l1i): L1I capacity
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
- l1d.size (l1d): L1D capacity
- l1d.line (l1d): L1D line size
- l1d.assoc (l1d): L1D associativity
- l1d.latency_complex (l1d): L1D hit latency (complex addr)
- l1d.load_bw (l1d): L1D load bandwidth
- dtlb.l1_entries (dtlb): L1 dTLB entries
- dtlb.l1_org (dtlb): L1 dTLB organisation
- dtlb.l2_entries (dtlb): L2 TLB entries
- mshr.outstanding (mshr): Outstanding L1D misses (MLP)
- prefetch.kinds (prefetch): Prefetcher kinds
- l2.line (l2): L2 line size
- l2.latency (l2): L2 hit latency
- l2.inner_slice (l2): Per-core inner L2 slice
- slc.size (slc): SLC capacity
- slc.latency (slc): SLC hit latency
- memctrl.dram_latency (memctrl): DRAM latency

## Open disputes (3)

- int_prf.total: measured on the A14  [c-dj-int-prf, c-at-int-prf]
- fp_prf.total: measured on the A14  [c-dj-fp-prf, c-at-fp-prf]
- eu_int.count: measured on the A14  [c-dj-int-units, c-at-int-units]

## Problems (0)

