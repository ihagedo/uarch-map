// atlas.js
// Isaac Hagedorn, 2026-11-03
// One atlas map: hot spots on the figures open the world map, chips light them, steps walk a figure.
(function () {
  "use strict";
  const D = JSON.parse(document.getElementById("atlas-data").textContent);
  const WORLD = "../../";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function light(fig, test) {
    fig.querySelectorAll(".hot").forEach((r) => r.classList.toggle("lit", !!test(r.dataset)));
    fig.querySelectorAll("[data-src]").forEach((w) => {
      const d = w.dataset;
      w.classList.toggle("lit", !!(test({ bid: d.src }) || test({ bid: d.dst })));
    });
  }

  function go(ds, here) {
    if (ds.fig) {
      const local = document.getElementById(ds.fig) || document.getElementById(`sheet-${ds.fig.replace(/^block-/, "")}`);
      if (local) return local.scrollIntoView({ behavior: "smooth", block: "start" });
      const map = D.where[ds.fig];
      if (map) location.href = `../${map}/#${ds.fig.replace(/^block-/, "sheet-")}`;
      return;
    }
    const bid = ds.param ? ds.param.split(".")[0] : ds.mech ? D.mechBlock[ds.mech] : ds.bid;
    if (bid && D.blocks[bid]) location.href = `${WORLD}#${bid}`;
    else if (ds.mech && here) light(here, (d) => d.mech === ds.mech);
  }

  function showStep(fig, step) {
    const steps = D.figures[fig.dataset.fig].walk || [];
    const st = steps.find((s) => s.n === step);
    fig.querySelectorAll(".step").forEach((b) => b.setAttribute("aria-pressed", String(!!st && +b.dataset.step === step)));
    const say = fig.querySelector(".say");
    say.hidden = !st;
    if (!st) return light(fig, () => false);
    light(fig, (d) => st.targets.includes(d.bid));
    say.innerHTML = `<p>${esc(st.say)}</p>` + (st.ask ? `<p class="ask">${esc(st.ask)}</p>` : "") +
      (st.rests_on ? `<p class="rests">rests on ${esc(st.rests_on)}</p>` : "");
    const first = fig.querySelector(`.hot[data-bid="${CSS.escape(st.targets[0])}"]`);
    if (first) first.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }

  document.querySelectorAll(".figure, .sheet").forEach((fig) => {
    fig.addEventListener("click", (e) => {
      const hot = e.target.closest(".hot");
      if (hot) return go(hot.dataset, fig);
      const step = e.target.closest(".step");
      if (step) {
        const n = +step.dataset.step;
        return showStep(fig, step.getAttribute("aria-pressed") === "true" ? null : n);
      }
      const full = e.target.closest(".full-toggle");
      if (full) {
        const on = full.getAttribute("aria-pressed") !== "true";
        full.setAttribute("aria-pressed", String(on));
        fig.querySelector(".fig-scroll").classList.toggle("full", on);
      }
    });
    fig.addEventListener("mouseover", (e) => {
      const chip = e.target.closest(".tag");
      if (chip) light(fig, (d) => (chip.dataset.bid && d.bid === chip.dataset.bid) || (chip.dataset.mech && d.mech === chip.dataset.mech));
    });
    fig.addEventListener("mouseout", (e) => {
      if (e.target.closest(".tag") && !fig.querySelector('.step[aria-pressed="true"]')) light(fig, () => false);
    });
  });

  const target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (target) target.scrollIntoView({ block: "start" });
})();
