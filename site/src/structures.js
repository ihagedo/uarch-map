  // structures.js
  // Isaac Hagedorn, 2026-10-08
  // The chip view and the L3 structure views, drawn like the figures: frames titled in their region's hue, boxes
  // with a title rule and one value per row behind its confidence glyph, structures as cells, wires by kind.
  const STRUCTURES = { retire: drawRetireView, ports: drawPortsView, lsq: drawLsqView, chip: drawChipView,
    frontend: drawFrontendView, dmem: drawDmemView };
  const fmtN = (n) => (n == null ? "?" : Number(n).toLocaleString("en-US"));
  const RANK = { unknown: 0, conjecture: 1, inferred: 2, ours: 3, derived: 3, single: 4, corroborated: 5, confirmed: 6 };
  const RANK_NAME = ["unknown", "conjecture", "inferred", "derived", "single", "corroborated", "confirmed"];
  const STATUS_CONF = { measured: "corroborated", inferred: "inferred", speculative: "conjecture",
    conjecture: "conjecture", absent: "unknown" };
  const STATUS_GLYPH = { measured: "◆", inferred: "~", speculative: "?", conjecture: "?", absent: "x" };
  const UNIT = { cycles: "clk", "B/cycle": "B/clk", "instr/cycle": "per clk", "branches/cycle": "per clk",
    "groups/cycle": "per clk", "entries/cycle": "per clk", "loads/cycle": "per clk", "stores/cycle": "per clk",
    "lookups/cycle": "per clk" };
  const VW = 1180, ROW = 19;

  function drawStructure(sid, S) {
    const frame = (D.views.L2.boxes[S.blocks[0]] || {}).frame;
    const g = el("g", { class: "structure", "data-structure": sid, style: frame ? hue(frame) : "" }, svg);
    const back = el("g", { class: "crumb", "data-nav": "back", tabindex: "0", role: "button",
      "aria-label": "Back to the stage map" }, g);
    txt(back, 16, 26, "‹ Stages", "crumb-link");
    txt(g, 16, 56, S.label, "k-h1");
    if (S.subtitle) txt(g, 16, 76, S.subtitle, "k-sub");
    const h = STRUCTURES[S.kind](g, S, 98);
    return { w: VW, h: h + 10 };
  }

  function txt(g, x, y, s, cls, anchor) {
    const t = el("text", { x, y, class: cls || "" }, g);
    if (anchor) t.setAttribute("text-anchor", anchor);
    t.textContent = s;
    return t;
  }
  function measure(s, cls) {
    const t = txt(svg, 0, -100, s, cls), w = t.getComputedTextLength();
    t.remove();
    return w;
  }
  // s in lines no wider than width, broken at spaces
  function wrapTo(s, width, cls) {
    const out = [];
    let cur = "";
    for (const w of String(s).split(/\s+/)) {
      const t = cur ? `${cur} ${w}` : w;
      if (cur && measure(t, cls) > width) { out.push(cur); cur = w; } else cur = t;
    }
    if (cur) out.push(cur);
    return out;
  }
  const hueOf = (bid) => D.blocks[bid].hue || (D.views.L2.boxes[bid] || {}).frame || "chip";
  // Block.confidence's rule in tools/kb/model.py: the mean rank, rounded
  function agg(pids) {
    const ps = pids.filter(Boolean).map((p) => D.params[p]);
    if (!ps.length) return "unknown";
    return RANK_NAME[Math.floor(ps.reduce((a, p) => a + RANK[p.conf], 0) / ps.length + 0.5)];
  }
  function valText(p, raw) {
    if (!p.known) return p.conj ? p.short : "?";
    if (raw || p.num == null) return p.brief || p.value;
    return (p.approx ? "~" : "") + fmtN(p.num);
  }
  const wordsOf = (r, p) => (r.words != null ? r.words : UNIT[p.unit] || p.unit || "");
  // the width a value row takes, without drawing it
  function rowW(r) {
    const p = D.params[r.pid], w = wordsOf(r, p);
    return 13 + (r.pre ? measure(r.pre, "k-words") + 4 : 0) + measure(valText(p, r.raw), p.num == null || r.raw ? "k-val txt" : "k-val") +
      (w ? 4 + measure(w, "k-words") : 0) + (openDispute(p) ? 11 : 0);
  }

  // one value: its confidence glyph, the value and its words; a button to the dossier. Returns its width.
  function vrow(g, x, y, r, w) {
    const p = D.params[r.pid];
    const s = el("g", { class: `sp krow conf-${p.conf}`, "data-param": r.pid, tabindex: "0", role: "button",
      "aria-label": `${p.name}: ${p.known ? p.value : "hole"}` }, g);
    const bg = el("rect", { x: x - 4, y: y - 13, height: 18, rx: 3, class: "row-bg anchor" }, s);
    txt(s, x, y, GLYPH[p.conf], "k-glyph");
    let cx = x + 13;
    const put = (str, cls) => { cx += txt(s, cx, y, str, cls).getComputedTextLength() + 4; };
    if (r.pre) put(r.pre, "k-words");
    put(valText(p, r.raw), p.num == null || r.raw ? "k-val txt" : "k-val");
    const words = wordsOf(r, p);
    if (words) put(words, "k-words");
    if (openDispute(p)) { disputePin(s, cx + 5, y - 4); cx += 11; }
    const nat = cx - 4 - x;
    bg.setAttribute("width", Math.max(w || 0, nat) + 8);
    el("title", {}, s).textContent = `${p.name}: ${p.known ? p.value + (p.unit ? " " + p.unit : "") : p.conj ?
      "conjecture " + p.short : "nothing published"} (${CONF_WORD[p.conf].toLowerCase()})`;
    return nat;
  }
  // values side by side on one line; with end, x is the line's right edge
  function vline(g, x, y, rows, end) {
    const l = el("g", {}, g);
    let cx = x;
    for (const r of rows) cx += vrow(l, cx, y, r) + 16;
    if (end) l.setAttribute("transform", `translate(${-(cx - 16 - x)} 0)`);
    return l;
  }

  // a box: title, a rule, one row each. o: {x, y, w, title, rows, conf, region, minH, cls, attrs, nav}.
  // Rows: {pid, words, pre, raw} a value; {text} a note; {tags} pills; {cells: pid, per, size} one cell per entry;
  // {queues: [n, e]} n queues of e entries.
  function kbox(g, o) {
    const conf = o.conf || agg(o.rows.filter((r) => r.pid).map((r) => r.pid));
    const b = el("g", Object.assign({ class: `kbox conf-${conf}${o.cls ? " " + o.cls : ""}`, style: hue(o.region || "chip") },
      o.attrs || {}), g);
    const rect = el("rect", { x: o.x, y: o.y, width: o.w, rx: 5, class: "body" }, b);
    if (o.nav) rect.setAttribute("data-nav", o.nav);
    let y = o.y + 6;
    if (o.title) {
      for (const ln of wrapTo(o.title, o.w - 18, "k-title")) { y += 16; txt(b, o.x + 9, y, ln, "k-title"); }
      y += 6;
      if (o.rows.length) el("path", { d: `M${o.x + 5} ${y} H${o.x + o.w - 5}`, class: "k-rule" }, b);
    }
    y += 4;
    for (const r of o.rows) {
      if (r.pid && !r.cells) { y += ROW; vrow(b, o.x + 10, y - 5, r, o.w - 20); }
      else if (r.text) { y += ROW; txt(b, o.x + 10, y - 5, r.text, r.cls || "k-note"); }
      else if (r.tags) y = tagRow(b, o.x + 9, y + 3, o.w - 18, r.tags, r.mech);
      else if (r.cells) y = cells(b, o.x + 10, y + 5, r.cells, r.per, r.size) + 1;
      else if (r.queues) y = queues(b, o.x + 10, y + 7, r.queues[0], r.queues[1]) + 1;
    }
    const h = Math.max(o.minH || 0, y + 9 - o.y);
    rect.setAttribute("height", h);
    return { x: o.x, y: o.y, w: o.w, h, b: o.y + h, g: b };
  }

  // a frame: a domain titled in its region's hue, with an optional note at its top right; close() sets its height
  function kframe(g, o) {
    const f = el("g", { class: "kframe", style: hue(o.region) }, g);
    const rect = el("rect", { x: o.x, y: o.y, width: o.w, rx: 9, class: "frame-body" }, f);
    txt(f, o.x + 12, o.y + 20, o.title, "kf-title");
    if (o.note) txt(f, o.x + o.w - 12, o.y + 20, o.note, "kf-note", "end");
    return { g: f, x: o.x, y: o.y, w: o.w, top: o.y + 34,
      close(bottom) { rect.setAttribute("height", bottom + 14 - o.y); return bottom + 14; } };
  }

  // pills, wrapped to width; returns the bottom
  function tagRow(g, x, y, width, tags, mech) {
    const t = mech ? el("g", { class: "rules", "data-mech": mech, tabindex: "0", role: "button" }, g) : g;
    let cx = x, cy = y;
    for (const s of tags) {
      const w = measure(s, "k-tag") + 10;
      if (cx > x && cx + w > x + width) { cx = x; cy += 21; }
      el("rect", { x: cx, y: cy, width: w, height: 17, rx: 3, class: "k-tag-bg" }, t);
      txt(t, cx + 5, cy + 12.5, s, "k-tag");
      cx += w + 5;
    }
    return cy + 21;
  }

  // a grid of cells, one per entry of a param, `per` to a row; returns the bottom
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
    el("title", {}, gq).textContent = `${D.params[pid].name}: ${fmtN(n)}`;
    return y + Math.ceil(n / per) * pitch - 3;
  }
  // n queues side by side, e entries each, oldest at the bottom; returns the bottom
  function queues(g, x, y, n, e) {
    if (!n || !e) return y;
    let d = "";
    for (let q = 0; q < n; q++) for (let k = 0; k < e; k++) d += `M${x + q * 20} ${y + k * 6}h16v4h-16z`;
    el("path", { d, class: "q-slot" }, g);
    return y + e * 6 - 2;
  }
  // banks or channels as tall cells, captioned under them
  function banks(g, x, y, w, h, n, caption) {
    const bw = (w - (n - 1) * 3) / n;
    let d = "";
    for (let i = 0; i < n; i++) d += `M${x + i * (bw + 3)} ${y}h${bw}v${h - 16}h${-bw}z`;
    el("path", { d, class: "k-cell" }, g);
    txt(g, x + w / 2, y + h - 3, caption, "k-cap", "middle");
  }
  // the ways of a cache, a column each, labelled w0, w1, ...
  function ways(g, x, y, w, h, n, rows) {
    const cw = w / n, ch = (h - 14) / rows;
    let d = "";
    for (let c = 0; c < n; c++) {
      txt(g, x + c * cw + cw / 2, y + 9, `w${c}`, "k-idx", "middle");
      for (let r = 0; r < rows; r++) d += `M${x + c * cw + 1} ${y + 14 + r * ch}h${cw - 3}v${ch - 3}h${-(cw - 3)}z`;
    }
    el("path", { d, class: "k-cell" }, g);
  }

  function wire(g, pts, kind) {
    return el("path", { d: "M" + pts.map((p) => `${p[0]} ${p[1]}`).join(" L"), class: `link k-${kind || "instruction"}`,
      "marker-end": "url(#arrow)" }, g);
  }
  // a two-way flow: two one-way wires side by side, each keeping to its right
  function pair(g, a, b, kind) {
    const d = 5;
    if (Math.abs(a[0] - b[0]) < 0.5) {
      const s = b[1] > a[1] ? 1 : -1;
      wire(g, [[a[0] - s * d, a[1]], [b[0] - s * d, b[1]]], kind);
      wire(g, [[b[0] + s * d, b[1]], [a[0] + s * d, a[1]]], kind);
    } else {
      const s = b[0] > a[0] ? 1 : -1;
      wire(g, [[a[0], a[1] + s * d], [b[0], b[1] + s * d]], kind);
      wire(g, [[b[0], b[1] - s * d], [a[0], a[1] - s * d]], kind);
    }
  }
  function zoom(g, x, y, label) {
    const z = el("g", { class: "zoom", "data-nav": "core", tabindex: "0", role: "button", "aria-label": label }, g);
    el("circle", { cx: x, cy: y, r: 8.5, class: "zoom-hit" }, z);
    el("circle", { cx: x - 1, cy: y - 1, r: 3.6, class: "zoom-glyph" }, z);
    el("path", { d: `M${x + 1.6} ${y + 1.6} L${x + 4.4} ${y + 4.4}`, class: "zoom-glyph" }, z);
    el("title", {}, z).textContent = label;
  }
  function mechBox(g, x, y, w, mid, region) {
    const m = D.mechanisms[mid];
    return kbox(g, { x, y, w, title: m.name, region, conf: m.ours ? "ours" : STATUS_CONF[m.status] || "conjecture",
      cls: "rules", attrs: { "data-mech": mid, tabindex: "0", role: "button", "aria-label": m.name },
      rows: [{ text: `${STATUS_GLYPH[m.status] || "?"} ${m.status}` }] });
  }

  // the legend the figures end with: confidence by fill and border, and the kinds of wire drawn
  const KIND_WORD = { instruction: "instruction flow", control: "control", data: "data", allocation: "allocate / release" };
  function legend(g, x, y, kinds) {
    const L = el("g", { class: "k-legend" }, g);
    let cx = x;
    for (const [c, w] of [["confirmed", "3+ measurements"], ["corroborated", "2 sources"], ["single", "one source"],
      ["derived", "derived"], ["inferred", "patent or analogy"], ["conjecture", "conjecture"], ["unknown", "unknown"]]) {
      el("rect", { x: cx, y: y - 10, width: 16, height: 11, rx: 2, class: "body" }, el("g", { class: `conf-${c}` }, L));
      cx += 21 + txt(L, cx + 21, y, `${GLYPH[c]} ${w}`, "k-leg").getComputedTextLength() + 18;
    }
    if (kinds && kinds.length) {
      y += 22;
      cx = x;
      for (const k of kinds) {
        wire(L, [[cx, y - 4], [cx + 28, y - 4]], k);
        cx += 34 + txt(L, cx + 34, y, KIND_WORD[k], "k-leg").getComputedTextLength() + 22;
      }
    }
    return y + 12;
  }

  function drawChipView(g, S, y0) {
    const P = S.params;
    const pf = kframe(g, { x: 16, y: y0, w: 760, title: "P-cluster", region: "chip" });
    vline(pf.g, 16 + 760 - 12, y0 + 20, [{ pid: P.cores, words: "cores" }, { pid: P.clock, words: "GHz" }], true);
    const n = D.params[P.cores].num || 4, cw = (732 - (n - 1) * 12) / n;
    const cores = [];
    for (let i = 0; i < n; i++) {
      const x = 30 + i * (cw + 12);
      const b = kbox(g, { x, y: pf.top, w: cw, title: `Firestorm ${i}`, region: "chip", nav: "core",
        rows: [{ pid: P.dw, words: "wide" }, { pid: P.l1i, words: "KiB L1I" }, { pid: P.l1d, words: "KiB L1D" }] });
      zoom(b.g, x + cw - 1, pf.top + 1, "Enter a Firestorm core");
      cores.push(b);
    }
    const l2y = Math.max(...cores.map((c) => c.b)) + 46;
    const l2 = kbox(g, { x: 30, y: l2y, w: 732, title: "Shared L2", region: hueOf("l2"), conf: D.blocks.l2.conf, rows: [
      { pid: P.l2_size, words: "MiB" }, { pid: P.l2_assoc, words: "ways" }, { pid: P.l2_line, words: "B lines" },
      { pid: P.l2_lat, words: "clk" }, { pid: P.l2_inner, words: "MiB inner slice" },
      { pid: P.l2_core, words: "MiB for one core" }, { pid: P.l2_bw, words: "GB/s to one core" }] });
    ways(l2.g, 300, l2y + 40, 446, l2.h - 54, D.params[P.l2_assoc].num || 12, 5);
    for (const c of cores) pair(g, [c.x + c.w / 2, c.b], [c.x + c.w / 2, l2y], "data");
    const ay = l2.b + 40;
    const amx = kbox(g, { x: 30, y: ay, w: 300, title: "AMX", region: hueOf("amx"), rows: [
      { pid: P.amx_grid, raw: true, words: "grid" }, { pid: P.amx_regs, words: "register sets" },
      { pid: P.amx_lat, words: "clk FMA" }, { pid: P.amx_buf, words: "op window" }] });
    const pw = kbox(g, { x: 342, y: ay, w: 230, title: "Clocks and power", region: hueOf("power"), rows: [
      { pid: P.clk_dom, raw: true, pre: "clock" }, { pid: P.powerup, words: "µs power-up" }] });
    pair(g, [180, l2.b], [180, ay], "data");
    const pBottom = pf.close(Math.max(amx.b, pw.b));

    const ef = kframe(g, { x: 792, y: y0, w: 372, title: "E-cluster", note: "not mapped", region: "chip" });
    const eb = kbox(g, { x: 806, y: ef.top, w: 344, title: "Icestorm cores", conf: "unknown", region: "chip", rows: [],
      minH: cores[0].h });
    ef.close(pBottom - 14);

    const fy = pBottom + 44;
    const fab = kbox(g, { x: 16, y: fy, w: 1148, title: "Fabric and coherence", region: hueOf("fabric"), rows: [
      { pid: P.coh, raw: true, words: "coherence" }, { pid: P.noc, words: "NoC port per cluster" }] });
    pair(g, [680, l2.b], [680, fy], "data");
    pair(g, [978, eb.b], [978, fy], "data");

    const mf = kframe(g, { x: 16, y: fab.b + 44, w: 1148, title: "Memory side", region: "beyond" });
    const slc = kbox(g, { x: 30, y: mf.top, w: 560, title: "System level cache", region: hueOf("slc"), conf: D.blocks.slc.conf,
      rows: [{ pid: P.slc_size, words: "MiB" }, { pid: P.slc_assoc, words: "ways" }, { pid: P.slc_planes, words: "planes" },
        { pid: P.slc_sets, words: "sets" }, { pid: P.slc_lat, words: "clk" }, { pid: P.slc_bw, words: "GB/s to one core" },
        { pid: P.slc_incl, raw: true }, { pid: P.slc_alloc, raw: true, pre: "fills:" }] });
    banks(slc.g, 290, mf.top + 40, 286, slc.h - 54, D.params[P.slc_planes].num || 4, "planes");
    const mc = kbox(g, { x: 620, y: mf.top, w: 530, title: "Memory controllers", region: hueOf("memctrl"),
      conf: D.blocks.memctrl.conf, minH: slc.h, rows: [{ pid: P.dram, words: "ns beyond the L2" },
        { pid: P.dram_bw, words: "GB/s to one core" }, { pid: P.peak, words: "GB/s peak" }, { pid: P.chan, words: "channels" }] });
    banks(mc.g, 860, mf.top + 40, 276, mc.h - 54, D.params[P.chan].num || 8, "channels");
    pair(g, [200, fab.b], [200, mf.top], "data");
    pair(g, [590, slc.y + 64], [620, slc.y + 64], "data");
    return legend(g, 16, mf.close(Math.max(slc.b, mc.b)) + 30, ["data"]);
  }

  function drawRetireView(g, S, y0) {
    const P = S.params;
    const rows = D.params[P.groups].num, slots = D.params[P.slots].num || 7;
    const lf = kframe(g, { x: 16, y: y0, w: 560, title: "Coalesced retire queue", region: "backend",
      note: rows ? `${fmtN(rows)} × ${slots} = ${fmtN(rows * slots)} slots` : "" });
    const gb = kbox(g, { x: 30, y: lf.top, w: 532, title: "Groups", region: "backend", rows: [
      { pid: P.groups, words: "groups" }, { pid: P.slots, words: "uops at most" },
      { pid: P.issuing, words: "issuing uops" }, { pid: P.rate_groups, words: "groups retired per clk" }] });
    const top = gb.b + 28, cw = 8, ch = 6, px = 9.5, py = 8, cols = 6;
    let bottom = top;
    if (rows) {
      const per = Math.ceil(rows / cols), rw = slots * px - (px - cw), gx = rw + 22;
      const grid = el("g", { class: "q-grid k-chart", "data-param": P.groups }, g);
      for (let c = 0; c < cols; c++) {
        let d = "";
        const k = Math.min(per, rows - c * per);
        for (let r = 0; r < k; r++) for (let s = 0; s < slots; s++) d += `M${30 + c * gx + s * px} ${top + r * py}h${cw}v${ch}h${-cw}z`;
        el("path", { d, class: "q-slot" }, grid);
        txt(grid, 30 + c * gx, top - 6, String(c * per + 1), "k-idx");
      }
      el("title", {}, grid).textContent = `${fmtN(rows)} groups x ${slots} slots`;
      bottom = top + per * py - 2;
    } else {
      el("rect", { x: 30, y: top, width: 500, height: 200, rx: 6, class: "q-hole" }, g);
      bottom = top + 200;
    }
    const lb = lf.close(bottom);

    const x0 = 600;
    const rf = kframe(g, { x: x0, y: y0, w: 564, title: "Packing", note: "an illustration, not a trace", region: "backend" });
    const rules = el("g", { class: "rules k-chart", "data-mech": "retire_groups", tabindex: "0", role: "button",
      "aria-label": "Retire group packing rules" }, g);
    const C = 56, G = 6;
    const examples = [
      [["ldr", "mem"], ["add", "iss"], ["nop", "elim"], ["nop", "elim"], ["mov", "elim"], ["nop", "elim"], ["cbz", "br"],
        "a load or store opens a group, a branch closes it"],
      [["nop", "elim"], ["nop", "elim"], ["mov", "elim"], ["nop", "elim"], ["nop", "elim"], ["mov", "elim"], ["nop", "elim"],
        "seven only when all are eliminated"],
      [["add", "iss"], ["add", "iss"], ["add", "iss"], ["add", "iss"], ["", "empty"], ["", "empty"], ["", "empty"],
        "about four issuing uops"],
    ];
    let ry = rf.top;
    examples.forEach((ex) => {
      ex.slice(0, 7).forEach(([op, kind], k) => {
        el("rect", { x: x0 + 14 + k * (C + G), y: ry, width: C, height: 28, rx: 4, class: `ex ex-${kind}` }, rules);
        if (op) txt(rules, x0 + 14 + k * (C + G) + C / 2, ry + 18, op, "ex-op", "middle");
      });
      txt(rules, x0 + 14, ry + 46, ex[7], "k-note");
      ry += 62;
    });
    if (S.claims.alt_rule && D.claims[S.claims.alt_rule]) {
      const c = D.claims[S.claims.alt_rule];
      const t = txt(rules, x0 + 14, ry + 4, `${D.sources[c.source].author}: loads, stores and branches take the last slot`, "k-note");
      el("title", {}, t).textContent = `${c.text} (${D.sources[c.source].cite}, ${locText(c.loc)})`;
      ry += 12;
    }
    const rb = rf.close(ry - 4);

    const qf = kframe(g, { x: x0, y: rb + 18, w: 564, title: "Rename retire queue", region: "backend" });
    const qb = kbox(g, { x: x0 + 14, y: qf.top, w: 536, region: "backend", rows: [
      { pid: P.rrq, words: "entries" }, { pid: P.rate_rrq, words: "entries retired per clk" },
      { tags: ["cbz, str: none", "add, mov: one", "adds, ldp: two"], mech: "rename_retire_queue" },
      { cells: P.rrq, per: 64, size: 5 }] });
    const qbB = qf.close(qb.b);

    const wf = kframe(g, { x: x0, y: qbB + 18, w: 564, title: "Window probes", note: "bar published, tick groups × slots",
      region: "backend" });
    const vals = S.probes.flatMap((pr) => [D.params[pr.window].num || 0,
      pr.rows ? (D.params[pr.rows].num || 0) * (D.params[pr.per_row].num || 0) : 0]);
    const bx = x0 + 214, scale = 320 / Math.max(...vals, 1), chart = el("g", { class: "k-chart" }, g);
    let wy = wf.top + 12;
    for (const pr of S.probes) {
      txt(chart, x0 + 14, wy, pr.filler, "k-words");
      vrow(chart, x0 + 110, wy, { pid: pr.window, words: "" });
      const n = D.params[pr.window].num || 0;
      el("rect", { x: bx, y: wy - 10, width: Math.max(3, n * scale), height: 11, rx: 2, class: "k-bar" }, chart);
      if (pr.rows) {
        const a = D.params[pr.rows].num, b = D.params[pr.per_row].num;
        if (a != null && b != null) {
          const tx = bx + a * b * scale;
          el("path", { d: `M${tx} ${wy - 15} V${wy + 4}`, class: "k-tick" }, chart);
          const end = tx + 30 > x0 + 550;
          txt(chart, end ? x0 + 550 : tx, wy + 17, `${fmtN(a)} × ${b}`, "k-cap", end ? "end" : "middle");
        }
      } else {
        txt(chart, bx + Math.max(3, n * scale) + 8, wy, pr.note, "k-cap");
      }
      wy += 40;
    }
    const wb = wf.close(wy - 22);
    return legend(g, 16, Math.max(lb, wb) + 30, []);
  }

  function drawPortsView(g, S, y0) {
    const P = S.params, num = (pid) => (pid ? D.params[pid].num : null);
    const lanes = [
      { label: "Integer", units: [1, 2, 3, 4, 5, 6], count: P.n_int, generic: "ALU", noun: "integer units",
        dispatch: [["Integer", P.d_int], ["Multiply", P.d_mul]], sched: [[P.s_int, "per queue"], [P.s_int_n, "queues"]],
        q: [num(P.s_int_n), num(P.s_int)] },
      { label: "Load-store", units: [7, 8, 9, 10], count: P.n_ls, generic: "", noun: "load-store units",
        dispatch: [["Load-store", P.d_ls]], sched: [[P.s_ls, "entries"], [P.s_ls_n, "queues"]],
        q: [num(P.s_ls_n), num(P.s_ls) && num(P.s_ls_n) ? Math.round(num(P.s_ls) / num(P.s_ls_n)) : null] },
      { label: "FP/SIMD", units: [11, 12, 13, 14], count: P.n_fp, generic: "FP/SIMD", noun: "FP/SIMD units",
        dispatch: [["FP/SIMD", P.d_fp]], sched: [[P.s_fp, "per queue"]], q: [1, num(P.s_fp)] },
    ];
    let y = y0;
    for (const L of lanes) {
      const f = kframe(g, { x: 16, y, w: 1148, title: L.label, region: "backend" });
      let dy = f.top;
      const disp = L.dispatch.map(([label, pid]) => {
        const b = kbox(g, { x: 30, y: dy, w: 220, title: `${label} dispatch`, region: "backend",
          rows: [{ pid, words: "entries" }, { cells: pid, per: 25, size: 5 }] });
        dy = b.b + 12;
        return b;
      });
      const sb = kbox(g, { x: 290, y: f.top, w: 240, title: `${L.label} schedulers`, region: "backend",
        rows: L.sched.map(([pid, words]) => ({ pid, words })).concat([{ queues: L.q }]) });
      const ux = 570, uw = 84, ug = 8;
      const ubs = L.units.map((n, k) => kbox(g, { x: ux + 14 + k * (uw + ug), y: f.top + 30, w: uw, title: `u${n}`,
        region: "backend", conf: D.params[L.count].conf,
        rows: [{ tags: (L.generic ? [L.generic] : []).concat((S.roles[`u${n}`] || []).map((r) => r.text)) }] }));
      const gb = Math.max(...ubs.map((u) => u.b)) + 12;
      const gw = 28 + L.units.length * (uw + ug) - ug;
      el("rect", { x: ux, y: f.top, width: gw, height: gb - f.top, rx: 6, class: "k-group frame-like" }, g);
      vrow(g, ux + 12, f.top + 18, { pid: L.count, words: L.noun });
      for (const d of disp) wire(g, [[250, d.y + 24], [290, d.y + 24]]);
      wire(g, [[530, sb.y + 24], [ux, sb.y + 24]]);
      y = f.close(Math.max(dy - 12, sb.b, gb)) + 18;
    }
    return legend(g, 16, y + 12, ["instruction"]);
  }

  function drawLsqView(g, S, y0) {
    const P = S.params;
    const lf = kframe(g, { x: 16, y: y0, w: 1148, title: "Entry lifetime", region: "lsu" });
    const steps = [
      ["Rename", { text: "ordering ID" }], ["LS dispatch", { pid: P.d_ls, words: "entries" }],
      ["LS scheduler", { pid: P.s_ls, words: "entries" }], ["Issue", { pid: P.alloc, raw: true }],
      ["Units 7-10", { pid: P.units, words: "units" }], ["Complete", { text: "early release" }], ["Retire", { text: "entry freed" }],
    ];
    const ws = steps.map(([t, r]) => Math.ceil(Math.max(measure(t, "k-title"), r.pid ? rowW(r) : measure(r.text, "k-note")) + 22));
    const gap = 30;
    let x = 30;
    const boxes = steps.map(([t, r], i) => {
      const b = kbox(g, { x, y: lf.top, w: ws[i], title: t, region: "lsu", rows: [r], conf: r.pid ? null : "unknown" });
      x += ws[i] + gap;
      return b;
    });
    const sh = Math.max(...boxes.map((b) => b.h));
    boxes.forEach((b, i) => {
      b.g.querySelector("rect.body").setAttribute("height", sh);
      if (i) wire(g, [[boxes[i - 1].x + boxes[i - 1].w, b.y + sh / 2], [b.x, b.y + sh / 2]]);
    });
    const my = lf.top + sh + 18;
    const mechs = S.mechanisms.map((mid, i) => mechBox(g, 30 + i * 372, my, 360, mid, "lsu"));
    const lb = lf.close(Math.max(...mechs.map((m) => m.b)));

    const qf = kframe(g, { x: 16, y: lb + 18, w: 740, title: "Queues", region: "lsu" });
    const lq = kbox(g, { x: 30, y: qf.top, w: 352, title: "Load queue", region: "lsu",
      rows: [{ pid: P.lq, words: "entries" }, { cells: P.lq, per: 26 }] });
    const sq = kbox(g, { x: 394, y: qf.top, w: 348, title: "Store queue", region: "lsu", minH: lq.h,
      rows: [{ pid: P.sq, words: "entries" }, { cells: P.sq, per: 26 }] });
    const of = kframe(g, { x: 772, y: lb + 18, w: 392, title: "Memory ordering", region: "lsu" });
    const ob = kbox(g, { x: 786, y: of.top, w: 364, title: "Disambiguation", region: "lsu", minH: lq.h, rows: [
      { pid: P.lsdp, raw: true }, { pid: P.lsdp_n, words: "pairs" }, { pid: P.flush, words: "clk ordering flush" },
      { pid: P.stl, words: "clk store to load" }, { pid: P.zcl, raw: true, pre: "zero-cycle loads:" }] });
    const qb = Math.max(qf.close(Math.max(lq.b, sq.b)), of.close(ob.b));

    let ty = qb + 18;
    if (S.apparent && S.apparent.length) {
      const pf = kframe(g, { x: 16, y: ty, w: 1148, title: "Queue probes", region: "lsu" });
      // the key, at the frame's top right: loads above, stores below
      el("rect", { x: 1000, y: ty + 11, width: 18, height: 8, rx: 2, class: "k-bar" }, pf.g);
      txt(pf.g, 1022, ty + 20, "loads", "kf-note");
      el("rect", { x: 1070, y: ty + 11, width: 18, height: 8, rx: 2, class: "k-bar alt" }, pf.g);
      txt(pf.g, 1092, ty + 20, "stores", "kf-note");
      const val = (cid) => D.claims[cid].value;
      const nums = S.apparent.flatMap((r) => [r.load, r.store]).map((c) => parseFloat(String(val(c)).replace(/[~,]/g, "")) || 0);
      const bx = 280, scale = 420 / Math.max(...nums, 1), ch = el("g", { class: "k-chart" }, g);
      const top = pf.top + 22;
      let yy = top;
      S.apparent.forEach((row, i) => {
        if (i && row.limit !== S.apparent[i - 1].limit) { el("path", { d: `M30 ${yy - 17} H1150`, class: "col-rule" }, ch); }
        txt(ch, 30, yy, row.delay, "k-words");
        let end = bx;
        [["load", ""], ["store", " alt"]].forEach(([k, cls], j) => {
          const v = parseFloat(String(val(row[k])).replace(/[~,]/g, "")) || 0, w = Math.max(2, v * scale);
          el("rect", { x: bx, y: yy - 12 + j * 9, width: w, height: 8, rx: 2, class: `k-bar${cls}` }, ch);
          end = Math.max(end, bx + w);
        });
        const t = el("g", { class: "cv" }, ch);
        txt(t, end + 8, yy, `${val(row.load) ?? "?"} / ${val(row.store) ?? "?"}`, "k-val");
        el("title", {}, t).textContent = [row.load, row.store].map((cid) => `${D.claims[cid].text} (${D.sources[D.claims[cid].source].cite}, ${locText(D.claims[cid].loc)})`).join("\n");
        const c = D.claims[row.load];
        el("title", {}, txt(ch, 830, yy, D.sources[c.source].cite, "k-cap")).textContent = `${D.sources[c.source].cite}, ${locText(c.loc)}`;
        if (row.limit && (!i || row.limit !== S.apparent[i - 1].limit)) txt(ch, 1150, yy, row.limit, "k-note", "end");
        yy += 28;
      });
      // the queues' own sizes, for scale
      for (const [pid, name] of [[P.lq, "load queue"], [P.sq, "store queue"]]) {
        const n = D.params[pid].num;
        if (!n) continue;
        const rx = bx + n * scale;
        el("path", { d: `M${rx} ${top - 22} V${yy - 18}`, class: "k-ref" }, ch);
        const first = pid === P.lq;
        txt(ch, first ? rx + 4 : rx - 4, top - 14, `${name} ${valText(D.params[pid])}`, "k-cap", first ? "start" : "end");
      }
      ty = pf.close(yy - 20);
    }
    return legend(g, 16, ty + 30, ["instruction"]);
  }

  function drawFrontendView(g, S, y0) {
    const P = S.params;
    const tf = kframe(g, { x: 16, y: y0, w: 560, title: "Taken branches", note: "by where fetch finds the target", region: "frontend" });
    const t0 = kbox(g, { x: 30, y: tf.top, w: 260, title: "Zero-bubble BTB", region: "frontend", rows: [
      { pid: P.l0, words: "entries" }, { pid: P.foot, words: "KiB of code" }] });
    const t1 = kbox(g, { x: 302, y: tf.top, w: 260, title: "L1I as the second tier", region: "frontend", rows: [
      { pid: P.l1, words: "entries" }, { pid: P.assoc, words: "ways" }, { pid: P.bubble, words: "clk bubble" }] });
    t0.g.querySelector("rect.body").setAttribute("height", t1.h);
    const tb = tf.close(Math.max(t0.b, t1.b));

    const pf = kframe(g, { x: 16, y: tb + 18, w: 560, title: "Predictors", region: "frontend" });
    const dir = kbox(g, { x: 30, y: pf.top, w: 260, title: "Direction", region: "frontend", rows: [
      { pid: P.kind, raw: true }, { pid: P.hist, words: "branches of history" }, { pid: P.ctr, words: "bit counters" },
      { pid: P.cap, words: "entries" }] });
    const mis = kbox(g, { x: 302, y: pf.top, w: 260, title: "Mispredict", region: "frontend", rows: [
      { pid: P.mis, words: "clk" }] });
    const r2 = Math.max(dir.b, mis.b) + 12;
    const ind = kbox(g, { x: 30, y: r2, w: 260, title: "Indirect targets", region: "frontend", rows: [
      { pid: P.ind, words: "entries" }, { pid: P.ikind, raw: true }] });
    const ras = kbox(g, { x: 302, y: r2, w: 260, title: "Return stack", region: "frontend", rows: [
      { pid: P.ras, words: "entries" }, { pid: P.rbub, words: "clk return" }] });
    const pb = pf.close(Math.max(ind.b, ras.b));

    const x0 = 600;
    const ff = kframe(g, { x: x0, y: y0, w: 564, title: "Fetch path", region: "frontend" });
    const chain = [];
    let y = ff.top;
    const add = (o) => { const b = kbox(g, Object.assign({ x: x0 + 14, y, w: 260, region: "frontend" }, o)); y = b.b + 30; chain.push(b); return b; };
    add({ title: "Fetch target queue", rows: [{ pid: P.ftq, raw: true, pre: "decoupled:" }, { pid: P.ftqd, words: "entries" },
      { pid: P.fdip, raw: true, pre: "FDIP:" }] });
    const fetch = add({ title: "Fetch", rows: [{ pid: P.fw, words: "per clk" }, { pid: P.taken, words: "taken per clk" }] });
    const l1i = add({ title: "L1 instruction cache", region: hueOf("l1i"), rows: [{ pid: P.l1i, words: "KiB" },
      { pid: P.line, words: "B lines" }, { pid: P.l1i_ways, words: "ways" }] });
    const itlb = kbox(g, { x: x0 + 300, y: l1i.y, w: 250, title: "Instruction TLB", region: hueOf("itlb"), minH: l1i.h,
      rows: [{ pid: P.itlb, words: "entries" }, { pid: P.itlb_org, raw: true }] });
    add({ title: "Decode", rows: [{ pid: P.dw, words: "wide" }] });
    add({ title: "Instruction queue", rows: [{ pid: P.iq, words: "entries" }] });
    chain.forEach((b, i) => { if (i) wire(g, [[x0 + 60, chain[i - 1].b], [x0 + 60, b.y]]); });
    wire(g, [[fetch.x + fetch.w, fetch.y + 24], [itlb.x + itlb.w / 2, fetch.y + 24], [itlb.x + itlb.w / 2, itlb.y]]);
    wire(g, [[itlb.x, l1i.y + 24], [l1i.x + l1i.w, l1i.y + 24]]);
    const fb = ff.close(chain[chain.length - 1].b);

    const mf = kframe(g, { x: 16, y: Math.max(pb, fb) + 18, w: 1148, title: "Mechanisms", region: "frontend" });
    const mw = (1148 - 28 - (S.mechanisms.length - 1) * 12) / S.mechanisms.length;
    const ms = S.mechanisms.map((mid, i) => mechBox(g, 30 + i * (mw + 12), mf.top, mw, mid, hueOf(D.mechanisms[mid].block || "fetch")));
    const mh = Math.max(...ms.map((m) => m.h));
    ms.forEach((m) => m.g.querySelector("rect.body").setAttribute("height", mh));
    return legend(g, 16, mf.close(mf.top + mh) + 30, ["instruction"]);
  }

  // top-level parts of a list value: "a (b, c), d" -> ["a", "d"]
  function splitTop(s) {
    const out = [];
    let depth = 0, cur = "";
    for (const ch of String(s)) {
      if (ch === "(") depth++;
      if (ch === ")") { depth--; continue; }
      if (depth) continue;
      if (ch === ",") { out.push(cur.trim()); cur = ""; } else cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }

  function drawDmemView(g, S, y0) {
    const P = S.params, num = (pid) => D.params[pid].num;
    const cf = kframe(g, { x: 16, y: y0, w: 560, title: "L1 data cache", region: "lsu" });
    const l1 = kbox(g, { x: 30, y: cf.top, w: 532, title: "Array", region: "lsu", rows: [
      { pid: P.size, words: "KiB" }, { pid: P.line, words: "B lines" }, { pid: P.assoc, words: "ways" },
      { pid: P.repl, raw: true }, { pid: P.banks, words: "banks" }, { pid: P.bank_w, words: "B per bank" }] });
    banks(l1.g, 250, cf.top + 40, 298, l1.h - 54, num(P.banks) || 8, "banks");
    const ports = kbox(g, { x: 30, y: l1.b + 12, w: 532, title: "Ports", region: "lsu", rows: [
      { pid: P.ld_bw, words: "B/clk loaded" }, { pid: P.ld_n, words: "loads per clk" },
      { pid: P.st_bw, words: "B/clk stored" }, { pid: P.st_n, words: "stores per clk" }] });
    const cb = cf.close(ports.b);

    const lf = kframe(g, { x: 16, y: cb + 18, w: 560, title: "Load to use", note: "clk, bars on a log scale", region: "lsu" });
    const rows = [["pointer chase", P.lat], ["into an ALU op", P.lat_alu], ["complex address", P.lat_cx],
      ["into FP/SIMD", P.lat_simd], ["L2", P.l2_lat], ["system level cache", P.slc_lat]];
    const bx = 160, bmax = 300, lmax = Math.log(Math.max(...rows.map(([, p]) => num(p) || 1))), ch = el("g", { class: "k-chart" }, g);
    let ly = lf.top + 12;
    for (const [label, pid] of rows) {
      const n = num(pid), w = n ? Math.max(4, (Math.log(n) / lmax) * bmax) : 0;
      txt(ch, 30, ly, label, "k-words");
      if (n) el("rect", { x: bx, y: ly - 10, width: w, height: 11, rx: 2, class: "k-bar" }, ch);
      vrow(ch, bx + w + 10, ly, { pid, words: "" });
      ly += 24;
    }
    txt(ch, 30, ly, "DRAM", "k-words");
    vrow(ch, bx, ly, { pid: P.dram, words: "ns beyond the L2" });
    const lb = lf.close(ly + 4);

    const x0 = 600;
    const tf = kframe(g, { x: x0, y: y0, w: 564, title: "Address translation", region: "lsu" });
    const t1 = kbox(g, { x: x0 + 14, y: tf.top, w: 536, title: "L1 data TLB", region: "lsu", rows: [
      { pid: P.t1, words: "entries" }, { pid: P.t1_org, raw: true }, { pid: P.t1_ports, words: "lookup per clk" },
      { pid: P.t1_miss, words: "clk miss" }, { pid: P.page, words: "KiB pages" }] });
    const t2 = kbox(g, { x: x0 + 14, y: t1.b + 34, w: 536, title: "L2 TLB", region: "lsu", rows: [
      { pid: P.t2, words: "entries" }, { pid: P.t2_org, raw: true }, { pid: P.t2_miss, words: "clk page walk" }] });
    wire(g, [[x0 + 60, t1.b], [x0 + 60, t2.y]]);
    const tb = tf.close(t2.b);

    const mf = kframe(g, { x: x0, y: tb + 18, w: 564, title: "Prefetch and misses", region: "lsu" });
    const pfb = kbox(g, { x: x0 + 14, y: mf.top, w: 536, title: "Prefetchers", region: hueOf("prefetch"), rows: [
      { pid: P.pf, raw: true, words: "" }, { tags: splitTop(D.params[P.pf].value) }, { pid: P.pf_n, words: "streams" }] });
    const mh = kbox(g, { x: x0 + 14, y: pfb.b + 12, w: 536, title: "Miss handling", region: hueOf("mshr"), rows: [
      { pid: P.mlp, words: "misses outstanding" }] });
    const mb = mf.close(mh.b);
    return legend(g, 16, Math.max(lb, mb) + 30, ["instruction"]);
  }
