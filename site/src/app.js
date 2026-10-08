// app.js
// Isaac Hagedorn, 2026-10-04
// Draws the map, the dossier and the phone stage list from the KB embedded in the page.
(function () {
  "use strict";
  const D = JSON.parse(document.getElementById("map-data").textContent);
  const M = D.views.metrics;
  const NS = "http://www.w3.org/2000/svg";
  const CONFS = ["high", "medium", "low", "none"];
  const DERIVS = ["measured", "documented", "inferred", "reported"];
  const CONF_WORD = { high: "High", medium: "Medium", low: "Low", none: "Hole" };
  const DERIV_WORD = { measured: "Measured", documented: "Documented", inferred: "Inferred", reported: "Reported" };
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
      inferred: '<rect class="pin-inferred" x="3" y="3" width="6" height="6" transform="rotate(45 6 6)"/>',
    }[deriv];
    return body ? `<svg class="p-pin" viewBox="0 0 12 12" aria-hidden="true">${body}</svg>` : "<span></span>";
  }
  const DISPUTE_HTML = '<svg class="p-pin" viewBox="0 0 12 12" aria-hidden="true">' +
    '<path class="pin-dispute" d="M6 1.4 L10.6 10 L1.4 10 Z"/></svg>';

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
    } else {
      const V = D.views[state.view];
      svg.setAttribute("viewBox", `0 0 ${V.width} ${V.height}`);
      svg.style.maxWidth = `${V.width}px`;
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
    b.params.forEach((pid, i) => {
      const p = D.params[pid];
      const ry = bx.y + M.boxHead - 2 + i * M.rowH;
      const disputed = openDispute(p);
      const r = el("g", { class: `row conf-${p.conf}`, "data-param": pid }, g);
      el("rect", { x: bx.x + 3, y: ry, width: bx.w - 6, height: M.rowH, rx: 3, class: "row-bg anchor" }, r);
      if (p.known) pin(r, p.status, bx.x + 12, ry + M.rowH / 2);
      // label gets the width the value leaves (at 10.5px: ~5.9px/char labels, ~6.4px/char values)
      const room = bx.w - 31 - p.short.length * 6.4 - 8 - (disputed ? 13 : 0);
      el("text", { x: bx.x + 21, y: ry + 12.5, class: "label" }, r).textContent = clip(p.label, Math.max(5, Math.floor(room / 5.9)));
      el("text", { x: bx.x + bx.w - 10 - (disputed ? 13 : 0), y: ry + 12.5, "text-anchor": "end", class: "value" }, r)
        .textContent = p.short;
      if (disputed) disputePin(r, bx.x + bx.w - 13, ry + M.rowH / 2);
      el("title", {}, r).textContent = `${p.name}: ` +
        (p.known ? `${p.value}${p.unit ? " " + p.unit : ""}` : "no claim yet") + ` (${CONF_WORD[p.conf].toLowerCase()})`;
    });
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

  function route(a, b, frameTop, k) {
    const g = M.colGap / 2, off = (k % 4) * 4 - 6;
    const ya = a.y + 15, yb = b.y + 15;
    if (Math.abs(a.x - b.x) < 1) {
      const xg = a.x - g + off;
      return [[a.x, ya], [xg, ya], [xg, yb], [b.x, yb]];
    }
    const right = b.x > a.x;
    const x1 = right ? a.x + a.w : a.x, x2 = right ? b.x : b.x + b.w;
    const xg1 = right ? x1 + g : x1 - g, xg2 = right ? x2 - g : x2 + g;
    if (Math.abs(xg1 - xg2) < 1) {
      const xg = xg1 + off;
      return [[x1, ya], [xg, ya], [xg, yb], [x2, yb]];
    }
    const yc = Math.min(frameTop[a.frame], frameTop[b.frame]) + M.frameLabel + M.framePad - 6 - k * 3;
    return [[x1, ya], [xg1 + off, ya], [xg1 + off, yc], [xg2 - off, yc], [xg2 - off, yb], [x2, yb]];
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
    const frameTop = Object.fromEntries(V.frames.map((f) => [f.id, f.y]));
    const mine = D.links.filter((l) => (l.from === state.block || l.to === state.block) && B[l.from] && B[l.to]);
    mine.forEach((l, k) => {
      const pts = route(B[l.from], B[l.to], frameTop, k);
      el("path", { d: rounded(pts, 6), class: `link k-${l.kind}`, "marker-end": "url(#arrow)" }, linkLayer);
    });
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
    h += `<p class="d-summary"><span class="conf-tag conf-${b.conf}">${b.conf === "none" ? "Hole" : CONF_WORD[b.conf] + " confidence"}</span>` +
      `<span>${known} of ${params.length} known</span><span>${plural(claims.size, "claim")}</span></p>`;
    if (b.blackBox) h += `<p class="blackbox-note">Nothing published.</p>`;
    if (b.l3 && wide.matches) {
      h += state.view === "L3" && state.l3 === b.l3
        ? `<p class="d-l3"><button type="button" class="open-l3" data-nav="back">‹ Stage map</button></p>`
        : `<p class="d-l3"><button type="button" class="open-l3" data-l3="${b.l3}">${esc(D.views.L3[b.l3].label)} ›</button></p>`;
    }
    h += `<section class="d-section"><h3>Parameters</h3><ul class="p-list">` +
      params.map(([pid, p]) => paramHTML(pid, p)).join("") + `</ul></section>`;
    const mechs = Object.entries(D.mechanisms).filter(([, m]) => m.params.some((pid) => D.params[pid].block === bid));
    if (mechs.length) h += `<section class="d-section"><h3>Mechanisms</h3>${mechs.map(mechHTML).join("")}</section>`;
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
      `<span class="p-name">${esc(p.name)}</span><span class="p-value${p.value.length > 16 ? " long" : ""}">${esc(p.value)}${unit}</span>` +
      `<span class="p-meta"><span class="conf-tag conf-${p.conf}">${CONF_WORD[p.conf]}</span>` +
      `<span>${p.known ? DERIV_WORD[p.status] : "No claim yet"}</span><span>${plural(n, "claim")}</span>` +
      (openDispute(p) ? `<span class="flag">${DISPUTE_HTML}Disputed</span>` : "") + `</span></button>` +
      (open ? evidenceHTML(pid, p) : "") + `</li>`;
  }

  function evidenceHTML(pid, p) {
    let h = `<div class="evidence" id="ev-${pid}">`;
    for (const d of p.disputes) {
      const sides = d.claims.map((cid) => `${D.sources[D.claims[cid].source].cite} ${D.claims[cid].value}`).join(", ");
      h += `<p class="ev-flag">${DISPUTE_HTML}${d.resolution ? "Resolved" : "Disputed"}: ${esc(sides)}` +
        (d.resolution ? `. ${esc(d.resolution)}` : "") + `</p>`;
    }
    if (p.for.length) h += `<h4 class="ev-h">Supporting claims (${p.for.length})</h4>` + p.for.map(claimHTML).join("");
    if (p.against.length) h += `<h4 class="ev-h">Contradicting claims (${p.against.length})</h4>` + p.against.map(claimHTML).join("");
    if (!p.for.length && !p.against.length) h += `<p class="hole-note">Nothing published.</p>`;
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
    return h + `<p class="claim-src">${where.join(" · ")}</p></article>`;
  }

  function mechHTML([mid, m]) {
    const on = state.mech === mid;
    return `<div class="mech-wrap"><button type="button" class="mech" data-mech="${mid}" aria-pressed="${on}">` +
      `<span class="mech-h">${esc(m.name)}<span class="status-tag">${esc(m.status)}</span></span>` +
      `<span class="mech-desc">${esc(m.description)}</span></button>` +
      (on && m.claims.length ? `<div class="mech-claims"><h4 class="ev-h">Claims (${m.claims.length})</h4>` +
        m.claims.map(claimHTML).join("") + `</div>` : "") + `</div>`;
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
      const owner = D.mechanisms[mid].params.map((pid) => D.params[pid].block);
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
  renderSourceFilter();
  renderList();
  renderMap();
  const [fromHash, sub] = decodeURIComponent(location.hash.slice(1)).split("/");
  if (D.blocks[fromHash] && D.views.L2.boxes[fromHash]) {
    if (sub === "structure" && D.blocks[fromHash].l3 && wide.matches) { state.block = fromHash; openStructure(D.blocks[fromHash].l3); }
    else select(fromHash, null);
  } else if (wide.matches) select("retire", "retire.groups");
})();
