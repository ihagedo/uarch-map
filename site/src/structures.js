  // structures.js
  // Isaac Hagedorn, 2026-10-08
  // The L3 structure views; build.py splices this file into app.js.
  const STRUCTURES = { retire: drawRetireView, ports: drawPortsView, lsq: drawLsqView, chip: drawChipView,
    frontend: drawFrontendView, dmem: drawDmemView };
  const fmtN = (n) => (n == null ? "?" : Number(n).toLocaleString("en-US"));

  function drawStructure(sid, S) {
    const frame = (D.views.L2.boxes[S.blocks[0]] || {}).frame;
    const g = el("g", { class: "structure", "data-structure": sid, style: frame ? hue(frame) : "" }, svg);
    const back = el("g", { class: "crumb", "data-nav": "back", tabindex: "0", role: "button",
      "aria-label": "Back to the stage map" }, g);
    txt(back, 16, 30, "‹ Stages", "crumb-link");
    txt(g, 84, 30, `/  ${S.label}`, "crumb-here");
    const size = STRUCTURES[S.kind](g, S);
    return { w: size.w, h: size.h };
  }

  function txt(g, x, y, s, cls, anchor) {
    const t = el("text", { x, y, class: cls || "" }, g);
    if (anchor) t.setAttribute("text-anchor", anchor);
    t.textContent = s;
    return t;
  }

  // a value bound to a param: clickable, outlined by confidence, "?" for a hole; returns its width
  function pval(g, x, y, pid, opts) {
    const o = opts || {};
    const p = D.params[pid];
    const v = p.known ? (o.raw ? p.value : (p.approx ? "~" : "") + fmtN(p.num != null ? p.num : p.value)) : "?";
    const s = el("g", { class: `sp conf-${p.conf}`, "data-param": pid, tabindex: "0", role: "button",
      "aria-label": `${p.name}: ${p.known ? p.value : "hole"}` }, g);
    const t = txt(s, x + 4, y, v + (o.unit ? ` ${o.unit}` : ""), `sp-text${o.big ? " big" : ""}`);
    const w = t.getComputedTextLength() + 8, h = o.big ? 24 : 18;
    s.insertBefore(el("rect", { x, y: y - h + (o.big ? 6 : 5), width: w, height: h, rx: 4, class: "body anchor" }), t);
    if (openDispute(p)) disputePin(s, x + w + 6, y - (o.big ? 6 : 5));
    el("title", {}, s).textContent = `${p.name}: ${p.known ? p.value + (p.unit ? " " + p.unit : "") : "no claim yet"}` +
      ` (${CONF_WORD[p.conf].toLowerCase()})`;
    return w + (openDispute(p) ? 12 : 0);
  }

  // a long text value bound to a param, wrapped at `chars`; returns the last baseline
  function pwrap(g, x, y, pid, chars) {
    const p = D.params[pid];
    const s = el("g", { class: `sp conf-${p.conf}`, "data-param": pid, tabindex: "0", role: "button",
      "aria-label": `${p.name}: ${p.known ? p.value : "hole"}` }, g);
    const box = el("rect", { x, y: y - 14, rx: 4, class: "body anchor" }, s);
    const last = wrapText(s, x + 6, y, p.known ? p.value : "?", chars, 17, "sp-text");
    box.setAttribute("width", Math.min(chars * 7.8, s.getBBox().width + 12));
    box.setAttribute("height", last - y + 20);
    el("title", {}, s).textContent = `${p.name}: ${p.known ? p.value : "no claim yet"} (${CONF_WORD[p.conf].toLowerCase()})`;
    return last;
  }

  // a line of text with values in it: parts are strings or {pid, ...opts}
  function line(g, x, y, parts, cls) {
    let cx = x;
    for (const part of parts) {
      if (typeof part === "string") {
        const t = txt(g, cx, y, part, cls || "st-t");
        cx += t.getComputedTextLength() + 4;
      } else {
        cx += pval(g, cx, y, part.pid, part) + 4;
      }
    }
    return cx;
  }

  function drawRetireView(g, S) {
    const P = S.params, W = 1180;
    const rows = D.params[P.groups].num, slots = D.params[P.slots].num || 7;

    txt(g, 16, 76, "Coalesced retire queue", "st-h");
    line(g, 16, 102, [{ pid: P.groups }, "groups of up to", { pid: P.slots }, "uops"]);
    const top = 122, cw = 8, ch = 6, px = 9.5, py = 8, cols = 6;
    if (rows) {
      const per = Math.ceil(rows / cols), rw = slots * px - (px - cw), gx = rw + 22;
      const grid = el("g", { class: "q-grid", "data-param": P.groups }, g);
      for (let c = 0; c < cols; c++) {
        let d = "";
        const n = Math.min(per, rows - c * per);
        for (let r = 0; r < n; r++) {
          for (let k = 0; k < slots; k++) d += `M${16 + c * gx + k * px} ${top + r * py}h${cw}v${ch}h${-cw}z`;
        }
        el("path", { d, class: "q-slot" }, grid);
        txt(grid, 16 + c * gx, top - 6, String(c * per + 1), "q-idx");
      }
      el("title", {}, grid).textContent = `${fmtN(rows)} groups x ${slots} slots = ${fmtN(rows * slots)} slots`;
      txt(g, 16, top + per * py + 22, `${fmtN(rows)} × ${slots} = ${fmtN(rows * slots)} slots`, "st-note");
    } else {
      el("rect", { x: 16, y: top, width: 500, height: 200, rx: 6, class: "q-hole" }, g);
      txt(g, 266, top + 104, "no claim for the number of groups", "st-note", "middle");
    }

    const x0 = 620;
    const rules = el("g", { class: "rules", "data-mech": "retire_groups", tabindex: "0", role: "button",
      "aria-label": "Retire group packing rules" }, g);
    txt(rules, x0, 76, "How groups are packed", "st-h");
    const C = 50, G = 4;
    const examples = [
      [["ldr", "mem"], ["add", "iss"], ["nop", "elim"], ["nop", "elim"], ["mov", "elim"], ["nop", "elim"], ["cbz", "br"],
        "A load or store starts a group; a branch ends one."],
      [["nop", "elim"], ["nop", "elim"], ["mov", "elim"], ["nop", "elim"], ["nop", "elim"], ["mov", "elim"], ["nop", "elim"],
        "Seven only when every uop is eliminated (nop, mov)."],
      [["add", "iss"], ["add", "iss"], ["add", "iss"], ["add", "iss"], ["", "empty"], ["", "empty"], ["", "empty"],
        "About four issuing uops per group."],
    ];
    examples.forEach((ex, i) => {
      const y = 92 + i * 68;
      ex.slice(0, 7).forEach(([op, kind], k) => {
        el("rect", { x: x0 + k * (C + G), y, width: C, height: 28, rx: 4, class: `ex ex-${kind}` }, rules);
        if (op) txt(rules, x0 + k * (C + G) + C / 2, y + 18, op, "ex-op", "middle");
      });
      txt(rules, x0, y + 46, ex[7], "st-t");
    });
    el("title", {}, rules).textContent = "Illustration of Johnson's packing rules, not a trace";
    if (S.claims.alt_rule && D.claims[S.claims.alt_rule]) {
      const c = D.claims[S.claims.alt_rule];
      const t = txt(rules, x0, 92 + 3 * 68 - 4, `${D.sources[c.source].author} reads it differently: loads, stores and branches all take a group's last slot.`, "st-note");
      el("title", {}, t).textContent = `${c.text} (${D.sources[c.source].cite}, ${locText(c.loc)})`;
    }

    const y1 = 334;
    txt(g, x0, y1, "Rename retire queue", "st-h");
    line(g, x0, y1 + 26, [{ pid: P.rrq }, "entries, one per architectural register written"]);
    const cost = el("g", { class: "rules", "data-mech": "rename_retire_queue", tabindex: "0", role: "button" }, g);
    txt(cost, x0, y1 + 48, "cbz, str: none   ·   add, mov: one   ·   adds, ldp: two", "st-t mono");
    const rrq = D.params[P.rrq].num;
    if (rrq) {
      const gq = el("g", { class: "q-grid", "data-param": P.rrq }, g), per = 60;
      let d = "";
      for (let i = 0; i < rrq; i++) d += `M${x0 + (i % per) * 8} ${y1 + 62 + Math.floor(i / per) * 8}h6v6h-6z`;
      el("path", { d, class: "q-slot" }, gq);
      el("title", {}, gq).textContent = `${fmtN(rrq)} entries`;
    }
    const y2 = y1 + 62 + Math.ceil((rrq || 0) / 60) * 8 + 26;
    line(g, x0, y2, ["Retires up to", { pid: P.rate_groups }, "groups and", { pid: P.rate_rrq },
      "rename entries per cycle"]);

    const y3 = y2 + 48, c1 = x0 + 128, c2 = x0 + 250;
    txt(g, x0, y3, "What a window probe measures", "st-h");
    txt(g, x0, y3 + 24, "Filler", "st-col");
    txt(g, c1, y3 + 24, "Published", "st-col");
    txt(g, c2, y3 + 24, "From the queues", "st-col");
    S.probes.forEach((pr, i) => {
      const y = y3 + 50 + i * 26;
      txt(g, x0, y, pr.filler, "st-t");
      pval(g, c1, y, pr.window);
      if (pr.rows) {
        const a = D.params[pr.rows].num, b = D.params[pr.per_row].num, w = D.params[pr.window].num;
        let cx = line(g, c2, y, [{ pid: pr.rows }, "×", { pid: pr.per_row }]);
        if (a != null && b != null) {
          const prod = a * b, off = w ? (prod - w) / w : 0;
          cx += txt(g, cx, y, `= ${fmtN(prod)}`, "st-t").getComputedTextLength() + 8;
          if (Math.abs(off) > 0.1) txt(g, cx, y, `${Math.round(Math.abs(off) * 100)} % ${off > 0 ? "above" : "below"}`, "st-off");
        }
      } else {
        txt(g, c2, y, pr.note, "st-t");
      }
    });
    const bottom = Math.max(y3 + 50 + S.probes.length * 26, top + (rows ? Math.ceil(rows / cols) * py + 30 : 220));
    return { w: W, h: bottom + 10 };
  }

  function drawPortsView(g, S) {
    const P = S.params, W = 1180;
    const lanes = [
      { id: "int", label: "Integer", units: [1, 2, 3, 4, 5, 6], count: P.n_int, generic: "ALU", noun: "integer units",
        dispatch: [["Integer", P.d_int], ["Multiply", P.d_mul]], sched: [[P.s_int, "per queue ×"], [P.s_int_n, "queues"]] },
      { id: "ls", label: "Load-store", units: [7, 8, 9, 10], count: P.n_ls, generic: "", noun: "load-store units",
        dispatch: [["Load-store", P.d_ls]], sched: [[P.s_ls, "entries in"], [P.s_ls_n, "queues"]] },
      { id: "fp", label: "FP/SIMD", units: [11, 12, 13, 14], count: P.n_fp, generic: "FP/SIMD", noun: "FP/SIMD units",
        dispatch: [["FP/SIMD", P.d_fp]], sched: [[P.s_fp, "per queue"]] },
    ];
    const cx = { d: 16, s: 262, u: 520 }, uw = 100, ug = 8, laneH = 150;
    txt(g, cx.d, 70, "Dispatch buffers", "st-col");
    txt(g, cx.s, 70, "Schedulers", "st-col");
    txt(g, cx.u, 70, "Execution units", "st-col");
    lanes.forEach((L, li) => {
      const y0 = 86 + li * (laneH + 18);
      el("rect", { x: 8, y: y0 - 6, width: W - 16, height: laneH, rx: 10, class: "lane" }, g);
      L.dispatch.forEach(([label, pid], k) => {
        const y = y0 + 14 + k * 54;
        el("rect", { x: cx.d, y, width: 200, height: 44, rx: 6, class: `stage-box body` }, el("g", { class: pid ? `conf-${D.params[pid].conf}` : "conf-none" }, g));
        txt(g, cx.d + 10, y + 18, label, "st-t");
        if (pid) pval(g, cx.d + 10, y + 37, pid, { unit: "entries" });
        else txt(g, cx.d + 10, y + 37, "no claim", "st-hole");
      });
      const sy = y0 + 14;
      const sconf = L.sched.map(([pid]) => D.params[pid]).filter((p) => p.known)
        .map((p) => p.conf).sort((a, b) => CONFS.indexOf(a) - CONFS.indexOf(b))[0] || "none";
      el("rect", { x: cx.s, y: sy, width: 220, height: 64, rx: 6, class: "stage-box body" }, el("g", { class: `conf-${sconf}` }, g));
      txt(g, cx.s + 10, sy + 18, `${L.label} schedulers`, "st-t");
      let sx = cx.s + 10;
      for (const [pid, after] of L.sched) {
        sx += pval(g, sx, sy + 42, pid) + 4;
        sx += txt(g, sx, sy + 42, after, "st-t").getComputedTextLength() + 6;
      }
      const ux = cx.u, uy = y0 + 4;
      line(g, ux, uy + 4, [{ pid: L.count }, L.noun], "st-t");
      L.units.forEach((n, k) => {
        const id = `u${n}`, x = ux + k * (uw + ug), y = uy + 16;
        const roles = (S.roles[id] || []);
        const ug_ = el("g", { class: "unit" }, g);
        el("rect", { x, y, width: uw, height: laneH - 34, rx: 6, class: "unit-body" }, ug_);
        txt(ug_, x + 10, y + 20, id, "unit-id");
        let ly = y + 40;
        const tags = (L.generic ? [L.generic] : []).concat(roles.map((r) => r.text));
        for (const t of tags) { txt(ug_, x + 10, ly, t, "unit-role"); ly += 16; }
      });
      const ay = y0 + 36;
      el("path", { d: `M${cx.d + 204} ${ay} H${cx.s - 6}`, class: "link", "marker-end": "url(#arrow)" }, g);
      el("path", { d: `M${cx.s + 224} ${ay} H${cx.u - 6}`, class: "link", "marker-end": "url(#arrow)" }, g);
    });
    return { w: W, h: 86 + 3 * (laneH + 18) };
  }

  // a grid of n cells bound to a param, `per` to a row; returns the bottom y
  function cells(g, x, y, pid, per, size) {
    const n = D.params[pid].num, c = size || 9, pitch = c + 3;
    if (!n) {
      el("rect", { x, y, width: per * pitch, height: 3 * pitch, rx: 4, class: "q-hole" }, g);
      return y + 3 * pitch;
    }
    const gq = el("g", { class: "q-grid", "data-param": pid }, g);
    let d = "";
    for (let i = 0; i < n; i++) d += `M${x + (i % per) * pitch} ${y + Math.floor(i / per) * pitch}h${c}v${c}h${-c}z`;
    el("path", { d, class: "q-slot" }, gq);
    el("title", {}, gq).textContent = `${D.params[pid].name}: ${fmtN(n)} entries`;
    return y + Math.ceil(n / per) * pitch;
  }

  function drawLsqView(g, S) {
    const P = S.params, W = 1180;
    txt(g, 16, 76, "Load queue", "st-h");
    line(g, 16, 102, [{ pid: P.lq }, "entries"]);
    let y = cells(g, 16, 116, P.lq, 26) + 36;
    txt(g, 16, y, "Store queue", "st-h");
    line(g, 16, y + 26, [{ pid: P.sq }, "entries"]);
    y = cells(g, 16, y + 40, P.sq, 26) + 36;
    if (P.lsdp) {
      txt(g, 16, y, "Memory ordering", "st-h");
      line(g, 16, y + 26, ["Dependence predictor:", { pid: P.lsdp, raw: true }]);
      line(g, 16, y + 50, [{ pid: P.lsdp_n }, "pairs; a misordering flush costs", { pid: P.flush }, "cycles"]);
      line(g, 16, y + 74, ["Store to load", { pid: P.stl }, "cycles; zero-cycle loads:", { pid: P.zcl, raw: true }]);
      y += 94;
    }

    const x0 = 400;
    txt(g, x0, 76, "Where an entry is taken and given back", "st-h");
    const steps = [
      ["Rename", "ordering ID", null],
      ["LS dispatch", null, P.d_ls],
      ["LS scheduler", null, P.s_ls],
      ["Issue", "queue entry taken", P.alloc],
      ["Units 7-10", null, P.units],
      ["Complete", "early release", null],
      ["Retire", "entry freed", null],
    ];
    const bw = 96, bh = 58, gap = 12, by = 96;
    steps.forEach(([name, note, pid], i) => {
      const x = x0 + i * (bw + gap);
      const conf = pid ? D.params[pid].conf : "medium";
      el("rect", { x, y: by, width: bw, height: bh, rx: 6, class: "stage-box body" }, el("g", { class: `conf-${pid ? conf : "none"} flow` }, g));
      txt(g, x + 8, by + 18, name, "st-t strong");
      if (pid) pval(g, x + 8, by + 44, pid, { raw: !D.params[pid].num });
      else if (note) txt(g, x + 8, by + 44, note, "st-note");
      if (i) el("path", { d: `M${x - gap + 1} ${by + bh / 2} H${x - 2}`, class: "link", "marker-end": "url(#arrow)" }, g);
    });
    const my = by + bh + 34;
    let mbottom = my;
    S.mechanisms.forEach((mid, i) => {
      const m = D.mechanisms[mid], x = x0 + i * 384;
      const r = el("g", { class: "rules", "data-mech": mid, tabindex: "0", role: "button" }, g);
      const box = el("rect", { x, y: my, width: 370, rx: 8, class: "mech-box" }, r);
      wrapText(r, x + 12, my + 22, m.name, 52, 17, "st-t strong");
      const sy = r.lastChild.getAttribute("y") * 1 + 18;
      txt(r, x + 12, sy, m.status, "status-text");
      const last = wrapText(r, x + 12, sy + 20, m.description, 56, 16, "st-note");
      box.setAttribute("height", last - my + 16);
      mbottom = Math.max(mbottom, last + 16);
    });

    let ty = Math.max(y + 28, mbottom + 40);
    if (S.apparent && S.apparent.length) {
      const col = { delay: 16, load: 270, store: 350, src: 430, limit: 580 };
      txt(g, 16, ty, "What a queue probe measures", "st-h");
      txt(g, 16, ty + 20, "The same fillers give different counts depending on the delay in front of them.", "st-note");
      txt(g, col.delay, ty + 46, "Delay before the fillers", "st-col");
      txt(g, col.load, ty + 46, "Loads", "st-col");
      txt(g, col.store, ty + 46, "Stores", "st-col");
      txt(g, col.src, ty + 46, "Measured by", "st-col");
      txt(g, col.limit, ty + 46, "What fills first", "st-col");
      S.apparent.forEach((row, i) => {
        const yy = ty + 72 + i * 26;
        if (i && row.limit !== S.apparent[i - 1].limit) el("path", { d: `M16 ${yy - 17} H${W - 16}`, class: "col-rule" }, g);
        txt(g, col.delay, yy, row.delay, "st-t");
        for (const k of ["load", "store"]) {
          const c = D.claims[row[k]];
          const t = el("g", { class: "cv" }, g);
          txt(t, col[k], yy, c.value != null ? c.value : "?", "sp-text");
          el("title", {}, t).textContent = `${c.text} (${D.sources[c.source].cite}, ${locText(c.loc)})`;
        }
        const c = D.claims[row.load];
        el("title", {}, txt(g, col.src, yy, D.sources[c.source].cite, "st-note")).textContent =
          `${D.sources[c.source].cite}, ${locText(c.loc)}`;
        if (row.limit && (!i || row.limit !== S.apparent[i - 1].limit)) txt(g, col.limit, yy, row.limit, "st-t");
      });
      ty += 72 + S.apparent.length * 26;
    }
    return { w: W, h: ty + 10 };
  }

  // s wrapped at `chars` a line, `lh` apart; returns the last baseline
  function wrapText(g, x, y, s, chars, lh, cls) {
    const words = String(s).split(/\s+/);
    let lineS = "", yy = y;
    for (const w of words) {
      if ((lineS + " " + w).trim().length > chars) { txt(g, x, yy, lineS.trim(), cls); yy += lh; lineS = ""; }
      lineS += " " + w;
    }
    if (lineS.trim()) txt(g, x, yy, lineS.trim(), cls);
    return yy;
  }

  function drawChipView(g, S) {
    const P = S.params, W = 1180;
    const box = (x, y, w, h, cls, conf) =>
      el("rect", { x, y, width: w, height: h, rx: 10, class: `${cls} body` }, el("g", { class: `conf-${conf || "none"}` }, g));
    const confOf = (...pids) => pids.map((p) => D.params[p]).filter((p) => p.known).map((p) => p.conf)
      .sort((a, b) => CONFS.indexOf(a) - CONFS.indexOf(b))[0] || "none";
    el("rect", { x: 16, y: 52, width: W - 32, height: 470, rx: 14, class: "chip-outline" }, g);
    txt(g, 32, 76, "Apple M1", "st-h");
    const px = 40, py = 96, pw = 640, ph = 300;
    box(px, py, pw, ph, "cluster", confOf(P.cores, P.clock));
    txt(g, px + 16, py + 26, "P-cluster", "st-t strong");
    line(g, px + 100, py + 26, [{ pid: P.cores }, "Firestorm cores, up to", { pid: P.clock }, "GHz"]);
    const n = D.params[P.cores].num || 4;
    for (let i = 0; i < n; i++) {
      const cx = px + 16 + i * ((pw - 32 + 12) / n), cw = (pw - 32 + 12) / n - 12;
      const core = el("g", { class: "core-tile", "data-nav": "core", tabindex: "0", role: "button",
        "aria-label": "Enter a Firestorm core" }, g);
      el("rect", { x: cx, y: py + 44, width: cw, height: 110, rx: 8, class: "core-body" }, core);
      txt(core, cx + 12, py + 68, "Firestorm", "st-t strong");
      txt(core, cx + 12, py + 140, "Enter the core ›", "crumb-link");
    }
    const ly = py + 172;
    box(px + 16, ly, pw - 32, 112, "cache-box", confOf(P.l2_size, P.l2_lat));
    txt(g, px + 32, ly + 26, "Shared L2", "st-t strong");
    line(g, px + 32, ly + 54, [{ pid: P.l2_size }, "MiB,", { pid: P.l2_line }, "B lines,", { pid: P.l2_lat }, "cycles"]);
    line(g, px + 32, ly + 82, ["one core sees an inner", { pid: P.l2_inner }, "MiB and can use", { pid: P.l2_core },
      "MiB; loads at", { pid: P.l2_bw }, "GB/s"]);
    const ex = px + pw + 30, ew = W - 32 - ex - 8;
    box(ex, py, ew, ph, "cluster", "none");
    txt(g, ex + 16, py + 26, "E-cluster (Icestorm)", "st-t strong");
    wrapText(g, ex + 16, py + 52, "The efficiency cores and their own L2. Outside this map; Icestorm claims are kept but set no values here.", 44, 17, "st-note");
    const sy = py + ph + 26;
    box(px, sy, pw, 76, "cache-box", confOf(P.slc_size, P.slc_lat));
    txt(g, px + 16, sy + 28, "System level cache", "st-t strong");
    line(g, px + 16, sy + 56, [{ pid: P.slc_size }, "MiB, shared by the whole chip;", { pid: P.slc_lat }, "cycles;",
      { pid: P.slc_bw }, "GB/s to one core"]);
    box(ex, sy, ew, 76, "cache-box", confOf(P.dram));
    txt(g, ex + 16, sy + 28, "Memory controllers and DRAM", "st-t strong");
    line(g, ex + 16, sy + 56, [{ pid: P.dram }, "ns beyond the L2;", { pid: P.dram_bw }, "GB/s to one core"]);
    el("path", { d: `M${px + pw / 2} ${py + ph} V${sy - 2}`, class: "link", "marker-end": "url(#arrow)" }, g);
    el("path", { d: `M${px + pw + 2} ${sy + 38} H${ex - 4}`, class: "link", "marker-end": "url(#arrow)" }, g);
    return { w: W, h: 540 };
  }

  function drawFrontendView(g, S) {
    const P = S.params, W = 1180;
    const conf = (...pids) => pids.map((p) => D.params[p]).filter((p) => p.known).map((p) => p.conf)
      .sort((a, b) => CONFS.indexOf(a) - CONFS.indexOf(b))[0] || "none";
    const box = (x, y, w, h, c) => el("rect", { x, y, width: w, height: h, rx: 8, class: "stage-box body" },
      el("g", { class: `conf-${c}` }, g));

    txt(g, 16, 76, "What a taken branch costs", "st-h");
    txt(g, 16, 96, "by where fetch finds its target", "st-note");
    const tiers = [
      { name: "Zero-bubble BTB", c: conf(P.l0), parts: [{ pid: P.l0 }, "entries, about", { pid: P.foot }, "KiB of code"],
        cost: "no bubble" },
      { name: "L1I as the second tier", c: conf(P.l1, P.bubble), parts: [{ pid: P.l1 }, "entries,", { pid: P.assoc }, "ways"],
        costPid: P.bubble },
    ];
    tiers.forEach((t, i) => {
      const y = 112 + i * 84;
      box(16, y, 540, 70, t.c);
      txt(g, 30, y + 24, t.name, "st-t strong");
      line(g, 30, y + 50, t.parts);
      if (t.costPid) line(g, 400, y + 38, [{ pid: t.costPid, big: true }, "cycles"]);
      else txt(g, 400, y + 42, t.cost, "st-big");
    });
    const py = 300;
    txt(g, 16, py, "Predictors", "st-h");
    box(16, py + 14, 540, 70, conf(P.kind, P.hist, P.cap));
    txt(g, 30, py + 38, "Direction", "st-t strong");
    line(g, 110, py + 38, [{ pid: P.kind, raw: true }]);
    line(g, 30, py + 64, ["history", { pid: P.hist }, "branches;", { pid: P.ctr }, "-bit counters; capacity",
      { pid: P.cap }, "entries"]);
    box(16, py + 98, 264, 56, conf(P.ind));
    txt(g, 30, py + 120, "Indirect targets", "st-t strong");
    line(g, 30, py + 144, [{ pid: P.ind }, "entries,", { pid: P.ikind, raw: true }]);
    box(292, py + 98, 264, 56, conf(P.ras));
    txt(g, 306, py + 120, "Return stack", "st-t strong");
    line(g, 306, py + 144, [{ pid: P.ras }, "entries; a return costs", { pid: P.rbub }, "cycle"]);
    line(g, 16, py + 184, ["A mispredicted branch costs", { pid: P.mis }, "cycles"]);

    const x0 = 620, bw = 300;
    txt(g, x0, 76, "Fetch path", "st-h");
    const steps = [
      ["L1 instruction cache", [{ pid: P.l1i }, "KiB,", { pid: P.line }, "B lines; iTLB", { pid: P.itlb }], [P.l1i, P.line, P.itlb]],
      ["Fetch", [{ pid: P.fw }, "instructions and", { pid: P.taken }, "taken branch per cycle"], [P.fw, P.taken]],
      ["Fetch target queue", ["decoupled:", { pid: P.ftq, raw: true }, "depth", { pid: P.ftqd }, "FDIP", { pid: P.fdip, raw: true }],
        [P.ftq, P.ftqd, P.fdip]],
      ["Decode", [{ pid: P.dw }, "instructions per cycle"], [P.dw]],
      ["Instruction queue", [{ pid: P.iq }, "entries"], [P.iq]],
    ];
    steps.forEach(([name, parts, pids], i) => {
      const y = 92 + i * 76;
      box(x0, y, 540, 58, conf(...pids));
      txt(g, x0 + 14, y + 22, name, "st-t strong");
      line(g, x0 + 14, y + 46, parts);
      if (i) el("path", { d: `M${x0 + 40} ${y - 17} V${y - 2}`, class: "link", "marker-end": "url(#arrow)" }, g);
    });
    let my = Math.max(92 + steps.length * 76 + 20, py + 212), mb = my;
    S.mechanisms.forEach((mid, i) => {
      if (i && i % 2 === 0) my = mb + 14;
      const m = D.mechanisms[mid], x = 16 + (i % 2) * 590;
      const r = el("g", { class: "rules", "data-mech": mid, tabindex: "0", role: "button" }, g);
      const b = el("rect", { x, y: my, width: 560, rx: 8, class: "mech-box" }, r);
      txt(r, x + 12, my + 22, m.name, "st-t strong");
      txt(r, x + 12, my + 40, m.status, "status-text");
      const last = wrapText(r, x + 12, my + 60, m.description, 84, 16, "st-note");
      b.setAttribute("height", last - my + 16);
      mb = Math.max(mb, last + 16);
    });
    return { w: W, h: Math.max(mb, py + 200) + 12 };
  }

  function drawDmemView(g, S) {
    const P = S.params, W = 1180;
    const num = (pid) => D.params[pid].num;
    txt(g, 16, 76, "L1 data cache", "st-h");
    line(g, 16, 102, [{ pid: P.size }, "KiB,", { pid: P.line }, "B lines,", { pid: P.assoc }, "ways"]);
    line(g, 16, 126, [{ pid: P.banks }, "banks of", { pid: P.bank_w }, "B"]);
    const nb = num(P.banks) || 0;
    if (nb) {
      const gb = el("g", { class: "q-grid", "data-param": P.banks }, g);
      for (let i = 0; i < nb; i++) el("rect", { x: 16 + i * 33, y: 138, width: 29, height: 22, rx: 3, class: "q-slot" }, gb);
      el("title", {}, gb).textContent = `${nb} banks`;
    }
    line(g, 16, 190, ["Loads", { pid: P.ld_bw }, "B per cycle, up to", { pid: P.ld_n }, "a cycle"]);
    line(g, 16, 214, ["Stores", { pid: P.st_bw }, "B per cycle, up to", { pid: P.st_n }, "a cycle"]);

    const ly = 262;
    txt(g, 16, ly, "Load-to-use latency", "st-h");
    txt(g, 16, ly + 20, "cycles, bar length on a log scale", "st-note");
    const rows = [
      ["L1D, pointer chase", P.lat], ["L1D, into an ALU op", P.lat_alu], ["L1D, complex address", P.lat_cx],
      ["L1D, into FP/SIMD", P.lat_simd], ["L2", P.l2_lat], ["System level cache", P.slc_lat],
    ];
    const bx = 200, bmax = 300, lmax = Math.log(Math.max(...rows.map(([, p]) => num(p) || 1)));
    rows.forEach(([label, pid], i) => {
      const y = ly + 46 + i * 26, n = num(pid);
      txt(g, 16, y, label, "st-t");
      if (n) el("rect", { x: bx, y: y - 12, width: Math.max(4, (Math.log(n) / lmax) * bmax), height: 14, rx: 3, class: "lat-bar" }, g);
      pval(g, bx + (n ? Math.max(4, (Math.log(n) / lmax) * bmax) : 0) + 8, y, pid);
    });
    const dy = ly + 46 + rows.length * 26;
    line(g, 16, dy, ["DRAM:", { pid: P.dram }, "ns beyond the L2 (no cycle figure is published with a clock)"]);

    const x0 = 620;
    txt(g, x0, 76, "Address translation", "st-h");
    line(g, x0, 102, [{ pid: P.page }, "KiB pages"]);
    const tl = (y, name, parts1, parts2, conf) => {
      el("rect", { x: x0, y, width: 540, height: 80, rx: 8, class: "stage-box body" }, el("g", { class: `conf-${conf}` }, g));
      txt(g, x0 + 14, y + 22, name, "st-t strong");
      line(g, x0 + 14, y + 46, parts1);
      line(g, x0 + 14, y + 68, parts2);
    };
    tl(118, "L1 data TLB", [{ pid: P.t1 }, "entries,", { pid: P.t1_org, raw: true }],
      [{ pid: P.t1_ports }, "lookup per cycle; a miss costs", { pid: P.t1_miss }, "cycles"], D.params[P.t1].conf);
    el("path", { d: `M${x0 + 40} ${200} V${214}`, class: "link", "marker-end": "url(#arrow)" }, g);
    tl(216, "L2 TLB", [{ pid: P.t2 }, "entries,", { pid: P.t2_org, raw: true }],
      ["a miss (page walk) costs", { pid: P.t2_miss }, "cycles"], D.params[P.t2].conf);
    const py = 340;
    txt(g, x0, py, "Prefetch and misses", "st-h");
    const pbox = el("rect", { x: x0, y: py + 14, width: 540, rx: 8, class: "stage-box body" }, el("g", { class: `conf-${D.params[P.pf].conf}` }, g));
    txt(g, x0 + 14, py + 36, "Prefetchers", "st-t strong");
    const pl = pwrap(g, x0 + 14, py + 60, P.pf, 60);
    line(g, x0 + 14, pl + 26, ["tracks", { pid: P.pf_n }, "or more stride streams at once"]);
    pbox.setAttribute("height", pl + 40 - (py + 14));
    const my = pl + 54;
    el("rect", { x: x0, y: my, width: 540, height: 56, rx: 8, class: "stage-box body" }, el("g", { class: `conf-${D.params[P.mlp].conf}` }, g));
    txt(g, x0 + 14, my + 22, "Miss handling", "st-t strong");
    line(g, x0 + 14, my + 44, [{ pid: P.mlp }, "misses outstanding"]);
    return { w: W, h: Math.max(dy, my + 56) + 16 };
  }
