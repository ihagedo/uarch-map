// app.js
// Isaac Hagedorn, 2026-10-04
// Draws the map, the dossier and the phone stage list from the KB embedded in the page.
(function () {
  "use strict";
  const D = JSON.parse(document.getElementById("map-data").textContent);
  const M = D.views.metrics;
  const NS = "http://www.w3.org/2000/svg";
  const CONFS = ["confirmed", "corroborated", "single", "derived", "ours", "inferred", "conjecture", "unknown"];
  const DERIVS = ["measured", "documented", "derived", "inferred", "reported"];
  const CONF_WORD = { confirmed: "Confirmed", corroborated: "Corroborated", single: "One source", derived: "Derived",
    ours: "Ours, measured", inferred: "Inferred", conjecture: "Conjecture", unknown: "Unknown" };
  const DERIV_WORD = { measured: "Measured", documented: "Documented", derived: "Derived", inferred: "Inferred",
    reported: "Reported" };
  const state = { view: "L2", l3: null, block: null, param: null, show: new Set(CONFS), derivs: new Set(DERIVS),
    source: "", mech: null };
  const $ = (id) => document.getElementById(id);
  const svg = $("map"), wrap = $("map-wrap"), dossier = $("dossier"), workspace = $("workspace"), strings = $("strings");
  const wide = window.matchMedia("(min-width: 761px)");
  let linkLayer = null;
  let shown = null; // what the dossier last rendered, to skip identical redraws

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + "s"}`;
  const openDispute = (p) => p.disputes.some((d) => !d.resolution);
  const hue = (frame) => `--hue: var(--c-${frame})`;
  // source filter value: "" (all), "s:<source id>", or "a:<author>" for every source by that author
  const fromSource = (sid) => !state.source || (state.source.startsWith("s:") ? sid === state.source.slice(2)
    : D.sources[sid].author === state.source.slice(2));
  const visible = (p) => state.show.has(p.conf) && (!p.known || state.derivs.has(p.status)) &&
    (!state.source || p.for.concat(p.against).some((cid) => fromSource(D.claims[cid].source)));
  const filtering = () => state.show.size < CONFS.length || state.derivs.size < DERIVS.length || !!state.source;

  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function pin(g, deriv, x, y) {
    if (deriv === "measured") el("circle", { cx: x, cy: y, r: 3.4, class: "pin pin-measured" }, g);
    else if (deriv === "documented") el("circle", { cx: x, cy: y, r: 3, class: "pin pin-documented" }, g);
    else if (deriv === "derived") {
      el("circle", { cx: x, cy: y, r: 3, class: "pin pin-derived" }, g);
      el("path", { d: `M${x} ${y - 3} A3 3 0 0 0 ${x} ${y + 3} Z`, class: "pin pin-derived-half" }, g);
    }
    else if (deriv === "inferred") el("rect", { x: x - 2.9, y: y - 2.9, width: 5.8, height: 5.8,
      transform: `rotate(45 ${x} ${y})`, class: "pin pin-inferred" }, g);
  }
  function disputePin(g, x, y) {
    el("path", { d: `M${x} ${y - 4.6} L${x + 4.6} ${y + 3.6} L${x - 4.6} ${y + 3.6} Z`, class: "pin pin-dispute" }, g);
  }
  function pinHTML(deriv) {
    const body = {
      measured: '<circle class="pin-measured" cx="6" cy="6" r="3.6"/>',
      documented: '<circle class="pin-documented" cx="6" cy="6" r="3.2"/>',
      derived: '<circle class="pin-derived" cx="6" cy="6" r="3.2"/><path class="pin-derived-half" d="M6 2.8 A3.2 3.2 0 0 0 6 9.2 Z"/>',

      inferred: '<rect class="pin-inferred" x="3" y="3" width="6" height="6" transform="rotate(45 6 6)"/>',
    }[deriv];
    return body ? `<svg class="p-pin" viewBox="0 0 12 12" aria-hidden="true">${body}</svg>` : "<span></span>";
  }
  const DISPUTE_HTML = '<svg class="p-pin" viewBox="0 0 12 12" aria-hidden="true">' +
    '<path class="pin-dispute" d="M6 1.4 L10.6 10 L1.4 10 Z"/></svg>';

  const Q_ORDER = ["measured", "inferred", "patent", "ours", "open"];
  const Q_WORD = { measured: "measured", inferred: "inferred", patent: "patent only", ours: "ours", open: "open" };
  const REGION_ORDER = ["frontend", "backend", "lsu", "beyond"];
  const REGION_NAME = { frontend: "Frontend", backend: "Backend", lsu: "Load-store unit", beyond: "Beyond the core" };
  function questionsOf(bid) {
    return Object.entries(D.questions).filter(([, q]) => q.block === bid);
  }
  function regionOf(bid) {
    const box = D.views.L2.boxes[bid];
    return box ? box.frame : "beyond";
  }
  function qChip([qid, q]) {
    return `<span class="q-chip q-${q.state}" title="${esc(q.q)}">${esc(q.label)}</span>`;
  }
  function renderQuestions() {
    const bids = Object.keys(D.blocks).filter((bid) => questionsOf(bid).length);
    const count = {}, max = { n: 1 };
    for (const r of REGION_ORDER) count[r] = Object.fromEntries(Q_ORDER.map((s) => [s, 0]));
    for (const q of Object.values(D.questions)) count[regionOf(q.block)][q.state]++;
    for (const r of REGION_ORDER) max.n = Math.max(max.n, Q_ORDER.reduce((a, s) => a + count[r][s], 0));
    $("q-bars").innerHTML = REGION_ORDER.map((r) => {
      const n = Q_ORDER.reduce((a, s) => a + count[r][s], 0);
      const segs = Q_ORDER.filter((s) => count[r][s]).map((s) =>
        `<span class="q-seg q-${s}" style="flex:${count[r][s]}" title="${Q_WORD[s]}: ${count[r][s]}"></span>`).join("");
      return `<div class="q-bar-row" style="${hue(r)}"><span>${REGION_NAME[r]}</span>` +
        `<span class="q-track"><span class="q-bar" style="width:${(100 * n / max.n).toFixed(1)}%">${segs}</span></span>` +
        `<span class="q-n">${n}</span></div>`;
    }).join("");
    $("q-blocks").innerHTML = REGION_ORDER.map((r) => {
      const rows = bids.filter((bid) => regionOf(bid) === r).map((bid) =>
        `<button type="button" class="q-row" data-block="${bid}" style="${hue(r)}">` +
        `<span class="q-name">${esc(D.blocks[bid].name)}</span><span class="q-chips">${questionsOf(bid).map(qChip).join("")}</span></button>`);
      return rows.length ? `<div class="q-region" style="${hue(r)}"><h3>${REGION_NAME[r]}</h3>${rows.join("")}</div>` : "";
    }).join("");
    $("q-blocks").addEventListener("click", (e) => {
      const row = e.target.closest(".q-row");
      if (!row) return;
      select(row.dataset.block, null);
      $("workspace").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
  function answerHTML(aid) {
    const m = D.mechanisms[aid], p = D.params[aid];
    if (m) return `<li${m.ours ? ' class="ours"' : ""}><b>${esc(m.name)}</b> <span class="status-tag">${m.ours ? "ours, " : ""}${esc(m.status)}</span></li>`;
    if (p) return `<li${p.conf === "conjecture" ? ' class="ours"' : ""}><b>${esc(p.name)}</b> <span class="status-tag">${p.known ? esc(p.value) : p.conj ? "ours, conjecture" : "nothing published"}</span></li>`;
    return "";
  }
  function questionsHTML(bid) {
    const qs = questionsOf(bid);
    if (!qs.length) return "";
    return `<section class="d-section"><h3>Questions</h3><ul class="q-list">` + qs.map(([qid, q]) =>
      `<li><span class="q-chip q-${q.state}">${esc(Q_WORD[q.state])}</span><span class="q-text"><b>${esc(q.label)}.</b> ${esc(q.q)}</span>` +
      (q.answers.length ? `<ul class="q-answers">${q.answers.map(answerHTML).join("")}</ul>` : "") + `</li>`).join("") +
      `</ul></section>`;
  }

  function renderMasthead() {
    const c = D.counts;
    const stats = [[c.blocks, "blocks"], [c.params, "parameters"], [c.holes, "holes"], [c.claims, "claims"],
      [c.sources, "sources"]];
    $("stats").innerHTML = stats.map(([n, w]) => `<div><dt>${w}</dt><dd>${n}</dd></div>`).join("");
    const src = Object.entries(D.sources).sort((a, b) => b[1].claims - a[1].claims || a[1].cite.localeCompare(b[1].cite));
    $("source-list").innerHTML = src.map(([, s]) => {
      const name = s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.cite)}</a>` : esc(s.cite);
      return `<li><span class="n${s.claims ? "" : " zero"}" title="claims drawn from this source">${s.claims}</span>` +
        `<span>${name}, ${esc(s.title)}</span></li>`;
    }).join("");
  }

  function renderMap() {
    svg.replaceChildren();
    const defs = el("defs", {}, svg);
    const mk = el("marker", { id: "arrow", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 8, markerHeight: 8,
      markerUnits: "userSpaceOnUse", orient: "auto-start-reverse" }, defs);
    el("path", { d: "M0 1 L10 5 L0 9 Z", class: "arrowhead" }, mk);
    svg.classList.toggle("l3", state.view === "L3");
    if (state.view === "L3") {
      // structure views measure their text, so they draw into a full-width viewBox first
      svg.setAttribute("viewBox", "0 0 1180 800");
      const size = drawStructure(state.l3, D.views.L3[state.l3]);
      svg.setAttribute("viewBox", `0 0 ${size.w} ${size.h}`);
      svg.style.maxWidth = `${size.w}px`;
      svg.style.minWidth = "";
    } else {
      const V = D.views[state.view];
      svg.setAttribute("viewBox", `0 0 ${V.width} ${V.height}`);
      // drawn at full size; the pane scrolls sideways when it is narrower
      svg.style.maxWidth = svg.style.minWidth = `${V.width}px`;
      drawColumns(V);
      if (state.view === "L2") drawStages(V); else drawRegions(V);
    }
    linkLayer = el("g", { class: "links", "aria-hidden": "true" }, svg);
    shown = null;
    refresh();
  }

  function drawColumns(V) {
    const g = el("g", { class: "cols", "aria-hidden": "true" }, svg);
    const ty = M.margin + 13, ry = M.margin + 25;
    const first = V.columns[0], last = V.columns[V.columns.length - 1];
    el("path", { d: `M${first.x} ${ry} H${last.x + last.w}`, class: "col-rule" }, g);
    V.columns.forEach((c, i) => {
      const t = el("text", { x: c.x + c.w / 2, y: ty, "text-anchor": "middle", class: "col-label" }, g);
      t.textContent = c.label.toUpperCase();
      if (i < V.columns.length - 1) {
        const cx = c.x + c.w + M.colGap / 2;
        el("path", { d: `M${cx - 3} ${ry - 5} L${cx + 2} ${ry} L${cx - 3} ${ry + 5}`, class: "col-chev" }, g);
      }
    });
  }

  function drawStages(V) {
    const frames = el("g", { class: "frames" }, svg);
    for (const f of V.frames) {
      const g = el("g", { class: "frame", "data-frame": f.id, style: hue(f.id) }, frames);
      el("rect", { x: f.x, y: f.y, width: f.w, height: f.h, rx: 10, class: "frame-body" }, g);
      el("text", { x: f.x + 12, y: f.y + 18, class: "frame-label" }, g).textContent = f.label.toUpperCase();
      el("text", { x: f.x + f.w - 12, y: f.y + 18, "text-anchor": "end", class: "frame-count" }, g)
        .textContent = `${f.known} of ${f.params.length} known`;
    }
    const boxes = el("g", { class: "boxes" }, svg);
    for (const [bid, bx] of Object.entries(V.boxes)) drawBox(boxes, bid, bx);
  }

  function drawBox(layer, bid, bx) {
    const b = D.blocks[bid];
    const known = b.params.filter((pid) => D.params[pid].known).length;
    const g = el("g", { class: `box conf-${b.conf}`, "data-block": bid, tabindex: "0", role: "button", style: hue(bx.frame),
      "aria-label": `${b.name}: ${CONF_WORD[b.conf].toLowerCase()} confidence, ${known} of ${b.params.length} parameters known` +
        (b.disputed ? ", disputed" : "") }, layer);
    if (b.desc) el("title", {}, g).textContent = b.desc;
    el("rect", { x: bx.x - 4, y: bx.y - 4, width: bx.w + 8, height: bx.h + 8, rx: 9, class: "sel-ring" }, g);
    el("rect", { x: bx.x, y: bx.y, width: bx.w, height: bx.h, rx: 6, class: "body", "pointer-events": "all" }, g);
    el("text", { x: bx.x + 10, y: bx.y + 19, class: "name" }, g).textContent = clip(b.name, 22);
    if (b.l3) {
      const z = el("g", { class: "zoom", "data-l3": b.l3, "data-block": bid }, g);
      const zx = bx.x + bx.w - 1, zy = bx.y + 1;
      el("circle", { cx: zx, cy: zy, r: 8.5, class: "zoom-hit" }, z);
      el("circle", { cx: zx - 1, cy: zy - 1, r: 3.6, class: "zoom-glyph" }, z);
      el("path", { d: `M${zx + 1.6} ${zy + 1.6} L${zx + 4.4} ${zy + 4.4}`, class: "zoom-glyph" }, z);
      el("title", {}, z).textContent = `Open the structure view: ${D.views.L3[b.l3].label}`;
    }
    el("path", { d: `M${bx.x + 8} ${bx.y + M.boxHead - 4.5} H${bx.x + bx.w - 8}`, class: "rule" }, g);
    if (!b.params.length) {
      el("text", { x: bx.x + 10, y: bx.y + M.boxHead + 10, class: "empty" }, g).textContent = "no parameters yet";
    }
    // rows come laid out from the build: a value that does not fit beside its label wraps below it
    for (const row of bx.rows) {
      const pid = row.pid, p = D.params[pid];
      const ry = bx.y + M.boxHead - 2 + row.y;
      const disputed = openDispute(p);
      const r = el("g", { class: `row conf-${p.conf}`, "data-param": pid }, g);
      el("rect", { x: bx.x + 3, y: ry, width: bx.w - 6, height: row.h, rx: 3, class: "row-bg anchor" }, r);
      if (p.known) pin(r, p.status, bx.x + 12, ry + M.rowH / 2);
      el("text", { x: bx.x + 21, y: ry + 12.5, class: "label" }, r).textContent = row.label;
      row.value.forEach((v, i) => {
        const right = bx.x + bx.w - 10 - (disputed && !row.split ? 13 : 0);
        el("text", { x: right, y: ry + 12.5 + (row.split ? (i + 1) * M.lineH : 0), "text-anchor": "end", class: "value" }, r)
          .textContent = v;
      });
      if (disputed) disputePin(r, bx.x + bx.w - 13, ry + M.rowH / 2);
      el("title", {}, r).textContent = `${p.name}: ` +
        (p.known ? `${p.value}${p.unit ? " " + p.unit : ""}` : p.conj ? `conjecture ${p.short}` : "nothing published") + ` (${CONF_WORD[p.conf].toLowerCase()})`;
    }
  }

  function drawRegions(V) {
    const layer = el("g", { class: "regions" }, svg);
    for (const f of V.frames) {
      const claims = new Set(f.params.flatMap((pid) => D.params[pid].for));
      const g = el("g", { class: `box region conf-${f.conf}`, "data-frame": f.id, tabindex: "0", role: "button", style: hue(f.id),
        "aria-label": `${f.label}: ${f.known} of ${f.params.length} parameters known. Open the stage view.` }, layer);
      el("rect", { x: f.x - 4, y: f.y - 4, width: f.w + 8, height: f.h + 8, rx: 13, class: "sel-ring" }, g);
      el("rect", { x: f.x, y: f.y, width: f.w, height: f.h, rx: 10, class: "body", "pointer-events": "all" }, g);
      el("text", { x: f.x + 16, y: f.y + 30, class: "r-name" }, g).textContent = f.label;
      el("text", { x: f.x + 16, y: f.y + 52, class: "r-count" }, g).textContent =
        `${f.known} of ${f.params.length} parameters known · ${plural(claims.size, "claim")}`;
      const per = Math.max(1, Math.floor((f.w - 32 + 4) / 14));
      f.params.forEach((pid, i) => {
        const p = D.params[pid];
        const cx = f.x + 16 + (i % per) * 14, cy = f.y + 66 + Math.floor(i / per) * 14;
        const c = el("g", { class: `cell conf-${p.conf}`, "data-param": pid }, g);
        el("rect", { x: cx, y: cy, width: 10, height: 10, rx: 2, class: "body" }, c);
        el("title", {}, c).textContent = `${p.name} (${CONF_WORD[p.conf].toLowerCase()})`;
      });
      el("text", { x: f.x + 16, y: f.y + f.h - 16, class: "r-blocks" }, g)
        .textContent = clip(f.desc || "", Math.floor((f.w - 32) / 5.6));
    }
  }

  // Links of the selected block, routed on a 2-unit grid around every box (A* with a cost per bend), by these
  // layout rules: keep CLEAR units off every box but the link's own two, leave and enter
  // a box side square, make every run after a turn at least RUN units long (no jogs), and never share a run
  // with a link drawn before (parallel runs within NEAR units cost extra) unless the two make a bus: same kind
  // into the same box, which merge into one trunk.
  const GRID = 2, CLEAR = 8, RUN = 12, BEND = 16, NEAR = 6, TIGHT = 4;
  const TAIL = [10, 12, 14, 16, 18, 20, 22, 24, 26], HEAD = TAIL.slice(1);
  function linkRoutes(links, V) {
    const B = V.boxes, ids = Object.keys(B), W = Math.ceil(V.width / GRID) + 1, H = Math.ceil(V.height / GRID) + 1;
    // owner of each cell: 0 free, i + 1 inside box i's clearance, -1 taken (two clearances, a label, a box)
    const own = new Int16Array(W * H), used = new Uint8Array(W * H), near = new Uint8Array(W * H * 2);
    const bus = new Int16Array(W * H * 2).fill(-1);  // the bus (to and kind) that covers each cell, by orientation
    const close = new Int16Array(W * H * 2).fill(-1);  // ... and the bus running parallel within TIGHT units
    let me = -1;  // the bus of the link being routed
    const mark = (x0, y0, x1, y1, v) => {
      for (let gy = Math.max(0, Math.floor(y0 / GRID) + 1); gy <= Math.min(H - 1, Math.ceil(y1 / GRID) - 1); gy++)
        for (let gx = Math.max(0, Math.floor(x0 / GRID) + 1); gx <= Math.min(W - 1, Math.ceil(x1 / GRID) - 1); gx++) {
          const c = gy * W + gx;
          own[c] = own[c] === 0 || own[c] === v ? v : -1;
        }
    };
    ids.forEach((id, i) => { const b = B[id]; mark(b.x - CLEAR, b.y - CLEAR, b.x + b.w + CLEAR, b.y + b.h + CLEAR, i + 1); });
    ids.forEach((id) => { const b = B[id]; mark(b.x, b.y, b.x + b.w, b.y + b.h, -1); });
    for (const f of V.frames) {  // the frame's label and count
      mark(f.x + 6, f.y + 2, f.x + 18 + f.label.length * 8.6, f.y + 25, -1);
      mark(f.x + f.w - 18 - 6.2 * `${f.known} of ${f.params.length} known`.length, f.y + 2, f.x + f.w - 6, f.y + 25, -1);
    }
    mark(-GRID, -GRID, V.width + GRID, M.margin + M.headH - 6, -1);
    // running beside a frame's border reads as part of the frame: cost it like running beside another link
    for (const f of V.frames) {
      for (let x = f.x; x <= f.x + f.w; x += GRID) for (let k = -NEAR; k <= NEAR; k += GRID) for (const y of [f.y, f.y + f.h]) {
        const gx = Math.round(x / GRID), gy = Math.round((y + k) / GRID);
        if (gx >= 0 && gy >= 0 && gx < W && gy < H) near[(gy * W + gx) * 2] = 1;
      }
      for (let y = f.y; y <= f.y + f.h; y += GRID) for (let k = -NEAR; k <= NEAR; k += GRID) for (const x of [f.x, f.x + f.w]) {
        const gx = Math.round((x + k) / GRID), gy = Math.round(y / GRID);
        if (gx >= 0 && gy >= 0 && gx < W && gy < H) near[(gy * W + gx) * 2 + 1] = 1;
      }
    }
    const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1], R = RUN / GRID;
    const inGrid = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
    // a straight run of n cells from (x, y) in direction d, all free (or the given box's clearance)
    function clear(x, y, d, n, mine) {
      for (let k = 1; k <= n; k++) {
        const qx = x + DX[d] * k, qy = y + DY[d] * k;
        if (!inGrid(qx, qy)) return false;
        const c = qy * W + qx;
        if (own[c] !== 0 && own[c] !== mine) return false;
        if ((used[c] & (1 << (d % 2)) && bus[c * 2 + d % 2] !== me) || (close[c * 2 + d % 2] >= 0 && close[c * 2 + d % 2] !== me)) return false;
      }
      return true;
    }
    // ports: cells 10-26 units off a side (12-26 at the head), reached by a straight run through the box's clearance
    function ports(b, i, out) {
      const res = [], hy = b.y + 15, cx = b.x + b.w / 2;
      const side = (d, edge, at, pref) => {
        for (const dist of out ? TAIL : HEAD) {  // the head's run carries the arrowhead
          // round away from the box, so the run to the side is never short of `dist`
          const away = (v, sgn) => (sgn > 0 ? Math.ceil(v / GRID) : Math.floor(v / GRID));
          const gx = d % 2 ? Math.round(at / GRID) : away(edge + (d === 0 ? dist : -dist), d === 0 ? 1 : -1);
          const gy = d % 2 ? away(edge + (d === 1 ? dist : -dist), d === 1 ? 1 : -1) : Math.round(at / GRID);
          if (!inGrid(gx, gy) || own[gy * W + gx] !== 0) continue;
          const back = (d + 2) % 4, n = Math.abs(d % 2 ? gy * GRID - edge : gx * GRID - edge) / GRID - 1;
          if (n > 0 && !clear(gx, gy, back, n, i + 1)) continue;
          const tip = d % 2 ? [gx * GRID, edge] : [edge, gy * GRID];
          res.push({ gx, gy, dir: out ? d : back, cost: pref + Math.abs(dist - 12) * 0.2, tip });
        }
      };
      for (let y = b.y + 10; y <= b.y + b.h - 10; y += GRID) {
        const c = Math.abs(y - hy) * 0.25;
        side(0, b.x + b.w, y, c);
        side(2, b.x, y, c);
      }
      for (let x = b.x + 14; x <= b.x + b.w - 14; x += GRID) {
        const c = 30 + Math.abs(x - cx) * 0.25;
        side(1, b.y + b.h, x, c);
        side(3, b.y, x, c);
      }
      return res;
    }
    function search(ia, ib) {
      const a = B[ids[ia]], b = B[ids[ib]];
      const starts = ports(a, ia, true), goals = new Map();
      for (const p of ports(b, ib, false)) {
        const k = (p.gy * W + p.gx) * 4 + p.dir;
        if (!goals.has(k) || goals.get(k).cost > p.cost) goals.set(k, p);
      }
      const tx0 = (b.x - 16) / GRID, tx1 = (b.x + b.w + 16) / GRID, ty0 = (b.y - 16) / GRID, ty1 = (b.y + b.h + 16) / GRID;
      const h = (gx, gy) => (Math.max(0, tx0 - gx, gx - tx1) + Math.max(0, ty0 - gy, gy - ty1)) * GRID;
      const g = new Float32Array(W * H * 4).fill(Infinity), prev = new Int32Array(W * H * 4).fill(-1);
      const heap = [];
      const push = (f, st) => {
        heap.push([f, st]);
        for (let i = heap.length - 1; i > 0;) {
          const j = (i - 1) >> 1;
          if (heap[j][0] <= heap[i][0]) break;
          [heap[i], heap[j]] = [heap[j], heap[i]]; i = j;
        }
      };
      const pop = () => {
        const top = heap[0], last = heap.pop();
        if (heap.length) {
          heap[0] = last;
          for (let i = 0; ;) {
            const l = 2 * i + 1, r = l + 1;
            let m = i;
            if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
            if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
            if (m === i) break;
            [heap[i], heap[m]] = [heap[m], heap[i]]; i = m;
          }
        }
        return top;
      };
      const startOf = new Map();
      for (const p of starts) {
        const st = (p.gy * W + p.gx) * 4 + p.dir;
        if (p.cost < g[st]) { g[st] = p.cost; startOf.set(st, p); push(p.cost + h(p.gx, p.gy), st); }
      }
      while (heap.length) {
        const [f, st] = pop();
        const cell = st >> 2, dir = st & 3, gx = cell % W, gy = (cell - gx) / W;
        if (f - h(gx, gy) > g[st] + 1e-6) continue;
        const goal = goals.get(st);
        if (goal) {
          const chain = [];
          for (let s2 = st; s2 >= 0; s2 = prev[s2]) chain.push(s2);
          chain.reverse();
          return { chain, start: startOf.get(chain[0]), goal };
        }
        // turn onto a head port here (its run to the box is the last run), go on one cell, or turn and run R cells
        for (const nd of [(dir + 1) % 4, (dir + 3) % 4]) {
          const ns = cell * 4 + nd, cost = g[st] + BEND;
          if (goals.has(ns) && cost < g[ns]) { g[ns] = cost; prev[ns] = st; push(cost + h(gx, gy), ns); }
        }
        for (const [nd, n] of [[dir, 1], [(dir + 1) % 4, R], [(dir + 3) % 4, R]]) {
          if (!clear(gx, gy, nd, n, 0)) continue;
          const nx = gx + DX[nd] * n, ny = gy + DY[nd] * n, nc = ny * W + nx, o = nd % 2;
          let extra = 0;
          for (let k = 1; k <= n; k++) {
            const q = (gy + DY[nd] * k) * W + gx + DX[nd] * k;
            extra += bus[q * 2 + o] === me ? -1 : (near[q * 2 + o] ? 8 : 0) + (used[q] ? 3 : 0);
          }
          const ns = nc * 4 + nd, cost = g[st] + n * GRID + (nd !== dir ? BEND : 0) + extra;
          if (cost < g[ns]) { g[ns] = cost; prev[ns] = st; push(cost + h(nx, ny), ns); }
        }
      }
      return null;
    }
    const dist = (l) => Math.abs(B[l.from].x - B[l.to].x) + Math.abs(B[l.from].y - B[l.to].y);
    const out = new Map();
    const buses = [...new Set(links.map((l) => `${l.to} ${l.kind}`))];
    const size = (l) => links.filter((k) => k.to === l.to && k.kind === l.kind).length;
    // the widest bus first, so a trunk gets the gutter on its sources' side; then the shortest link first
    for (const l of links.slice().sort((p, q) => size(q) - size(p) || dist(p) - dist(q))) {
      me = buses.indexOf(`${l.to} ${l.kind}`);
      const r = search(ids.indexOf(l.from), ids.indexOf(l.to));
      if (!r) continue;
      // every cell of the route between the two tips; collinear points drop out below
      const pts = [r.start.tip, ...r.chain.map((st) => [((st >> 2) % W) * GRID, Math.floor((st >> 2) / W) * GRID])];
      pts.push(r.goal.tip);
      // keep the corners, then mark the cells the route covers by orientation and the cells NEAR units either side
      const clean = [pts[0]];
      for (let i = 1; i < pts.length; i++) {
        const [p0, p1] = [clean[clean.length - 1], pts[i]];
        if (Math.abs(p0[0] - p1[0]) + Math.abs(p0[1] - p1[1]) < 0.5) continue;
        if (clean.length > 1) {
          const q = clean[clean.length - 2];
          if ((Math.abs(q[0] - p0[0]) < 0.5 && Math.abs(p0[0] - p1[0]) < 0.5) || (Math.abs(q[1] - p0[1]) < 0.5 && Math.abs(p0[1] - p1[1]) < 0.5)) {
            clean[clean.length - 1] = p1;
            continue;
          }
        }
        clean.push(p1);
      }
      for (let i = 0; i + 1 < clean.length; i++) {
        const [x0, y0] = clean[i], [x1, y1] = clean[i + 1], o = Math.abs(y1 - y0) > 0.5 ? 1 : 0;
        const n = Math.round((Math.abs(x1 - x0) + Math.abs(y1 - y0)) / GRID);
        for (let k = 0; k <= n; k++) {
          const cx = Math.round((x0 + ((x1 - x0) * k) / Math.max(1, n)) / GRID), cy = Math.round((y0 + ((y1 - y0) * k) / Math.max(1, n)) / GRID);
          if (!inGrid(cx, cy)) continue;
          used[cy * W + cx] |= 1 << o;
          if (bus[(cy * W + cx) * 2 + o] < 0) bus[(cy * W + cx) * 2 + o] = me;
          for (let j = 1; j <= NEAR / GRID; j++) for (const sgn of [-1, 1]) {
            const qx = cx + (o ? sgn * j : 0), qy = cy + (o ? 0 : sgn * j);
            if (!inGrid(qx, qy)) continue;
            near[(qy * W + qx) * 2 + o] = 1;
            if (j * GRID < TIGHT && close[(qy * W + qx) * 2 + o] < 0) close[(qy * W + qx) * 2 + o] = me;
          }
        }
      }
      out.set(l, clean);
    }
    return out;
  }

  function rounded(pts, r) {
    const p = pts.filter((q, i) => i === 0 || Math.abs(q[0] - pts[i - 1][0]) + Math.abs(q[1] - pts[i - 1][1]) > 0.5);
    let d = `M${p[0][0]} ${p[0][1]}`;
    for (let i = 1; i < p.length - 1; i++) {
      const [x0, y0] = p[i - 1], [x1, y1] = p[i], [x2, y2] = p[i + 1];
      const l1 = Math.hypot(x1 - x0, y1 - y0), l2 = Math.hypot(x2 - x1, y2 - y1);
      const rr = Math.min(r, l1 / 2, l2 / 2);
      d += ` L${x1 - ((x1 - x0) / l1) * rr} ${y1 - ((y1 - y0) / l1) * rr}` +
        ` Q${x1} ${y1} ${x1 + ((x2 - x1) / l2) * rr} ${y1 + ((y2 - y1) / l2) * rr}`;
    }
    const e = p[p.length - 1];
    return d + ` L${e[0]} ${e[1]}`;
  }

  function drawLinks() {
    if (!linkLayer) return;
    linkLayer.replaceChildren();
    if (state.view !== "L2" || !state.block) return;
    const V = D.views.L2, B = V.boxes;
    const mine = D.links.filter((l) => (l.from === state.block || l.to === state.block) && B[l.from] && B[l.to]);
    for (const [l, pts] of linkRoutes(mine, V)) {
      el("path", { d: rounded(pts, 6), class: `link k-${l.kind}`, "marker-end": "url(#arrow)", "data-bus": `${l.to} ${l.kind}`, "data-link": `${l.from} ${l.to}` }, linkLayer);
    }
  }

  function refresh() {
    svg.querySelectorAll(".box[data-block]").forEach((g) => {
      const bid = g.dataset.block;
      g.classList.toggle("selected", bid === state.block);
      g.setAttribute("aria-pressed", String(bid === state.block));
    });
    svg.querySelectorAll(".row, .sp").forEach((r) => r.classList.toggle("selected", r.dataset.param === state.param));
    renderDossier();
    applyFilters();
    drawLinks();
    const chip = state.view === "L3" && state.l3 === "chip";
    for (const v of ["L1", "L2"]) $(`zoom-${v}`).setAttribute("aria-pressed", String(state.view === v));
    $("zoom-L0").setAttribute("aria-pressed", String(chip));
    $("zoom-L3").setAttribute("aria-pressed", String(state.view === "L3" && !chip));
    const l3 = structureHere();
    $("zoom-L3").disabled = !l3 || l3 === "chip";
    $("zoom-L3").title = l3 && l3 !== "chip" ? D.views.L3[l3].label : "Select a block with a structure view";
    for (const c of CONFS) $(`show-${c}`).setAttribute("aria-pressed", String(state.show.has(c)));
    for (const d of DERIVS) $(`deriv-${d}`).setAttribute("aria-pressed", String(state.derivs.has(d)));
    $("source-filter").value = state.source;
    $("clear-filters").hidden = !filtering();
    const explained = new Set(state.mech ? D.mechanisms[state.mech].params : []);
    svg.querySelectorAll(".row, .sp").forEach((r) => r.classList.toggle("mech-hit", explained.has(r.dataset.param)));
    svg.querySelectorAll(".rules").forEach((r) => r.classList.toggle("selected", r.dataset.mech === state.mech));
    dossier.querySelectorAll(".mech").forEach((m) => m.setAttribute("aria-pressed", String(m.dataset.mech === state.mech)));
    queueStrings();
  }

  let stringsQueued = false;
  function queueStrings() {
    if (stringsQueued) return;
    stringsQueued = true;
    requestAnimationFrame(() => { stringsQueued = false; drawStrings(); });
  }

  function drawStrings() {
    strings.replaceChildren();
    if (!wide.matches || state.view === "L1" || dossier.hidden) return;
    const ws = workspace.getBoundingClientRect(), wr = wrap.getBoundingClientRect(), dr = dossier.getBoundingClientRect();
    const clampY = (y) => Math.min(Math.max(y, dr.top + 8), dr.bottom - 8);
    const frameOf = (pid) => (D.views.L2.boxes[D.params[pid].block] || {}).frame;
    const rowEnd = (pid) => {
      for (const bg of svg.querySelectorAll(`[data-param="${CSS.escape(pid)}"] .anchor`)) {
        const b = bg.getBoundingClientRect();
        if (b.right >= wr.left && b.right <= wr.right) return [b.right - 2, b.top + b.height / 2];
      }
      return null;
    };
    const tie = (a, b, frame, cls) => {
      const ax = a[0] - ws.left, ay = a[1] - ws.top, bx = b[0] - ws.left, by = b[1] - ws.top;
      const dx = Math.max(30, (bx - ax) / 2);
      const g = el("g", { class: `string-g ${cls}`, style: frame ? hue(frame) : "" }, strings);
      el("path", { d: `M${ax} ${ay} C${ax + dx} ${ay} ${bx - dx} ${by} ${bx} ${by}`, class: "string" }, g);
      el("circle", { cx: ax, cy: ay, r: 2.6, class: "string-end" }, g);
      el("circle", { cx: bx, cy: by, r: 2.6, class: "string-end" }, g);
    };
    if (state.param) {
      const p = D.params[state.param], a = rowEnd(state.param);
      // dashed: the losing side of an open dispute, and contradicting claims
      const other = new Set(p.disputes.filter((d) => !d.resolution).flatMap((d) => d.claims.slice(1)).concat(p.against));
      if (a) dossier.querySelectorAll(`[id="ev-${state.param}"] .claim`).forEach((card) => {
        const c = card.getBoundingClientRect();
        tie(a, [c.left, clampY(c.top + 18)], frameOf(state.param),
          `${other.has(card.dataset.claim) ? "alt" : ""} ${card.classList.contains("dim") ? "dim" : ""}`);
      });
    }
    if (state.mech) {
      const card = dossier.querySelector(`.mech[data-mech="${state.mech}"]`);
      if (card) {
        const c = card.getBoundingClientRect(), b = [c.left, clampY(c.top + 16)];
        for (const pid of D.mechanisms[state.mech].params) {
          const a = rowEnd(pid);
          if (a) tie(a, b, frameOf(pid), "");
        }
      }
    }
  }

  function applyFilters() {
    const dimGroup = (g, pids, conf) => {
      const any = pids.length ? pids.some((pid) => visible(D.params[pid])) : state.show.has(conf);
      g.classList.toggle("dim", !any);
      return any;
    };
    svg.querySelectorAll(".box[data-block]").forEach((g) => {
      const b = D.blocks[g.dataset.block];
      const any = dimGroup(g, b.params, b.conf);
      g.querySelectorAll(".row").forEach((r) => r.classList.toggle("dim", any && !visible(D.params[r.dataset.param])));
    });
    svg.querySelectorAll(".region").forEach((g) => {
      const f = D.views.L1.frames.find((x) => x.id === g.dataset.frame);
      const any = dimGroup(g, f.params, f.conf);
      g.querySelectorAll(".cell").forEach((c) => c.classList.toggle("dim", any && !visible(D.params[c.dataset.param])));
    });
    document.querySelectorAll(".card").forEach((card) => {
      const b = D.blocks[card.dataset.block];
      const any = dimGroup(card, b.params, b.conf);
      card.querySelectorAll(".c-row").forEach((r) => r.classList.toggle("dim", any && !visible(D.params[r.dataset.param])));
    });
    svg.querySelectorAll(".sp").forEach((g) => g.classList.toggle("dim", !visible(D.params[g.dataset.param])));
    dossier.querySelectorAll(".p-row").forEach((r) => r.classList.toggle("dim", !visible(D.params[r.dataset.param])));
    dossier.querySelectorAll(".claim").forEach((c) => c.classList.toggle("dim", !fromSource(c.dataset.source)));
  }

  // o.stay: click came from inside the current view (an L3 value), so stay in it
  function select(bid, pid, opts) {
    const o = opts || {};
    if (bid !== state.block) state.mech = null;
    const inL3 = state.view === "L3" && (o.stay || (bid && D.views.L3[state.l3].blocks.includes(bid)));
    if (state.view !== "L2" && bid && !inL3) { state.view = "L2"; state.block = bid; state.param = pid || null; renderMap(); }
    else { state.block = bid; state.param = pid || null; refresh(); }
    setHash();
    if (bid && o.scroll !== false && state.view === "L2") requestAnimationFrame(() => revealBox(bid));
  }

  function setHash() {
    const h = state.view === "L3" ? `#${state.block || D.views.L3[state.l3].blocks[0]}/structure` : state.block ? `#${state.block}` : "";
    try { history.replaceState(null, "", h || location.pathname + location.search); } catch (e) { /* sandboxed */ }
  }

  function structureHere() {
    if (state.view === "L3") return state.l3;
    return state.block ? D.blocks[state.block].l3 || null : null;
  }

  function openStructure(sid, bid) {
    state.view = "L3";
    state.l3 = sid;
    if (bid && bid !== state.block) { state.block = bid; state.param = null; state.mech = null; }
    if (!state.block) state.block = D.views.L3[sid].blocks[0];
    renderMap();
    wrap.scrollTo({ left: 0 });
    setHash();
  }

  function closeStructure() {
    state.view = "L2";
    renderMap();
    setHash();
    if (state.block) requestAnimationFrame(() => revealBox(state.block));
  }

  function revealBox(bid) {
    const bx = D.views.L2.boxes[bid];
    if (!bx || !wide.matches) return;
    const s = svg.clientWidth / D.views.L2.width;
    const x0 = bx.x * s, x1 = (bx.x + bx.w) * s;
    const left = wrap.scrollLeft, right = left + wrap.clientWidth;
    if (x0 - 20 < left) wrap.scrollTo({ left: Math.max(0, x0 - 40), behavior: "smooth" });
    else if (x1 + 20 > right) wrap.scrollTo({ left: x1 + 40 - wrap.clientWidth, behavior: "smooth" });
  }

  function openRegion(fid) {
    state.view = "L2";
    renderMap();
    const f = D.views.L2.frames.find((x) => x.id === fid);
    if (!f) return;
    requestAnimationFrame(() => {
      const s = svg.clientWidth / D.views.L2.width;
      wrap.scrollTo({ left: Math.max(0, (f.x - 20) * s), behavior: "smooth" });
      const g = svg.querySelector(`.frame[data-frame="${fid}"]`);
      if (g) { g.classList.add("flash"); setTimeout(() => g.classList.remove("flash"), 1400); }
    });
  }

  function renderDossier() {
    const bid = state.block;
    workspace.classList.toggle("has-dossier", !!bid);
    document.body.classList.toggle("sheet-open", !!bid && !wide.matches);
    if (!bid) { dossier.hidden = true; dossier.innerHTML = ""; shown = null; return; }
    if (shown && shown.block === bid && shown.param === state.param && shown.mech === state.mech &&
        shown.view === state.view) return;
    const keepScroll = shown && shown.block === bid ? dossier.scrollTop : 0;
    shown = { block: bid, param: state.param, mech: state.mech, view: state.view };
    dossier.hidden = false;
    const b = D.blocks[bid];
    const frame = D.views.L2.boxes[bid] && D.views.L2.boxes[bid].frame;
    dossier.style.cssText = frame ? hue(frame) : "";
    const params = b.params.map((pid) => [pid, D.params[pid]]);
    const known = params.filter(([, p]) => p.known).length;
    const claims = new Set(params.flatMap(([, p]) => p.for.concat(p.against)));
    let h = `<div class="d-head"><p class="eyebrow"><span class="dot"></span>${b.region ? esc(b.region) + " · " : ""}${esc(b.stage)}</p>` +
      `<h2>${esc(b.name)}</h2>` + (b.desc ? `<p class="d-role">${esc(b.desc)}</p>` : "") +
      `<button type="button" class="d-close" id="d-close" aria-label="Close the dossier">×</button></div>`;
    h += `<p class="d-summary"><span class="conf-tag conf-${b.conf}">${CONF_WORD[b.conf]}</span>` +
      `<span>${known} of ${params.length} known</span><span>${plural(claims.size, "claim")}</span></p>`;
    if (b.blackBox) h += `<p class="blackbox-note">Nothing published.</p>`;
    if (b.l3 && wide.matches) {
      h += state.view === "L3" && state.l3 === b.l3
        ? `<p class="d-l3"><button type="button" class="open-l3" data-nav="back">‹ Stage map</button></p>`
        : `<p class="d-l3"><button type="button" class="open-l3" data-l3="${b.l3}">${esc(D.views.L3[b.l3].label)} ›</button></p>`;
    }
    h += `<section class="d-section"><h3>Parameters</h3><ul class="p-list">` +
      params.map(([pid, p]) => paramHTML(pid, p)).join("") + `</ul></section>`;
    const mechs = Object.entries(D.mechanisms)
      .filter(([, m]) => m.block === bid || m.params.some((pid) => D.params[pid].block === bid));
    if (mechs.length) h += `<section class="d-section"><h3>Mechanisms</h3>${mechs.map(mechHTML).join("")}</section>`;
    h += questionsHTML(bid);
    const outs = D.links.filter((l) => l.from === bid), ins = D.links.filter((l) => l.to === bid);
    if (outs.length || ins.length) {
      h += `<section class="d-section"><h3>Connections</h3><ul class="link-list">` +
        outs.map((l) => linkHTML(l.to, "to", l)).join("") + ins.map((l) => linkHTML(l.from, "from", l)).join("") +
        `</ul></section>`;
    }
    dossier.innerHTML = h;
    dossier.scrollTop = keepScroll;
    const ev = state.param && document.getElementById(`ev-${state.param}`);
    if (ev && wide.matches) {
      const d = dossier.getBoundingClientRect(), r = ev.parentElement.getBoundingClientRect();
      if (r.top < d.top || r.bottom > d.bottom) dossier.scrollTop += Math.min(r.top - d.top - 12, r.bottom - d.bottom + 12);
    }
  }

  function paramHTML(pid, p) {
    const open = state.param === pid;
    const n = p.for.length + p.against.length;
    const unit = p.known && p.unit ? `<small>${esc(p.unit)}</small>` : "";
    return `<li><button type="button" class="p-row conf-${p.conf}" data-param="${pid}" aria-expanded="${open}">` +
      (p.known ? pinHTML(p.status) : "<span></span>") +
      `<span class="p-name">${esc(p.name)}</span><span class="p-value${p.value.length > 16 ? " long" : ""}">` +
      `${esc(p.known ? p.value : p.conj ? p.short : p.value)}${unit}</span>` +
      `<span class="p-meta"><span class="conf-tag conf-${p.conf}">${CONF_WORD[p.conf]}</span>` +
      `<span>${p.known ? DERIV_WORD[p.status] : "Nothing published"}</span><span>${plural(n, "claim")}</span>` +
      (openDispute(p) ? `<span class="flag">${DISPUTE_HTML}Disputed</span>` : "") +
      (p.judgment ? `<span class="ours-tag">Ours: ${esc(p.judgment.verdict)}</span>` : "") + `</span></button>` +
      (open ? evidenceHTML(pid, p) : "") + `</li>`;
  }

  const VERDICT = { likely: "Likely on the M1", unlikely: "Unlikely on the M1", open: "Open", settled: "Settled" };
  function judgmentHTML(j) {
    return j ? `<span class="judgment"><span class="ours-tag">Ours</span><b>${VERDICT[j.verdict]}.</b> ${esc(j.text)}</span>` : "";
  }

  function evidenceHTML(pid, p) {
    let h = `<div class="evidence" id="ev-${pid}">`;
    if (p.judgment) h += `<p class="ev-flag">${judgmentHTML(p.judgment)}</p>`;
    for (const d of p.disputes) {
      const sides = d.claims.map((cid) => `${D.sources[D.claims[cid].source].cite} ${D.claims[cid].value}`).join(", ");
      const by = d.ours ? `<span class="ours-tag">Ours</span>` : "";
      h += `<p class="ev-flag">${DISPUTE_HTML}${by}${d.resolution ? "Resolved" : "Disputed"}: ${esc(sides)}` +
        (d.resolution ? `. ${esc(d.resolution)}` : "") + `</p>`;
    }
    if (p.for.length) h += `<h4 class="ev-h">Supporting claims (${p.for.length})</h4>` + p.for.map(claimHTML).join("");
    if (p.against.length) h += `<h4 class="ev-h">Contradicting claims (${p.against.length})</h4>` + p.against.map(claimHTML).join("");
    if (p.conj) {
      h += `<p class="hole-note">${esc(p.conj.text)}</p>`;
      if (p.conj.basis.length) h += `<h4 class="ev-h">Based on (${p.conj.basis.length})</h4>` + p.conj.basis.map(claimHTML).join("");
    } else if (!p.for.length && !p.against.length) h += `<p class="hole-note">Nothing published.</p>`;
    return h + `</div>`;
  }

  function locText(loc) {
    if (/^p\d+$/.test(loc)) return `page ${parseInt(loc.slice(1), 10)}`;
    if (loc.startsWith("#")) return `section “${loc.slice(1).replace(/-/g, " ")}”`;
    return loc;
  }

  function claimHTML(cid) {
    const c = D.claims[cid], s = D.sources[c.source];
    const src = s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.cite)}</a>` : esc(s.cite);
    let h = `<article class="claim" data-source="${esc(c.source)}" data-claim="${esc(cid)}"><p class="claim-text">${esc(c.text)}</p>`;
    if (c.quote) h += `<p class="claim-quote">“${esc(c.quote)}”</p>`;
    const where = [src, esc(locText(c.loc)), `<span class="deriv">${pinHTML(c.deriv)}${DERIV_WORD[c.deriv]}</span>`];
    if (c.chip && c.chip !== "m1") where.push(esc(c.chip.toUpperCase()));
    if (s.ours) where.unshift(`<span class="ours-tag">Ours</span>`);
    return h + `<p class="claim-src">${where.join(" · ")}</p></article>`;
  }

  function mechHTML([mid, m]) {
    const on = state.mech === mid;
    let more = "";
    if (on && m.ours) {
      if (m.alternative) more += `<p class="ours-line"><b>Alternative.</b> ${esc(m.alternative)}</p>`;
      if (m.test) more += `<p class="ours-line"><b>What would tell them apart.</b> ${esc(m.test)}</p>`;
      more += `<h4 class="ev-h">Rests on (${m.basis.length})</h4>` + m.basis.map(claimHTML).join("");
    } else if (on && m.claims.length) {
      more += `<h4 class="ev-h">Claims (${m.claims.length})</h4>` + m.claims.map(claimHTML).join("");
    }
    return `<div class="mech-wrap"><button type="button" class="mech${m.ours ? " ours" : ""}" data-mech="${mid}" aria-pressed="${on}">` +
      `<span class="mech-h">${esc(m.name)}` + (m.ours ? `<span class="ours-tag">Ours</span>` : "") +
      `<span class="status-tag">${esc(m.status)}</span>` +
      (m.chip && m.chip !== "m1" ? `<span class="status-tag">${esc(m.chip.toUpperCase())}</span>` : "") + `</span>` +
      `<span class="mech-desc">${esc(m.description)}</span>${judgmentHTML(m.judgment)}</button>` +
      (more ? `<div class="mech-claims">${more}</div>` : "") + `</div>`;
  }

  function linkHTML(other, dir, l) {
    return `<li><button type="button" data-block="${other}"><span class="dir">${dir}</span>${esc(D.blocks[other].name)}` +
      `<span class="dir"> · ${esc(l.label || l.kind)}</span></button></li>`;
  }

  function renderList() {
    const frames = D.views.L2.frames.slice().sort((a, b) => (a.id === "beyond") - (b.id === "beyond"));
    $("stage-list").innerHTML = frames.map((f) =>
      `<section class="sl-frame" style="${hue(f.id)}"><h3>${esc(f.label)}<span>${f.known} of ${f.params.length} known</span></h3>` +
      f.blocks.map((bid) => {
        const b = D.blocks[bid];
        return `<button type="button" class="card conf-${b.conf}" data-block="${bid}">` +
          `<span class="c-name">${esc(b.name)}<span>${b.disputed ? DISPUTE_HTML : ""}</span></span>` +
          b.params.map((pid) => {
            const p = D.params[pid];
            return `<span class="c-row conf-${p.conf}" data-param="${pid}"><span>${esc(p.label)}</span>` +
              `<span class="v">${esc(p.short)}</span></span>`;
          }).join("") + `</button>`;
      }).join("") + `</section>`).join("");
  }

  function renderSourceFilter() {
    const byAuthor = {};
    for (const [sid, s] of Object.entries(D.sources)) if (s.claims) (byAuthor[s.author] = byAuthor[s.author] || []).push(sid);
    const total = (sids) => sids.reduce((n, sid) => n + D.sources[sid].claims, 0);
    const opt = (sid) => {
      const s = D.sources[sid];
      return `<option value="s:${esc(sid)}">${esc(s.cite)} · ${esc(clip(s.title, 44))} (${s.claims})</option>`;
    };
    const out = ['<option value="">All sources</option>'];
    for (const [author, sids] of Object.entries(byAuthor).sort((a, b) => total(b[1]) - total(a[1]))) {
      sids.sort((a, b) => D.sources[b].claims - D.sources[a].claims);
      if (sids.length === 1) { out.push(opt(sids[0])); continue; }
      out.push(`<optgroup label="${esc(author)}"><option value="a:${esc(author)}">${esc(author)}, all (${total(sids)})</option>` +
        sids.map(opt).join("") + `</optgroup>`);
    }
    $("source-filter").innerHTML = out.join("");
  }

/*STRUCTURES*/

  svg.addEventListener("click", (e) => {
    if (e.target.closest("[data-nav=back], [data-nav=core]")) return closeStructure();
    const zoom = e.target.closest(".zoom");
    if (zoom) return openStructure(zoom.dataset.l3, zoom.dataset.block);
    const region = e.target.closest(".region");
    if (region) return openRegion(region.dataset.frame);
    if (state.view === "L3") return structureClick(e.target);
    const box = e.target.closest(".box[data-block]");
    if (!box) return;
    const row = e.target.closest(".row");
    const pid = row ? row.dataset.param : null;
    select(box.dataset.block, pid && state.param === pid ? null : pid);
  });
  function structureClick(t) {
    const sp = t.closest(".sp[data-param]");
    if (sp) {
      const pid = sp.dataset.param;
      return select(D.params[pid].block, state.param === pid ? null : pid, { stay: true, scroll: false });
    }
    const rules = t.closest(".rules[data-mech]");
    if (rules) {
      const mid = rules.dataset.mech;
      const m = D.mechanisms[mid];
      const owner = [m.block, ...m.params.map((pid) => D.params[pid].block)].filter(Boolean);
      if (!owner.includes(state.block)) { state.block = owner[0]; state.param = null; }
      state.mech = state.mech === mid ? null : mid;
      refresh();
    }
  }

  svg.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    if (state.view === "L3") {
      if (e.target.closest("[data-nav=back], [data-nav=core]")) { e.preventDefault(); return closeStructure(); }
      if (e.target.closest(".sp, .rules")) { e.preventDefault(); return structureClick(e.target); }
      return;
    }
    const region = e.target.closest(".region");
    const box = e.target.closest(".box[data-block]");
    if (!region && !box) return;
    e.preventDefault();
    if (region) openRegion(region.dataset.frame);
    else select(box.dataset.block, null, { scroll: false });
  });
  dossier.addEventListener("click", (e) => {
    if (e.target.closest("#d-close")) {
      if (state.view !== "L3") return select(null);
      Object.assign(state, { view: "L2", block: null, param: null, mech: null });
      renderMap();
      return setHash();
    }
    const open = e.target.closest(".open-l3");
    if (open) return open.dataset.nav === "back" ? closeStructure() : openStructure(open.dataset.l3, state.block);
    const row = e.target.closest(".p-row");
    if (row) return select(state.block, state.param === row.dataset.param ? null : row.dataset.param, { scroll: false });
    const mech = e.target.closest(".mech");
    if (mech) { state.mech = state.mech === mech.dataset.mech ? null : mech.dataset.mech; return refresh(); }
    const jump = e.target.closest("[data-block]");
    if (jump) select(jump.dataset.block);
  });
  $("stage-list").addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (card) select(card.dataset.block);
  });
  document.querySelectorAll(".seg button").forEach((btn) => btn.addEventListener("click", () => {
    if (state.view === btn.dataset.view && btn.dataset.view !== "L3") return;
    if (btn.dataset.view === "L0") return openStructure("chip");
    if (btn.dataset.view === "L3") return structureHere() && openStructure(structureHere());
    state.view = btn.dataset.view;
    renderMap();
    setHash();
  }));
  document.querySelectorAll(".chip[data-conf]").forEach((btn) => btn.addEventListener("click", () => {
    const c = btn.dataset.conf;
    if (state.show.has(c)) state.show.delete(c); else state.show.add(c);
    refresh();
  }));
  document.querySelectorAll(".chip[data-deriv]").forEach((btn) => btn.addEventListener("click", () => {
    const d = btn.dataset.deriv;
    if (state.derivs.has(d)) state.derivs.delete(d); else state.derivs.add(d);
    refresh();
  }));
  $("source-filter").addEventListener("change", (e) => { state.source = e.target.value; refresh(); });
  $("clear-filters").addEventListener("click", () => {
    state.show = new Set(CONFS);
    state.derivs = new Set(DERIVS);
    state.source = "";
    refresh();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (state.view === "L3") closeStructure();
    else if (state.block) select(null);
  });
  for (const t of [window, wrap, dossier]) t.addEventListener("scroll", queueStrings, { passive: true });
  window.addEventListener("resize", queueStrings);

  renderMasthead();
  renderQuestions();
  renderSourceFilter();
  renderList();
  renderMap();
  const [fromHash, sub] = decodeURIComponent(location.hash.slice(1)).split("/");
  if (D.blocks[fromHash] && D.views.L2.boxes[fromHash]) {
    if (sub === "structure" && D.blocks[fromHash].l3 && wide.matches) { state.block = fromHash; openStructure(D.blocks[fromHash].l3); }
    else select(fromHash, null);
  } else if (wide.matches) select("retire", "retire.groups");
})();
