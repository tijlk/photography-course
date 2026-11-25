/*
  Viewfinder simulator: optical (DSLR) finder vs electronic (mirrorless)
  viewfinder with exposure simulation and a live histogram.

  Usage:
    <link rel="stylesheet" href="../assets/evf-sim.css">
    <div class="evf-sim" data-scene="snow"></div>   <!-- task: exposure compensation -->
    <div class="evf-sim" data-scene="cabin"></div>  <!-- task: white balance -->
    <script src="../assets/evf-sim.js" defer></script>

  This is a deliberately simplified model for building intuition, not a
  colour-accurate renderer: the meter scales the scene so its average lands
  on middle grey (18%), exposure compensation multiplies by 2^EV, and white
  balance divides out the colour of a black-body light at the set kelvin.
*/
(function () {
  "use strict";

  var W = 320, H = 200;

  // Deterministic pseudo-random numbers so every viewer sees the same scene.
  function rng(seed) {
    return function () {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  // Approximate RGB of a black-body light source at kelvin K (0..1 per channel).
  // Common approximation (after Tanner Helland); illustrative only.
  function kelvinRGB(K) {
    var t = K / 100, r, g, b;
    r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
    g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661
                : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
    b = t >= 66 ? 255 : (t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307);
    function c(v) { return Math.max(1, Math.min(255, v)) / 255; }
    return [c(r), c(g), c(b)];
  }

  // ---- Scenes: per-pixel reflectance (linear 0..1 per channel) ----------
  function makeScene(name) {
    var R = new Float32Array(W * H), G = new Float32Array(W * H), B = new Float32Array(W * H);
    var mask = new Uint8Array(W * H); // 1 = the region the task is judged on
    var rand = rng(name === "snow" ? 7 : 11);
    function set(i, r, g, b) { R[i] = r; G[i] = g; B[i] = b; }

    if (name === "snow") {
      var ridge = [], snowline = [];
      for (var x = 0; x < W; x++) {
        var h = 70 + 38 * Math.sin(x / 41) + 18 * Math.sin(x / 13 + 1.7) + 6 * Math.sin(x / 5.3);
        ridge.push(h);
        snowline.push(h + 22 + 10 * Math.sin(x / 9 + 0.5));
      }
      for (var y = 0; y < H; y++) {
        for (x = 0; x < W; x++) {
          var i = y * W + x, n = rand();
          if (y < ridge[x]) {                      // sky
            var s = 0.32 + 0.18 * (y / 110);
            set(i, s * 0.55, s * 0.75, s * 1.0);
          } else if (y < snowline[x]) {            // snow caps
            var v = 0.8 + 0.12 * n;
            set(i, v, v, v * 1.02); mask[i] = 1;
          } else if (y < 150 - 6 * Math.sin(x / 17)) { // rock and forest
            var dark = (Math.sin(x / 3.1) + Math.sin(y / 2.3)) > 0.6;
            var r0 = dark ? 0.04 : 0.13 + 0.05 * n;
            set(i, r0, r0 * (dark ? 1.3 : 1.0), r0 * 0.95);
          } else {                                 // snowfield foreground
            var f = 0.82 + 0.1 * n - 0.04 * Math.sin(x / 23 + y / 7);
            set(i, f, f, f * 1.02); mask[i] = 1;
          }
        }
      }
      return { R: R, G: G, B: B, mask: mask, lightK: 5500, wbK: 5500, ec: 0 };
    }

    // cabin: wood wall, white mug, and an 18% grey card (the judged region)
    for (var yy = 0; yy < H; yy++) {
      for (var xx = 0; xx < W; xx++) {
        var j = yy * W + xx, m = rand();
        var plank = Math.floor(yy / 25) % 2 === 0 ? 1 : 0.9;
        var grain = 0.9 + 0.1 * Math.sin(xx / 6 + yy * 0.7) + 0.05 * m;
        set(j, 0.38 * plank * grain, 0.24 * plank * grain, 0.13 * plank * grain);
        if (yy > 150) { var t = 0.2 + 0.03 * m; set(j, t, t * 0.8, t * 0.6); } // table
        var dx = xx - 95, dy = yy - 120;
        if (Math.abs(dx) < 28 && dy > -30 && dy < 40) { var w = 0.82 + 0.05 * m; set(j, w, w, w); } // mug
        if (xx > 170 && xx < 270 && yy > 55 && yy < 145) { set(j, 0.18, 0.18, 0.18); mask[j] = 1; }  // grey card
      }
    }
    return { R: R, G: G, B: B, mask: mask, lightK: 2400, wbK: 5500, ec: 0 };
  }

  function gammaByte(v) { return v <= 0 ? 0 : v >= 1 ? 255 : Math.round(255 * Math.pow(v, 1 / 2.2)); }

  function build(root) {
    var name = root.getAttribute("data-scene") || "snow";
    var sc = makeScene(name);

    // Meter: scale so the scene's average luminance lands on middle grey.
    var sum = 0;
    for (var i = 0; i < W * H; i++) sum += 0.2126 * sc.R[i] + 0.7152 * sc.G[i] + 0.0722 * sc.B[i];
    var meterGain = 0.18 / (sum / (W * H));

    root.innerHTML =
      '<div class="evf-toolbar" role="group" aria-label="Viewfinder type">' +
        '<button type="button" class="evf-mode" data-mode="ovf">Optical finder (30D)</button>' +
        '<button type="button" class="evf-mode is-on" data-mode="evf">Electronic viewfinder</button>' +
      "</div>" +
      '<div class="evf-frame"><canvas width="' + W + '" height="' + H + '"></canvas><span class="evf-badge"></span></div>' +
      '<canvas class="evf-hist" width="256" height="60" aria-label="Histogram"></canvas>' +
      '<div class="evf-controls"></div>' +
      '<p class="evf-status" aria-live="polite"></p>';

    var canvas = root.querySelector(".evf-frame canvas");
    var ctx = canvas.getContext("2d");
    var hist = root.querySelector(".evf-hist");
    var hctx = hist.getContext("2d");
    var badge = root.querySelector(".evf-badge");
    var status = root.querySelector(".evf-status");
    var controls = root.querySelector(".evf-controls");
    var img = ctx.createImageData(W, H);
    var mode = "evf";
    var solved = false;

    var id = "evf-" + name;
    if (name === "snow") {
      controls.innerHTML =
        '<label for="' + id + '-ec">Exposure compensation <output id="' + id + '-ec-out">0 EV</output></label>' +
        '<input id="' + id + '-ec" type="range" min="-2" max="3" step="0.333333" value="0">';
    } else {
      controls.innerHTML =
        '<label for="' + id + '-wb">White balance setting <output id="' + id + '-wb-out">5500 K</output></label>' +
        '<input id="' + id + '-wb" type="range" min="2000" max="10000" step="100" value="5500">';
    }
    var slider = controls.querySelector("input");
    var out = controls.querySelector("output");

    function fmtEV(v) {
      var thirds = Math.round(v * 3);
      if (thirds === 0) return "0 EV";
      var sign = thirds > 0 ? "+" : "−", a = Math.abs(thirds), whole = Math.floor(a / 3), rem = a % 3;
      return sign + (whole ? whole : "") + (rem ? (whole ? " " : "") + rem + "/3" : "") + " EV";
    }

    function render() {
      var light = kelvinRGB(sc.lightK), wb = kelvinRGB(sc.wbK);
      // Normalise white balance on green so changing it doesn't change brightness.
      var cr = light[0] / wb[0] * (wb[1] / light[1]);
      var cb = light[2] / wb[2] * (wb[1] / light[1]);
      var gain = meterGain * Math.pow(2, sc.ec);
      var bins = new Uint32Array(256), clipped = 0, maskN = 0, maskSum = 0, mr = 0, mg = 0, mb = 0;
      var d = img.data;

      for (var k = 0; k < W * H; k++) {
        var r, g, b;
        if (mode === "ovf") {
          // The eye adapts: the optical finder shows the scene, not the exposure.
          var ovfLight = name === "cabin" ? [1, 0.93, 0.8] : [1, 1, 1];
          r = sc.R[k] * 1.05 * ovfLight[0]; g = sc.G[k] * 1.05 * ovfLight[1]; b = sc.B[k] * 1.05 * ovfLight[2];
        } else {
          r = sc.R[k] * gain * cr; g = sc.G[k] * gain; b = sc.B[k] * gain * cb;
        }
        var R8 = gammaByte(r), G8 = gammaByte(g), B8 = gammaByte(b);
        d[k * 4] = R8; d[k * 4 + 1] = G8; d[k * 4 + 2] = B8; d[k * 4 + 3] = 255;
        var Y = Math.round(0.2126 * R8 + 0.7152 * G8 + 0.0722 * B8);
        bins[Y]++;
        if (R8 === 255 || G8 === 255 || B8 === 255) clipped++;
        if (sc.mask[k]) { maskN++; maskSum += Y; mr += R8; mg += G8; mb += B8; }
      }
      ctx.putImageData(img, 0, 0);
      if (name === "cabin") {
        ctx.font = "11px sans-serif";
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillText("grey card", 192, 139);
        ctx.fillText("mug", 84, 108);
      }
      drawHist(bins);

      badge.textContent = mode === "evf" ? "EVF · exposure simulation on" : "Optical · what your eye sees";
      if (mode === "ovf") {
        status.className = "evf-status";
        status.textContent = "Through a mirror you see the scene itself. The settings don't change this view, so you only find out how the photo looks after you take it. Switch back to the electronic viewfinder.";
        return;
      }

      if (name === "snow") {
        var snowLevel = maskSum / maskN, clipPct = 100 * clipped / (W * H);
        if (clipPct > 3) {
          setStatus("bad", "Too far: " + clipPct.toFixed(0) + "% of the frame is clipped to pure white (see the spike at the right edge of the histogram). Snow texture is gone. Back off.");
        } else if (snowLevel < 215) {
          setStatus("", "The snow looks grey: the meter has pulled it toward middle grey. Which way do you need to go?");
        } else {
          setStatus("good", "Done: bright, white snow with texture intact, and almost nothing clipped. You fixed the meter's mistake before taking the shot, which a 30D's optical finder couldn't show you.");
          solved = true;
        }
      } else {
        var ratio = Math.max(mr, mg, mb) / Math.max(1, Math.min(mr, mg, mb));
        var warm = mr > mb;
        if (ratio < 1.1) {
          setStatus("good", "Done: the grey card is neutral. The light here is about 2,400 K, so the setting needs to match the light.");
          solved = true;
        } else {
          setStatus("", "The grey card has a " + (warm ? "warm, orange" : "cool, blue") + " cast. Move the setting toward the colour temperature of the light in the room.");
        }
      }
    }

    function setStatus(kind, text) { status.className = "evf-status " + kind; status.textContent = text; }

    function drawHist(bins) {
      var max = 0;
      for (var b = 1; b < 255; b++) max = Math.max(max, bins[b]);
      max = Math.max(max, 1);
      var css = getComputedStyle(root);
      hctx.clearRect(0, 0, 256, 60);
      hctx.fillStyle = css.getPropertyValue("--card") || "#eee";
      hctx.fillRect(0, 0, 256, 60);
      hctx.fillStyle = css.getPropertyValue("--muted") || "#888";
      for (var x = 0; x < 256; x++) {
        var h = Math.min(60, 60 * bins[x] / max);
        hctx.fillRect(x, 60 - h, 1, h);
      }
      if (bins[255] > (W * H) * 0.005) {          // flag clipping at the right edge
        hctx.fillStyle = css.getPropertyValue("--bad") || "#c33";
        hctx.fillRect(252, 0, 4, 60);
      }
    }

    slider.addEventListener("input", function () {
      var v = parseFloat(slider.value);
      if (name === "snow") { sc.ec = v; out.textContent = fmtEV(v); }
      else { sc.wbK = v; out.textContent = v + " K"; }
      render();
    });

    Array.prototype.forEach.call(root.querySelectorAll(".evf-mode"), function (b) {
      b.addEventListener("click", function () {
        mode = b.getAttribute("data-mode");
        Array.prototype.forEach.call(root.querySelectorAll(".evf-mode"), function (o) {
          o.classList.toggle("is-on", o === b);
          o.setAttribute("aria-pressed", o === b ? "true" : "false");
        });
        render();
      });
    });

    render();
  }

  document.addEventListener("DOMContentLoaded", function () {
    Array.prototype.forEach.call(document.querySelectorAll(".evf-sim"), build);
  });
})();
