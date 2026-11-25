/*
  Kit builder: choose a body and lenses, see total weight, hiking weight
  (body + the lenses marked for the hike), focal ranges in 35mm-equivalent
  terms, checklist flags, and a budget total from prices the learner types in.

  Usage:
    <link rel="stylesheet" href="../assets/kit-builder.css">
    <div class="kit-builder" data-kit="kit-data" data-currency="€"></div>
    <script type="application/json" id="kit-data">{ "bodies": [...], "lenses": [...], "extras": [...] }</script>
    <script src="../assets/kit-builder.js" defer></script>

  body:  { id, name, sensor: "APS-C"|"FF", crop, weight (g, with battery), ibis, slots, notes, src }
  lens:  { id, name, mount: "RF"|"RF-S"|"EF-S", minF, maxF, aperture, weight (g), owned, notes, src }
  extra: { id, name, weight (g or null), needs: "EF-S" }   (added automatically when needed)

  Prices are typed by the learner (no figures are invented here) and kept in
  this browser's localStorage when available.
*/
(function () {
  "use strict";

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function store(key, val) {
    try {
      if (val === undefined) return JSON.parse(localStorage.getItem(key) || "null");
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { return null; }
  }
  function fmtKg(g) { return (g / 1000).toFixed(2).replace(/\.?0+$/, "") + " kg"; }
  function equiv(l, crop) {
    var a = Math.round(l.minF * crop), b = Math.round(l.maxF * crop);
    return a === b ? a + "mm" : a + "–" + b + "mm";
  }

  function build(root) {
    var data = JSON.parse(document.getElementById(root.getAttribute("data-kit")).textContent);
    var cur = root.getAttribute("data-currency") || "";
    var key = "kit-builder:" + location.pathname + ":" + root.getAttribute("data-kit");
    var saved = store(key) || {};
    var state = {
      body: saved.body || data.bodies[0].id,
      lenses: saved.lenses || {},     // id -> true
      hike: saved.hike || {},         // id -> true
      prices: saved.prices || {},     // id -> number
      budget: saved.budget != null ? saved.budget : null  // typed by the learner, never stored in the page
    };
    function save() { store(key, state); }

    root.innerHTML = "";
    var budgetRow = el("p", "kb-budget");
    var budgetLabel = el("label", null, "Your budget ");
    budgetLabel.setAttribute("for", key + "-budget");
    var budgetIn = el("input", "kb-price");
    budgetIn.type = "number"; budgetIn.min = "0"; budgetIn.step = "1"; budgetIn.inputMode = "numeric";
    budgetIn.id = key + "-budget"; budgetIn.placeholder = cur + " total";
    if (state.budget != null) budgetIn.value = state.budget;
    budgetIn.addEventListener("input", function () {
      var v = parseFloat(budgetIn.value);
      state.budget = isNaN(v) ? null : v; save(); render();
    });
    budgetRow.appendChild(budgetLabel); budgetRow.appendChild(budgetIn);
    budgetRow.appendChild(el("span", "kb-hint", " saved in this browser only"));
    root.appendChild(budgetRow);
    var bodyBox = el("fieldset", "kb-group"); bodyBox.appendChild(el("legend", null, "1 · Body"));
    var lensBox = el("fieldset", "kb-group"); lensBox.appendChild(el("legend", null, "2 · Lenses <span class=\"kb-hint\">tick to include, mark up to two for the hike</span>"));
    var out = el("section", "kb-summary"); out.setAttribute("aria-live", "polite");
    root.appendChild(bodyBox); root.appendChild(lensBox); root.appendChild(out);

    function priceInput(id, label) {
      var inp = el("input", "kb-price");
      inp.type = "number"; inp.min = "0"; inp.step = "1"; inp.inputMode = "numeric";
      inp.id = "kb-price-" + id; inp.placeholder = cur + " price";
      inp.setAttribute("aria-label", "Price for " + label);
      if (state.prices[id] != null) inp.value = state.prices[id];
      inp.addEventListener("input", function () {
        var v = parseFloat(inp.value);
        if (isNaN(v)) delete state.prices[id]; else state.prices[id] = v;
        save(); render();
      });
      return inp;
    }

    data.bodies.forEach(function (b) {
      var row = el("div", "kb-row");
      var lab = el("label", "kb-choice");
      var r = el("input"); r.type = "radio"; r.name = key + "-body"; r.id = "kb-body-" + b.id;
      r.checked = state.body === b.id;
      r.addEventListener("change", function () { state.body = b.id; save(); render(); });
      lab.appendChild(r);
      lab.appendChild(el("span", "kb-name", b.name + ' <span class="kb-tag">' + (b.sensor === "FF" ? "full frame" : "APS-C") + "</span>"));
      row.appendChild(lab);
      row.appendChild(priceInput(b.id, b.name));
      row.appendChild(el("p", "kb-meta", fmtKg(b.weight) + " with battery · IBIS " + b.ibis + " · " + b.slots +
        (b.notes ? " · " + b.notes : "") + (b.src ? ' · <a href="' + b.src + '">source</a>' : "")));
      bodyBox.appendChild(row);
    });

    var lensRows = {};
    data.lenses.forEach(function (l) {
      var row = el("div", "kb-row");
      var lab = el("label", "kb-choice");
      var c = el("input"); c.type = "checkbox"; c.id = "kb-lens-" + l.id;
      c.checked = !!state.lenses[l.id];
      c.addEventListener("change", function () {
        if (c.checked) state.lenses[l.id] = true; else { delete state.lenses[l.id]; delete state.hike[l.id]; }
        save(); render();
      });
      lab.appendChild(c);
      lab.appendChild(el("span", "kb-name", l.name + (l.owned ? ' <span class="kb-tag">you own this</span>' : "")));
      row.appendChild(lab);
      var hikeLab = el("label", "kb-hike");
      var h = el("input"); h.type = "checkbox"; h.id = "kb-hike-" + l.id;
      h.checked = !!state.hike[l.id];
      h.addEventListener("change", function () {
        if (h.checked) { state.hike[l.id] = true; state.lenses[l.id] = true; } else delete state.hike[l.id];
        save(); render();
      });
      hikeLab.appendChild(h); hikeLab.appendChild(document.createTextNode(" hike"));
      row.appendChild(hikeLab);
      if (!l.owned) row.appendChild(priceInput(l.id, l.name));
      var meta = el("p", "kb-meta");
      row.appendChild(meta);
      lensBox.appendChild(row);
      lensRows[l.id] = { row: row, check: c, hike: h, meta: meta, lens: l };
    });

    function render() {
      var body = data.bodies.filter(function (b) { return b.id === state.body; })[0];
      var chosen = data.lenses.filter(function (l) { return state.lenses[l.id]; });
      var warnings = [];

      // Per-lens metadata depends on the body (crop, compatibility).
      Object.keys(lensRows).forEach(function (id) {
        var r = lensRows[id], l = r.lens, txt;
        var effCrop = body.crop;
        var note = "";
        if (l.mount === "EF-S" || l.mount === "RF-S") {
          if (body.sensor === "FF") { effCrop = 1.6; note = " · <strong>crops the full-frame sensor to APS-C</strong>"; }
        }
        if (l.mount === "EF-S") note += " · needs EF-EOS R adapter";
        txt = l.minF + (l.minF === l.maxF ? "" : "–" + l.maxF) + "mm " + l.aperture + " · ≈ " + equiv(l, effCrop) +
          " equivalent · " + l.weight + " g" + note + (l.notes ? " · " + l.notes : "") + (l.src ? ' · <a href="' + l.src + '">source</a>' : "");
        r.meta.innerHTML = txt;
        r.check.checked = !!state.lenses[id];
        r.hike.checked = !!state.hike[id];
      });

      var hikeIds = Object.keys(state.hike);
      if (hikeIds.length > 2) warnings.push("You marked " + hikeIds.length + " lenses for the hike. Your limit is two.");

      var needsAdapter = chosen.some(function (l) { return l.mount === "EF-S"; });
      var adapter = (data.extras || []).filter(function (x) { return x.needs === "EF-S"; })[0];
      var weight = body.weight, unknownWeight = false;
      chosen.forEach(function (l) { weight += l.weight; });
      var hikeW = body.weight;
      data.lenses.forEach(function (l) { if (state.hike[l.id]) hikeW += l.weight; });
      var hikeNeedsAdapter = data.lenses.some(function (l) { return state.hike[l.id] && l.mount === "EF-S"; });
      if (needsAdapter && adapter) {
        if (adapter.weight == null) unknownWeight = true; else { weight += adapter.weight; if (hikeNeedsAdapter) hikeW += adapter.weight; }
      }
      chosen.forEach(function (l) {
        if ((l.mount === "EF-S" || l.mount === "RF-S") && body.sensor === "FF")
          warnings.push(l.name + " only uses the APS-C part of the " + body.name + "'s sensor.");
      });

      // Coverage across the kit, in equivalent mm.
      var lo = Infinity, hi = 0, fastestWide = null;
      chosen.forEach(function (l) {
        var c = ((l.mount === "EF-S" || l.mount === "RF-S") && body.sensor === "FF") ? 1.6 : body.crop;
        lo = Math.min(lo, l.minF * c); hi = Math.max(hi, l.maxF * c);
        if (l.minF * c <= 30) {
          var f = parseFloat(String(l.aperture).replace(/^f\//, ""));
          if (!fastestWide || f < fastestWide.f) fastestWide = { f: f, name: l.name, mm: Math.round(l.minF * c) };
        }
      });

      // Budget.
      var total = 0, missing = [];
      function addPrice(id, name) { if (state.prices[id] != null) total += state.prices[id]; else missing.push(name); }
      addPrice(body.id, body.name);
      chosen.forEach(function (l) { if (!l.owned) addPrice(l.id, l.name); });
      if (needsAdapter && adapter) addPrice(adapter.id, adapter.name);

      var html = "<h4>Your kit</h4><dl>";
      html += "<dt>Coverage</dt><dd>" + (chosen.length ? "≈ " + Math.round(lo) + "–" + Math.round(hi) + "mm equivalent" : "No lenses yet") + "</dd>";
      html += "<dt>Stars</dt><dd>" + (fastestWide ? "Widest fast option: " + fastestWide.name + " at ≈ " + fastestWide.mm + "mm, " + "f/" + fastestWide.f +
        (body.sensor === "APS-C" ? " (APS-C: about 1⅓ stops noisier than full frame at the same settings)" : "") : "No lens at 30mm equivalent or wider") + "</dd>";
      html += "<dt>Total weight</dt><dd>" + fmtKg(weight) + (unknownWeight ? " + adapter (weight not sourced)" : "") + "</dd>";
      html += "<dt>Hiking weight</dt><dd>" + (hikeIds.length ? fmtKg(hikeW) + " (body + " + hikeIds.length + " lens" + (hikeIds.length > 1 ? "es" : "") + (hikeNeedsAdapter && adapter && adapter.weight == null ? " + adapter" : "") + ")" : "Mark the lenses you'd carry") + "</dd>";
      var budget = state.budget;
      html += "<dt>Budget</dt><dd>" + cur + Math.round(total).toLocaleString() +
        (budget != null ? " of " + cur + budget.toLocaleString() : " (enter your budget above)") +
        (budget != null && total > budget ? ' <span class="kb-bad">over by ' + cur + Math.round(total - budget).toLocaleString() + "</span>" : "") +
        (budget != null && total <= budget && !missing.length ? ' <span class="kb-hint">' + cur + Math.round(budget - total).toLocaleString() + " left</span>" : "") +
        (missing.length ? '<br><span class="kb-hint">No price yet for: ' + missing.join(", ") + "</span>" : "") + "</dd>";
      html += "</dl>";
      if (needsAdapter && adapter) {
        html += '<p class="kb-hint">Adapter: ' + adapter.name + ' <span id="kb-adapter-slot"></span></p>';
      }
      if (warnings.length) html += '<ul class="kb-warn"><li>' + warnings.join("</li><li>") + "</li></ul>";
      out.innerHTML = html;
      if (needsAdapter && adapter) {
        var slot = out.querySelector("#kb-adapter-slot");
        var inp = priceInput(adapter.id, adapter.name);
        slot.appendChild(inp);
      }
    }

    render();
  }

  document.addEventListener("DOMContentLoaded", function () {
    Array.prototype.forEach.call(document.querySelectorAll(".kit-builder[data-kit]"), build);
  });
})();
