# firestorm knowledge base

blocks 40, links 37, params 159, claims 2194, sources 70, mechanisms 183

## By status

- derived: 13
- documented: 4
- inferred: 18
- measured: 120
- open: 3
- reported: 1

## By confidence

- confirmed: 26
- conjecture: 3
- corroborated: 31
- derived: 12
- inferred: 19
- ours: 1
- single: 67

## Holes (3)

- ftq.depth (ftq): Fetch target queue depth
- iq.depth (iq): Fetch-to-decode queue depth
- mshr.outstanding (mshr): Outstanding L1D misses (MLP)

## Open disputes (17)

- dirpred.mispredict_penalty: Reproduced (6 runs, sets 04,16,45; cpus 4,5,6,7; 3 days); runs and CIs 14.38 to 14.43. 2.988 GHz. fe_mispredict_w16384: (random - baseline) / 0.5, baseline data mode 2.  [c-7cpu-mispredict, c-us-p3-7-frontend-mispredict-penalty]
- rename.mov_imm_limit: Eight per cycle on an 8-wide core is 8 per 8 instructions; Johnson gives 2 per 8 handled by renaming (c-dj-mov-imm)  [c-dj-mov-imm, c-ox-mov-imm-8]
- int_prf.headroom: Two runs, agree (sets 31,43; cpus 6,7); range with the resolution 340 to 347. Fine step 1; the delay and loop hold up to 2 more than the knee counts. The knee counts free registers. Masked chain, out of the DMP's reach. 2.988 GHz.  [c-jia-int-spec-362, c-us-window-int-d2-miss-masked]
- sched_int.entries_per_queue: Against the 13 of c-mh-v1-sched-int-13; the split of the 50 and the 42 is left open.  [c-mh-v1-sched-int-13, c-jia-sched-int-units]
- sched_int.entries_per_queue: Against the 13 per multiply queue of c-mh-v1-sched-int-13.  [c-mh-v1-sched-int-13, c-jc-mul-sched-28]
- lq.entries: range 148-154 (midpoint given); measured on the A14, probe not described  [c-dj-lsq-lq-130, c-at-lq]
- l2.latency: Reproduced (10 runs, sets 03,13,15,20; cpus 4,5,6,7; 3 days); runs and CIs 17.43 to 17.99. Load-to-load: ldr x, [x], no address add. Cores 4/5 read about 0.5 below 6/7. Raw pointer chain; masked 18.95; plain 18.96. 2.985 GHz.  [c-mh-v2-l2-latency-17, c-us-p2-1-l2-load-to-use]
- sched_int.total_entries: Disagrees with Johnson's diagram. On Handley's reading, an integer total summed from the diagram's queue sizes (134, c-cc-oryon-m1-int-sched-134) counts each paired queue about twice; he gives no total of his own.  [c-jia-sched-int-134, c-mh-v1-sched-johnson-2x]
- lsu.store_load_latency: Latency per forwarded store and load in his test; c-mh-v1-store-load-pair-6 gives 6.  [c-mh-v1-store-load-pair-6, c-jia-stlf-latency]
- lsu.store_load_latency: Reproduced (6 runs, sets 07,15,21; cpus 4,5,6,7; 3 days). 2.988 GHz. str x1, [x1]; ldr x2, [x2], x1 = x2; 6 here vs 7.5 above: a setup difference; equal: that value.  [c-mh-v1-store-load-pair-6, c-us-p2-5-store-to-load-forwarding-forced-seq-5b094d]
- sched_ls.queues: Against the four 12-entry queues of c-mh-v1-sched-ls-split-queues.  [c-mh-v1-sched-ls-4x12, c-jia-sched-ls-unified]
- lsu.lsdp_entries: Reproduced (6 runs, sets 07,15,21; cpus 4,5,6,7; 3 days); spread 91 to 92. Store address delayed by udiv. 2.988 GHz. N store/load blocks, store address behind a divide; 2.0 -> 32.0 cycles per block.  [c-mh-v1-lsdp-74-delayed-data, c-us-p2-5-store-load-pairs-tracked]
- lsu.ordering_flush_penalty: Reproduced (6 runs, sets 07,15,21; cpus 4,5,6,7; 3 days); runs and CIs 29.97 to 29.98. 2.988 GHz. above 2x the knee, over the flat level.  [c-mh-v1-ordering-flush-25, c-us-p2-5-ordering-violation-cost-per-block]
- dispatch.fp_entries: 12 vs 14 at equal rank  [c-mh-v1-dispatch-fp-12, c-mh-v1-dispatch-fp-14]
- memctrl.dram_load_bw: 64 vs 58 at equal rank  [c-mh-v2-slc-dram-load-64, c-at-mini-dram-read-bw]
- slc.replacement: Lines placed by GPU reads. Disagrees with EXAM's pseudo-random finding (c-exam-repl-random) and with the patent reading c-mh-v3-slc-replacement.  [c-exam-repl-random, c-slac-repl-lru]
- fp_prf.headroom: Two runs, agree (sets 31,43; cpus 6,7); range with the resolution 400 to 408. Fine step 1; the delay and loop hold up to 1 more than the knee counts. The knee counts free registers. Masked chain, out of the DMP's reach. 2.988 GHz.  [c-jia-fp-spec-382, c-us-window-fp-d2-miss-masked]

## Problems (0)

