/*!
 * Meadow Hero v3.8 — Adaptive rendering and rebuilt character
 * A live 3D meadow hero background: seasons, weather, time of day, a camper van and a tree you can drag.
 * v3: a modelled camper van and a seated woman (built in Blender, loaded as compressed glTF), rolling hills with
 * distant trees, volumetric clouds, a sun and moon (real moon phase) that follow the light, Milky Way, headlight
 * beams, butterflies, dandelion clocks, click-to-gust wind, and an optional light/season that follows local time.
 * v3.1: clear skies with a white-gold sun and wide glow (default light is now "golden"), shorter grass that blends
 * into the countryside, fields with hedgerows and copses on the hills, shaded distant trees, lighter haze, and
 * fixes for black-dot artifacts on some GPUs and for time running backwards on slow frames.
 * v3.2: photographic colour grading that follows the light, season and weather; sky colours matched to real
 * photographs (deep blue noon, hazy golden hour with lens glare, navy night with a bright Milky Way and a planet);
 * crisper fair-weather clouds; eight butterfly species (peacock, swallowtail, monarch, blue morpho and more)
 * that dance closer to the viewer; sunlit pollen in the golden light; smoother leaf edges.
 * v3.3: photoreal fair-weather cumulus (rendered offline as a volumetric panorama with separate sun, low-sun/moon
 * and sky-light passes, relit live for every light, season and weather), no more shimmer in the sky, a wider view
 * of the sky, and dandelion clocks across the meadow whose seeds take off when you brush the grass or send a gust.
 * v3.4: natural cumulus shapes (billowing tops, flat hazy bases, soft wispy sides) in three depth layers, near,
 * middle and far, that drift slowly with the wind at their own speeds; clouds passing the low sun light up at the
 * edges and softly dim the meadow; cloud shadows on the grass move with them; one even grass field from front to
 * back; a tidier tree crown; setLight() also takes "noon" | "golden" | "dusk" | "night".
 * v3.5: linear HDR bloom before ACES output, restrained photographic grading, finer foliage,
 * natural meadow variation, improved contact lighting, aerial perspective and cloud scattering.
 * quality also accepts "ultra" (2x DPR cap, 4096 shadows, 64 cloud samples).
 * Requires three.js r128 loaded first as a global (THREE), from
 *   https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js
 * Safe to inline in a page: this file contains no closing script tag.
 *
 * Usage:
 *   MeadowHero.mount(document.getElementById("hero"), {
 *     season: "summer",      // "spring" | "summer" | "autumn" | "winter" | "local" (from today's date)
 *     weather: "clear",      // "clear" | "rain" | "snow"
 *     light: "golden",       // "noon" | "golden" | "dusk" | "night" (or 0..1), or "local" to follow the visitor's clock
 *     panel: true,           // show the Customize button and panel
 *     hints: true,           // show the small "move / click / touch / scroll" chips
 *     character: true,       // show the person sitting on the van roof
 *     scrollTrack: null,     // element whose scroll progress turns day into night (e.g. a tall wrapper around a sticky hero)
 *     quality: "auto",       // "auto" | "high" | "low"
 *     assetsPath: "meadow-assets/", // folder with van.glb, person.glb (+ -q.glbz fallbacks), sky-clouds*.jpg, oak-leaves.png, bark-*.jpg
 *     extras: true,          // load bloom post-processing from cdn.jsdelivr.net (three@0.128.0/examples/js)
 *     skyClouds: true,       // the baked cumulus sky (sky-clouds*.jpg, half size on phones); false = live raymarched clouds
 *     models: null           // null = the built-in van + character from assetsPath (van.glb, person.glb);
 *                            // false = procedural stand-ins only; or your own: { van: "my-van.glb" | { url, rotationY, length }, person: { url, height } }
 *                            // Host can't serve .glb files (some site builders)? Load meadow-assets/models.js before this file.
 *   });
 * Returns { setSeason, setWeather, setLight, reset, destroy }. setLight takes 0..1 or "noon" | "golden" | "dusk" | "night".
 */
(function (global) {
  "use strict";

  var CSS = [
    ".mh-root{position:relative;overflow:hidden;isolation:isolate;background:#8f9aa3;}",
    ".mh-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;z-index:-2;touch-action:pan-y;}",
    ".mh-fx{position:absolute;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(125% 100% at 55% 42%,rgba(0,0,0,0) 58%,rgba(0,0,0,.24) 100%);}",
    ".mh-fx::after{content:\"\";position:absolute;inset:0;opacity:.05;mix-blend-mode:overlay;background-image:url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\");}",
    ".mh-ui{font-family:'Instrument Sans',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#fff;-webkit-font-smoothing:antialiased;}",
    ".mh-ui button{font:inherit;color:inherit;cursor:pointer;}",
    ".mh-ui :focus-visible{outline:2px solid #fff;outline-offset:2px;}",
    ".mh-toggle{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 20px);transform:translateX(-50%);z-index:6;display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:rgba(16,17,19,.82);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);font-size:14px;font-weight:600;letter-spacing:.01em;box-shadow:0 10px 30px rgba(0,0,0,.25);transition:background .2s ease;}",
    ".mh-toggle:hover{background:rgba(16,17,19,.94);}",
    ".mh-toggle svg{width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;}",
    ".mh-panel{position:absolute;right:clamp(12px,2vw,24px);bottom:calc(env(safe-area-inset-bottom,0px) + 20px);z-index:6;width:236px;padding:10px;border-radius:20px;display:grid;gap:8px;background:rgba(40,42,45,.62);-webkit-backdrop-filter:blur(20px) saturate(1.2);backdrop-filter:blur(20px) saturate(1.2);border:1px solid rgba(255,255,255,.13);box-shadow:0 24px 60px rgba(0,0,0,.28);transform-origin:bottom right;transition:opacity .25s ease,transform .25s ease;}",
    ".mh-panel[hidden]{display:grid!important;opacity:0;transform:translateY(8px) scale(.98);pointer-events:none;visibility:hidden;}",
    ".mh-seg{display:grid;gap:2px;padding:4px;border-radius:14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);}",
    ".mh-seg.c4{grid-template-columns:repeat(4,minmax(0,1fr));}",
    ".mh-seg.c3{grid-template-columns:repeat(3,minmax(0,1fr));}",
    ".mh-seg button{display:grid;justify-items:center;gap:4px;padding:8px 2px 7px;border:0;border-radius:10px;background:transparent;color:rgba(255,255,255,.74);font-size:11px;line-height:1;transition:background .2s ease,color .2s ease;}",
    ".mh-seg button:hover{color:#fff;background:rgba(255,255,255,.06);}",
    ".mh-seg button[aria-pressed='true']{color:#fff;background:rgba(255,255,255,.16);box-shadow:inset 0 0 0 1px rgba(255,255,255,.2);}",
    ".mh-seg svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;}",
    ".mh-light{padding:10px 8px 4px;display:grid;gap:4px;}",
    ".mh-light-head{display:flex;justify-content:space-between;align-items:baseline;}",
    ".mh-light-head span{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.74);font-weight:600;}",
    ".mh-light-head b{font-family:'Instrument Serif',Georgia,'Times New Roman',serif;font-weight:400;font-size:19px;letter-spacing:.01em;}",
    ".mh-arc{position:relative;height:66px;touch-action:none;cursor:pointer;}",
    ".mh-arc svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;}",
    ".mh-knob{position:absolute;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;background:radial-gradient(circle at 50% 50%,#fffdf3 0 38%,#ffe9b0 52%,rgba(255,226,150,.0) 72%);box-shadow:0 0 0 1px rgba(255,255,255,.35),0 0 18px 6px rgba(255,230,160,.35);cursor:grab;transition:background .3s ease,box-shadow .3s ease;}",
    ".mh-knob.moon{background:radial-gradient(circle at 50% 50%,#f3f6ff 0 38%,#c9d4f2 52%,rgba(200,212,242,0) 72%);box-shadow:0 0 0 1px rgba(255,255,255,.35),0 0 18px 6px rgba(190,205,245,.3);}",
    ".mh-arc:focus-visible{outline:2px solid #fff;outline-offset:4px;border-radius:10px;}",
    ".mh-stops{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-top:1px solid rgba(255,255,255,.18);padding-top:8px;}",
    ".mh-stops button{border:0;background:none;padding:4px 0;font-size:11px;color:rgba(255,255,255,.66);}",
    ".mh-stops button[aria-pressed='true']{color:#fff;font-weight:600;}",
    ".mh-hints{position:absolute;left:clamp(14px,2vw,24px);bottom:calc(env(safe-area-inset-bottom,0px) + 22px);z-index:5;display:flex;flex-wrap:wrap;gap:6px;max-width:calc(50% - 110px);pointer-events:none;transition:opacity .5s ease;}",
    ".mh-chip{display:inline-flex;align-items:baseline;gap:5px;padding:6px 11px 7px;border-radius:999px;background:rgba(16,17,19,.7);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.12);font-size:12px;line-height:1.2;letter-spacing:.01em;color:rgba(255,255,255,.88);white-space:nowrap;transition:opacity .4s ease;}",
    ".mh-chip b{color:#fff;font-weight:600;}",
    ".mh-chip[data-off='1']{display:none;}",
    "@media (max-width:760px){.mh-hints{display:none;}}",
    "@media (max-width:560px){.mh-panel{left:12px;right:12px;width:auto;bottom:calc(env(safe-area-inset-bottom,0px) + 74px);}}",
    "@media (prefers-reduced-motion:reduce){.mh-panel,.mh-toggle,.mh-knob{transition:none;}}"
  ].join("\n");

  var ICONS = {
    spring: '<svg viewBox="0 0 24 24"><path d="M12 21v-9"/><path d="M12 12c0-4 3-7 8-7 0 4-3 7-8 7z"/><path d="M12 14c0-3-2.5-5.5-7-5.5 0 3 2.5 5.5 7 5.5z"/></svg>',
    summer: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg>',
    autumn: '<svg viewBox="0 0 24 24"><path d="M5 19C5 10 11 5 20 4c-1 9-6 15-15 15z"/><path d="M5 19l8-8"/></svg>',
    winter: '<svg viewBox="0 0 24 24"><path d="M12 2.5v19M3.8 7.25l16.4 9.5M3.8 16.75l16.4-9.5"/><path d="M9.5 4l2.5 2 2.5-2M9.5 20l2.5-2 2.5 2"/></svg>',
    clear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.6"/><path d="M12 3.5v1.8M12 18.7v1.8M3.5 12h1.8M18.7 12h1.8M6 6l1.3 1.3M16.7 16.7L18 18M6 18l1.3-1.3M16.7 7.3L18 6"/></svg>',
    rain: '<svg viewBox="0 0 24 24"><path d="M7 15a4 4 0 0 1-.6-8A5.5 5.5 0 0 1 17 7.5 3.8 3.8 0 0 1 17 15z"/><path d="M8.5 18l-1 2.5M12.5 18l-1 2.5M16.5 18l-1 2.5"/></svg>',
    snow: '<svg viewBox="0 0 24 24"><path d="M7 15a4 4 0 0 1-.6-8A5.5 5.5 0 0 1 17 7.5 3.8 3.8 0 0 1 17 15z"/><circle cx="8.5" cy="19" r=".6"/><circle cx="12" cy="20.5" r=".6"/><circle cx="15.5" cy="19" r=".6"/></svg>',
    pencil: '<svg viewBox="0 0 24 24"><path d="M15.5 4.5l4 4L9 19l-5 1 1-5z"/><path d="M13.5 6.5l4 4"/></svg>'
  };

  var SEASONS = {
    spring: { tint: "#eaffc4", recolor: 0.25, tip: "#5b9345", base: "#243f1d", dry: "#a9c46a", yellow: 0.5, leafA: "#7fb84a", leafB: "#cbe88a", leafAmt: 0.85, blossom: 1, flowers: 1.0, fall: 0, snow: 0 },
    summer: { tint: "#d6ecbc", recolor: 0.0, tip: "#667e46", base: "#2a3821", dry: "#ad9a68", yellow: 0.38, leafA: "#405332", leafB: "#92a166", leafAmt: 1.0, blossom: 0, flowers: 0.5, fall: 0, snow: 0 },
    autumn: { tint: "#ffffff", recolor: 0.92, yellow: 0.05, tip: "#b18d40", base: "#382a11", dry: "#c47f36", leafA: "#b8461b", leafB: "#e7b03a", leafAmt: 0.72, blossom: 0, flowers: 0, fall: 1, snow: 0 },
    winter: { tint: "#c8ccb0", recolor: 0.5, yellow: 0, tip: "#56643a", base: "#1f2417", dry: "#8a8460", leafA: "#4a5a30", leafB: "#6b7a44", leafAmt: 0.0, blossom: 0, flowers: 0, fall: 0, snow: 0.92 }
  };
  var WEATHER = {
    clear: { overcast: 0.03, rain: 0, snowfall: 0, wet: 0 },
    rain: { overcast: 1.0, rain: 1, snowfall: 0, wet: 1 },
    snow: { overcast: 0.92, rain: 0, snowfall: 1, wet: 0 }
  };
  var LIGHT_NAMES = ["Noon", "Golden", "Dusk", "Night"];

  function injectCSS() {
    if (document.getElementById("mh-style")) return;
    var s = document.createElement("style");
    s.id = "mh-style";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function mount(container, options) {
    var THREE = global.THREE;
    if (!THREE) throw new Error("MeadowHero needs three.js r128 loaded before it.");
    if (!container) throw new Error("MeadowHero.mount needs a container element.");
    var opts = Object.assign({ season: "summer", weather: "clear", light: "golden", panel: true, hints: true, character: true, scrollTrack: null, quality: "auto", assetsPath: "meadow-assets/", extras: true, models: null }, options || {});
    injectCSS();
    container.classList.add("mh-root");
    if (container.clientHeight < 80) container.style.minHeight = "100vh";

    var reduce = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // "local" follows the visitor's clock and calendar
    var LIGHT_BY_NAME = { noon: 0, golden: 1 / 3, dusk: 2 / 3, night: 1 };
    if (typeof opts.light === "string" && LIGHT_BY_NAME[opts.light.toLowerCase()] != null) opts.light = LIGHT_BY_NAME[opts.light.toLowerCase()];
    var isLocal = opts.light === "local", lightBase = isLocal ? localLight(new Date()) : clamp01(+opts.light || 0);
    var season0 = opts.season === "local" ? localSeason(new Date()) : opts.season;
    var state = { season: SEASONS[season0] ? season0 : "summer", weather: WEATHER[opts.weather] ? opts.weather : "clear", light: isLocal ? lightBase : clamp01(+opts.light || 0) };
    var listeners = [];
    function on(target, type, fn, o) { target.addEventListener(type, fn, o); listeners.push([target, type, fn, o]); }

    /* ---------------- DOM ---------------- */
    var canvas = document.createElement("canvas");
    canvas.className = "mh-canvas";
    canvas.setAttribute("aria-hidden", "true");
    var fx = document.createElement("div"), fxLayer = fx;
    fx.className = "mh-fx";
    fx.setAttribute("aria-hidden", "true");
    container.insertBefore(fx, container.firstChild);
    container.insertBefore(canvas, container.firstChild);

    var ui = document.createElement("div");
    ui.className = "mh-ui";
    container.appendChild(ui);
    var panel, toggle, knob, arcEl, lightName, hintEl, dandChip;
    if (opts.hints !== false) {
      var touchy = global.matchMedia && global.matchMedia("(hover: none)").matches;
      hintEl = document.createElement("div");
      hintEl.className = "mh-hints";
      hintEl.setAttribute("aria-hidden", "true");
      var chips = [[touchy ? "drag" : "move", "part the grass"], [touchy ? "tap" : "click", "a gust"], ["touch", "a dandelion"]];
      if (opts.scrollTrack) chips.push(["scroll", "day into night"]);
      hintEl.innerHTML = chips.map(function (c) { return '<span class="mh-chip"><b>' + c[0] + "</b>" + c[1] + "</span>"; }).join("");
      dandChip = hintEl.children[2];
      ui.appendChild(hintEl);
    }
    if (opts.panel) buildPanel();

    function segButton(group, key, label) {
      return '<button type="button" data-group="' + group + '" data-key="' + key + '" aria-pressed="false">' + ICONS[key] + "<span>" + label + "</span></button>";
    }
    function buildPanel() {
      toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "mh-toggle";
      toggle.setAttribute("aria-expanded", "false");
      toggle.innerHTML = ICONS.pencil + "<span>Customize</span>";
      ui.appendChild(toggle);
      panel = document.createElement("div");
      panel.className = "mh-panel";
      panel.hidden = true;
      panel.setAttribute("role", "group");
      panel.setAttribute("aria-label", "Scene settings");
      panel.innerHTML =
        '<div class="mh-seg c4" role="group" aria-label="Season">' + segButton("season", "spring", "Spring") + segButton("season", "summer", "Summer") + segButton("season", "autumn", "Autumn") + segButton("season", "winter", "Winter") + "</div>" +
        '<div class="mh-seg c3" role="group" aria-label="Weather">' + segButton("weather", "clear", "Clear") + segButton("weather", "rain", "Rain") + segButton("weather", "snow", "Snow") + "</div>" +
        '<div class="mh-light">' +
        '<div class="mh-light-head"><span>Light</span><b class="mh-light-name">Noon</b></div>' +
        '<div class="mh-arc" tabindex="0" role="slider" aria-label="Time of day" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="Noon">' +
        '<svg viewBox="0 0 200 66" preserveAspectRatio="none" aria-hidden="true"><path d="M10 12 Q 104 16 190 58" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="0.1 5"/></svg>' +
        '<span class="mh-knob" aria-hidden="true"></span></div>' +
        '<div class="mh-stops">' + LIGHT_NAMES.map(function (n, i) { return '<button type="button" data-light="' + (i / 3) + '" aria-pressed="false">' + n + "</button>"; }).join("") + "</div>" +
        "</div>";
      ui.appendChild(panel);
      knob = panel.querySelector(".mh-knob");
      arcEl = panel.querySelector(".mh-arc");
      lightName = panel.querySelector(".mh-light-name");

      on(toggle, "click", function () { setPanel(panel.hidden); });
      on(document, "keydown", function (e) { if (e.key === "Escape" && !panel.hidden) { setPanel(false); toggle.focus(); } });
      on(panel, "click", function (e) {
        var b = e.target.closest("button");
        if (!b) return;
        if (b.dataset.group === "season") api.setSeason(b.dataset.key);
        else if (b.dataset.group === "weather") api.setWeather(b.dataset.key);
        else if (b.dataset.light != null) { manualLight = true; api.setLight(+b.dataset.light); }
      });
      var dragging = false;
      function arcFromEvent(e) {
        var r = arcEl.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width * 200, py = (e.clientY - r.top) / r.height * 66;
        var best = 0, bd = 1e9;
        for (var i = 0; i <= 80; i++) {
          var u = i / 80, p = arcPoint(u), d = (p[0] - px) * (p[0] - px) + (p[1] - py) * (p[1] - py);
          if (d < bd) { bd = d; best = u; }
        }
        manualLight = true;
        api.setLight(best);
      }
      on(arcEl, "pointerdown", function (e) { dragging = true; try { arcEl.setPointerCapture(e.pointerId); } catch (err) {} arcFromEvent(e); knob.style.cursor = "grabbing"; });
      on(arcEl, "pointermove", function (e) { if (dragging) arcFromEvent(e); });
      on(arcEl, "pointerup", function () { dragging = false; knob.style.cursor = ""; });
      on(arcEl, "pointercancel", function () { dragging = false; });
      on(arcEl, "keydown", function (e) {
        var step = e.shiftKey ? 0.1 : 0.02;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") { manualLight = true; api.setLight(state.light + step); e.preventDefault(); }
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") { manualLight = true; api.setLight(state.light - step); e.preventDefault(); }
        if (e.key === "Home") { api.setLight(0); e.preventDefault(); }
        if (e.key === "End") { api.setLight(1); e.preventDefault(); }
      });
      syncUI();
    }
    function setPanel(open) { panel.hidden = !open; toggle.setAttribute("aria-expanded", String(open)); }
    function arcPoint(u) {
      var x = (1 - u) * (1 - u) * 10 + 2 * u * (1 - u) * 104 + u * u * 190;
      var y = (1 - u) * (1 - u) * 12 + 2 * u * (1 - u) * 16 + u * u * 58;
      return [x, y];
    }
    function lightLabel(v) { return LIGHT_NAMES[Math.round(v * 3)]; }
    function syncUI() {
      if (!panel) return;
      panel.querySelectorAll("[data-group]").forEach(function (b) {
        b.setAttribute("aria-pressed", String(state[b.dataset.group] === b.dataset.key));
      });
      var name = lightLabel(state.light);
      panel.querySelectorAll("[data-light]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.textContent === name)); });
      lightName.textContent = name;
      var p = arcPoint(state.light);
      knob.style.left = (p[0] / 200 * 100) + "%";
      knob.style.top = (p[1] / 66 * 100) + "%";
      knob.classList.toggle("moon", state.light > 0.8);
      arcEl.setAttribute("aria-valuenow", String(Math.round(state.light * 100)));
      arcEl.setAttribute("aria-valuetext", name);
    }

    var manualLight = false;
    var api = {
      setSeason: function (s) { if (SEASONS[s]) { state.season = s; syncUI(); } },
      setWeather: function (w) { if (WEATHER[w]) { state.weather = w; syncUI(); } },
      setLight: function (v) {
        // accepts 0..1 or a named stop ("noon", "golden", "dusk", "night")
        if (typeof v === "string") v = LIGHT_BY_NAME[v.toLowerCase()] != null ? LIGHT_BY_NAME[v.toLowerCase()] : parseFloat(v);
        v = +v; if (!isFinite(v)) return;
        state.light = clamp01(v); syncUI();
      },
      destroy: destroy
    };

    /* scroll-linked time of day */
    function readScroll() {
      if (!opts.scrollTrack) return;
      var r = opts.scrollTrack.getBoundingClientRect();
      var span = r.height - global.innerHeight;
      if (span <= 0) return;
      var p = clamp01(-r.top / span);
      manualLight = false;
      api.setLight(lightBase + p * (1 - lightBase));
      if (hintEl) hintEl.style.opacity = p > 0.05 ? "0" : "1";
    }
    if (opts.scrollTrack) { on(global, "scroll", readScroll, { passive: true }); readScroll(); }
    var localTimer = isLocal ? setInterval(function () {
      lightBase = localLight(new Date());
      if (opts.scrollTrack) readScroll(); else if (!manualLight) api.setLight(lightBase);
    }, 60000) : 0;

    /* ---------------- scene ---------------- */
    var scene3d = null;
    try { scene3d = buildScene(); } catch (err) { console.error("MeadowHero:", err); }
    if (!scene3d) container.style.background = "linear-gradient(180deg,#9fb6cc 0%,#d9dfe3 55%,#56693a 55.2%,#2f3e1e 100%)";

    var raf = 0, visible = true, last = performance.now();
    var io = null;
    if ("IntersectionObserver" in global) {
      io = new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); } }, { threshold: 0 });
      io.observe(container);
    }
    function loop(now) {
      raf = 0;
      if (!visible || document.hidden) { if (!document.hidden && visible) raf = requestAnimationFrame(loop); return; }
      // rAF timestamps can trail performance.now() on a busy main thread; never let time run backwards
      var dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = Math.max(last, now);
      if (scene3d) scene3d.render(now / 1000, dt);
      raf = requestAnimationFrame(loop);
    }
    on(document, "visibilitychange", function () { if (!document.hidden && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); } });
    raf = requestAnimationFrame(loop);

    function destroy() {
      if (raf) cancelAnimationFrame(raf);
      if (localTimer) clearInterval(localTimer);
      if (io) io.disconnect();
      listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2], l[3]); });
      if (scene3d) scene3d.dispose();
      canvas.remove(); fx.remove(); ui.remove();
      container.classList.remove("mh-root");
    }

    function clamp01(v) { return Math.min(1, Math.max(0, v)); }
    function southern() {
      try { return /^(Australia|Antarctica)\/|^Pacific\/(Auckland|Chatham|Fiji|Noumea)|^America\/(Santiago|Argentina|Sao_Paulo|Montevideo|Asuncion|La_Paz|Lima)|^Africa\/(Johannesburg|Maputo|Harare|Windhoek|Lusaka|Gaborone)|^Indian\/(Mauritius|Reunion)/.test(Intl.DateTimeFormat().resolvedOptions().timeZone || ""); } catch (e) { return false; }
    }
    function dayOfYear(d) { return (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 0)) / 864e5; }
    // a rough mid-latitude sun: longer days in summer, golden hour before sunset, dusk, then night
    function localLight(d) {
      var doy = dayOfYear(d) + (southern() ? 182 : 0);
      var dayLen = 12 + 3.2 * Math.cos(2 * Math.PI * (doy - 172) / 365), noon = 12.75;
      var rise = noon - dayLen / 2, set = noon + dayLen / 2, h = d.getHours() + d.getMinutes() / 60;
      function seg(a, b, v0, v1) { return v0 + (v1 - v0) * clamp01((h - a) / (b - a)); }
      if (h < rise - 1 || h > set + 1.75) return 1;
      if (h < rise + 0.5) return seg(rise - 1, rise + 0.5, 0.85, 0.33);
      if (h < rise + 2.5) return seg(rise + 0.5, rise + 2.5, 0.33, 0);
      if (h < set - 3) return 0;
      if (h < set - 0.5) return seg(set - 3, set - 0.5, 0, 0.33);
      if (h < set + 0.75) return seg(set - 0.5, set + 0.75, 0.33, 0.66);
      return seg(set + 0.75, set + 1.75, 0.66, 1);
    }
    function localSeason(d) {
      var m = (d.getMonth() + (southern() ? 6 : 0)) % 12;
      return m < 2 || m === 11 ? "winter" : m < 5 ? "spring" : m < 8 ? "summer" : "autumn";
    }

    /* ======================================================================== */
    function buildScene() {
      var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: "high-performance" });
      if (!renderer.getContext()) throw new Error("WebGL unavailable");
      var DPR = Math.min(global.devicePixelRatio || 1, opts.quality === "low" ? 1 : (opts.quality === "ultra" ? 2 : 1.5));
      renderer.setPixelRatio(DPR);
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;

      var disposed = false;
      var narrowScreen = container.clientWidth < 700;
      var isGL2 = renderer.capabilities.isWebGL2;
      var lowQ = opts.quality === "low", autoQ = opts.quality === "auto";
      var adaptiveLevel=0, perfLast=0, perfSum=0, perfCount=0, perfWindow=0, perfCooldown=5, perfMs=0, shadowTime=0;
      renderer.shadowMap.enabled = !lowQ;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.shadowMap.autoUpdate=false;
      var shadowsOn = !lowQ;
      var scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0xffffff, 0.01);
      var camera = new THREE.PerspectiveCamera(40, 1, 0.25, 9000);

      function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
      function Lc(hex) { return new THREE.Color(hex).convertSRGBToLinear(); }
      function smooth(e0, e1, x) { var f = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return f * f * (3 - 2 * f); }
      function glsl(c) { return "vec3(" + c.r.toFixed(4) + "," + c.g.toFixed(4) + "," + c.b.toFixed(4) + ")"; }
      function lerp(a, b, t) { return a + (b - a) * t; }
      var disposables = [];
      function keep(o) { disposables.push(o); return o; }

      /* ---------- light keyframes (0 noon → 1 night): colours + sun azimuth/elevation (degrees, 0 = straight ahead) ---------- */
      var LK = [
        // gexp: how fast the sky turns from the horizon colour to the zenith colour; cov: cloud cover on clear days
        { l: 0.00, top: "#165288", hor: "#a8c0d5", mid: "#000000", midK: 0, gexp: 0.48, cov: 0.34, sun: "#fff4e3", sunI: 2.55, amb: "#b7cbe0", ambI: 0.82, exp: 0.92, az: -42, el: 64, tw: 0, otop: "#9fa7b1", ohor: "#c9ced5" },
        { l: 0.33, top: "#294e78", hor: "#b5b8bf", mid: "#000000", midK: 0, gexp: 0.43, cov: 0.30, sun: "#ffd3a0", sunI: 2.65, amb: "#aebfce", ambI: 0.78, exp: 0.96, az: -9, el: 14, tw: 0, otop: "#a3a1a2", ohor: "#d6c9b8" },
        { l: 0.66, top: "#1b3672", hor: "#e0956c", mid: "#b8b6c2", midK: 1, gexp: 0.34, cov: 0.18, sun: "#ff9356", sunI: 0.55, amb: "#5b557d", ambI: 0.42, exp: 1.1, az: 14, el: -3.5, tw: 1, otop: "#3e415a", ohor: "#6f6070" },
        { l: 1.00, top: "#00152f", hor: "#7b8593", mid: "#000000", midK: 0, gexp: 0.15, cov: 0.02, sun: "#a6bdf0", sunI: 0.55, amb: "#3b5a85", ambI: 0.6, exp: 1.05, az: 40, el: -28, tw: 0, otop: "#10141f", ohor: "#1c2230" }
      ].map(function (k) {
        var o = { l: k.l, sunI: k.sunI, ambI: k.ambI, exp: k.exp, az: k.az, el: k.el, tw: k.tw, gexp: k.gexp, cov: k.cov, midK: k.midK };
        ["top", "hor", "mid", "sun", "amb", "otop", "ohor"].forEach(function (key) { o[key] = Lc(k[key]); });
        return o;
      });
      var cur = {};
      ["top", "hor", "mid", "sun", "amb", "otop", "ohor"].forEach(function (key) { cur[key] = new THREE.Color(); });
      function sampleLight(l) {
        var i = 0;
        while (i < LK.length - 2 && l > LK[i + 1].l) i++;
        var a = LK[i], b = LK[i + 1];
        var f = clamp01((l - a.l) / (b.l - a.l));
        f = f * f * (3 - 2 * f);
        ["top", "hor", "mid", "sun", "amb", "otop", "ohor"].forEach(function (key) { cur[key].copy(a[key]).lerp(b[key], f); });
        ["sunI", "ambI", "exp", "az", "el", "tw", "gexp", "cov", "midK"].forEach(function (key) { cur[key] = lerp(a[key], b[key], f); });
        return cur;
      }

      /* ---------- colour grade per light (noon → night), blended with the season and the weather ---------- */
      var GK = [
        { l: 0.00, gain: [1.0, 1.0, 1.0], lift: [0, 0.002, 0.004], gam: 1.025, con: 1.065, sat: 1.03, blk: 0.012 },
        { l: 0.33, gain: [1.018, 1.0, 0.98], lift: [0, 0.002, 0.007], gam: 1.025, con: 1.075, sat: 1.06, blk: 0.014 },
        { l: 0.66, gain: [1.02, 0.99, 1.0], lift: [0, 0, 0.008], gam: 1.02, con: 1.04, sat: 1.02, blk: 0.008 },
        { l: 1.00, gain: [0.92, 1.0, 1.1], lift: [0, 0.005, 0.015], gam: 0.98, con: 1.04, sat: 1.08, blk: 0.008 }
      ];
      var SEASON_GRADE = { spring: { gain: [0.99, 1.01, 0.99], sat: 1.03 }, summer: { gain: [1, 1, 1], sat: 1 }, autumn: { gain: [1.02, 1.0, 0.96], sat: 0.95 }, winter: { gain: [0.97, 1.0, 1.05], sat: 0.86 } };
      var GR = { gain: new THREE.Vector3(1, 1, 1), lift: new THREE.Vector3(), gam: 1, con: 1, sat: 1, blk: 0 };
      var seasonW = { spring: 0, summer: 0, autumn: 0, winter: 0 }; seasonW[state.season] = 1;
      function sampleGrade(l, ks, rain, snow) {
        var i = 0;
        while (i < GK.length - 2 && l > GK[i + 1].l) i++;
        var a = GK[i], b = GK[i + 1], f = clamp01((l - a.l) / (b.l - a.l)); f = f * f * (3 - 2 * f);
        GR.gain.set(lerp(a.gain[0], b.gain[0], f), lerp(a.gain[1], b.gain[1], f), lerp(a.gain[2], b.gain[2], f));
        GR.lift.set(lerp(a.lift[0], b.lift[0], f), lerp(a.lift[1], b.lift[1], f), lerp(a.lift[2], b.lift[2], f));
        GR.gam = lerp(a.gam, b.gam, f); GR.con = lerp(a.con, b.con, f); GR.sat = lerp(a.sat, b.sat, f); GR.blk = lerp(a.blk, b.blk, f);
        var g0 = 0, g1 = 0, g2 = 0, sat = 0, wsum = 0;
        Object.keys(seasonW).forEach(function (key) {
          seasonW[key] += ((key === state.season ? 1 : 0) - seasonW[key]) * ks;
          var sg = SEASON_GRADE[key], w = seasonW[key];
          g0 += sg.gain[0] * w; g1 += sg.gain[1] * w; g2 += sg.gain[2] * w; sat += sg.sat * w; wsum += w;
        });
        wsum = Math.max(wsum, 1e-3);
        GR.gain.x *= g0 / wsum; GR.gain.y *= g1 / wsum; GR.gain.z *= g2 / wsum; GR.sat *= sat / wsum;
        // rain greys and cools the picture, snow cools and softens it
        GR.sat *= (1 - 0.28 * rain) * (1 - 0.16 * snow); GR.con *= (1 - 0.07 * rain) * (1 - 0.04 * snow); GR.blk *= 1 - 0.6 * rain;
        GR.gain.x *= (1 - 0.03 * rain) * (1 - 0.03 * snow); GR.gain.z *= (1 + 0.03 * rain) * (1 + 0.05 * snow);
        GR.lift.x += 0.025 * rain + 0.008 * snow; GR.lift.y += 0.03 * rain + 0.012 * snow; GR.lift.z += 0.035 * rain + 0.02 * snow;
        return GR;
      }

      /* ---------- smoothed environment ---------- */
      var P = { light: state.light, overcast: 0, rain: 0, snowfall: 0, wet: 0, snow: 0, leafAmt: 1, blossom: 0, flowers: 0.5, fall: 0, recolor: 0, cold: 0 };
      var PC = { tip: new THREE.Color(), base: new THREE.Color(), dry: new THREE.Color(), leafA: new THREE.Color(), leafB: new THREE.Color(), tint: new THREE.Color() };
      var seasonLin = {};
      Object.keys(SEASONS).forEach(function (k) {
        var s = SEASONS[k]; seasonLin[k] = {};
        ["tip", "base", "dry", "leafA", "leafB", "tint"].forEach(function (c) { seasonLin[k][c] = Lc(s[c]); });
      });
      function targetEnv() {
        var s = SEASONS[state.season], w = WEATHER[state.weather];
        return {
          light: state.light, overcast: w.overcast, rain: w.rain, snowfall: w.snowfall, wet: Math.max(w.wet, 0),
          snow: Math.max(s.snow, state.weather === "snow" ? 1 : 0) * (state.weather === "rain" ? 0.6 : 1),
          leafAmt: s.leafAmt, blossom: s.blossom, flowers: s.flowers * (state.weather === "snow" ? 0 : 1), fall: s.fall, recolor: s.recolor,
          cold: (state.season === "winter" || state.weather === "snow") ? 1 : 0
        };
      }
      (function initEnv() {
        var t = targetEnv(); Object.keys(t).forEach(function (k) { P[k] = t[k]; });
        var sl = seasonLin[state.season]; Object.keys(PC).forEach(function (k) { PC[k].copy(sl[k]); });
      })();

      /* ---------- shared uniforms + GLSL ---------- */
      var trail = [];
      for (var ti = 0; ti < 8; ti++) trail.push(new THREE.Vector4(0, 0, -999, 0));
      var U = {
        uTime: { value: 0 }, uWind: { value: 1 }, uTrail: { value: trail },
        uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunC: { value: new THREE.Color() }, uAmbC: { value: new THREE.Color() }, uTransK: { value: 1 },
        uFogC: { value: new THREE.Color() }, uFogD: { value: 0.01 },
        uTreeSh: { value: new THREE.Vector3(0, 0, 1) }, uVanSh: { value: new THREE.Vector4(0, 0, 1, 1) }, uShDir: { value: new THREE.Vector2(1, 0) },
        uShStretch: { value: 1 }, uShK: { value: 0.5 }, uVanRot: { value: 0 },
        uGlowPos: { value: new THREE.Vector3() }, uVanOn: { value: 0 },
        uTreePos: { value: new THREE.Vector3() }, uVanPos: { value: new THREE.Vector3() }, uHeight: { value: 1 },
        uSnow: { value: 0 }, uWet: { value: 0 }, uFlowers: { value: 1 }, uYellow: { value: 0.2 },
        uBase: { value: PC.base }, uTip: { value: PC.tip }, uDry: { value: PC.dry },
        uCloudNoise: { value: null }, uCloudT: { value: 0 }, uCloudCov: { value: 0.4 }, uCloudOn: { value: 0 },
        uHeadPos: { value: new THREE.Vector3() }, uHeadDir: { value: new THREE.Vector3(1, 0, 0) }, uHeadOn: { value: 0 },
        uGust: { value: new THREE.Vector4(0, 0, -100, 0) }
      };
      U.uCloudSun = U.uSunDir;
      var NOISE = [
        "float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }",
        "float vnoise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); vec2 u = f*f*(3.0-2.0*f);",
        " return mix(mix(hash12(i), hash12(i+vec2(1.0,0.0)), u.x), mix(hash12(i+vec2(0.0,1.0)), hash12(i+vec2(1.0,1.0)), u.x), u.y); }"
      ].join("\n");
      var WIND = [
        "uniform float uTime, uWind; uniform vec4 uTrail[8]; uniform vec4 uGust;",
        "vec3 bend(vec2 xz, float k, float ht, float rnd, out float gust){",
        " vec2 wd = normalize(vec2(1.0, 0.35));",
        " float n = vnoise(xz*0.07 - wd*uTime*0.55);",
        " float n2 = vnoise(xz*0.21 + vec2(-uTime*0.35, uTime*0.22));",
        " gust = smoothstep(0.25, 0.85, n)*0.85 + n2*0.25;",
        " float fl = sin(uTime*5.3 + rnd*31.0 + xz.x*0.8)*0.05 + sin(uTime*7.7 + rnd*17.0)*0.025;",
        " vec3 o = vec3(0.0);",
        " o.xz += wd*(gust*0.48 + 0.055 + fl*0.65)*uWind*k*ht;",
        " float push = 0.0; vec2 pdir = vec2(0.0);",
        " for (int i = 0; i < 8; i++) {",
        "  vec2 d = xz - uTrail[i].xz; float l = length(d);",
        "  float p = 1.0 - smoothstep(0.0, 2.0, l); p = p*p*(3.0-2.0*p)*uTrail[i].w;",
        "  pdir += (d/max(l, 0.001))*p; push = max(push, p);",
        " }",
        " float pl = length(pdir); if (pl > 1.0) pdir /= pl;",
        " o.xz += pdir*1.3*k*ht;",
        " o.y -= push*0.55*k*ht;",
        // a click sends a ring of wind racing out across the meadow
        " float ga = uTime - uGust.z;",
        " if (ga > 0.0 && ga < 3.0) {",
        "  vec2 gv = xz - uGust.xy; float gl = length(gv);",
        "  float gq = (gl - ga*6.0)*0.55; float ring = exp(-gq*gq)*(1.0 - ga/3.0)*uGust.w;",
        "  o.xz += (gv/max(gl, 0.01))*ring*1.1*k*ht; o.y -= ring*0.35*k*ht;",
        " }",
        " return o;",
        "}"
      ].join("\n");
      var LIGHT = [
        "uniform vec3 uSunDir, uSunC, uAmbC, uFogC, uGlowPos; uniform float uTransK, uVanOn, uSnow, uWet;",
        "uniform vec3 uTreeSh; uniform vec4 uVanSh; uniform vec2 uShDir; uniform float uShStretch, uShK, uVanRot;",
        "float shadowAt(vec2 xz){",
        " vec2 q = xz - uTreeSh.xy; vec2 pd = vec2(-uShDir.y, uShDir.x);",
        " float d = length(vec2(dot(q, uShDir)/uShStretch, dot(q, pd))) / uTreeSh.z;",
        " float gaps = vnoise(xz*1.7)*0.5 + vnoise(xz*4.1)*0.25;",
        " float t = smoothstep(0.5, 1.0, d + gaps*0.35);",
        " vec2 v = xz - uVanSh.xy; float c = cos(uVanRot), s = sin(uVanRot);",
        " vec2 lv = vec2(v.x*c - v.y*s, v.x*s + v.y*c);",
        " float dv = length(lv / uVanSh.zw);",
        " float vs = smoothstep(0.75, 1.15, dv);",
        " return 1.0 - (1.0 - min(t, vs)) * uShK;",
        "}",
        "vec3 vanGlow(vec3 p){ float d = length(p - uGlowPos); return vec3(1.0, 0.56, 0.24)*uVanOn*1.8/(1.0 + d*d*0.16); }",
        "vec3 fogColor(vec3 V){ float s = max(dot(-V, normalize(uSunDir)), 0.0); return uFogC + uSunC*(pow(s, 6.0)*0.16 + pow(s, 40.0)*0.3)*uTransK; }"
      ].join("\n");
      // cloud shadows sweeping over the ground (samples the same noise as the cloud layer)
      var CLOUDSH = isGL2 ? [
        "precision highp sampler3D;",
        "uniform sampler3D uCloudNoise; uniform float uCloudT, uCloudCov, uCloudOn; uniform vec3 uCloudSun;",
        "float cloudShadow(vec3 p){",
        " vec3 L = normalize(uCloudSun); vec3 cp = p + L*((1500.0 - p.y)/max(L.y, 0.12));",
        " vec3 w = vec3(-uCloudT*11.0, 0.0, uCloudT*1.5);",
        " float n = texture(uCloudNoise, (cp + w)*0.0001).r;",
        " return 1.0 - uCloudOn*0.62*smoothstep(0.12, 0.4, L.y)*smoothstep(1.0 - uCloudCov - 0.04, 1.0 - uCloudCov + 0.2, n);",
        "}"].join("\n") : "float cloudShadow(vec3 p){ return 1.0; }";
      // the van's headlights as a light cone on the meadow
      var HEADL = [
        "uniform vec3 uHeadPos, uHeadDir; uniform float uHeadOn;",
        "vec3 headlight(vec3 p){",
        " vec3 d = p - uHeadPos; float l = length(d); vec3 dn = d/max(l, 0.001);",
        " float cone = smoothstep(0.90, 0.976, dot(dn, normalize(uHeadDir)));",
        " return vec3(1.0, 0.93, 0.8)*uHeadOn*cone*7.0/(1.0 + l*l*0.14);",
        "}"].join("\n");
      var OUT = "\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n";
      // Real sun shadows for the custom grass/ground/flower shaders (reads three's directional shadow map)
      var SHADOW = [
        "#include <packing>",
        "#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0",
        "uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];",
        "uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];",
        "struct DirectionalLightShadow { float shadowBias; float shadowNormalBias; float shadowRadius; vec2 shadowMapSize; };",
        "uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];",
        "vec3 shCoord(vec3 wp){ vec4 sc = directionalShadowMatrix[ 0 ] * vec4(wp, 1.0); return sc.xyz / sc.w; }",
        "float shTap(vec2 uv, float z){ return step(z, unpackRGBAToDepth(texture2D(directionalShadowMap[ 0 ], uv))); }",
        "float sunShadow(vec3 wp){",
        " vec3 c = shCoord(wp);",
        " if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0 || c.z > 1.0) return 1.0;",
        " float z = c.z + directionalLightShadows[ 0 ].shadowBias; vec2 tx = 1.5 / directionalLightShadows[ 0 ].shadowMapSize;",
        " float s = 0.0;",
        " for (int i = -1; i <= 1; i++) { for (int j = -1; j <= 1; j++) { s += shTap(c.xy + vec2(float(i), float(j))*tx, z); } }",
        " return s / 9.0;",
        "}",
        "float sunShadowFast(vec3 wp){",
        " vec3 c = shCoord(wp);",
        " if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0 || c.z > 1.0) return 1.0;",
        " float z = c.z + directionalLightShadows[ 0 ].shadowBias; vec2 tx = 1.2 / directionalLightShadows[ 0 ].shadowMapSize;",
        " return 0.25*(shTap(c.xy + vec2(-tx.x, -tx.y), z) + shTap(c.xy + vec2(tx.x, -tx.y), z) + shTap(c.xy + vec2(-tx.x, tx.y), z) + shTap(c.xy + vec2(tx.x, tx.y), z));",
        "}",
        "#else",
        "float sunShadow(vec3 wp){ return 1.0; }",
        "float sunShadowFast(vec3 wp){ return 1.0; }",
        "#endif"
      ].join("\n");
      function shaderMat(extra, vs, fs, o) {
        var uni = {};
        Object.keys(U).forEach(function (k) { uni[k] = U[k]; });
        Object.keys(extra || {}).forEach(function (k) { uni[k] = extra[k]; });
        if (o && o.lights) Object.assign(uni, THREE.UniformsUtils.clone(THREE.UniformsLib.lights));
        return keep(new THREE.ShaderMaterial(Object.assign({ uniforms: uni, vertexShader: vs, fragmentShader: fs }, o || {})));
      }
      // Standard materials that pick up snow on upward faces and gloss when wet
      function snowify(m, paintExpr, key, extraFrag, snowAmt) {
        m.onBeforeCompile = function (sh) {
          sh.uniforms.uSnow = U.uSnow; sh.uniforms.uWet = U.uWet;
          sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWN; varying float vLy; varying float vLx; varying float vLz;")
            .replace("#include <beginnormal_vertex>", "#include <beginnormal_vertex>\nvWN = normalize((modelMatrix*vec4(objectNormal,0.0)).xyz); vLy = position.y; vLx = position.x; vLz = position.z;");
          var f = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vWN; varying float vLy; varying float vLx; varying float vLz; uniform float uSnow; uniform float uWet;");
          if (paintExpr) f = f.replace("vec4 diffuseColor = vec4( diffuse, opacity );", "vec4 diffuseColor = vec4( " + paintExpr + ", opacity );");
          f = f.replace("#include <map_fragment>", "#include <map_fragment>\n float snowK = smoothstep(0.45, 0.9, vWN.y)*uSnow*" + (snowAmt == null ? 1 : snowAmt).toFixed(3) + "; diffuseColor.rgb = mix(diffuseColor.rgb*(1.0 - uWet*0.25), vec3(0.82,0.85,0.9), snowK);");
          if (extraFrag) f = f.replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n" + extraFrag);
          f = f.replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, max(roughnessFactor*0.55, 0.3), uWet);");
          sh.fragmentShader = f;
        };
        m.customProgramCacheKey = function () { return "mh-snow-" + (key || "plain"); };
        return keep(m);
      }


      function finishSurface(mat, kind) {
        var prior=mat.onBeforeCompile, priorKey=mat.customProgramCacheKey.bind(mat);
        mat.extensions = Object.assign({},mat.extensions,{derivatives:true});
        mat.onBeforeCompile=function(sh){
          if(prior)prior.call(mat,sh);
          sh.uniforms.uSurfaceSun=U.uSunC;sh.uniforms.uSurfaceDir=U.uSunDir;
          sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vSurfaceP;').replace('#include <begin_vertex>','#include <begin_vertex>\nvSurfaceP = position;');
          var util='varying vec3 vSurfaceP; uniform vec3 uSurfaceSun,uSurfaceDir;\nfloat surfaceHash(vec3 p){p=fract(p*0.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z); }\nfloat surfaceNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(surfaceHash(i),surfaceHash(i+vec3(1,0,0)),f.x),mix(surfaceHash(i+vec3(0,1,0)),surfaceHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(surfaceHash(i+vec3(0,0,1)),surfaceHash(i+vec3(1,0,1)),f.x),mix(surfaceHash(i+vec3(0,1,1)),surfaceHash(i+vec3(1,1,1)),f.x),f.y),f.z); }\n';
          sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\n'+util);
          var albedo='',rough='',bump='',scatter='';
          if(kind==='paint'){
            albedo='float dust=(1.0-smoothstep(0.32,0.95,vSurfaceP.y))*(0.3+0.7*surfaceNoise(vSurfaceP*8.0)); diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.13,0.105,0.065),dust*0.10);';
            rough='roughnessFactor=clamp(roughnessFactor+(surfaceNoise(vSurfaceP*75.0)-0.5)*0.035+dust*0.12,0.16,0.6);';
            bump='float mhB=surfaceNoise(vSurfaceP*220.0)*0.00018;';
          }else if(kind==='rubber'){
            albedo='diffuseColor.rgb *= 0.88 + 0.18*surfaceNoise(vSurfaceP*38.0);';
            rough='roughnessFactor=clamp(roughnessFactor+(surfaceNoise(vSurfaceP*55.0)-0.5)*0.12,0.55,1.0);';
            bump='float mhB=surfaceNoise(vSurfaceP*110.0)*0.0008;';
          }else if(kind==='skin'){
            albedo='float blood=surfaceNoise(vSurfaceP*18.0); diffuseColor.rgb *= mix(vec3(1.02,0.95,0.93),vec3(0.99,1.01,1.0),blood);';
            rough='roughnessFactor=clamp(roughnessFactor+(surfaceNoise(vSurfaceP*170.0)-0.5)*0.055,0.38,0.62);';
            bump='float mhB=surfaceNoise(vSurfaceP*310.0)*0.000045;';
            scatter='vec3 skinL=normalize(mat3(viewMatrix)*uSurfaceDir);float skinTrans=pow(max(dot(-normal,skinL),0.0),2.0);outgoingLight+=diffuseColor.rgb*uSurfaceSun*vec3(0.9,0.28,0.12)*skinTrans*0.035;';
          }else if(kind==='cloth'){
            albedo='float weave=surfaceNoise(vSurfaceP*150.0);diffuseColor.rgb *= 0.94 + 0.10*weave;';
            rough='roughnessFactor=clamp(roughnessFactor+(surfaceNoise(vSurfaceP*120.0)-0.5)*0.08,0.65,1.0);';
            bump='float mhB=(sin(vSurfaceP.x*720.0)*sin(vSurfaceP.y*640.0)*0.5+0.5)*0.00006;';
          }else if(kind==='leather'){
            albedo='diffuseColor.rgb *= 0.9 + 0.18*surfaceNoise(vSurfaceP*45.0);';
            rough='roughnessFactor+=surfaceNoise(vSurfaceP*130.0)*0.08;';
            bump='float mhB=surfaceNoise(vSurfaceP*180.0)*0.00032;';
          }else if(kind==='hair'){
            albedo='diffuseColor.rgb *= 0.9 + 0.2*surfaceNoise(vSurfaceP*70.0);';
            rough='roughnessFactor=clamp(roughnessFactor,0.35,0.7);';
            bump='float mhB=sin(vSurfaceP.x*820.0+surfaceNoise(vSurfaceP*20.0)*4.0)*0.000025;';
          }else if(kind==='eyes'){
            albedo='vec2 irisP=vec2(abs(vSurfaceP.x)-0.665,vSurfaceP.y);float irisD=length(irisP);float irisMask=(1.0-smoothstep(0.162,0.177,irisD))*step(0.08,vSurfaceP.z);float fibers=0.5+0.5*sin(atan(irisP.y,irisP.x)*75.0);vec3 iris=mix(vec3(0.024,0.014,0.007),vec3(0.12,0.068,0.028),fibers)*mix(0.12,1.0,smoothstep(0.06,0.074,irisD));diffuseColor.rgb=mix(diffuseColor.rgb,iris,irisMask);';
          }else if(kind==='metal'){
            rough='roughnessFactor=clamp(roughnessFactor+(surfaceNoise(vSurfaceP*90.0)-0.5)*0.04,0.12,0.55);';
            bump='float mhB=surfaceNoise(vSurfaceP*160.0)*0.000025;';
          }
          sh.fragmentShader=sh.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+albedo);
          sh.fragmentShader=sh.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\n'+rough);
          if(bump)sh.fragmentShader=sh.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n'+bump+'vec3 mhQ0=dFdx(-vViewPosition),mhQ1=dFdy(-vViewPosition);vec3 mhS=cross(mhQ1,normal),mhT=cross(normal,mhQ0);float mhD=dot(mhQ0,mhS);normal=normalize(abs(mhD)*normal-sign(mhD)*(dFdx(mhB)*mhS+dFdy(mhB)*mhT));');
          if(scatter)sh.fragmentShader=sh.fragmentShader.replace('gl_FragColor = vec4( outgoingLight, diffuseColor.a );',scatter+'\ngl_FragColor = vec4( outgoingLight, diffuseColor.a );');
        };
        mat.customProgramCacheKey=function(){return priorKey()+'-surface-'+kind;};
        mat.needsUpdate=true;return mat;
      }

      /* ---------- textures ---------- */
      function canvasTex(w, h, draw) {
        var c = document.createElement("canvas"); c.width = w; c.height = h;
        draw(c.getContext("2d"), w, h);
        return keep(new THREE.CanvasTexture(c));
      }
      var glowTex = canvasTex(128, 128, function (g) {
        var gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
        gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.22, "rgba(255,255,255,0.5)"); gr.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
      });
      var leafTex = canvasTex(256, 256, function (g) {
        var r = mulberry(21);
        for (var i = 0; i < 95; i++) {
          var ang = r() * Math.PI * 2, rad = Math.pow(r(), 0.65) * 100;
          var x = 128 + Math.cos(ang) * rad, y = 128 + Math.sin(ang) * rad;
          var a = r() * Math.PI * 2, L = 18 + r() * 16, W = L * 0.44, s = r();
          g.save(); g.translate(x, y); g.rotate(a);
          var lv = Math.round(150 + s * 105);
          g.fillStyle = "rgb(" + lv + "," + lv + "," + lv + ")";
          g.beginPath(); g.moveTo(-L / 2, 0); g.quadraticCurveTo(0, -W, L / 2, 0); g.quadraticCurveTo(0, W, -L / 2, 0); g.fill();
          g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = 1;
          g.beginPath(); g.moveTo(-L / 2, 0); g.lineTo(L / 2, 0); g.stroke();
          g.restore();
        }
      });
      var oneLeafTex = canvasTex(64, 64, function (g) {
        g.translate(32, 32); g.rotate(0.6);
        g.fillStyle = "#fff"; g.beginPath(); g.moveTo(-26, 0); g.quadraticCurveTo(0, -15, 26, 0); g.quadraticCurveTo(0, 15, -26, 0); g.fill();
        g.strokeStyle = "rgba(0,0,0,0.25)"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-26, 0); g.lineTo(26, 0); g.stroke();
      });
      var barkTex = canvasTex(64, 256, function (g, w, h) {
        var r = mulberry(5);
        g.fillStyle = "#5e4c40"; g.fillRect(0, 0, w, h);
        for (var i = 0; i < 90; i++) {
          g.fillStyle = r() < 0.55 ? "rgba(30,22,18," + (0.25 + r() * 0.4) + ")" : "rgba(170,150,130," + (0.1 + r() * 0.2) + ")";
          g.fillRect(r() * w, r() * h, 1 + r() * 3, 18 + r() * 80);
        }
      });
      barkTex.encoding = THREE.sRGBEncoding;
      barkTex.wrapS = barkTex.wrapT = THREE.RepeatWrapping;
      barkTex.repeat.set(2, 3);
      var fabricTex = canvasTex(128, 32, function (g, w, h) {
        g.fillStyle = "#9a4733"; g.fillRect(0, 0, w, h);
        g.fillStyle = "#d8cab0"; for (var i = 0; i < 8; i++) g.fillRect(i * 16 + 2, 0, 3, h);
        g.fillStyle = "#2f3b4c"; for (i = 0; i < 8; i++) g.fillRect(i * 16 + 8, 0, 2, h);
      });
      fabricTex.encoding = THREE.sRGBEncoding;
      fabricTex.wrapS = fabricTex.wrapT = THREE.RepeatWrapping;

      var i = 0;
      /* ---------- sky: atmosphere, sun, moon (real phase), stars, Milky Way + raymarched clouds ---------- */
      var skyGroup = new THREE.Group();
      scene.add(skyGroup);
      var isGL2 = renderer.capabilities.isWebGL2;
      var drawSize = new THREE.Vector2();
      var cloudRT = new THREE.WebGLRenderTarget(4, 4, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type: isGL2 ? THREE.HalfFloatType : THREE.UnsignedByteType, depthBuffer: false });
      keep(cloudRT);
      // moon phase from today's date (0 = new, 0.5 = full)
      var moonPhase = (function () {
        var days = (Date.now() - Date.UTC(2000, 0, 6, 18, 14)) / 86400000;
        var p = (days / 29.530588853) % 1; return p < 0 ? p + 1 : p;
      })();
      if (opts.moonPhase != null) moonPhase = +opts.moonPhase;
      var skyU = {
        uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uSun: { value: new THREE.Color() },
        uSunDir: { value: new THREE.Vector3(0, 1, -1) }, uMoonDir: { value: new THREE.Vector3(-0.2, 0.3, -1).normalize() },
        uNight: { value: 0 }, uDay: { value: 1 }, uTime: { value: 0 }, uOver: { value: 0 }, uIsEnv: { value: 0 }, uEnvGround: { value: new THREE.Color(0.1, 0.12, 0.06) },
        uTwilight: { value: 0 }, uMoonPhase: { value: moonPhase }, uClouds: { value: cloudRT.texture }, uRes: { value: new THREE.Vector2(1, 1) },
        uCloudMix: { value: 0 }, uFlat: { value: 1 }, uCover: { value: 0.5 }, uGexp: { value: 0.32 }, uMid: { value: new THREE.Color() }, uMidK: { value: 0 },
        uPano: { value: null }, uPanoA: { value: null }, uPanoOn: { value: 0 }, uSunVisibility: { value: 1 }, uPanoRot: { value: new THREE.Vector3() },
        uPR0: { value: new THREE.Vector4() }, uPR1: { value: new THREE.Vector4() }, uPR2: { value: new THREE.Vector4() }, uPB01: { value: new THREE.Vector4() }, uPB2: { value: new THREE.Vector2() },
        uPanoSunA: { value: new THREE.Color() }, uPanoSunB: { value: new THREE.Color() }, uPanoAmb: { value: new THREE.Color() }, uPanoRim: { value: new THREE.Color() }, uCT: { value: new THREE.Vector2(0.002, 0.002) }
      };
      var SKY_FS = [
        "uniform vec3 uTop, uHor, uMid, uSun, uSunDir, uMoonDir, uEnvGround; uniform float uNight, uDay, uTime, uOver, uIsEnv, uTwilight, uMoonPhase, uCloudMix, uFlat, uCover, uGexp, uMidK;",
        "uniform sampler2D uClouds; uniform vec2 uRes, uCT; varying vec3 vDir;",
        "uniform sampler2D uPano, uPanoA; uniform float uPanoOn, uSunVisibility; uniform vec3 uPanoRot; uniform vec4 uPR0, uPR1, uPR2, uPB01; uniform vec2 uPB2; uniform vec3 uPanoSunA, uPanoSunB, uPanoAmb, uPanoRim;",
        NOISE,
        "float hash13(vec3 p3){ p3 = fract(p3*0.1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y)*p3.z); }",
        "float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a*vnoise(p); p = p*2.03 + 17.1; a *= 0.5; } return v; }",
        "float vnoise3(vec3 p){ vec3 i = floor(p); vec3 f = fract(p); f = f*f*(3.0-2.0*f);",
        " return mix(mix(mix(hash13(i), hash13(i+vec3(1,0,0)), f.x), mix(hash13(i+vec3(0,1,0)), hash13(i+vec3(1,1,0)), f.x), f.y),",
        "            mix(mix(hash13(i+vec3(0,0,1)), hash13(i+vec3(1,0,1)), f.x), mix(hash13(i+vec3(0,1,1)), hash13(i+vec3(1,1,1)), f.x), f.y), f.z); }",
        "float fbm3(vec3 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a*vnoise3(p); p = p*2.07 + 3.1; a *= 0.5; } return v; }",
        "float starLayer(vec3 d, float scale, float density, float size){",
        " vec3 p = d*scale; vec3 i = floor(p); vec3 f = fract(p);",
        " float h = hash13(i); if (h > density) return 0.0;",
        " vec3 c = vec3(hash13(i + 11.3), hash13(i + 27.1), hash13(i + 51.7))*0.7 + 0.15;",
        " float r = length(f - c);",
        " float b = pow(hash13(i + 91.3), 3.0);",
        " float tw = 0.65 + 0.35*sin(uTime*(1.5 + h*9.0) + h*61.0);",
        " return (1.0 - smoothstep(0.0, size, r))*b*tw;",
        "}",
        // one depth layer of the baked cumulus: R = azimuth/elevation range, B = its band in the atlas, rot = drift
        "vec4 panoLayer(vec3 d, float rot, vec4 R, vec2 B, float mu){",
        " float t = (asin(clamp(d.y, -1.0, 1.0)) - R.z)*R.w;",
        " float m = smoothstep(0.0, 0.012, t)*(1.0 - smoothstep(0.988, 1.0, t));",
        " vec2 uv = vec2((atan(d.x, -d.z) - rot - R.x)*R.y, B.x + clamp(t, 0.0, 1.0)*B.y);",
        " vec3 pe = texture2D(uPano, uv).rgb; float pa = texture2D(uPanoA, uv).r;",
        " pe *= pe;",
        " vec3 pl = pe.r*uPanoSunA + pe.g*uPanoSunB + pe.b*uPanoAmb;",
        // live forward scattering for wherever the cloud has drifted: thin edges toward the sun glow, thick cores darken
        " float ph = pow(mu, 8.0)*0.35 + pow(mu, 48.0)*1.1;",
        " pl = pl*(1.0 - 0.3*ph*smoothstep(0.55, 0.95, pa)*sign(dot(uPanoRim, vec3(1.0)))) + uPanoRim*ph*pa*(1.0 - pa)*(1.0 - pa)*4.0;",
        " float k = m*smoothstep(0.004, 0.03, pa);",
        " float aerial = (0.06 + 0.18*(1.0 - smoothstep(0.0, 0.15, d.y)))*(1.0 - uNight);",
        " pl = mix(pl, mix(uHor, uTop, 0.18)*pa, aerial);",
        " return vec4(pl*k, pa*k);",
        "}",
        "float solarTransmission(vec3 d){",
        " float tr = 1.0;",
        " if (uPanoOn > 0.001) {",
        "  tr *= 1.0 - panoLayer(d,uPanoRot.x,uPR0,uPB01.xy,0.0).a*uPanoOn;",
        "  tr *= 1.0 - panoLayer(d,uPanoRot.y,uPR1,uPB01.zw,0.0).a*uPanoOn;",
        "  tr *= 1.0 - panoLayer(d,uPanoRot.z,uPR2,uPB2,0.0).a*uPanoOn;",
        " }",
        " if (uCloudMix > 0.001 && uIsEnv < 0.5) tr *= 1.0 - texture2D(uClouds,gl_FragCoord.xy/uRes).a*uCloudMix;",
        " return pow(clamp(tr,0.0,1.0),5.0);",
        "}",
        "void main(){",
        " vec3 d = normalize(vDir);",
        " float h = max(d.y, 0.0);",
        " vec3 sd = normalize(uSunDir);",
        " float s = max(dot(d, sd), 0.0);",
        // base gradient + horizon haze
        " float gk = pow(h, mix(uGexp, 0.75, uOver));",
        " vec3 midC = mix((uHor + uTop)*0.5, uMid, uMidK*(1.0 - uOver));",
        " vec3 col = gk < 0.5 ? mix(uHor, midC, gk*2.0) : mix(midC, uTop, gk*2.0 - 1.0);",
        " col = mix(col, uHor*1.06, exp(-h*28.0)*0.35*(1.0 - uNight));",
        " float clearK = 1.0 - uOver*0.85;",
        // Mie glow around the sun, broader when hazy, plus a soft twilight band opposite the sun
        // glow fitted to a photographed low sun: neutral white, very wide falloff
        " vec3 sunW = vec3(dot(uSun, vec3(0.3333)));",
        " col += (uSun*pow(s, 5.0)*0.07 + sunW*(pow(s, 24.0)*0.075 + pow(s, 120.0)*0.19 + pow(s, 900.0)*0.32))*uDay*clearK*(0.12 + 0.88*uSunVisibility);",
        " col += uSun*pow(s, 3.0)*0.22*uDay*uOver;",
        " float anti = max(dot(normalize(vec3(-sd.x, 0.0, -sd.z)), normalize(vec3(d.x, 0.0, d.z))), 0.0);",
        " col += vec3(0.62, 0.42, 0.55)*uTwilight*exp(-abs(d.y - 0.06)*14.0)*(0.35 + 0.65*anti)*0.55*clearK;",
        " col += uSun*uTwilight*exp(-abs(d.y)*9.0)*pow(max(dot(normalize(vec3(sd.x, 0.0, sd.z)), normalize(vec3(d.x, 0.0, d.z))), 0.0), 3.0)*1.4*clearK;",
        " vec2 cirrusUV = d.xz/max(d.y + 0.22, 0.08);",
        " float wisps = fbm(vec2(cirrusUV.x*0.9 + uTime*0.0008, cirrusUV.y*3.8));",
        " float veil = smoothstep(0.59, 0.78, wisps)*smoothstep(0.12, 0.42, d.y)*0.12*(1.0 - uOver)*(1.0 - uNight);",
        " col = mix(col, uHor*0.85 + uSun*0.18, veil);",
        // sun disc with limb darkening
        " float disc = smoothstep(0.999957, 0.999976, s)*smoothstep(-0.03, 0.01, d.y);",
        " col += mix(uSun, vec3(1.0), 0.6)*disc*16.0*uDay*solarTransmission(d)*(1.0 - uOver)*(0.8 + 0.2*smoothstep(0.99988, 0.99998, s));",
        // night sky: stars, Milky Way, moon
        " if (uNight > 0.001 && uIsEnv < 0.5) {",
        "  float nk = uNight*(1.0 - uOver)*smoothstep(-0.02, 0.18, d.y);",
        "  vec3 mwN = vec3(-0.4865, -0.7692, -0.4142);",
        "  float x = dot(d, mwN) + (fbm3(d*3.0 + 5.0) - 0.5)*0.05;",
        "  float band = exp(-x*x/0.014), halo = exp(-x*x/0.07);",
        "  float ck = pow(max(dot(d, vec3(0.3505, 0.2079, -0.9132)), 0.0), 8.0);",
        "  float n1 = fbm3(d*5.0 + 2.0), n2 = fbm3(d*14.0 + 7.0), n3 = fbm3(d*32.0 + 3.0);",
        "  float lanes = smoothstep(0.44, 0.68, fbm3(d*8.0 + 13.0))*exp(-x*x/0.005);",
        "  float mw = band*(0.12 + n1*n1*1.5 + n2*n2*0.9 + n3*n3*0.5)*(1.0 - 0.9*lanes)*(0.55 + 1.3*ck) + halo*0.07*(0.6 + ck);",
        "  vec3 mwc = mix(vec3(0.72, 0.74, 0.86), vec3(1.0, 0.86, 0.7), smoothstep(0.3, 0.75, n1)*band*(0.6 + 0.4*ck));",
        "  col += mwc*mw*0.34*nk;",
        "  float st = starLayer(d, 150.0, 0.32 + band*0.55, 0.11)*(1.0 + band*0.8) + starLayer(d, 80.0, 0.15, 0.09)*2.2 + starLayer(d, 300.0, 0.14 + band*0.8*(1.0 - lanes), 0.16)*(0.55 + band*1.6) + starLayer(d, 220.0, band*0.9*(1.0 - lanes), 0.14)*band*1.4;",
        "  col += vec3(0.95, 0.97, 1.0)*st*2.4*nk;",
        // a bright planet low in the sky, with a soft four-point glint
        "  vec3 pdir = normalize(vec3(-0.0698, 0.1763, -0.9819));",
        "  float pp = max(dot(d, pdir), 0.0);",
        "  vec3 px = normalize(cross(vec3(0.0, 1.0, 0.0), pdir)); vec3 py = cross(pdir, px);",
        "  vec2 pq = vec2(dot(d, px), dot(d, py))*1400.0;",
        "  float glint = (exp(-abs(pq.y)*1.2 - abs(pq.x)*0.1) + exp(-abs(pq.x)*1.2 - abs(pq.y)*0.1))*step(0.0, dot(d, pdir));",
        "  col += vec3(1.0, 0.96, 0.88)*(smoothstep(0.999994, 0.999999, pp)*8.0 + pow(pp, 60000.0)*1.5 + glint*0.35)*nk;",
        "  vec3 md = normalize(uMoonDir);",
        "  float mr = 0.0105;",
        "  vec3 mx = normalize(cross(vec3(0.0, 1.0, 0.0), md)); vec3 my = cross(md, mx);",
        "  vec2 mp = vec2(dot(d, mx), dot(d, my))/mr;",
        "  float ml = length(mp);",
        "  float mk = uNight*(1.0 - uOver*0.9);",
        "  if (ml < 1.0 && dot(d, md) > 0.0) {",
        "   vec3 nrm = vec3(mp, sqrt(max(1.0 - ml*ml, 0.0)));",
        "   float ph = uMoonPhase*6.2831853;",
        "   vec3 Ld = normalize(vec3(sin(ph), 0.15, -cos(ph)));",
        "   float lit = smoothstep(-0.05, 0.12, dot(nrm, Ld));",
        "   float maria = smoothstep(0.42, 0.7, fbm(mp*2.2 + 4.0))*0.45 + smoothstep(0.55, 0.75, fbm(mp*6.0 + 9.0))*0.15;",
        "   vec3 mcol = vec3(1.0, 0.97, 0.9)*(1.0 - maria)*(0.75 + 0.25*nrm.z);",
        "   col = mix(col, mcol*(lit*2.6 + 0.035), (1.0 - smoothstep(0.94, 1.0, ml))*mk);",
        "  }",
        "  float mg = max(dot(d, md), 0.0);",
        "  col += vec3(0.75, 0.8, 0.95)*(pow(mg, 900.0)*0.4 + pow(mg, 260.0)*0.1 + pow(mg, 40.0)*0.015)*mk*(0.3 + 0.7*sin(uMoonPhase*3.14159));",
        " }",
        // fair-weather cumulus baked offline (volumetric, three light passes) and relit with the live sun, moon and sky
        // three depth layers (far, middle, near) drifting at their own angular speeds, composited back to front
        " if (uPanoOn > 0.001 && d.y > -0.03) {",
        "  float pmu = max(dot(d, sd), 0.0);",
        "  vec4 pf = panoLayer(d, uPanoRot.z, uPR2, uPB2, pmu);",
        "  col = col*(1.0 - pf.a*uPanoOn) + pf.rgb*uPanoOn;",
        "  vec4 pm = panoLayer(d, uPanoRot.y, uPR1, uPB01.zw, pmu);",
        "  col = col*(1.0 - pm.a*uPanoOn) + pm.rgb*uPanoOn;",
        "  vec4 pn = panoLayer(d, uPanoRot.x, uPR0, uPB01.xy, pmu);",
        "  col = col*(1.0 - pn.a*uPanoOn) + pn.rgb*uPanoOn;",
        " }",
        // clouds: half-resolution raymarched layer (or a cheap 2D layer for the environment map / WebGL1)
        " if (uFlat > 0.5 && d.y > -0.02) {",
        "  vec2 uv = d.xz/(max(d.y, 0.0) + 0.1)*1.3 + vec2(uTime*0.010, uTime*0.004);",
        "  float c = fbm(uv);",
        "  float cov = smoothstep(0.66 - uOver*0.52, 0.92 - uOver*0.34, c);",
        "  vec3 cc = mix(uHor, uTop, 0.35)*(0.95 + 0.25*c) + uSun*0.25*uDay;",
        "  col = mix(col, cc, cov*mix(smoothstep(-0.02, 0.2, d.y), smoothstep(0.1, 0.45, d.y)*0.5, uIsEnv)*0.8);",
        " }",
        " if (uCloudMix > 0.001 && uIsEnv < 0.5) {",
        "  vec2 cuv = gl_FragCoord.xy/uRes;",
        "  vec4 cl = texture2D(uClouds, cuv)*0.36 + (texture2D(uClouds, cuv + uCT*vec2(0.9, 0.9)) + texture2D(uClouds, cuv + uCT*vec2(-0.9, 0.9)) + texture2D(uClouds, cuv + uCT*vec2(0.9, -0.9)) + texture2D(uClouds, cuv - uCT*0.9))*0.16;",
        "  col = col*(1.0 - cl.a*uCloudMix) + cl.rgb*uCloudMix;",
        " }",
        " if (d.y < -0.02) col = mix(uHor, uEnvGround, uIsEnv*smoothstep(-0.02, -0.3, d.y));",
        " gl_FragColor = vec4(col, 1.0);", OUT,
        "}"
      ].join("\n");
      var skyMat = keep(new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false, uniforms: skyU,
        vertexShader: "varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
        fragmentShader: SKY_FS
      }));
      var sky = new THREE.Mesh(keep(new THREE.SphereGeometry(4000, 48, 24)), skyMat);
      sky.renderOrder = -2; sky.frustumCulled = false;
      skyGroup.add(sky);
      // image-based lighting from the live sky (2D cloud layer; no stars)
      var pmrem = new THREE.PMREMGenerator(renderer);
      var envScene = new THREE.Scene();
      var envU = Object.assign({}, skyU, { uIsEnv: { value: 1 }, uFlat: { value: 1 }, uCloudMix: { value: 0 } });
      var envSkyMat = keep(new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: envU, vertexShader: skyMat.vertexShader, fragmentShader: SKY_FS }));
      envScene.add(new THREE.Mesh(sky.geometry, envSkyMat));
      var envRT = null, envKey = "", envTimer = 0, reflectionGround=null, reflectionTree=null, reflectionSun=null, reflectionHemi=null;
      function updateEnv() {
        if(!reflectionGround && ground && tree){
          reflectionGround=new THREE.Mesh(ground.geometry,keep(new THREE.MeshStandardMaterial({color:0x596340,roughness:1})));envScene.add(reflectionGround);
          reflectionTree=new THREE.Group();
          // Rough reflections need the tree silhouette, not every animated leaf six times.
          var rm=keep(new THREE.MeshStandardMaterial({color:0x27451d,roughness:1}));
          [[0,5,0,2.7],[1.7,5.1,.4,1.7],[-1.5,4.8,-.3,1.8],[0,6.4,0,1.8]].forEach(function(p){var m=new THREE.Mesh(keep(new THREE.SphereGeometry(p[3],10,7)),rm);m.position.set(p[0],p[1],p[2]);reflectionTree.add(m);});
          envScene.add(reflectionTree);
          reflectionTree.traverse(function(o){o.castShadow=false;o.receiveShadow=false;});
          reflectionSun=new THREE.DirectionalLight();envScene.add(reflectionSun);
          reflectionHemi=new THREE.HemisphereLight();envScene.add(reflectionHemi);
        }
        if(reflectionGround){
          reflectionGround.position.set(-van.position.x,-van.position.y-1.15,-van.position.z);
          reflectionGround.material.color.copy(PC.tip).multiplyScalar(0.38).lerp(new THREE.Color(0.6,0.63,0.68),P.snow);
          reflectionTree.position.copy(tree.position).sub(van.position);reflectionTree.position.y-=1.15;
          reflectionSun.position.copy(U.uSunDir.value);reflectionSun.color.copy(U.uSunC.value);reflectionSun.intensity=0.9;
          reflectionHemi.color.copy(U.uAmbC.value);reflectionHemi.groundColor.copy(PC.base);reflectionHemi.intensity=0.9;
        }
        var rt = pmrem.fromScene(envScene, 0, 0.15, 10000);
        scene.environment = rt.texture;
        if (envRT) envRT.dispose();
        envRT = rt;
      }

      /* volumetric clouds: tileable Perlin-Worley 3D noise generated once, raymarched at half resolution */
      var cloudsOK = false, cloudNoise = null;
      var cloudU = {
        uNoise: U.uCloudNoise, uInvVP: { value: new THREE.Matrix4() }, uCamPos: { value: new THREE.Vector3() },
        uLightDir: { value: new THREE.Vector3(0, 1, 0) }, uLightC: { value: new THREE.Color() }, uAmbTop: { value: new THREE.Color() }, uAmbHor: { value: new THREE.Color() },
        uFogC: { value: new THREE.Color() }, uCoverage: U.uCloudCov, uDensity: { value: 1 }, uTime: U.uCloudT, uFrame: { value: 0 }, uDark: { value: 0 },
        uBottom: { value: 1150 }, uTop: { value: 2550 }, uSteps: { value: opts.quality === "ultra" ? 64 : 40 }
      };
      function buildCloudNoise() {
        var N = 64, data = new Uint8Array(N * N * N * 4), r = mulberry(1234);
        function grid(C) { var g = new Float32Array(C * C * C * 3); for (var i = 0; i < g.length; i++) g[i] = r(); return g; }
        function worley(x, y, z, C, g) {
          var px = x * C, py = y * C, pz = z * C, ix = Math.floor(px), iy = Math.floor(py), iz = Math.floor(pz), best = 9;
          for (var dz = -1; dz <= 1; dz++) for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
            var cx = ix + dx, cy = iy + dy, cz = iz + dz;
            var wx = ((cx % C) + C) % C, wy = ((cy % C) + C) % C, wz = ((cz % C) + C) % C, k = ((wz * C + wy) * C + wx) * 3;
            var fx = cx + g[k] - px, fy = cy + g[k + 1] - py, fz = cz + g[k + 2] - pz, dd = fx * fx + fy * fy + fz * fz;
            if (dd < best) best = dd;
          }
          return Math.min(1, Math.sqrt(best));
        }
        var grads = [];
        for (var gi = 0; gi < 256; gi++) { var th = r() * 6.2832, ph = Math.acos(2 * r() - 1); grads.push([Math.sin(ph) * Math.cos(th), Math.sin(ph) * Math.sin(th), Math.cos(ph)]); }
        function ghash(x, y, z, P) { x = ((x % P) + P) % P; y = ((y % P) + P) % P; z = ((z % P) + P) % P; return grads[(x * 73856093 ^ y * 19349663 ^ z * 83492791) & 255]; }
        function perlin(x, y, z, P) {
          var px = x * P, py = y * P, pz = z * P, ix = Math.floor(px), iy = Math.floor(py), iz = Math.floor(pz);
          var fx = px - ix, fy = py - iy, fz = pz - iz;
          var ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10), uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10), uz = fz * fz * fz * (fz * (fz * 6 - 15) + 10);
          var v = [];
          for (var c = 0; c < 8; c++) {
            var ox = c & 1, oy = (c >> 1) & 1, oz = (c >> 2) & 1, gg = ghash(ix + ox, iy + oy, iz + oz, P);
            v.push(gg[0] * (fx - ox) + gg[1] * (fy - oy) + gg[2] * (fz - oz));
          }
          var x0 = v[0] + (v[1] - v[0]) * ux, x1 = v[2] + (v[3] - v[2]) * ux, x2 = v[4] + (v[5] - v[4]) * ux, x3 = v[6] + (v[7] - v[6]) * ux;
          var y0 = x0 + (x1 - x0) * uy, y1 = x2 + (x3 - x2) * uy;
          return y0 + (y1 - y0) * uz;
        }
        var g4 = grid(4), g8 = grid(8), g16 = grid(16), g32 = grid(32);
        for (var z = 0; z < N; z++) for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
          var fx = x / N, fy = y / N, fz = z / N;
          var pn = perlin(fx, fy, fz, 4) * 0.55 + perlin(fx, fy, fz, 8) * 0.3 + perlin(fx, fy, fz, 16) * 0.15;
          pn = Math.min(1, Math.max(0, pn * 0.9 + 0.5));
          var w1 = 1 - worley(fx, fy, fz, 4, g4), w2 = 1 - worley(fx, fy, fz, 8, g8), w3 = 1 - worley(fx, fy, fz, 16, g16);
          var wf = w1 * 0.625 + w2 * 0.25 + w3 * 0.125;
          var pw = Math.min(1, Math.max(0, wf + pn * (1 - wf) * 0.9 - 0.25) * 1.3);
          var w4 = 1 - worley(fx, fy, fz, 32, g32);
          var det = w2 * 0.625 + w3 * 0.25 + w4 * 0.125;
          var o = ((z * N + y) * N + x) * 4;
          data[o] = Math.round(pw * 255); data[o + 1] = Math.round(det * 255); data[o + 2] = Math.round(wf * 255); data[o + 3] = 255;
        }
        var tex = new THREE.DataTexture3D(data, N, N, N);
        tex.format = THREE.RGBAFormat; tex.type = THREE.UnsignedByteType;
        tex.minFilter = tex.magFilter = THREE.LinearFilter; tex.wrapS = tex.wrapT = tex.wrapR = THREE.RepeatWrapping;
        tex.unpackAlignment = 1; tex.needsUpdate = true;
        return keep(tex);
      }
      var CLOUD_FS = [
        "precision highp sampler3D;",
        "uniform sampler3D uNoise; uniform mat4 uInvVP; uniform vec3 uCamPos, uLightDir, uLightC, uAmbTop, uAmbHor, uFogC;",
        "uniform float uCoverage, uDensity, uTime, uFrame, uBottom, uTop, uDark, uSteps; varying vec2 vUv;",
        "float remap(float v, float a, float b, float c, float d){ return c + (v - a)*(d - c)/max(b - a, 1e-4); }",
        "float ign(vec2 p){ return fract(52.9829189*fract(dot(p + uFrame*5.588238, vec2(0.06711056, 0.00583715)))); }",
        "float HG(float c, float g){ float g2 = g*g; return (1.0 - g2)/pow(1.0 + g2 - 2.0*g*c, 1.5); }",
        "float dens(vec3 p, float detail){",
        " float h = (p.y - uBottom)/(uTop - uBottom);",
        " if (h < 0.0 || h > 1.0) return 0.0;",
        " vec3 w = vec3(-uTime*11.0, 0.0, uTime*1.5);",
        " vec4 n = texture(uNoise, (p + w)*0.0001);",
        " float big = texture(uNoise, (p + w*0.6)*0.000045 + vec3(0.37, 0.11, 0.73)).b;",
        " float prof = smoothstep(0.0, 0.09, h)*(1.0 - smoothstep(mix(0.32, 0.6, uCoverage), 1.0, h));",
        " float cov = clamp(uCoverage + (big - 0.5)*0.32, 0.0, 1.0);",
        " float b = remap(n.r*prof, 1.0 - cov, 1.0, 0.0, 1.0);",
        " if (b <= 0.0) return 0.0;",
        " if (detail > 0.5) {",
        "  float dn = texture(uNoise, (p + w*1.6)*0.00078).g;",
        "  b = remap(b, (1.0 - dn)*mix(0.4, 0.18, h), 1.0, 0.0, 1.0);",
        " }",
        " return clamp(b, 0.0, 1.0)*uDensity;",
        "}",
        "void main(){",
        " vec4 wp = uInvVP*vec4(vUv*2.0 - 1.0, 1.0, 1.0);",
        " vec3 rd = normalize(wp.xyz/wp.w - uCamPos);",
        " if (rd.y < 0.01) { gl_FragColor = vec4(0.0); return; }",
        " float t0 = (uBottom - uCamPos.y)/rd.y, t1 = (uTop - uCamPos.y)/rd.y;",
        " float tmax = 30000.0; if (t0 > tmax) { gl_FragColor = vec4(0.0); return; }",
        " t1 = min(t1, tmax);",
        " float st = (t1 - t0)/uSteps;",
        " float t = t0 + st*ign(gl_FragCoord.xy);",
        " float mu = dot(rd, uLightDir);",
        " float phase = mix(HG(mu, 0.6), HG(mu, -0.15), 0.5);",
        " vec3 col = vec3(0.0); float T = 1.0; float tw = 0.0; float wsum = 0.0;",
        " for (int i = 0; i < 64; i++) {",
        "  if (float(i) >= uSteps || T < 0.02) break;",
        "  vec3 p = uCamPos + rd*t;",
        "  float d = dens(p, 1.0);",
        "  if (d > 0.003) {",
        "   float ld = 0.0;",
        "   for (int j = 0; j < 4; j++) { float ls = 70.0*(1.0 + float(j)*1.4); ld += dens(p + uLightDir*ls*(float(j) + 0.6), 0.0)*ls; }",
        "   float Tl = exp(-ld*0.012);",
        "   float Tms = exp(-ld*0.0022);",
        "   float powder = 1.0 - exp(-d*8.0);",
        "   float h = (p.y - uBottom)/(uTop - uBottom);",
        "   vec3 amb = mix(uAmbHor, uAmbTop, clamp(h*1.3, 0.0, 1.0))*(0.45 + 0.55*h);",
        "   vec3 S = uLightC*(Tl*phase + Tms*0.32)*mix(0.55, 1.0, powder) + amb*0.95;",
        "   S *= 1.0 - uDark*0.55;",
        "   float sig = d*0.011;",
        "   float dT = exp(-sig*st);",
        "   col += T*S*(1.0 - dT);",
        "   tw += t*T*(1.0 - dT); wsum += T*(1.0 - dT);",
        "   T *= dT;",
        "  }",
        "  t += st;",
        " }",
        " float dist = wsum > 0.0 ? tw/wsum : t0;",
        " float fog = 1.0 - exp(-dist/16000.0);",
        " float a = 1.0 - T;",
        " col = mix(col, uFogC*a, fog);",
        " gl_FragColor = vec4(col, a);",
        "}"
      ].join("\n");
      var cloudMat = keep(new THREE.ShaderMaterial({
        uniforms: cloudU, depthTest: false, depthWrite: false,
        vertexShader: "varying vec2 vUv; void main(){ vUv = position.xy*0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }",
        fragmentShader: CLOUD_FS
      }));
      var cloudScene = new THREE.Scene(), cloudCam = new THREE.Camera();
      var cloudTri = new THREE.BufferGeometry();
      cloudTri.setAttribute("position", new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
      keep(cloudTri);
      var cloudQuad = new THREE.Mesh(cloudTri, cloudMat); cloudQuad.frustumCulled = false; cloudScene.add(cloudQuad);
      var cloudScale = opts.quality === "ultra" ? 0.66 : (narrowScreen ? 0.4 : 0.5);
      if (isGL2 && opts.clouds !== false && THREE.DataTexture3D) {
        setTimeout(function () {
          try { cloudNoise = buildCloudNoise(); cloudU.uNoise.value = cloudNoise; cloudsOK = true; U.uCloudOn.value = 1; }
          catch (e) { console.warn("MeadowHero: volumetric clouds unavailable", e); }
        }, 30);
      }
      var vpInv = new THREE.Matrix4(), cloudFrame = 0;
      function renderClouds() {
        if (!cloudsOK) return;
        renderer.getDrawingBufferSize(drawSize);
        var w = Math.max(2, Math.round(drawSize.x * cloudScale)), h = Math.max(2, Math.round(drawSize.y * cloudScale));
        if (cloudRT.width !== w || cloudRT.height !== h) cloudRT.setSize(w, h);
        skyU.uRes.value.copy(drawSize); skyU.uCT.value.set(1 / w, 1 / h);
        camera.updateMatrixWorld();
        vpInv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).invert();
        cloudU.uInvVP.value.copy(vpInv); cloudU.uCamPos.value.setFromMatrixPosition(camera.matrixWorld);
        cloudU.uFrame.value = 0;
        var prev = renderer.getRenderTarget(), ptm = renderer.toneMapping;
        renderer.toneMapping = THREE.NoToneMapping;
        renderer.setRenderTarget(cloudRT); renderer.render(cloudScene, cloudCam);
        renderer.setRenderTarget(prev); renderer.toneMapping = ptm;
      }


      /* ---------- lights for standard materials ---------- */
      var hemi = new THREE.HemisphereLight(0xffffff, 0x3a5a22, 0.8);
      scene.add(hemi);
      var sunLight = new THREE.DirectionalLight(0xffffff, 1);
      scene.add(sunLight); scene.add(sunLight.target);
      if (shadowsOn) {
        sunLight.castShadow = true;
        var shadowSize = opts.quality === "ultra" ? 4096 : ((narrowScreen || autoQ) ? 1024 : 2048);
        sunLight.shadow.mapSize.set(shadowSize, shadowSize);
        var sc0 = sunLight.shadow.camera; sc0.left = -22; sc0.right = 22; sc0.top = 22; sc0.bottom = -22; sc0.near = 1; sc0.far = 160;
        sunLight.shadow.bias = -0.00025; sunLight.shadow.normalBias = 0.035;
      }
      var vanPoint = new THREE.PointLight(0xffa654, 0, 14, 2);
      scene.add(vanPoint);
      var faceFill=new THREE.PointLight(0xe7edf4,0,1.5,2);scene.add(faceFill);
      var lanternLight = new THREE.PointLight(0xffb469, 0, 6, 2);
      scene.add(lanternLight);

      // one set of constants shades the blades and, past the blades, the meadow floor seen as a canopy,
      // so the far meadow can't look like a different kind of grass
      var GRK = { mix: 0.62, cb: 0.72, aNear: 0.62, aFar: 0.62, sNear: 0.29, sFar: 0.36, tr: 0.28, sheen: 0.56 };
      function gk(v) { return (+v).toFixed(4); }
      var CANOPY = function () {
        return [
          "vec3 canopyColor(vec3 W, vec3 V, vec3 Ld, float sh, float wave){",
          " float dkc = smoothstep(0.42, 0.78, vnoise(W.xz*0.055 + 3.7));",
          " vec3 calb = mix(mix(uBase, uTip, " + gk(GRK.mix) + "), uDry, dkc*0.17)*(0.93 + 0.14*vnoise(W.xz*0.9 + 1.7))*(1.0 - uWet*0.25);",
          " vec3 Vh = normalize(vec3(V.x, 0.0, V.z) + vec3(0.0, 0.001, 0.0));",
          " vec3 Nc = normalize(Vh*0.6 + vec3(0.0, 0.75, 0.0));",
          " float cndl = dot(Nc, Ld);",
          " vec3 cdiff = vec3(clamp(cndl*0.4 + 0.6, 0.0, 1.0)) + clamp(-cndl, 0.0, 1.0)*0.62*vec3(0.95, 1.0, 0.6);",
          " float ctrans = pow(clamp(dot(V, -Ld), 0.0, 1.0), 3.0)*0.85;",
          " vec3 cc = (calb*uAmbC*" + gk(GRK.aFar) + " + calb*uSunC*cdiff*sh*" + gk(GRK.sFar) + " + calb*uSunC*ctrans*uTransK*" + gk(GRK.tr * 0.5) + "*sh*vec3(0.85, 1.0, 0.42))*" + gk(GRK.cb) + ";",
          " float Fc = 0.03 + 0.15*pow(1.0 - abs(dot(Nc, V)), 4.0);",
          " cc += mix(uFogC, uAmbC*1.3, 0.5)*Fc*" + gk(GRK.sheen) + ";",
          " return cc*(1.0 + (wave - 0.5)*0.16);",
          "}"
        ].join("\n");
      };
      var MEADOW_WAVE = "vec2 mwd = normalize(vec2(1.0, 0.35)); float mwave = vnoise(vW.xz*0.035 - mwd*uTime*0.9)*0.6 + vnoise(vW.xz*0.11 - mwd*uTime*1.6)*0.4;";
      /* ---------- terrain: flat meadow in front, rolling hills behind ---------- */
      var TREE_HOME = new THREE.Vector3(7.5, 0, -42), VAN_HOME = new THREE.Vector3(-1.2, 0, -14), VAN_ROT = -2.25;
      var FOCUS = new THREE.Vector2(3, -50);
      function hh2(x, z) { var s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
      function vn2(x, z) {
        var ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
        var ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
        var a = hh2(ix, iz), b = hh2(ix + 1, iz), c = hh2(ix, iz + 1), d = hh2(ix + 1, iz + 1);
        return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
      }
      function fbm2(x, z, o) { var v = 0, a = 0.5, n = 0; for (var k = 0; k < o; k++) { v += a * vn2(x, z); n += a; x = x * 2.03 + 17.1; z = z * 2.03 - 9.7; a *= 0.5; } return v / n; }
      function terrainH(x, z) {
        var dx = x - FOCUS.x, dz = z - FOCUS.y, d = Math.sqrt(dx * dx + dz * dz);
        // gentle undulation of the meadow, levelled under the van and the tree
        var dv = Math.hypot(x - VAN_HOME.x, z - VAN_HOME.z), dt = Math.hypot(x - TREE_HOME.x, z - TREE_HOME.z);
        var u = (fbm2(x * 0.03 + 11.3, z * 0.03 - 7.1, 3) - 0.5) * 1.6 * smooth(6, 16, dv) * smooth(5, 12, dt) * smooth(4, 14, Math.hypot(x, z - 8));
        // rolling hills behind the meadow, bigger downs further away
        var hw = smooth(46, 170, d);
        var hills = (fbm2(x * 0.0038 + 3.7, z * 0.0038 + 1.3, 5) - 0.36) * 50 * hw;
        var far = smooth(180, 900, d) * (fbm2(x * 0.0017 - 5.2, z * 0.0017 + 9.4, 3) - 0.2) * 120;
        return u + Math.max(hills, -3 * hw) + Math.max(far, 0);
      }
      function terrainN(x, z, e) {
        var hx = terrainH(x + e, z) - terrainH(x - e, z), hz = terrainH(x, z + e) - terrainH(x, z - e);
        return new THREE.Vector3(-hx, 2 * e, -hz).normalize();
      }
      // polar grid centred on the camera: fine near, coarse far
      var TRINGS = 190, TSEG = narrowScreen ? 150 : 210, tcx = 0, tcz = 8, tth = 2.3;
      var tpos = new Float32Array(TRINGS * TSEG * 3), tnor = new Float32Array(TRINGS * TSEG * 3), tidx = [];
      for (var ri = 0; ri < TRINGS; ri++) {
        var rr = ri === 0 ? 0.01 : 0.35 * Math.pow(1.05, ri);
        for (var si = 0; si < TSEG; si++) {
          var th = -tth + 2 * tth * si / (TSEG - 1);
          var vx = tcx + rr * Math.sin(th), vz = tcz - rr * Math.cos(th), vy = terrainH(vx, vz);
          var nn = terrainN(vx, vz, Math.max(0.3, rr * 0.012));
          var o3 = (ri * TSEG + si) * 3;
          tpos[o3] = vx; tpos[o3 + 1] = vy; tpos[o3 + 2] = vz;
          tnor[o3] = nn.x; tnor[o3 + 1] = nn.y; tnor[o3 + 2] = nn.z;
          if (ri > 0 && si > 0) {
            var a1 = (ri - 1) * TSEG + si - 1, b1 = (ri - 1) * TSEG + si, c1 = ri * TSEG + si - 1, d1 = ri * TSEG + si;
            tidx.push(a1, b1, c1, b1, d1, c1);
          }
        }
      }
      // the countryside past the meadow: a gently warped grid of fields with hedgerows and a few copses.
      // The same map drives the ground shader and where the distant trees stand.
      var FLD = { c: Math.cos(0.38), s: Math.sin(0.38), cx: 84, cz: 60, N: 64 };
      function fieldWarpX(qz) { return Math.sin(qz * 0.021 + 1.3) * 9 + Math.sin(qz * 0.047 + 0.4) * 3; }
      function fieldWarpZ(qx) { return Math.sin(qx * 0.017 + 0.7) * 7 + Math.sin(qx * 0.051 + 2.1) * 2.5; }
      function fieldInv(qx, qz, out) {
        var ux = qx, uz = qz;
        for (var it = 0; it < 8; it++) { var nx = qx - fieldWarpX(uz), nz = qz - fieldWarpZ(ux); ux = nx; uz = nz; }
        out.x = FLD.c * ux + FLD.s * uz; out.y = -FLD.s * ux + FLD.c * uz;
        return out;
      }
      var fieldData = new Uint8Array(FLD.N * FLD.N * 4), rFd = mulberry(4242), fcTmp = new THREE.Vector2();
      function fieldCell(i, j) { i = ((i % FLD.N) + FLD.N) % FLD.N; j = ((j % FLD.N) + FLD.N) % FLD.N; return (j * FLD.N + i) * 4; }
      for (var fj = -32; fj < 32; fj++) for (var fi = -32; fi < 32; fi++) {
        var fo = fieldCell(fi, fj);
        fieldInv((fi + 0.5) * FLD.cx, (fj + 0.5) * FLD.cz, fcTmp);
        var fcd = Math.hypot(fcTmp.x - tcx, fcTmp.y - tcz);
        fieldData[fo] = Math.floor(rFd() * 256);
        fieldData[fo + 1] = rFd() < 0.64 ? 255 : 0;
        fieldData[fo + 2] = rFd() < 0.56 ? 255 : 0;
        var woodP = 0.06 + 0.16 * smooth(0.55, 0.75, fbm2(fcTmp.x * 0.0021 + 7.7, fcTmp.y * 0.0021 - 3.1, 3)) + 0.12 * smooth(900, 2000, fcd);
        fieldData[fo + 3] = (fcd > 190 && rFd() < woodP) ? 255 : 0;
      }
      // copses stay separate (no shared edges), so each reads as its own wood
      for (fj = -32; fj < 32; fj++) for (fi = -32; fi < 32; fi++) {
        fo = fieldCell(fi, fj);
        if (fieldData[fo + 3] && (fieldData[fieldCell(fi - 1, fj) + 3] || fieldData[fieldCell(fi, fj - 1) + 3])) fieldData[fo + 3] = 0;
      }
      var fieldTex = keep(new THREE.DataTexture(fieldData, FLD.N, FLD.N, THREE.RGBAFormat));
      fieldTex.minFilter = fieldTex.magFilter = THREE.NearestFilter; fieldTex.wrapS = fieldTex.wrapT = THREE.RepeatWrapping;
      fieldTex.generateMipmaps = false; fieldTex.needsUpdate = true;
      var fieldU = { uFields: { value: fieldTex }, uLeafA: { value: PC.leafA }, uLeafB: { value: PC.leafB }, uLeafAmt: { value: 1 } };
      var FIELD_GLSL = [
        "uniform sampler2D uFields; uniform vec3 uLeafA, uLeafB; uniform float uLeafAmt;",
        "const vec2 FCS = vec2(84.0, 60.0);",
        "vec2 fieldQ(vec2 p){",
        " vec2 q0 = vec2(" + FLD.c.toFixed(6) + "*p.x - " + FLD.s.toFixed(6) + "*p.y, " + FLD.s.toFixed(6) + "*p.x + " + FLD.c.toFixed(6) + "*p.y);",
        " return q0 + vec2(sin(q0.y*0.021 + 1.3)*9.0 + sin(q0.y*0.047 + 0.4)*3.0, sin(q0.x*0.017 + 0.7)*7.0 + sin(q0.x*0.051 + 2.1)*2.5);",
        "}",
        // metres to the nearest hedged edge of the field containing q; also the field's data and the position inside it
        "float hedgeDist(vec2 q, out vec4 cd, out vec2 m){",
        " vec2 g = q/FCS; vec2 cell = floor(g);",
        " cd = texture2D(uFields, (cell + 0.5)/64.0);",
        " vec4 dE = texture2D(uFields, (cell + vec2(1.5, 0.5))/64.0);",
        " vec4 dN = texture2D(uFields, (cell + vec2(0.5, 1.5))/64.0);",
        " m = (g - cell)*FCS; vec2 mo = FCS - m;",
        " float e = 1e4;",
        " if (cd.g > 0.5) e = min(e, m.x);",
        " if (dE.g > 0.5) e = min(e, mo.x);",
        " if (cd.b > 0.5) e = min(e, m.y);",
        " if (dN.b > 0.5) e = min(e, mo.y);",
        " return e;",
        "}",
        "float woodAmt(vec4 cd, vec2 m, vec2 q){",
        " if (cd.a < 0.5) return 0.0;",
        " vec2 mo = FCS - m; float inner = min(min(m.x, mo.x), min(m.y, mo.y));",
        " return smoothstep(0.0, 6.0, inner - 2.0 + (vnoise(q*0.07) - 0.5)*14.0);",
        "}",
        // how much of a point lies in the shade of hedges and copses (they stand ~2.5 m and ~13 m tall)
        "float fieldShade(vec2 p, vec3 L){",
        " vec2 sxz = L.xz/max(length(L.xz), 1e-3); float tanE = L.y/max(length(L.xz), 1e-3);",
        " float lh = clamp(2.5/max(tanE, 0.08), 0.0, 22.0), lw = clamp(13.0/max(tanE, 0.08), 0.0, 70.0);",
        " vec4 cd; vec2 m; float s = 0.0;",
        " vec2 q1 = fieldQ(p + sxz*lh*0.55); float e1 = hedgeDist(q1, cd, m);",
        " s = max(s, (1.0 - smoothstep(0.8, 2.6, e1))*smoothstep(0.2, 0.42, vnoise(q1*0.045 + 3.0))*smoothstep(175.0, 260.0, length(p - vec2(0.0, 8.0)))*0.7);",
        " vec2 q2 = fieldQ(p + sxz*lw*0.5); hedgeDist(q2, cd, m); s = max(s, woodAmt(cd, m, q2));",
        " vec2 q3 = fieldQ(p + sxz*lw); hedgeDist(q3, cd, m); s = max(s, woodAmt(cd, m, q3)*0.85);",
        " return s;",
        "}"
      ].join("\n");
      var groundGeo = keep(new THREE.BufferGeometry());
      groundGeo.setAttribute("position", new THREE.BufferAttribute(tpos, 3));
      groundGeo.setAttribute("normal", new THREE.BufferAttribute(tnor, 3));
      groundGeo.setIndex(tidx);
      var groundMat = shaderMat(fieldU,
        "uniform float uFogD; varying vec3 vW; varying vec3 vN; varying float vFog; varying float vDist; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; vN = normal; vec4 mv = viewMatrix*w; float d = -mv.z; vDist = d; vFog = 1.0 - exp(-uFogD*d); gl_Position = projectionMatrix*mv; }",
        [
          "uniform vec3 uBase, uDry, uTip; uniform float uTime; varying vec3 vW; varying vec3 vN; varying float vFog; varying float vDist;",
          NOISE, LIGHT, SHADOW, CLOUDSH, HEADL, FIELD_GLSL, CANOPY(),
          "void main(){",
          " float n = vnoise(vW.xz*0.35)*0.5 + vnoise(vW.xz*0.07)*0.5;",
          " float big = vnoise(vW.xz*0.012 + 2.0);",
          " float dk = smoothstep(0.42, 0.78, vnoise(vW.xz*0.055 + 3.7));",
          " float far = smoothstep(20.0, 140.0, vDist);",
          // the meadow floor: dark between the near blades, the colour of the grass canopy further out
          " vec3 green = mix(uBase*1.15, mix(uBase, uTip, 0.6), far);",
          " vec3 alb = mix(green, mix(uDry*0.35, uDry*0.75, far), dk*mix(0.25, 0.45, far)) * (0.8 + 0.4*mix(n, big, far));",
          " vec3 N = normalize(vN); vec3 Ld = normalize(uSunDir); vec3 V = normalize(cameraPosition - vW);",
          // beyond the meadow: fields, hedgerows and copses
          " float fk = smoothstep(105.0, 165.0, length(vW.xz - vec2(0.0, 8.0)));",
          " float fshade = 0.0, wood = 0.0, hedge = 0.0;",
          " if (fk > 0.001) {",
          "  vec2 q = fieldQ(vW.xz); vec4 cd; vec2 m;",
          "  float e = hedgeDist(q, cd, m);",
          "  float detail = 1.0 - smoothstep(1400.0, 2600.0, vDist);",
          "  float t = cd.r;",
          "  vec3 pasture = mix(uBase, uTip, 0.5), lush = mix(uBase, uTip, 0.7)*1.04, rough = mix(uBase, uTip, 0.3)*1.1;",
          "  vec3 hay = mix(mix(uBase, uTip, 0.6), uDry, 0.6)*1.08;",
          "  float rows = mix(1.0, 0.9 + 0.1*sin(m.y*1.3), 1.0 - smoothstep(220.0, 480.0, vDist));",
          "  vec3 fc = t < 0.34 ? pasture : (t < 0.6 ? lush : (t < 0.82 ? rough : hay*rows));",
          "  fc = mix(mix(uBase, uTip, 0.5), fc, smoothstep(150.0, 270.0, length(vW.xz - vec2(0.0, 8.0))));",
          "  fc *= (0.86 + 0.28*vnoise(vW.xz*0.045 + t*40.0))*(0.9 + 0.2*vnoise(vW.xz*0.23 + 5.0));",
          "  fc = mix(mix(uBase, uTip, 0.42), fc, detail);",
          "  float hn = vnoise(q*0.21), hgap = smoothstep(0.2, 0.42, vnoise(q*0.045 + 3.0));",
          "  float aa = clamp(fwidth(e), 0.15, 8.0), hw = (0.7 + 1.5*hn)*hgap;",
          "  float wd = length(vW.xz - vec2(0.0, 8.0));",
          "  hedge = (1.0 - smoothstep(hw - aa, hw + aa, e))*min(1.0, hw/aa)*detail*smoothstep(175.0, 260.0, wd);",
          "  wood = woodAmt(cd, m, q);",
          "  vec3 canopy = mix(vec3(0.05, 0.042, 0.034), mix(uLeafA, uLeafB, 0.3 + 0.5*vnoise(vW.xz*0.25))*0.42, uLeafAmt);",
          "  canopy *= 0.65 + 0.6*vnoise(vW.xz*0.33);",
          "  vec3 hedgeC = mix(uBase*1.6, uLeafA*0.55, 0.5)*(0.75 + 0.5*hn);",
          "  vec3 fieldAlb = mix(mix(fc, hedgeC, hedge), canopy, wood);",
          // far ridges are mostly wooded and read darker through the haze
          "  fieldAlb = mix(fieldAlb, mix(uBase*1.2, uLeafA*0.35, 0.4), smoothstep(1100.0, 2600.0, vDist)*0.6);",
          "  fieldAlb = mix(vec3(dot(fieldAlb, vec3(0.3, 0.59, 0.11))), fieldAlb, 0.78)*0.84;",
          "  alb = mix(alb, fieldAlb, fk);",
          "  fshade = fieldShade(vW.xz, Ld)*fk*detail;",
          " }",
          " float micro = vnoise(vW.xz*3.6)*0.6 + vnoise(vW.xz*12.0)*0.4;",
          " alb *= mix(0.86 + micro*0.28, 1.0, smoothstep(15.0, 80.0, vDist));",
          " alb *= 1.0 - uWet*0.35;",
          " float sn = clamp(uSnow*(0.85 + 0.3*vnoise(vW.xz*0.6)), 0.0, 1.0)*(1.0 - max(wood, hedge)*0.6);",
          " alb = mix(alb, vec3(0.80, 0.83, 0.88)*(0.92 + 0.08*n), sn);",
          // low sun models the hills: more contrast between sunny and shaded slopes away from the meadow
          " float diff = mix(clamp(dot(N, Ld)*0.6 + 0.4, 0.0, 1.0), clamp(dot(N, Ld)*0.9 + 0.1, 0.0, 1.0), max(fk, far*0.85));",
          " float cs = cloudShadow(vW);",
          " float shd = sunShadow(vW + vec3(0.0, 0.05, 0.0)) * shadowAt(vW.xz) * cs * (1.0 - fshade*0.8) * (1.0 - wood*0.45);",
          // wind waves rolling over the distant grass + backlit sheen toward the sun
          " vec2 wd = normalize(vec2(1.0, 0.35));",
          " float wave = vnoise(vW.xz*0.035 - wd*uTime*0.9)*0.6 + vnoise(vW.xz*0.11 - wd*uTime*1.6)*0.4;",
          " float sheen = (0.6 + 0.8*wave)*far*(1.0 - sn);",
          " float back = pow(max(dot(V, -Ld), 0.0), 3.0)*uTransK;",
          " float occ = mix(mix(0.62, 1.0, far), 0.78 + 0.22*N.y, fk) * (1.0 - wood*0.3);",
          " shd *= mix(0.4, 1.0, smoothstep(0.0, 0.6, far));",
          " float mk = mix(0.88, 1.0, fk);",
          " vec3 col = alb*(uAmbC*0.95*occ + uSunC*diff*shd*0.85)*mk + alb*vanGlow(vW)*0.8;",
          " col += alb*uSunC*shd*(0.08*sheen + back*0.14*far*vec3(0.85, 1.0, 0.42))*(1.0 - fk*0.65);",
          // past the blades the meadow is seen as a grass canopy: same albedo, light and sheen as the far blades
          " float cfar = smoothstep(18.0, 58.0, vDist)*(1.0 - fk)*(1.0 - sn);",
          " if (cfar > 0.001) {",
          "  col = mix(col, canopyColor(vW, V, Ld, cloudShadow(vW)*shadowAt(vW.xz), wave), cfar);",
          " }",
          " col += alb*headlight(vW)*mix(1.2, 0.55, sn);",
          " float glint = step(0.9965, hash12(floor(vW.xz*38.0))) * sn * pow(max(dot(reflect(-Ld, N), V), 0.0), 6.0) * shd;",
          " col += uSunC * glint * 3.0;",
          " float puddle = smoothstep(0.55, 0.75, vnoise(vW.xz*0.3 + 9.0)) * uWet * (1.0 - far);",
          " col += mix(uFogC, uAmbC, 0.5) * pow(1.0 - max(dot(N, V), 0.0), 4.0) * puddle * 0.8;",
          // aerial perspective softens the countryside into the sky
          " float ap = (1.0 - exp(-vDist*0.0016))*fk*0.60;",
          " vec3 hz = fogColor(V); hz = mix(hz, vec3(dot(hz, vec3(0.3, 0.59, 0.11)))*vec3(1.0, 1.03, 0.94), 0.45*fk);",
          " col = mix(col, hz, max(vFog, ap));",
          " gl_FragColor = vec4(col, 1.0);", OUT,
          "}"
        ].join("\n"), { lights: true, extensions: { derivatives: true } });
      var ground = new THREE.Mesh(groundGeo, groundMat);
      ground.receiveShadow = true; ground.frustumCulled = false;
      scene.add(ground);

      /* ---------- geometry merge helper ---------- */
      function merge(items) {
        var pos = [], nor = [], uvs = [];
        items.forEach(function (it) {
          var g = it.geo.index ? it.geo.toNonIndexed() : it.geo.clone();
          g.applyMatrix4(it.m);
          var p = g.attributes.position.array, n = g.attributes.normal.array, uv = g.attributes.uv ? g.attributes.uv.array : null;
          for (var a = 0; a < p.length; a++) { pos.push(p[a]); nor.push(n[a]); }
          for (a = 0; a < p.length / 3; a++) { uvs.push(uv ? uv[a * 2] : 0, uv ? uv[a * 2 + 1] : 0); }
          g.dispose(); it.geo.dispose();
        });
        var out = new THREE.BufferGeometry();
        out.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        out.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
        out.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
        return keep(out);
      }

      /* ---------- trees ---------- */
      var leafU = { uMap: { value: leafTex }, uLeafA: { value: PC.leafA }, uLeafB: { value: PC.leafB }, uLeafTint: { value: PC.tint }, uLeafAmt: { value: 1 }, uBlossom: { value: 0 }, uPhoto: { value: 0 }, uCardScale: { value: 1 }, uRecolor: { value: 0 }, uA2C: { value: 1 }, uNightDim: { value: 0 } };
      var leafVS = [
        "attribute vec3 aPos; attribute vec4 aQ; attribute vec2 aSS;",
        "uniform float uTime, uWind, uFogD, uCrownR, uLeafAmt, uCardScale; uniform vec3 uCrown;",
        "varying vec2 vUv; varying vec3 vN; varying vec3 vCN; varying vec3 vW; varying float vAO; varying float vShade; varying float vFog;",
        "vec3 qrot(vec4 q, vec3 v){ return v + 2.0*cross(q.xyz, cross(q.xyz, v) + q.w*v); }",
        "void main(){",
        " vUv = uv;",
        " float keepK = smoothstep(aSS.y*0.92, aSS.y*0.92 + 0.08, uLeafAmt);",
        // smaller leaf clusters toward the outside of the crown keep the silhouette soft
        " float rimK = mix(1.0, 0.8, smoothstep(0.62, 1.0, length(aPos - uCrown)/uCrownR));",
        " vec3 p = aPos;",
        " float sway = sin(uTime*1.3 + aPos.x*0.6 + aPos.y*0.4)*0.07 + sin(uTime*3.4 + aSS.y*20.0)*0.03;",
        " p.x += sway*uWind*aPos.y*0.1; p.z += sway*0.6*uWind*aPos.y*0.1;",
        " vec3 wc = (modelMatrix*vec4(p, 1.0)).xyz;",
        // each leaf cluster turns to face the viewer (with a random roll), so none is ever seen edge-on as a streak
        " vec3 vd = normalize(cameraPosition - wc);",
        " vec3 rt = normalize(cross(vec3(0.0, 1.0, 0.0), vd) + vec3(1e-4, 0.0, 0.0)); vec3 upv = cross(vd, rt);",
        " float rl = aSS.y*37.7 + aQ.x*3.1; float cr = cos(rl), sr = sin(rl);",
        " vec2 q2 = vec2(cr*position.x - sr*position.y, sr*position.x + cr*position.y)*aSS.x*keepK*uCardScale*rimK*length(modelMatrix[0].xyz);",
        " vec4 w = vec4(wc + rt*q2.x + upv*q2.y, 1.0); vW = w.xyz;",
        " vCN = vd;",
        " vec3 outN = normalize(p - uCrown);",
        " vN = normalize(mat3(modelMatrix)*normalize(mix(qrot(aQ, vec3(0.0, 0.0, 1.0)), outN, 0.7)));",
        " vAO = clamp(length(p - uCrown)/uCrownR, 0.0, 1.0);",
        " vShade = fract(aSS.y*7.31);",
        " vec4 mv = viewMatrix*w; float d = -mv.z; vFog = 1.0 - exp(-uFogD*d);",
        " gl_Position = projectionMatrix*mv;",
        "}"
      ].join("\n");
      var leafFS = [
        "uniform sampler2D uMap; uniform vec3 uLeafA, uLeafB, uLeafTint; uniform float uBlossom, uPhoto, uRecolor, uA2C, uNightDim;",
        "varying vec2 vUv; varying vec3 vN; varying vec3 vCN; varying vec3 vW; varying float vAO; varying float vShade; varying float vFog;",
        NOISE, LIGHT, CLOUDSH,
        "void main(){",
        " vec4 t = texture2D(uMap, vUv);",
        " vec3 V = normalize(cameraPosition - vW);",
        // leaf cards seen edge-on thin out instead of smearing into streaks
        " float ta = t.a*smoothstep(0.08, 0.34, abs(dot(normalize(vCN), V)));",
        " float cov = uA2C > 0.5 ? clamp((ta - 0.5)/max(fwidth(t.a), 1e-4) + 0.5, 0.0, 1.0) : step(0.5, ta);",
        " if (cov < 0.02) discard;",
        " vec3 seasonCol = mix(uLeafA, uLeafB, vShade);",
        " vec3 texLin = pow(t.rgb, vec3(2.2));",
        " float lum = dot(texLin, vec3(0.3, 0.59, 0.11));",
        " vec3 photo = mix(texLin*uLeafTint*0.92, seasonCol*(0.3 + lum*2.8), uRecolor);",
        " vec3 proc = seasonCol*(0.45 + 0.75*t.r*t.r);",
        " vec3 alb = mix(proc, photo, uPhoto);",
        " if (vShade > 1.0 - uBlossom*0.22) alb = mix(alb, vec3(0.95, 0.66, 0.74)*(0.55 + lum*1.6), 0.7);",
        " alb = mix(vec3(dot(alb, vec3(0.3, 0.59, 0.11))), alb, 0.64 + 0.28*uRecolor);",
        " vec3 N = normalize(vN + vec3((t.r-t.g)*0.35, (t.g-t.b)*0.18, 0.0)); vec3 Ld = normalize(uSunDir);",
        " float diff = clamp(dot(N, Ld)*0.65 + 0.35, 0.0, 1.0);",
        " float trans = pow(clamp(dot(V, -Ld), 0.0, 1.0), 2.0)*0.55;",
        " float ao = mix(0.24, 1.0, smoothstep(0.18, 1.0, vAO));",
        " float csh = cloudShadow(vW);",
        " vec3 col = alb*uAmbC*ao*0.9 + (alb*uSunC*diff*ao*0.7 + alb*uSunC*trans*uTransK*vec3(1.0, 1.0, 0.6)*ao*0.55)*csh;",
        " float wax = pow(max(dot(N, normalize(Ld + V)), 0.0), 28.0)*0.025*ao;",
        " col += uSunC*wax*csh;",
        " col = mix(col, vec3(0.8, 0.83, 0.88)*(uAmbC + uSunC*0.4), smoothstep(0.35, 0.9, N.y)*uSnow*0.75);",
        " col *= 1.0 - 0.6*uNightDim;",
        " col += alb*vanGlow(vW)*0.3;",
        " col = mix(col, uFogC, vFog);",
        " gl_FragColor = vec4(col, uA2C > 0.5 ? cov : 1.0);", OUT,
        "}"
      ].join("\n");
      var barkMat = snowify(new THREE.MeshStandardMaterial({ color: 0xffffff, map: barkTex, roughness: 1 }), null, "bark");
      var barkTint = new THREE.Color(0.62, 0.55, 0.48);
      // photo textures (optional): oak leaves (ez-tree, MIT) and oak bark (Poly Haven, CC0)
      var assets = opts.assetsPath || "";
      var texLoader = new THREE.TextureLoader();
      var maxAniso = renderer.capabilities.getMaxAnisotropy();
      function loadTex(name, cb) { texLoader.load(assets + name, function (t) { keep(t); t.anisotropy = Math.min(8, maxAniso); cb(t); }, undefined, function () {}); }
      // baked cumulus sky: three depth layers (near 2.6-9 km, middle 9-22 km, far) stacked in one atlas; each covers
      // azimuth -52..52 deg and repeats seamlessly, so the layers can drift at their own speeds (parallax)
      var PANO = /*PANO*/{ file: "sky-clouds.jpg", alpha: "sky-clouds-a.jpg", small: "sky-clouds-s.jpg", smallAlpha: "sky-clouds-s-a.jpg", H: 2048, max: [0.19135, 0.18455, 0.67708], layers: [{ az0: -52, az1: 52, el0: 8.8577, el1: 32.3806, r0: 16, r1: 942, speed: 0.12 }, { az0: -52, az1: 52, el0: 2.8877, el1: 13.8634, r0: 958, r1: 1390, speed: 0.045 }, { az0: -52, az1: 52.0074, el0: 0.1425, el1: 7.8614, r0: 1406, r1: 1710, speed: 0.016 }] }/*PANO*/;
      var PANO_K = { sunA: 1.95, sunB: 2.45, amb: 1.28, rim: 0.24 };
      var panoReady = 0, panoWanted = opts.skyClouds !== false, panoFailed = false, panoAlphaPx = null, panoPW = 0, panoPH = 0;
      var D2R = Math.PI / 180;
      [skyU.uPR0, skyU.uPR1, skyU.uPR2].forEach(function (u, i) {
        var L = PANO.layers[i];
        u.value.set(L.az0 * D2R, 1 / ((L.az1 - L.az0) * D2R), L.el0 * D2R, 1 / ((L.el1 - L.el0) * D2R));
      });
      skyU.uPB01.value.set(1 - PANO.layers[0].r1 / PANO.H, (PANO.layers[0].r1 - PANO.layers[0].r0) / PANO.H, 1 - PANO.layers[1].r1 / PANO.H, (PANO.layers[1].r1 - PANO.layers[1].r0) / PANO.H);
      skyU.uPB2.value.set(1 - PANO.layers[2].r1 / PANO.H, (PANO.layers[2].r1 - PANO.layers[2].r0) / PANO.H);
      // a small CPU copy of the cloud opacity tells the scene when a drifting cloud passes in front of the sun
      function readPanoAlpha(img) {
        try {
          var cw = 1024, ch = 512, cv = document.createElement("canvas"); cv.width = cw; cv.height = ch;
          var cx = cv.getContext("2d"); cx.drawImage(img, 0, 0, cw, ch);
          var px = cx.getImageData(0, 0, cw, ch).data, a = new Uint8Array(cw * ch);
          for (var i = 0; i < cw * ch; i++) a[i] = px[i * 4];
          panoAlphaPx = a; panoPW = cw; panoPH = ch;
        } catch (err) { panoAlphaPx = null; }
      }
      function panoAlphaAt(az, el, rot) {
        if (!panoAlphaPx) return 0;
        var tr = 1;
        for (var i = 0; i < 3; i++) {
          var L = PANO.layers[i];
          var t = (el / D2R - L.el0) / (L.el1 - L.el0);
          if (t <= 0.01 || t >= 0.99) continue;
          var u = (az - rot[i]) / D2R; u = (u - L.az0) / (L.az1 - L.az0); u -= Math.floor(u);
          var x = u * panoPW - 0.5, y = (L.r0 + (1 - t) * (L.r1 - L.r0)) / PANO.H * panoPH - 0.5;
          var x0 = Math.floor(x), y0 = Math.max(0, Math.min(panoPH - 2, Math.floor(y))), fx = x - x0, fy = Math.max(0, Math.min(1, y - y0));
          var xa = ((x0 % panoPW) + panoPW) % panoPW, xb = (xa + 1) % panoPW;
          var a = (panoAlphaPx[y0 * panoPW + xa] * (1 - fx) + panoAlphaPx[y0 * panoPW + xb] * fx) * (1 - fy) + (panoAlphaPx[(y0 + 1) * panoPW + xa] * (1 - fx) + panoAlphaPx[(y0 + 1) * panoPW + xb] * fx) * fy;
          tr *= 1 - a / 255;
        }
        return 1 - tr;
      }
      if (panoWanted) {
        // phones and small screens get the half-resolution atlas
        var scrMax = Math.max(global.screen ? global.screen.width : 0, global.screen ? global.screen.height : 0, container.clientWidth) * Math.min(2, global.devicePixelRatio || 1);
        var smallSky = lowQ || (opts.quality !== "high" && opts.quality !== "ultra" && scrMax < 1800);
        var panoTex = function (t, key) {
          keep(t); t.anisotropy = Math.min(4, maxAniso); t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping;
          if (key === "uPanoA") { t.format = THREE.LuminanceFormat; readPanoAlpha(t.image); }
          t.needsUpdate = true; skyU[key].value = t; if (skyU.uPano.value && skyU.uPanoA.value) panoReady = 1;
        };
        // if the sky images can't be loaded, the live raymarched clouds take over
        var panoFail = function () { panoFailed = true; };
        texLoader.load(assets + (smallSky ? PANO.small : PANO.file), function (t) { panoTex(t, "uPano"); }, undefined, panoFail);
        texLoader.load(assets + (smallSky ? PANO.smallAlpha : PANO.alpha), function (t) { panoTex(t, "uPanoA"); }, undefined, panoFail);
      }
      loadTex("oak-leaves.png", function (t) { leafU.uMap.value = t; leafU.uPhoto.value = 1; leafU.uCardScale.value = 1.42; impDirty = true; });
      loadTex("bark-color.jpg", function (t) { t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 2); barkMat.map = t; barkMat.color.copy(barkTint); barkMat.needsUpdate = true; });
      loadTex("bark-normal.jpg", function (t) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 2); barkMat.normalMap = t; barkMat.normalScale.set(1.2, 1.2); barkMat.needsUpdate = true; });
      loadTex("bark-rough.jpg", function (t) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 2); barkMat.roughnessMap = t; barkMat.needsUpdate = true; });

      function buildTree(seed, leafDensity, opt) {
        opt = opt || {};
        var r = mulberry(seed);
        var g = new THREE.Group();
        var up = new THREE.Vector3(0, 1, 0);
        var tips = [], items = [];
        var maxDepth = opt.depth || 4;
        var mtx = new THREE.Matrix4(), qq = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
        function limb(a, b, r0, r1) {
          var dir = new THREE.Vector3().subVectors(b, a), len = dir.length(); dir.normalize();
          qq.setFromUnitVectors(up, dir);
          var mid = a.clone().addScaledVector(dir, len / 2);
          items.push({ geo: new THREE.CylinderGeometry(r1, r0, len, r0 > 0.15 ? 9 : 5, 1, true), m: new THREE.Matrix4().compose(mid, qq.clone(), one) });
          if (r1 > 0.035) items.push({ geo: new THREE.SphereGeometry(r1, r1 > 0.15 ? 9 : 5, 4), m: new THREE.Matrix4().makeTranslation(b.x, b.y, b.z) });
        }
        function grow(start, dir, len, rad, depth) {
          // two-part branch with a slight bend for a less rigid silhouette
          var bendV = new THREE.Vector3(r() - 0.5, (r() - 0.3) * 0.5, r() - 0.5).multiplyScalar(0.35);
          var mid = start.clone().addScaledVector(dir, len * 0.5).add(bendV.clone().multiplyScalar(len * 0.25));
          var d2 = dir.clone().add(bendV).normalize();
          var end = mid.clone().addScaledVector(d2, len * 0.5);
          limb(start, mid, rad, rad * 0.82);
          limb(mid, end, rad * 0.82, rad * 0.64);
          if (depth >= maxDepth) { tips.push(end); tips.push(mid); return; }
          var n = r() < 0.45 ? 2 : 3, base = r() * Math.PI * 2;
          for (var k = 0; k < n; k++) {
            var a = base + k * (Math.PI * 2 / n) + (r() - 0.5) * 0.8;
            var spread = 0.55 + r() * 0.35;
            var nd = new THREE.Vector3(Math.cos(a) * spread, 0.2 + r() * 0.25, Math.sin(a) * spread).add(d2).normalize();
            grow(end, nd, len * (0.62 + r() * 0.16), rad * 0.62, depth + 1);
          }
          if (depth >= 2) tips.push(end);
        }
        var trunkH = opt.trunkH || 3.0;
        var lean = new THREE.Vector3((r() - 0.5) * 0.4, trunkH, (r() - 0.5) * 0.3);
        var top = lean.clone();
        limb(new THREE.Vector3(0, 0, 0), new THREE.Vector3(lean.x * 0.5, trunkH * 0.5, lean.z * 0.5), 0.46, 0.4);
        limb(new THREE.Vector3(lean.x * 0.5, trunkH * 0.5, lean.z * 0.5), top, 0.4, 0.33);
        items.push({ geo: new THREE.CylinderGeometry(0.46, 0.78, 0.5, 10, 1, true), m: new THREE.Matrix4().makeTranslation(0, 0.25, 0) });
        var limbs = 4, b0 = r() * 6.28;
        for (var l = 0; l < limbs; l++) {
          var a = b0 + l * (Math.PI * 2 / limbs) + (r() - 0.5) * 0.6;
          var d = new THREE.Vector3(Math.cos(a) * 1.0, 0.85, Math.sin(a) * 1.0).normalize();
          grow(top, d, 2.7 + r() * 0.6, 0.26, 1);
        }
        var wood = new THREE.Mesh(merge(items), barkMat);
        g.add(wood);

        var center = new THREE.Vector3();
        tips.forEach(function (p) { center.add(p); });
        center.divideScalar(tips.length); center.y += 0.3;
        var crownR = 0;
        tips.forEach(function (p) { crownR = Math.max(crownR, p.distanceTo(center)); });
        crownR += 0.8;

        var pos = [], qs = [], ss = [], ee = new THREE.Euler(), tmp = new THREE.Vector3(), cq = new THREE.Vector3();
        var cRh = crownR * 0.95, cRv = crownR * 0.78, cRd = crownR * 0.85;
        function card(p, sc) {
          // leaf clusters that would float outside the crown are drawn softly back to its shell (no stray flags)
          cq.copy(p).sub(center);
          var rv = cq.y > 0 ? cRv : cRd;
          var e = Math.sqrt(cq.x * cq.x / (cRh * cRh) + cq.y * cq.y / (rv * rv) + cq.z * cq.z / (cRh * cRh));
          if (e > 0.84) { var e2 = 0.84 + 0.16 * (1 - Math.exp(-(e - 0.84) / 0.16)); p = cq.multiplyScalar(e2 / e).add(center); }
          pos.push(p.x, p.y, p.z);
          ee.set(r() * 6.28, r() * 6.28, r() * 6.28); qq.setFromEuler(ee);
          qs.push(qq.x, qq.y, qq.z, qq.w);
          ss.push(sc, r());
        }
        tips.forEach(function (p) {
          var cnt = Math.round(11 * leafDensity);
          var outv = p.clone().sub(center).normalize().multiplyScalar(0.3);
          for (var c = 0; c < cnt; c++) {
            tmp.set(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(Math.pow(r(), 0.6) * 0.9);
            card(p.clone().add(tmp).add(outv), 0.75 + r() * 0.55);
          }
        });
        var fillN = Math.round((opt.fill || 0) * 220 * leafDensity);
        for (var fi = 0; fi < fillN; fi++) {
          tmp.set(r() - 0.5, (r() - 0.5) * 0.7, r() - 0.5).normalize().multiplyScalar((0.45 + 0.5 * Math.pow(r(), 0.5)) * (crownR - 0.6));
          card(center.clone().add(tmp), 0.8 + r() * 0.6);
        }
        var lg = new THREE.InstancedBufferGeometry();
        var plane = new THREE.PlaneGeometry(1, 1);
        lg.index = plane.index; lg.attributes.position = plane.attributes.position; lg.attributes.uv = plane.attributes.uv;
        lg.setAttribute("aPos", new THREE.InstancedBufferAttribute(new Float32Array(pos), 3));
        lg.setAttribute("aQ", new THREE.InstancedBufferAttribute(new Float32Array(qs), 4));
        lg.setAttribute("aSS", new THREE.InstancedBufferAttribute(new Float32Array(ss), 2));
        lg.instanceCount = ss.length / 2;
        keep(lg);
        var lm = shaderMat(Object.assign({}, leafU, { uCrown: { value: center.clone() }, uCrownR: { value: crownR } }), leafVS, leafFS, { side: THREE.DoubleSide, alphaToCoverage: true, extensions: { derivatives: true } });
        var leaves = new THREE.Mesh(lg, lm);
        leaves.frustumCulled = false;
        if (opt.shadows) {
          leaves.castShadow = true;
          leaves.customDepthMaterial = shaderMat(Object.assign({}, leafU), [
            "attribute vec3 aPos; attribute vec4 aQ; attribute vec2 aSS;",
            "uniform float uTime, uWind, uLeafAmt, uCardScale; varying vec2 vUv;",
            "vec3 qrot(vec4 q, vec3 v){ return v + 2.0*cross(q.xyz, cross(q.xyz, v) + q.w*v); }",
            "void main(){ vUv = uv;",
            " float keepK = smoothstep(aSS.y*0.92, aSS.y*0.92 + 0.08, uLeafAmt);",
            " vec3 p = qrot(aQ, position*aSS.x*keepK*uCardScale) + aPos;",
            " float sway = sin(uTime*1.3 + aPos.x*0.6 + aPos.y*0.4)*0.07 + sin(uTime*3.4 + aSS.y*20.0)*0.03;",
            " p.x += sway*uWind*aPos.y*0.1; p.z += sway*0.6*uWind*aPos.y*0.1;",
            " gl_Position = projectionMatrix*viewMatrix*modelMatrix*vec4(p, 1.0); }"
          ].join("\n"), "#include <packing>\nuniform sampler2D uMap; varying vec2 vUv; void main(){ if (texture2D(uMap, vUv).a < 0.5) discard; gl_FragColor = packDepthToRGBA(gl_FragCoord.z); }", { side: THREE.DoubleSide });
          wood.castShadow = true; wood.receiveShadow = true;
        }
        g.add(leaves);
        var proxy = new THREE.Mesh(keep(new THREE.SphereGeometry(crownR * 0.8, 10, 8)), keep(new THREE.MeshBasicMaterial()));
        proxy.position.copy(center); proxy.visible = false; g.add(proxy);
        var trunkProxy = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.5, 0.6, trunkH, 8)), proxy.material);
        trunkProxy.position.y = trunkH / 2; trunkProxy.visible = false; g.add(trunkProxy);
        tips.sort(function (a, b) { return b.y - a.y; });
        return { group: g, parts: [proxy, trunkProxy, wood], center: center, crownR: crownR, tips: tips, trunkH: trunkH, top: top };
      }

      var TREE_SCALE = 1.75;
      var T = buildTree(17, (lowQ || autoQ) ? 1.0 : 1.55, { depth: 4, trunkH: 2.6, fill: 0.72, shadows: shadowsOn });
      var tree = T.group;
      tree.scale.setScalar(TREE_SCALE);
      scene.add(tree);
      /* ---------- distant trees: camera-facing billboards from an atlas of real 3D trees ---------- */
      var impRT = keep(new THREE.WebGLRenderTarget(1024, 1024, { minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat }));
      impRT.texture.generateMipmaps = true; impRT.texture.encoding = THREE.sRGBEncoding;
      var impScene = new THREE.Scene(); impScene.add(new THREE.AmbientLight(0xffffff, 1.0));
      var impCam = new THREE.OrthographicCamera(-1, 1, 1, 0, 0.1, 200);
      var impTrees = [];
      for (var iv = 0; iv < 4; iv++) {
        var itr = buildTree(301 + iv * 17, 1.2, { depth: 3, trunkH: 1.8 + iv * 0.35, fill: 0.9 });
        itr.group.visible = false; impScene.add(itr.group);
        var ith = itr.center.y + itr.crownR, itw = itr.crownR * 2.2;
        impTrees.push({ t: itr, h: ith, S: Math.max(ith, itw) * 1.04, cx: itr.center.x, cz: itr.center.z, cy: itr.center.y, cr: itr.crownR });
      }
      var impDirty = true, impTimer = 0, impKey = "";
      function renderImpostors() {
        var keepU = { a: U.uAmbC.value.clone(), s: U.uSunC.value.clone(), f: U.uFogD.value, t: U.uTransK.value, v: U.uVanOn.value, h: U.uHeadOn.value, c: U.uCloudOn.value };
        var keepND = leafU.uNightDim.value;
        U.uAmbC.value.setRGB(1, 1, 1); U.uSunC.value.setRGB(0, 0, 0); leafU.uA2C.value = 0; leafU.uNightDim.value = 0; U.uFogD.value = 0; U.uTransK.value = 0; U.uVanOn.value = 0; U.uHeadOn.value = 0; U.uCloudOn.value = 0;
        var prevRT = renderer.getRenderTarget(), ptm = renderer.toneMapping, pcc = renderer.getClearColor(new THREE.Color()), pca = renderer.getClearAlpha();
        renderer.toneMapping = THREE.NoToneMapping;
        renderer.setRenderTarget(impRT); renderer.setClearColor(0x000000, 0); renderer.clear();
        impTrees.forEach(function (it, k) {
          var cx = k % 2, cy = k >> 1;
          impRT.viewport.set(cx * 512, cy * 512, 512, 512); impRT.scissor.set(cx * 512, cy * 512, 512, 512); impRT.scissorTest = true;
          renderer.setRenderTarget(impRT);
          impCam.left = -it.S / 2; impCam.right = it.S / 2; impCam.top = it.S; impCam.bottom = 0; impCam.updateProjectionMatrix();
          impCam.position.set(it.cx, 0, it.cz + 60); impCam.lookAt(it.cx, 0, it.cz);
          impTrees.forEach(function (o, j) { o.t.group.visible = j === k; });
          renderer.render(impScene, impCam);
        });
        impRT.scissorTest = false; impRT.viewport.set(0, 0, 1024, 1024); impRT.scissor.set(0, 0, 1024, 1024);
        impTrees.forEach(function (o) { o.t.group.visible = false; });
        renderer.setRenderTarget(prevRT); renderer.toneMapping = ptm; renderer.setClearColor(pcc, pca);
        leafU.uA2C.value = 1; leafU.uNightDim.value = keepND; U.uAmbC.value.copy(keepU.a); U.uSunC.value.copy(keepU.s); U.uFogD.value = keepU.f; U.uTransK.value = keepU.t; U.uVanOn.value = keepU.v; U.uHeadOn.value = keepU.h; U.uCloudOn.value = keepU.c;
      }
      var IMPN = lowQ ? 500 : (narrowScreen ? 700 : 1500), impPos = [], impP = [], impC = [], rI = mulberry(555), ipT = new THREE.Vector2();
      function impView(x, z) {
        var dx = x - tcx, dz = tcz - z, dd = Math.hypot(dx, dz), a = Math.atan2(dx, dz);
        if (dd < 260 && Math.abs(a - Math.atan2(VAN_HOME.x - tcx, tcz - VAN_HOME.z)) < 0.1) return 0;
        return dd >= 108 && dd <= 3000 && Math.abs(a) < 0.7 ? dd : 0;
      }
      function impAt(x, z, hReal) {
        if (!impView(x, z) || impP.length / 4 >= IMPN) return false;
        var v = Math.floor(rI() * 4), sc = hReal / impTrees[v].h, S = impTrees[v].S * sc;
        impPos.push(x, terrainH(x, z) - 0.35, z);
        impP.push(S, v, rI(), 0.85 + rI() * 0.4);
        impC.push(impTrees[v].cy * sc / S, impTrees[v].cr * sc / S);
        return true;
      }
      // copses first (dense, irregular), then hedgerow trees with gaps, then a few big field trees
      var woodsL = [], hedgesL = [], nImp = 0;
      for (fj = -32; fj < 32; fj++) for (fi = -32; fi < 32; fi++) {
        fo = fieldCell(fi, fj);
        if (fieldData[fo + 3]) {
          fieldInv((fi + 0.5) * FLD.cx, (fj + 0.5) * FLD.cz, ipT);
          var wd = Math.hypot(ipT.x - tcx, ipT.y - tcz);
          if (wd < 3100 && Math.abs(Math.atan2(ipT.x - tcx, tcz - ipT.y)) < 0.85) woodsL.push([fi, fj, wd]);
        }
        for (var side = 0; side < 2; side++) {
          if (!fieldData[fo + 1 + side]) continue;
          if (side) fieldInv((fi + 0.5) * FLD.cx, fj * FLD.cz, ipT); else fieldInv(fi * FLD.cx, (fj + 0.5) * FLD.cz, ipT);
          var hd = impView(ipT.x, ipT.y);
          if (hd && hd < 1800) hedgesL.push([fi, fj, side, hd]);
        }
      }
      woodsL.sort(function (a, b) { return a[2] - b[2]; });
      hedgesL.sort(function (a, b) { return a[3] - b[3]; });
      woodsL.forEach(function (w) {
        var sp = w[2] > 1400 ? 21 : (w[2] > 650 ? 14 : 9.5), hb = w[2] > 1400 ? 16 : (w[2] > 650 ? 12 : 9);
        for (var wq = 4; wq < FLD.cz - 3; wq += sp) for (var wp = 4; wp < FLD.cx - 3; wp += sp) {
          if (nImp >= IMPN * 0.52 || rI() < 0.12) continue;
          fieldInv(w[0] * FLD.cx + wp + (rI() - 0.5) * sp * 0.8, w[1] * FLD.cz + wq + (rI() - 0.5) * sp * 0.8, ipT);
          if (impAt(ipT.x, ipT.y, hb + rI() * 6)) nImp++;
        }
      });
      hedgesL.forEach(function (h) {
        if (rI() < 0.3) return;
        var len = h[2] ? FLD.cx : FLD.cz, at = rI() * 12;
        while (at < len && impP.length / 4 < IMPN * 0.94) {
          var off = (rI() - 0.5) * 2;
          if (h[2]) fieldInv(h[0] * FLD.cx + at, h[1] * FLD.cz + off, ipT); else fieldInv(h[0] * FLD.cx + off, h[1] * FLD.cz + at, ipT);
          if (rI() < 0.6) impAt(ipT.x, ipT.y, 6 + rI() * rI() * 10);
          at += 7 + rI() * 12;
        }
      });
      for (var ik = 0; ik < 600; ik++) {
        var ang = (rI() * 2 - 1) * 0.7, dist = 120 + Math.pow(rI(), 1.4) * 900;
        var x = tcx + dist * Math.sin(ang), z = tcz - dist * Math.cos(ang);
        fieldQ2(x, z, ipT);
        var mxx = ((ipT.x % FLD.cx) + FLD.cx) % FLD.cx, mzz = ((ipT.y % FLD.cz) + FLD.cz) % FLD.cz;
        if (mxx < 12 || mzz < 12 || mxx > FLD.cx - 12 || mzz > FLD.cz - 12 || rI() > 0.1) continue;
        impAt(x, z, 12 + rI() * 5);
      }
      function fieldQ2(x, z, out) {
        var qx = FLD.c * x - FLD.s * z, qz = FLD.s * x + FLD.c * z;
        out.x = qx + fieldWarpX(qz); out.y = qz + fieldWarpZ(qx);
        return out;
      }
      var impGeo = keep(new THREE.InstancedBufferGeometry());
      var impQuad = new THREE.PlaneGeometry(1, 1); impQuad.translate(0, 0.5, 0);
      impGeo.index = impQuad.index; impGeo.attributes.position = impQuad.attributes.position;
      impGeo.setAttribute("aPos", new THREE.InstancedBufferAttribute(new Float32Array(impPos), 3));
      impGeo.setAttribute("aP", new THREE.InstancedBufferAttribute(new Float32Array(impP), 4));
      impGeo.setAttribute("aC", new THREE.InstancedBufferAttribute(new Float32Array(impC), 2));
      impGeo.instanceCount = impP.length / 4;
      var impMat = shaderMat({ uAtlas: { value: impRT.texture } },
        [
          "attribute vec3 aPos; attribute vec4 aP; attribute vec2 aC; uniform float uFogD;",
          "varying vec2 vUv; varying float vFog; varying vec3 vW; varying float vCS; varying float vRnd; varying vec2 vLp; varying vec2 vCr; varying vec3 vRight; varying vec3 vFwd;",
          CLOUDSH,
          "void main(){",
          " float S = aP.x;",
          " vec3 right = normalize(vec3(viewMatrix[0][0], 0.0, viewMatrix[2][0]));",
          " vec3 wp = aPos + right*position.x*S*aP.w + vec3(0.0, position.y*S, 0.0);",
          " vec2 cell = vec2(mod(aP.y, 2.0), floor(aP.y/2.0));",
          " vUv = (cell + vec2(position.x + 0.5, position.y))*0.5;",
          " vW = wp; vRnd = aP.z; vLp = position.xy; vCr = aC; vRight = right; vFwd = vec3(-right.z, 0.0, right.x);",
          " if (dot(vFwd, cameraPosition - aPos) < 0.0) vFwd = -vFwd;",
          " vCS = cloudShadow(aPos + vec3(0.0, S*0.4, 0.0));",
          " vec4 mv = viewMatrix*vec4(wp, 1.0); vFog = 1.0 - exp(-uFogD*(-mv.z));",
          " gl_Position = projectionMatrix*mv;",
          "}"
        ].join("\n"),
        [
          "uniform sampler2D uAtlas; varying vec2 vUv; varying float vFog; varying vec3 vW; varying float vCS; varying float vRnd; varying vec2 vLp; varying vec2 vCr; varying vec3 vRight; varying vec3 vFwd;",
          NOISE, LIGHT,
          "void main(){",
          " vec4 t = texture2D(uAtlas, vUv);",
          " float cov = clamp((t.a - 0.32)/max(fwidth(t.a), 1e-4) + 0.5, 0.0, 1.0); if (cov < 0.02) discard;",
          " vec3 alb = pow(t.rgb/max(t.a, 0.001), vec3(2.2))*(0.6 + 0.3*vRnd);",
          " alb = mix(vec3(dot(alb, vec3(0.3, 0.59, 0.11))), alb, 0.75);",
          " vec3 Ld = normalize(uSunDir); vec3 V = normalize(cameraPosition - vW);",
          // treat the crown as a ball: lit on the sun's side, shaded underneath and away from it
          " vec2 dc = (vLp - vec2(0.0, vCr.x))/max(vCr.y, 0.01);",
          " vec3 nb = normalize(vec3(dc*0.95, sqrt(max(1.0 - min(dot(dc, dc), 1.0), 0.0)) + 0.2));",
          " vec3 nW = normalize(vRight*nb.x + vec3(0.0, nb.y, 0.0) + vFwd*nb.z);",
          " float lam = clamp(dot(nW, Ld)*0.85 + 0.15, 0.0, 1.0);",
          " float occ = mix(0.5, 1.0, smoothstep(-1.0, 0.5, dc.y));",
          " vec3 col = alb*(uAmbC*(0.62 + 0.38*nb.y)*occ + uSunC*lam*occ*0.72*vCS) + alb*uSunC*uTransK*pow(max(dot(V, -Ld), 0.0), 4.0)*0.35*vCS*(1.0 - nb.z*0.5);",
          " float ap = 1.0 - exp(-length(cameraPosition - vW)*0.0018);",
          " col = mix(col, fogColor(V), max(vFog, ap*0.62));",
          " gl_FragColor = vec4(col, cov);", OUT,
          "}"
        ].join("\n"), { alphaToCoverage: true, extensions: { derivatives: true } });
      var impMesh = new THREE.Mesh(impGeo, impMat); impMesh.frustumCulled = false;
      scene.add(impMesh);

      /* falling leaves (autumn) */
      var FL = lowQ ? 60 : 140;
      var flGeo = new THREE.InstancedBufferGeometry();
      var flPlane = new THREE.PlaneGeometry(1, 1);
      flGeo.index = flPlane.index; flGeo.attributes.position = flPlane.attributes.position; flGeo.attributes.uv = flPlane.attributes.uv;
      var flA = new Float32Array(FL * 4), flB = new Float32Array(FL * 4), rf = mulberry(91);
      for (i = 0; i < FL; i++) {
        var tp = T.tips[Math.floor(rf() * T.tips.length)];
        flA[i * 4] = tp.x; flA[i * 4 + 1] = tp.y; flA[i * 4 + 2] = tp.z; flA[i * 4 + 3] = rf();
        flB[i * 4] = 7 + rf() * 6; flB[i * 4 + 1] = rf(); flB[i * 4 + 2] = rf(); flB[i * 4 + 3] = rf();
      }
      flGeo.setAttribute("aA", new THREE.InstancedBufferAttribute(flA, 4));
      flGeo.setAttribute("aB", new THREE.InstancedBufferAttribute(flB, 4));
      flGeo.instanceCount = FL;
      keep(flGeo);
      var fallU = { uFall: { value: 0 }, uMap: { value: oneLeafTex }, uLeafA: leafU.uLeafA, uLeafB: leafU.uLeafB };
      var fallMat = shaderMat(fallU,
        [
          "attribute vec4 aA; attribute vec4 aB;",
          "uniform float uTime, uWind, uFall, uFogD;",
          "varying vec2 vUv; varying float vA; varying float vS; varying vec3 vW; varying float vFog;",
          "void main(){",
          " float f = fract(uTime/aB.x + aA.w);",
          " vec3 p = aA.xyz;",
          " p.y = mix(aA.y, 0.06, smoothstep(0.0, 0.85, f));",
          " p.x += f*aA.y*0.9*uWind + sin(uTime*1.7 + aB.y*20.0)*0.5*f;",
          " p.z += cos(uTime*1.3 + aB.z*20.0)*0.5*f;",
          " float ang = uTime*(2.0 + aB.w*3.0) + aB.y*6.28;",
          " vec3 q = position*0.22*uFall*step(aB.w, uFall);",
          " q = vec3(q.x*cos(ang) - q.y*sin(ang), q.x*sin(ang)*0.6 + q.y*cos(ang), q.x*sin(ang)*0.8);",
          " vec4 w = modelMatrix*vec4(p + q, 1.0); vW = w.xyz;",
          " vA = smoothstep(0.0, 0.05, f)*(1.0 - smoothstep(0.92, 1.0, f));",
          " vUv = uv; vS = aB.z;",
          " vec4 mv = viewMatrix*w; float d = -mv.z; vFog = 1.0 - exp(-uFogD*d);",
          " gl_Position = projectionMatrix*mv;",
          "}"
        ].join("\n"),
        [
          "uniform sampler2D uMap; uniform vec3 uLeafA, uLeafB;",
          "varying vec2 vUv; varying float vA; varying float vS; varying vec3 vW; varying float vFog;",
          NOISE, LIGHT,
          "void main(){",
          " vec4 t = texture2D(uMap, vUv); if (t.a < 0.5 || vA < 0.02) discard;",
          " vec3 alb = mix(uLeafA, uLeafB, vS) * (0.6 + 0.4*t.r);",
          " vec3 col = alb*(uAmbC + uSunC*0.6) + alb*uSunC*uTransK*0.3;",
          " col = mix(col, uFogC, vFog);",
          " gl_FragColor = vec4(col, 1.0);", OUT,
          "}"
        ].join("\n"), { side: THREE.DoubleSide });
      var fallingLeaves = new THREE.Mesh(flGeo, fallMat);
      fallingLeaves.frustumCulled = false;
      tree.add(fallingLeaves);

      /* ---------- squirrel ---------- */
      var furMat = new THREE.MeshStandardMaterial({ color: Lc("#9a5226"), roughness: 0.9 }), bellyMat = new THREE.MeshStandardMaterial({ color: Lc("#e6caa2"), roughness: 0.9 });
      keep(furMat); keep(bellyMat);
      var squirrel = new THREE.Group();
      function sm(geo, m, x, y, z, sx, sy, sz) { var o = new THREE.Mesh(keep(geo), m); o.position.set(x, y, z); if (sx) o.scale.set(sx, sy, sz); squirrel.add(o); return o; }
      sm(new THREE.SphereGeometry(0.16, 12, 9), furMat, 0, 0.16, 0, 0.85, 0.8, 1.35);
      sm(new THREE.SphereGeometry(0.1, 12, 9), furMat, 0, 0.27, 0.23);
      sm(new THREE.ConeGeometry(0.03, 0.08, 6), furMat, 0.045, 0.37, 0.22);
      sm(new THREE.ConeGeometry(0.03, 0.08, 6), furMat, -0.045, 0.37, 0.22);
      sm(new THREE.SphereGeometry(0.1, 10, 8), bellyMat, 0, 0.12, 0.11, 0.9, 0.9, 1.2);
      var tail = new THREE.Group(); tail.position.set(0, 0.18, -0.21); squirrel.add(tail);
      for (i = 0; i < 6; i++) {
        var tpm = new THREE.Mesh(keep(new THREE.SphereGeometry(0.09 + i * 0.01, 10, 8)), furMat);
        tpm.position.set(0, Math.sin(i * 0.5) * 0.28 + i * 0.025, -Math.cos(i * 0.5) * 0.1 - i * 0.016);
        tail.add(tpm);
      }
      tree.add(squirrel);

      /* ---------- birds ---------- */
      var birdMat = keep(new THREE.MeshStandardMaterial({ color: Lc("#26282d"), roughness: 0.8, side: THREE.DoubleSide }));
      var wingGeo = keep(new THREE.BufferGeometry());
      wingGeo.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0.1, 0, 0, -0.08, 0.2, 0.02, 0.02, 0.2, 0.02, 0.02, 0, 0, -0.08, 0.4, 0.0, -0.06], 3));
      wingGeo.computeVertexNormals();
      var birdBody = keep(new THREE.SphereGeometry(0.07, 8, 6)), birdHead = keep(new THREE.SphereGeometry(0.05, 8, 6));
      var birds = [];
      var worldCrown = T.center.clone().multiplyScalar(TREE_SCALE);
      for (i = 0; i < 6; i++) {
        var bird = new THREE.Group();
        var bb = new THREE.Mesh(birdBody, birdMat); bb.scale.set(0.8, 0.8, 2.2); bird.add(bb);
        var bh = new THREE.Mesh(birdHead, birdMat); bh.position.set(0, 0.03, 0.15); bird.add(bh);
        var wl = new THREE.Mesh(wingGeo, birdMat); bird.add(wl);
        var wr = new THREE.Mesh(wingGeo, birdMat); wr.scale.x = -1; bird.add(wr);
        var perch = T.tips[(i * 3) % Math.min(18, T.tips.length)].clone().multiplyScalar(TREE_SCALE).add(new THREE.Vector3(0, 0.2, 0));
        bird.userData = { wl: wl, wr: wr, phase: Math.random() * Math.PI * 2, speed: 0.3 + Math.random() * 0.22, R: 5 + Math.random() * 3.5, alt: worldCrown.y + 2.2 + Math.random() * 2, perch: perch };
        bird.scale.setScalar(1.15);
        scene.add(bird);
        birds.push(bird);
      }

      /* ---------- camper van (bay-window style, no badges) ---------- */
      var van = new THREE.Group();
      var bodyG = new THREE.Group(), roofG = new THREE.Group();
      van.add(bodyG); van.add(roofG);
      var vanParts = [];
      function add(mesh, x, y, z, parent) {
        mesh.position.set(x, y, z); (parent || bodyG).add(mesh); vanParts.push(mesh);
        mesh.castShadow = true; mesh.receiveShadow = true;
        return mesh;
      }
      var blue = Lc("#4b7ea6"), white = Lc("#efece4"), trimW = Lc("#f8f6f0"), well = Lc("#0b0c0e");
      var paintExpr = "(min(length(vec2(vLx + 1.45, vLy - 0.5)), length(vec2(vLx - 1.45, vLy - 0.5))) < 0.66 ? " + glsl(well) +
        " : (vLy < 1.27 ? " + glsl(blue) + " : (vLy < 1.33 ? " + glsl(trimW) + " : " + glsl(white) + ")))";
      var paintMat = snowify(new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.36, metalness: 0.0, clearcoat: 1.0, clearcoatRoughness: 0.12 }), paintExpr, "paint");
      var prof = new THREE.Shape();
      prof.moveTo(-2.15, 0.5);
      prof.lineTo(-2.07, 0.5);
      prof.absarc(-1.45, 0.5, 0.62, Math.PI, 0, true);
      prof.lineTo(0.83, 0.5);
      prof.absarc(1.45, 0.5, 0.62, Math.PI, 0, true);
      prof.lineTo(2.08, 0.5);
      prof.quadraticCurveTo(2.22, 0.5, 2.22, 0.7);
      prof.lineTo(2.22, 1.42);
      prof.quadraticCurveTo(2.22, 1.72, 2.13, 1.92);
      prof.quadraticCurveTo(2.02, 2.16, 1.72, 2.16);
      prof.lineTo(-1.85, 2.16);
      prof.quadraticCurveTo(-2.15, 2.16, -2.15, 1.86);
      prof.lineTo(-2.15, 0.5);
      var bodyGeo = keep(new THREE.ExtrudeGeometry(prof, { depth: 1.5, bevelEnabled: true, bevelThickness: 0.24, bevelSize: 0.14, bevelSegments: 8, curveSegments: 28 }));
      bodyGeo.translate(0, 0, -0.75);
      bodyGeo.computeVertexNormals();
      var bodyMesh = add(new THREE.Mesh(bodyGeo, paintMat), 0, 0, 0);
      bodyMesh.updateMatrixWorld(true);
      // dark underbody so the gap under the sills reads as shadow
      var under = add(new THREE.Mesh(keep(new THREE.BoxGeometry(4.3, 0.12, 1.8)), keep(new THREE.MeshStandardMaterial({ color: well, roughness: 1 }))), 0, 0.42, 0);

      var glassMat = snowify(new THREE.MeshStandardMaterial({ color: Lc("#121a20"), roughness: 0.2, metalness: 0.15, envMapIntensity: 1.2, emissive: new THREE.Color(1.0, 0.62, 0.3), emissiveIntensity: 0 }), null, "glass");
      var cabGlass = snowify(new THREE.MeshStandardMaterial({ color: Lc("#121a20"), roughness: 0.18, metalness: 0.15, envMapIntensity: 1.2 }), null, "cabglass");
      var chrome = keep(new THREE.MeshStandardMaterial({ color: Lc("#e4e4e2"), roughness: 0.12, metalness: 1.0 }));
      var rubber = keep(new THREE.MeshStandardMaterial({ color: Lc("#16171a"), roughness: 0.9 }));
      var seal = keep(new THREE.MeshStandardMaterial({ color: Lc("#1c1d20"), roughness: 0.6 }));
      var whiteRim = keep(new THREE.MeshStandardMaterial({ color: white, roughness: 0.32, metalness: 0.2 }));
      var whitePaint = snowify(new THREE.MeshPhysicalMaterial({ color: white, roughness: 0.36, clearcoat: 1, clearcoatRoughness: 0.12 }), null, "whitepaint");
      function rrect(w, h, r) {
        var s = new THREE.Shape(), x = -w / 2, y = -h / 2;
        s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
        s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
        s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
        return keep(new THREE.ShapeGeometry(s, 10));
      }
      var ZS = 0.75 + 0.24 + 0.004;
      // side windows with black rubber seals
      [[-1.5, 0.82, glassMat], [-0.55, 0.82, glassMat], [0.4, 0.82, glassMat], [1.42, 0.78, cabGlass]].forEach(function (w) {
        [1, -1].forEach(function (side) {
          var gm = rrect(w[1], 0.5, 0.12); if (side < 0) gm.rotateY(Math.PI);
          var fr = rrect(w[1] + 0.07, 0.57, 0.15); if (side < 0) fr.rotateY(Math.PI);
          add(new THREE.Mesh(fr, seal), w[0], 1.72, (ZS - 0.001) * side).receiveShadow = false;
          add(new THREE.Mesh(gm, w[2]), w[0], 1.72, (ZS + 0.004) * side).receiveShadow = false;
        });
      });
      [1, -1].forEach(function (side) { add(new THREE.Mesh(keep(new THREE.BoxGeometry(0.03, 0.5, 0.012)), seal), 1.68, 1.72, (ZS + 0.004) * side); });
      // windshield: a tessellated pane projected onto the curved nose so it hugs the body
      var shapeMask = canvasTex(256, 96, function (g, w, h) {
        g.fillStyle = "#000"; g.fillRect(0, 0, w, h); g.fillStyle = "#fff";
        var r = 26; g.beginPath(); g.moveTo(r, 0); g.lineTo(w - r, 0); g.quadraticCurveTo(w, 0, w, r); g.lineTo(w, h - r); g.quadraticCurveTo(w, h, w - r, h); g.lineTo(r, h); g.quadraticCurveTo(0, h, 0, h - r); g.lineTo(0, r); g.quadraticCurveTo(0, 0, r, 0); g.fill();
      });
      var projRay = new THREE.Raycaster();
      function noseSheet(width, height, yC, lift) {
        var g = keep(new THREE.PlaneGeometry(width, height, 24, 10));
        var pa = g.attributes.position;
        for (var k = 0; k < pa.count; k++) {
          var zz = -pa.getX(k), yy = pa.getY(k) + yC;
          projRay.set(new THREE.Vector3(4, yy, zz), new THREE.Vector3(-1, 0, 0));
          var hit = projRay.intersectObject(bodyMesh, false)[0];
          var xx = hit ? hit.point.x + lift : 2.3;
          pa.setXYZ(k, xx, yy, zz);
        }
        g.computeVertexNormals();
        var nn = g.attributes.normal;
        for (k = 0; k < nn.count; k++) if (nn.getX(k) < 0) nn.setXYZ(k, -nn.getX(k), -nn.getY(k), -nn.getZ(k));
        return g;
      }
      var sealMask = seal.clone(); sealMask.alphaMap = shapeMask; sealMask.alphaTest = 0.5; keep(sealMask);
      var wsGlass = cabGlass.clone(); wsGlass.alphaMap = shapeMask; wsGlass.alphaTest = 0.5; wsGlass.onBeforeCompile = cabGlass.onBeforeCompile; wsGlass.customProgramCacheKey = function () { return "mh-snow-wsglass"; }; keep(wsGlass);
      var wsFrame = add(new THREE.Mesh(noseSheet(1.58, 0.58, 1.73, 0.006), sealMask), 0, 0, 0);
      var wsPane = add(new THREE.Mesh(noseSheet(1.5, 0.5, 1.73, 0.012), wsGlass), 0, 0, 0);
      wsFrame.receiveShadow = wsPane.receiveShadow = false;
      var wiper = keep(new THREE.BoxGeometry(0.012, 0.016, 0.46));
      add(new THREE.Mesh(wiper, rubber), 2.375, 1.47, 0.3).rotation.x = 0.55;
      add(new THREE.Mesh(wiper, rubber), 2.375, 1.47, -0.4).rotation.x = 0.55;
      var rwGeo = rrect(1.15, 0.42, 0.1); rwGeo.rotateY(-Math.PI / 2);
      add(new THREE.Mesh(rwGeo, glassMat), -2.296, 1.74, 0).receiveShadow = false;
      // nose: intake grille under the windshield, lamps, signals, bumper, plate
      var grille = add(new THREE.Mesh(keep(new THREE.BoxGeometry(0.02, 0.1, 1.1)), seal), 2.362, 1.34, 0);
      for (var gs = 0; gs < 4; gs++) add(new THREE.Mesh(keep(new THREE.BoxGeometry(0.012, 0.008, 1.08)), whitePaint), 2.373, 1.305 + gs * 0.024, 0);
      var lensMat = keep(new THREE.MeshPhysicalMaterial({ color: Lc("#8c9697"), roughness: 0.16, metalness: 0.1, clearcoat: 0.6, emissive: new THREE.Color(1, 0.93, 0.78), emissiveIntensity: 0 }));
      var indMat = keep(new THREE.MeshStandardMaterial({ color: Lc("#e39a3a"), roughness: 0.3, emissive: new THREE.Color(1, 0.5, 0.1), emissiveIntensity: 0 }));
      var tailMat = keep(new THREE.MeshStandardMaterial({ color: Lc("#7a1d18"), roughness: 0.3, emissive: new THREE.Color(1, 0.12, 0.08), emissiveIntensity: 0 }));
      var headSprites = [];
      var lensGeo = keep(new THREE.SphereGeometry(0.15, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.32)); lensGeo.rotateZ(-Math.PI / 2);
      var ringGeo = keep(new THREE.TorusGeometry(0.16, 0.026, 10, 32)); ringGeo.rotateY(Math.PI / 2);
      var bowlGeo = keep(new THREE.CylinderGeometry(0.15, 0.15, 0.06, 28)); bowlGeo.rotateZ(Math.PI / 2);
      var indGeo = keep(new THREE.SphereGeometry(0.06, 14, 10));
      var glowSpriteMat = function (c) { return keep(new THREE.SpriteMaterial({ map: glowTex, color: c, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, fog: false })); };
      [0.6, -0.6].forEach(function (z) {
        add(new THREE.Mesh(bowlGeo, chrome), 2.36, 0.98, z);
        add(new THREE.Mesh(lensGeo, lensMat), 2.345, 0.98, z);
        add(new THREE.Mesh(ringGeo, chrome), 2.39, 0.98, z);
        var ind = add(new THREE.Mesh(indGeo, indMat), 2.36, 1.2, z * 1.12); ind.scale.set(0.45, 0.6, 1);
        add(new THREE.Mesh(keep(new THREE.BoxGeometry(0.05, 0.26, 0.11)), tailMat), -2.3, 1.06, z * 1.25);
        var spr = new THREE.Sprite(glowSpriteMat(new THREE.Color(1, 0.92, 0.75)));
        spr.scale.setScalar(1.5); spr.position.set(2.52, 0.98, z); bodyG.add(spr); headSprites.push(spr);
      });
      var bump = keep(new THREE.CylinderGeometry(0.075, 0.075, 2.02, 18)); bump.rotateX(Math.PI / 2);
      add(new THREE.Mesh(bump, chrome), 2.45, 0.54, 0);
      add(new THREE.Mesh(bump, chrome), -2.38, 0.54, 0);
      [0.55, -0.55].forEach(function (z) { add(new THREE.Mesh(keep(new THREE.CylinderGeometry(0.045, 0.045, 0.3, 12)), chrome), 2.48, 0.62, z); });
      var plate = rrect(0.42, 0.13, 0.02); plate.rotateY(Math.PI / 2);
      add(new THREE.Mesh(plate, keep(new THREE.MeshStandardMaterial({ color: Lc("#ece7d6"), roughness: 0.5 }))), 2.52, 0.66, 0);
      // wheels: tyre, rounded sidewall, white steel rim, chrome hubcap
      var tireGeo = keep(new THREE.CylinderGeometry(0.41, 0.41, 0.24, 40)); tireGeo.rotateX(Math.PI / 2);
      var sideWallGeo = keep(new THREE.TorusGeometry(0.33, 0.085, 12, 40));
      var rimGeo = keep(new THREE.CylinderGeometry(0.25, 0.25, 0.26, 32)); rimGeo.rotateX(Math.PI / 2);
      var capGeo = keep(new THREE.SphereGeometry(0.14, 20, 12));
      [[-1.45, 0.8], [-1.45, -0.8], [1.45, 0.8], [1.45, -0.8]].forEach(function (p) {
        add(new THREE.Mesh(tireGeo, rubber), p[0], 0.41, p[1]);
        add(new THREE.Mesh(sideWallGeo, rubber), p[0], 0.41, p[1] * 1.15);
        add(new THREE.Mesh(rimGeo, whiteRim), p[0], 0.41, p[1] * 1.02);
        var cap = add(new THREE.Mesh(capGeo, chrome), p[0], 0.41, p[1] * 1.16); cap.scale.z = 0.35;
      });
      // rain gutters, mirrors, handles, door seams, rear louvres
      var gutter = keep(new THREE.CylinderGeometry(0.018, 0.018, 3.9, 8)); gutter.rotateZ(Math.PI / 2);
      [1, -1].forEach(function (side) {
        add(new THREE.Mesh(gutter, whitePaint), -0.15, 2.17, side * 1.0);
        add(new THREE.Mesh(keep(new THREE.CylinderGeometry(0.012, 0.012, 0.34, 8)), chrome), 2.0, 1.47, side * 1.06).rotation.x = side * 0.9;
        var mir = add(new THREE.Mesh(keep(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 20)), chrome), 2.0, 1.62, side * 1.2); mir.rotation.z = Math.PI / 2;
        add(new THREE.Mesh(keep(new THREE.BoxGeometry(0.15, 0.03, 0.035)), chrome), 0.98, 1.4, side * (ZS + 0.012));
        add(new THREE.Mesh(keep(new THREE.BoxGeometry(0.014, 0.88, 0.008)), seal), 1.02, 0.9, side * (ZS + 0.002));
        for (var lv = 0; lv < 6; lv++) add(new THREE.Mesh(keep(new THREE.BoxGeometry(0.34, 0.016, 0.012)), seal), -1.78, 1.12 + lv * 0.045, side * (ZS + 0.003));
      });
      add(new THREE.Mesh(keep(new THREE.BoxGeometry(0.014, 0.88, 0.008)), seal), -0.05, 0.9, -(ZS + 0.002));
      add(new THREE.Mesh(keep(new THREE.BoxGeometry(0.014, 0.88, 0.008)), seal), -1.1, 0.9, -(ZS + 0.002));
      add(new THREE.Mesh(keep(new THREE.BoxGeometry(1.05, 0.012, 0.01)), seal), -0.57, 1.36, -(ZS + 0.003));
      // contact shadow under the van (soft ambient occlusion on the ground)
      var aoMat = keep(new THREE.MeshBasicMaterial({ map: glowTex, color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false }));
      var ao = new THREE.Mesh(keep(new THREE.PlaneGeometry(6.2, 3.2)), aoMat); ao.rotation.x = -Math.PI / 2; ao.position.y = 0.03; ao.renderOrder = 1; bodyG.add(ao);

      // roof: rack, luggage, snow cap
      var ROOF = 2.3;
      var rackMat = snowify(new THREE.MeshStandardMaterial({ color: Lc("#232427"), roughness: 0.5, metalness: 0.7 }), null, "rack");
      var railGeo = keep(new THREE.CylinderGeometry(0.022, 0.022, 3.4, 8)); railGeo.rotateZ(Math.PI / 2);
      var crossGeo = keep(new THREE.CylinderGeometry(0.02, 0.02, 1.5, 8)); crossGeo.rotateX(Math.PI / 2);
      var legGeo = keep(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 6));
      var rackParts = [];
      [0.74, -0.74].forEach(function (z) { rackParts.push(add(new THREE.Mesh(railGeo, rackMat), -0.25, ROOF + 0.18, z, roofG)); });
      for (var ci = 0; ci < 6; ci++) rackParts.push(add(new THREE.Mesh(crossGeo, rackMat), -1.9 + ci * 0.66, ROOF + 0.15, 0, roofG));
      [[-1.9, 0.74], [-1.9, -0.74], [1.4, 0.74], [1.4, -0.74], [-0.25, 0.74], [-0.25, -0.74]].forEach(function (p) { rackParts.push(add(new THREE.Mesh(legGeo, rackMat), p[0], ROOF + 0.08, p[1], roofG)); });
      function capsule(r, len, seg) {
        var pts = [];
        for (var k = 0; k <= 10; k++) { var a = -Math.PI / 2 + (k / 10) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r - len / 2)); }
        for (k = 0; k <= 10; k++) { var a2 = (k / 10) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.cos(a2) * r, Math.sin(a2) * r + len / 2)); }
        return keep(new THREE.LatheGeometry(pts, seg || 24));
      }
      var knitTex = canvasTex(128, 128, function (g, w, h) {
        g.fillStyle = "rgb(128,128,255)"; g.fillRect(0, 0, w, h);
        for (var x = 0; x < w; x += 8) { var gr = g.createLinearGradient(x, 0, x + 8, 0); gr.addColorStop(0, "rgb(70,128,230)"); gr.addColorStop(0.5, "rgb(128,128,255)"); gr.addColorStop(1, "rgb(186,128,230)"); g.fillStyle = gr; g.fillRect(x, 0, 8, h); }
        for (var y = 0; y < h; y += 6) { g.fillStyle = "rgba(128,90,240,0.35)"; g.fillRect(0, y, w, 1); }
      });
      knitTex.wrapS = knitTex.wrapT = THREE.RepeatWrapping; knitTex.repeat.set(6, 6);
      var leather = snowify(new THREE.MeshStandardMaterial({ color: Lc("#6b3f24"), roughness: 0.55 }), null, "leather");
      var canvasBag = snowify(new THREE.MeshStandardMaterial({ color: Lc("#55603e"), roughness: 0.9, normalMap: knitTex, normalScale: new THREE.Vector2(0.3, 0.3) }), null, "canvas");
      var blanket = snowify(new THREE.MeshStandardMaterial({ map: fabricTex, roughness: 0.95 }), null, "blanket");
      var duffel = add(new THREE.Mesh(capsule(0.2, 0.5), leather), 0.75, ROOF + 0.38, 0.12, roofG); duffel.rotation.z = Math.PI / 2; duffel.scale.set(1, 1, 0.85);
      var strap = add(new THREE.Mesh(keep(new THREE.TorusGeometry(0.2, 0.015, 8, 24, Math.PI)), leather), 0.75, ROOF + 0.46, 0.12, roofG); strap.rotation.y = Math.PI / 2;
      var bag2 = add(new THREE.Mesh(capsule(0.17, 0.3), canvasBag), 0.25, ROOF + 0.34, -0.42, roofG); bag2.rotation.z = Math.PI / 2; bag2.rotation.y = 0.4;
      var roll = keep(new THREE.CylinderGeometry(0.13, 0.13, 0.9, 24)); roll.rotateX(Math.PI / 2);
      var rollM = add(new THREE.Mesh(roll, blanket), 1.25, ROOF + 0.34, 0, roofG);
      var blanketM = add(new THREE.Mesh(keep(new THREE.BoxGeometry(0.72, 0.025, 0.86)), blanket), 0, ROOF, 0, roofG); blanketM.visible = false;
      var crate = add(new THREE.Mesh(keep(new THREE.BoxGeometry(0.42, 0.26, 0.5)), canvasBag), -1.55, ROOF + 0.33, 0.35, roofG); crate.rotation.y = 0.2;
      // settled snow on the roof, thickens with the snow amount
      var capShape = new THREE.Shape();
      (function () { var w = 4.15, d = 1.78, r = 0.45, x = -w / 2, y = -d / 2;
        capShape.moveTo(x + r, y); capShape.lineTo(x + w - r, y); capShape.quadraticCurveTo(x + w, y, x + w, y + r); capShape.lineTo(x + w, y + d - r);
        capShape.quadraticCurveTo(x + w, y + d, x + w - r, y + d); capShape.lineTo(x + r, y + d); capShape.quadraticCurveTo(x, y + d, x, y + d - r); capShape.lineTo(x, y + r); capShape.quadraticCurveTo(x, y, x + r, y); })();
      var capGeo2 = keep(new THREE.ExtrudeGeometry(capShape, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 4, curveSegments: 12 }));
      capGeo2.rotateX(-Math.PI / 2);
      (function () { var p = capGeo2.attributes.position, r2 = mulberry(8); for (var k = 0; k < p.count; k++) { if (p.getY(k) > 0.05) p.setY(k, p.getY(k) + Math.sin(p.getX(k) * 3.1) * 0.015 + Math.sin(p.getZ(k) * 4.7 + p.getX(k)) * 0.012 + r2() * 0.01); } capGeo2.computeVertexNormals(); })();
      var snowMat = keep(new THREE.MeshStandardMaterial({ color: Lc("#f2f5fa"), roughness: 0.85 }));
      var snowCap = add(new THREE.Mesh(capGeo2, snowMat), -0.18, ROOF - 0.02, 0, roofG);

      // the person sitting on the roof
      var person = new THREE.Group();
      var personBody = new THREE.Group(); person.add(personBody);
      var skin = keep(new THREE.MeshStandardMaterial({ color: Lc("#c48a66"), roughness: 0.6 }));
      var sweater = snowify(new THREE.MeshStandardMaterial({ color: Lc("#d29c22"), roughness: 0.95, normalMap: knitTex, normalScale: new THREE.Vector2(0.6, 0.6) }), null, "sweater");
      var denim = snowify(new THREE.MeshStandardMaterial({ color: Lc("#36506f"), roughness: 0.85, normalMap: knitTex, normalScale: new THREE.Vector2(0.25, 0.25) }), null, "denim");
      var hairMat = snowify(new THREE.MeshStandardMaterial({ color: Lc("#1d1410"), roughness: 0.45, side: THREE.DoubleSide }), null, "hair");
      var shoeMat = keep(new THREE.MeshStandardMaterial({ color: Lc("#e9e4da"), roughness: 0.7 }));
      var up = new THREE.Vector3(0, 1, 0);
      function seg(a, b, r0, r1, m, parent) {
        var dir = new THREE.Vector3().subVectors(b, a), len = dir.length(); dir.normalize();
        var mesh = new THREE.Mesh(keep(new THREE.CylinderGeometry(r1, r0, len, 18, 1)), m);
        mesh.position.copy(a).addScaledVector(dir, len / 2);
        mesh.quaternion.setFromUnitVectors(up, dir);
        var p = parent || personBody;
        p.add(mesh); vanParts.push(mesh); mesh.castShadow = true;
        var j = new THREE.Mesh(keep(new THREE.SphereGeometry(r1, 18, 12)), m); j.position.copy(b); p.add(j); vanParts.push(j); j.castShadow = true;
        var j0 = new THREE.Mesh(keep(new THREE.SphereGeometry(r0, 18, 12)), m); j0.position.copy(a); p.add(j0); vanParts.push(j0); j0.castShadow = true;
        return mesh;
      }
      function V3(x, y, z) { return new THREE.Vector3(x, y, z); }
      function pm(geo, m, parent) { var o = new THREE.Mesh(keep(geo), m); (parent || personBody).add(o); vanParts.push(o); o.castShadow = true; return o; }
      var pelvis = pm(new THREE.SphereGeometry(0.15, 24, 16), denim); pelvis.scale.set(1.25, 0.65, 1.05); pelvis.position.set(0, 0.09, -0.02);
      var torsoPts = [[0.0, 0], [0.14, 0.0], [0.152, 0.06], [0.145, 0.16], [0.152, 0.26], [0.165, 0.34], [0.155, 0.42], [0.12, 0.47], [0.06, 0.5], [0.0, 0.505]].map(function (v) { return new THREE.Vector2(v[0], v[1]); });
      var torso = new THREE.Group(); torso.position.set(0, 0.1, -0.04); torso.rotation.x = 0.32; personBody.add(torso);
      var tmesh = pm(new THREE.LatheGeometry(torsoPts, 32), sweater, torso); tmesh.scale.set(1.12, 1, 0.78);
      var neck = pm(new THREE.CylinderGeometry(0.045, 0.05, 0.1, 16), skin, torso); neck.position.set(0, 0.53, 0.0);
      var headG = new THREE.Group(); headG.position.set(0, 0.6, 0.02); torso.add(headG);
      var head = pm(new THREE.SphereGeometry(0.1, 32, 24), skin, headG); head.scale.set(0.88, 1.1, 0.98); head.position.set(0, 0.06, 0);
      var nose = pm(new THREE.ConeGeometry(0.014, 0.04, 10), skin, headG); nose.rotation.x = Math.PI / 2; nose.position.set(0, 0.05, 0.1);
      var hairCap = pm(new THREE.SphereGeometry(0.112, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.62), hairMat, headG); hairCap.scale.set(0.95, 1.12, 1.06); hairCap.position.set(0, 0.075, -0.012); hairCap.rotation.x = -0.35;
      var hairPts = [new THREE.Vector2(0.075, 0.0), new THREE.Vector2(0.105, -0.08), new THREE.Vector2(0.12, -0.2), new THREE.Vector2(0.125, -0.32), new THREE.Vector2(0.11, -0.4), new THREE.Vector2(0.06, -0.44)];
      var hairLong = pm(new THREE.LatheGeometry(hairPts, 24, Math.PI * 0.55, Math.PI * 0.9), hairMat, headG);
      hairLong.position.set(0, 0.1, -0.02); hairLong.scale.set(1.0, 1, 0.7);
      [0.095, -0.095].forEach(function (x) {
        seg(V3(x, 0.1, 0.02), V3(x * 1.15, 0.42, 0.34), 0.07, 0.058, denim);
        seg(V3(x * 1.15, 0.42, 0.34), V3(x * 1.1, 0.06, 0.48), 0.055, 0.042, denim);
        var shoe = pm(capsule(0.045, 0.12, 16).clone(), shoeMat); shoe.rotation.x = Math.PI / 2; shoe.position.set(x * 1.1, 0.04, 0.53); shoe.scale.set(1.15, 1, 0.8);
      });
      [[V3(0.17, 0.52, -0.08), 1], [V3(-0.17, 0.52, -0.08), -1]].forEach(function (s) {
        var sh = s[0].clone().applyAxisAngle(new THREE.Vector3(1, 0, 0), 0.32).add(V3(0, 0.1, -0.04));
        var elbow = V3(0.2 * s[1], 0.36, 0.26), hand = V3(0.04 * s[1], 0.36, 0.42);
        seg(sh, elbow, 0.05, 0.043, sweater);
        seg(elbow, hand, 0.042, 0.036, sweater);
        var h = pm(new THREE.SphereGeometry(0.04, 16, 12), skin); h.position.copy(hand).add(V3(0, 0, 0.03)); h.scale.set(1, 0.8, 1.2);
      });
      // cold-weather beanie and scarf
      var woolRed = keep(new THREE.MeshStandardMaterial({ color: Lc("#a23a2c"), roughness: 1, normalMap: knitTex, normalScale: new THREE.Vector2(0.8, 0.8) }));
      var woolCream = keep(new THREE.MeshStandardMaterial({ color: Lc("#e8dcc4"), roughness: 1, normalMap: knitTex, normalScale: new THREE.Vector2(0.8, 0.8) }));
      var cold = new THREE.Group(); personBody.add(cold);
      var beanie = new THREE.Group(); headG.add(beanie);
      var bn = pm(new THREE.SphereGeometry(0.118, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), woolRed, beanie); bn.scale.set(0.95, 1.15, 1.05); bn.position.set(0, 0.09, -0.005);
      var cuff = pm(new THREE.TorusGeometry(0.108, 0.022, 10, 28), woolRed, beanie); cuff.rotation.x = Math.PI / 2 - 0.3; cuff.position.set(0, 0.095, 0.0);
      var pom = pm(new THREE.SphereGeometry(0.04, 14, 10), woolCream, beanie); pom.position.set(0, 0.225, -0.02);
      var scarf = new THREE.Group(); torso.add(scarf);
      var sc1 = pm(new THREE.TorusGeometry(0.075, 0.04, 12, 28), woolCream, scarf); sc1.rotation.x = Math.PI / 2; sc1.position.set(0, 0.5, 0.0);
      var sc2 = pm(new THREE.BoxGeometry(0.07, 0.26, 0.03), woolCream, scarf); sc2.position.set(0.05, 0.38, 0.12); sc2.rotation.x = -0.25;
      // umbrella for rain
      var umbrella = new THREE.Group(); personBody.add(umbrella);
      var umbMat = keep(new THREE.MeshStandardMaterial({ color: Lc("#1f2b45"), roughness: 0.45, side: THREE.DoubleSide }));
      var canopy = pm(new THREE.SphereGeometry(0.62, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.42), umbMat, umbrella); canopy.scale.set(1, 0.55, 1); canopy.position.y = 0.0;
      var shaft = pm(new THREE.CylinderGeometry(0.016, 0.016, 0.8, 8), keep(new THREE.MeshStandardMaterial({ color: Lc("#2a2b2e"), roughness: 0.5 })), umbrella); shaft.position.y = -0.38;
      var handle = pm(new THREE.TorusGeometry(0.04, 0.012, 8, 16, Math.PI), keep(new THREE.MeshStandardMaterial({ color: Lc("#5a3a22"), roughness: 0.6 })), umbrella); handle.position.set(0.04, -0.78, 0); handle.rotation.z = Math.PI;
      var tipU = pm(new THREE.ConeGeometry(0.012, 0.06, 8), chrome, umbrella); tipU.position.y = 0.36;
      umbrella.position.set(0.1, 0.98, 0.12); umbrella.rotation.set(0.12, 0, -0.22);
      // lantern beside her
      var lantern = new THREE.Group();
      var lanternGlassMat = keep(new THREE.MeshStandardMaterial({ color: Lc("#f6e2b0"), roughness: 0.2, emissive: new THREE.Color(1, 0.7, 0.32), emissiveIntensity: 0, transparent: true, opacity: 0.9 }));
      var lg1 = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 16)), lanternGlassMat); lg1.position.y = 0.1; lantern.add(lg1);
      var lc1 = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.03, 0.075, 0.05, 16)), rackMat); lc1.position.y = 0.2; lantern.add(lc1);
      var lb1 = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 16)), rackMat); lb1.position.y = 0.02; lantern.add(lb1);
      var lspr = new THREE.Sprite(glowSpriteMat(new THREE.Color(1, 0.75, 0.4))); lspr.scale.setScalar(0.28); lspr.position.y = 0.1; lantern.add(lspr);
      lantern.position.set(0.32, 0.0, 0.18);
      person.add(lantern);
      person.position.set(-0.85, ROOF + 0.04, 0.0);
      person.rotation.y = -Math.PI / 2 - 0.55;
      roofG.add(person);
      person.visible = opts.character !== false;

      var beamMat = keep(new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        uniforms: { uOn: { value: 0 }, uHaze: { value: 0 } },
        vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
        fragmentShader: "uniform float uOn, uHaze; varying vec2 vUv; void main(){ float a = pow(clamp(vUv.y, 0.0, 1.0), 2.4) * (0.012 + uHaze*0.075) * uOn; gl_FragColor = vec4(vec3(1.0, 0.88, 0.66) * a, a); }"
      }));
      var beamGeo = keep(new THREE.ConeGeometry(1.5, 9, 24, 1, true)), beamCones = [];
      [0.6, -0.6].forEach(function (z) {
        var cone = new THREE.Mesh(beamGeo, beamMat); beamCones.push(cone);
        cone.rotation.z = Math.PI / 2;
        cone.position.set(2.42 + 4.5, 0.95, z);
        bodyG.add(cone);
      });
      scene.add(van);

      var camNear = narrowScreen ? 12.5 : 8;
      function resetObjects() {
        tree.position.set(TREE_HOME.x, terrainH(TREE_HOME.x, TREE_HOME.z) - 0.1, TREE_HOME.z);
        van.position.set(VAN_HOME.x, terrainH(VAN_HOME.x, VAN_HOME.z), VAN_HOME.z); van.rotation.y = VAN_ROT;
      }
      resetObjects();

      /* ---------- fireflies ---------- */
      var ffGeo = keep(new THREE.BufferGeometry()), ffp = [], ffs = [];
      for (i = 0; i < 90; i++) {
        ffp.push(-12 + Math.random() * 26, 0.3 + Math.random() * 2.2, -28 + Math.random() * 26);
        ffs.push(Math.random() + 0.5, Math.random(), Math.random() + 0.5, Math.random() + 0.5);
      }
      ffGeo.setAttribute("position", new THREE.Float32BufferAttribute(ffp, 3));
      ffGeo.setAttribute("aSeed", new THREE.Float32BufferAttribute(ffs, 4));
      var ffMat = keep(new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uNight: { value: 0 }, uPx: { value: DPR } },
        vertexShader: [
          "attribute vec4 aSeed; uniform float uTime, uNight, uPx; varying float vA;",
          "void main(){ vec3 p = position;",
          " p.x += sin(uTime*0.5*aSeed.x + aSeed.y*6.28)*0.8; p.y += sin(uTime*0.8*aSeed.z + aSeed.w*6.28)*0.35; p.z += cos(uTime*0.4*aSeed.y + aSeed.x*6.28)*0.8;",
          " vec4 mv = modelViewMatrix*vec4(p,1.0); gl_PointSize = uPx * 46.0 / -mv.z;",
          " vA = uNight * (0.25 + 0.75*pow(clamp(0.5+0.5*sin(uTime*2.0*aSeed.w + aSeed.x*20.0), 0.0, 1.0), 3.0)); gl_Position = projectionMatrix*mv; }"
        ].join("\n"),
        fragmentShader: "varying float vA; void main(){ float d = length(gl_PointCoord-0.5); float a = 1.0 - smoothstep(0.0, 0.5, d); a*=a; gl_FragColor = vec4(vec3(1.0,0.85,0.35)*a*vA*2.0, a*vA);" + OUT + "}"
      }));
      var fireflies = new THREE.Points(ffGeo, ffMat);
      fireflies.frustumCulled = false;
      scene.add(fireflies);

      /* ---------- grass ---------- */
      var SEGN = (lowQ || autoQ) ? 3 : 5, bp = [], bi = [];
      for (i = 0; i < SEGN; i++) { var by2 = i / SEGN, bw = 0.5 * (1 - Math.pow(by2, 1.3) * 0.9); bp.push(-bw, by2, 0, bw, by2, 0); }
      bp.push(0, 1, 0);
      for (i = 0; i < SEGN - 1; i++) { var a0 = i * 2; bi.push(a0, a0 + 1, a0 + 2, a0 + 1, a0 + 3, a0 + 2); }
      var lastI = (SEGN - 1) * 2; bi.push(lastI, lastI + 1, SEGN * 2);
      var grassGeo = keep(new THREE.InstancedBufferGeometry());
      grassGeo.setIndex(bi);
      grassGeo.setAttribute("position", new THREE.Float32BufferAttribute(bp, 3));
      var N = lowQ ? 28000 : (autoQ ? (narrowScreen ? 38000 : 72000) : (narrowScreen ? 60000 : 110000));
      var offs = new Float32Array(N * 3), prm = new Float32Array(N * 4);
      for (i = 0; i < N; i++) {
        var z, half, x, dist, tries = 0;
        do {
          z = camNear - 1.2 - (camNear + 92) * Math.pow(Math.random(), 1.65);
          half = 9 + Math.max(0, 9 - z) * 0.95;
          x = (Math.random() * 2 - 1) * half;
          dist = Math.max(0, camNear - z);
          var endD = 88 + 14 * fbm2(x * 0.011 + 5.1, 2.3, 3);
          tries++;
        } while (tries < 12 && Math.random() > 1 - smooth(endD - 40, endD, dist));
        offs[i * 3] = x; offs[i * 3 + 1] = terrainH(x, z); offs[i * 3 + 2] = z;
        prm[i * 4] = Math.random() * Math.PI;
        prm[i * 4 + 1] = (0.32 + Math.random() * 0.56) * (0.75 + fbm2(x*0.22,z*0.22,2)*0.65) * (1 + dist * 0.003);
        prm[i * 4 + 2] = (0.027 + 0.008 * smooth(10, 40, dist)) * (1 + dist * 0.055) * (0.7 + Math.random() * 0.5);
        prm[i * 4 + 3] = Math.random();
      }
      grassGeo.setAttribute("aOffset", new THREE.InstancedBufferAttribute(offs, 3));
      grassGeo.setAttribute("aP", new THREE.InstancedBufferAttribute(prm, 4));
      grassGeo.instanceCount = N;

      var FLATTEN = [
        " vec2 vl = aOffset.xz - uVanPos.xz; float cr = cos(uVanRot), sr = sin(uVanRot);",
        " vec2 lv = vec2(vl.x*cr - vl.y*sr, vl.x*sr + vl.y*cr);",
        " float inside = (1.0 - smoothstep(2.55, 3.55, abs(lv.x)))*(1.0 - smoothstep(1.1, 1.85, abs(lv.y)));"
      ].join("\n");
      var grassMat = shaderMat({},
        [
          "attribute vec3 aOffset; attribute vec4 aP;",
          "uniform float uHeight, uFogD, uVanRot, uSnow; uniform vec3 uTreePos, uVanPos;",
          "varying float vH, vRand, vGust, vPatch, vFog, vFar, vY, vSh, vDist; varying vec3 vW, vN;",
          NOISE, WIND, SHADOW, CLOUDSH,
          "void main(){",
          " float h = position.y; float ht = aP.y*uHeight*(1.0 - uSnow*0.25);",
          " float c = cos(aP.x), s = sin(aP.x);",
          " float px = position.x*aP.z;",
          " vec3 w = aOffset + vec3(px*c, h*ht, px*s);",
          " float k = h*h;",
          " w.xz += vec2(-s, c)*(aP.w - 0.5)*0.6*k*ht;",
          " float gust;",
          " w += bend(aOffset.xz, k, ht, aP.w, gust);",
          FLATTEN,
          " w.y = mix(w.y, w.y*0.08, inside);",
          " w = mix(w, aOffset, step(aP.w, uSnow*0.62));",
          " vec2 td = aOffset.xz - uTreePos.xz; float tl = length(td);",
          " w.xz += (td/max(tl, 0.001))*(1.0 - smoothstep(0.6, 1.6, tl))*0.7*k*ht;",
          " vH = h; vRand = aP.w; vGust = gust; vY = w.y - aOffset.y;",
          " vPatch = vnoise(aOffset.xz*0.055 + 3.7);",
          " vec3 n = vec3(-s, 0.0, c);",
          " vN = normalize(n + vec3(c, 0.0, s)*sign(position.x)*0.5 + vec3(0.0, 0.35 + h*0.5, 0.0));",
          " vW = w;",
          " vSh = sunShadowFast(w)*cloudShadow(w);",
          " vec4 mv = viewMatrix*vec4(w, 1.0);",
          " float d = -mv.z; vFog = 1.0 - exp(-uFogD*d); vFar = smoothstep(15.0, 60.0, d); vDist = d;",
          " gl_Position = projectionMatrix*mv;",
          "}"
        ].join("\n"),
        [
          "uniform vec3 uBase, uTip, uDry; uniform float uTime;",
          "varying float vH, vRand, vGust, vPatch, vFog, vFar, vY, vSh, vDist; varying vec3 vW, vN;",
          NOISE, LIGHT, HEADL, CANOPY(),
          "void main(){",
          " vec3 green = mix(uBase, uTip, smoothstep(0.0, 1.0, vH));",
          " vec3 dry = mix(uBase*1.3, uDry, smoothstep(0.0, 1.0, vH));",
          " float dk = smoothstep(0.42, 0.78, vPatch);",
          // small, natural differences between blades: a little lighter or darker, a little bluer or yellower
          " float hv = fract(vRand*7.31);",
          " vec3 alb = mix(green, dry, dk*0.34) * (0.86 + vRand*0.28) * mix(vec3(0.96, 1.0, 1.14), vec3(1.05, 1.0, 0.86), hv);",
          " alb = mix(alb, vec3(0.15, 0.135, 0.1)*(0.75 + vRand*0.5), uSnow*0.8) * (1.0 - uWet*0.25);",
          " vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW);",
          " if (dot(N, V) < 0.0) N = -N;",
          " vec3 Ld = normalize(uSunDir);",
          " float ndl = dot(N, Ld);",
          " vec3 diff = vec3(clamp(ndl*0.4 + 0.6, 0.0, 1.0)) + clamp(-ndl, 0.0, 1.0)*0.62*vec3(0.95, 1.0, 0.6);",
          " float trans = pow(clamp(dot(V, -Ld), 0.0, 1.0), 3.0)*vH;",
          " float spec = pow(clamp(dot(N, normalize(Ld + V)), 0.0, 1.0), mix(20.0, 60.0, uWet))*mix(0.16, 0.6, uWet)*vH;",
          " float sh = shadowAt(vW.xz) * vSh;",
          " float ao = mix(0.20, 1.0, smoothstep(0.0, 0.85, vH)); ao = mix(ao, 1.0, vFar);",
          " ao = mix(ao, 1.0, uSnow*0.5);",
          " vec3 col = alb*uAmbC*ao*mix(" + gk(GRK.aNear) + ", " + gk(GRK.aFar) + ", vFar) + alb*uSunC*diff*ao*sh*mix(" + gk(GRK.sNear) + ", " + gk(GRK.sFar) + ", vFar) + alb*uSunC*trans*uTransK*" + gk(GRK.tr) + "*(1.0 - vFar*0.5)*sh*vec3(0.85, 1.0, 0.42) + uSunC*spec*sh*0.45;",
          // blades are a little glossy: they reflect the sky, which keeps the meadow from turning neon
          " float Fs = 0.03 + 0.15*pow(1.0 - abs(dot(N, V)), 4.0);",
          " col += mix(uFogC, uAmbC*1.3, 0.5)*Fs*" + gk(GRK.sheen) + "*mix(ao, 1.0, 0.6)*(1.0 - uSnow*0.6);",
          " col *= 1.0 + vGust*0.12*vH;",
          " float cfb = smoothstep(26.0, 74.0, vDist)*(1.0 - uSnow);",
          " if (cfb > 0.001) { vec3 vW2 = vW; " + "vec2 mwd = normalize(vec2(1.0, 0.35)); float mwave = vnoise(vW.xz*0.035 - mwd*uTime*0.9)*0.6 + vnoise(vW.xz*0.11 - mwd*uTime*1.6)*0.4;" + " col = mix(col, canopyColor(vW, V, Ld, sh, mwave), cfb*0.9); }",
          " float buried = (1.0 - smoothstep(0.03, 0.16, vY)) * uSnow;",
          " col = mix(col, vec3(0.8, 0.83, 0.88)*(uAmbC + uSunC*0.5*sh), buried*0.9);",
          " col = mix(col, vec3(0.86, 0.89, 0.94)*(uAmbC + uSunC*0.4*sh), clamp(N.y, 0.0, 1.0)*uSnow*0.22*vH);",
          " col += alb*vanGlow(vW)*(0.3 + vH);",
          " col += alb*headlight(vW)*(0.2 + vH*1.3);",
          " col = mix(col, uFogC, vFog);",
          " gl_FragColor = vec4(col, 1.0);", OUT,
          "}"
        ].join("\n"), { side: THREE.DoubleSide, lights: true });
      var grass = new THREE.Mesh(grassGeo, grassMat);
      grass.frustumCulled = false;
      scene.add(grass);

      /* ---------- wildflowers ---------- */
      var FN = lowQ ? 700 : (narrowScreen ? 1100 : 2800);
      var fOff = new Float32Array(FN * 3), fPrm = new Float32Array(FN * 4), fCol = new Float32Array(FN * 3);
      var palette = ["#f4f1e8", "#f6d54a", "#b9a2e6", "#f2f0ff", "#e98bb0", "#7aa8ee"].map(Lc);
      var fr2 = mulberry(77), drifts = [];
      for (i = 0; i < 20; i++) {
        var dz = camNear - 2 - 34 * Math.pow(fr2(), 1.2);
        var dh = 7 + Math.max(0, 9 - dz) * 0.85;
        drifts.push({ x: (fr2() * 2 - 1) * dh, z: dz, r: 1.5 + fr2() * 3, c: palette[i % palette.length] });
      }
      for (i = 0; i < FN; i++) {
        var dd = drifts[Math.floor(fr2() * drifts.length)];
        var ra = fr2() * 6.283, rd = Math.sqrt(-2 * Math.log(Math.max(1e-4, fr2()))) * dd.r * 0.6;
        var fx = dd.x + Math.cos(ra) * rd, fz = Math.min(camNear - 0.5, dd.z + Math.sin(ra) * rd);
        fOff[i * 3] = fx; fOff[i * 3 + 1] = terrainH(fx, fz); fOff[i * 3 + 2] = fz;
        fPrm[i * 4] = 0.4 + fr2() * 0.43;
        fPrm[i * 4 + 1] = (0.045 + fr2() * 0.035) * (1 + Math.max(0, camNear - fz) * 0.025);
        fPrm[i * 4 + 2] = fr2();
        fPrm[i * 4 + 3] = fr2();
        var pc = fr2() < 0.8 ? dd.c : palette[Math.floor(fr2() * palette.length)];
        fCol[i * 3] = pc.r; fCol[i * 3 + 1] = pc.g; fCol[i * 3 + 2] = pc.b;
      }
      var flwGeo = keep(new THREE.InstancedBufferGeometry());
      var fq = new THREE.PlaneGeometry(1, 1);
      flwGeo.index = fq.index; flwGeo.attributes.position = fq.attributes.position;
      flwGeo.setAttribute("aOffset", new THREE.InstancedBufferAttribute(fOff, 3));
      flwGeo.setAttribute("aF", new THREE.InstancedBufferAttribute(fPrm, 4));
      flwGeo.setAttribute("aCol", new THREE.InstancedBufferAttribute(fCol, 3));
      flwGeo.instanceCount = FN;
      var flowerMat = shaderMat({},
        [
          "attribute vec3 aOffset; attribute vec4 aF; attribute vec3 aCol;",
          "uniform float uHeight, uFogD, uVanRot, uFlowers, uYellow; uniform vec3 uVanPos;",
          "varying vec2 vUv; varying vec3 vCol; varying vec3 vW; varying float vFog; varying float vRot; varying float vSh;",
          NOISE, WIND, SHADOW, CLOUDSH,
          "void main(){",
          " float ht = aF.x*uHeight; float gust;",
          " vec3 base = aOffset + vec3(0.0, ht, 0.0) + bend(aOffset.xz, 1.0, ht, aF.w, gust);",
          FLATTEN,
          " float show = step(aF.w, uFlowers) * (1.0 - inside);",
          " vec4 mv = viewMatrix*vec4(base, 1.0);",
          " mv.xy += position.xy*aF.y*show;",
          " vUv = position.xy + 0.5; vCol = mix(aCol, vec3(0.93, 0.62, 0.05), step(fract(aF.z*7.31), uYellow)); vW = base; vRot = aF.z*6.28; vSh = sunShadowFast(base)*cloudShadow(base);",
          " float d = -mv.z; vFog = 1.0 - exp(-uFogD*d);",
          " gl_Position = projectionMatrix*mv;",
          "}"
        ].join("\n"),
        [
          "varying vec2 vUv; varying vec3 vCol; varying vec3 vW; varying float vFog; varying float vRot; varying float vSh;",
          NOISE, LIGHT, HEADL,
          "void main(){",
          " vec2 p = vUv - 0.5; float r = length(p)*2.0; float a = atan(p.y, p.x) + vRot;",
          " float petal = 0.6 + 0.4*abs(cos(a*2.5));",
          " if (r > petal) discard;",
          " vec3 alb = vCol*(0.75 + 0.25*(1.0 - r));",
          " if (r < 0.26) alb = vec3(0.9, 0.62, 0.08);",
          " float sh = shadowAt(vW.xz) * vSh;",
          " vec3 col = alb*(uAmbC*0.9 + uSunC*0.75*sh) + alb*vanGlow(vW) + alb*headlight(vW);",
          " col = mix(col, uFogC, vFog);",
          " gl_FragColor = vec4(col, 1.0);", OUT,
          "}"
        ].join("\n"), { lights: true });
      var flowers = new THREE.Mesh(flwGeo, flowerMat);
      flowers.frustumCulled = false;
      scene.add(flowers);

      /* ---------- butterflies: spring/summer days and the early light; eight species, some of them vivid ---------- */
      // one atlas, 4 x 2 cells (the right-hand wing pair, body on the cell's left edge): cabbage white, brimstone,
      // small tortoiseshell, common blue, peacock, swallowtail, monarch and blue morpho
      var BSP = 8;
      var bflyTex = canvasTex(512, 256, function (g2) {
        var shapes = {
          std: function () {
            g2.beginPath();
            g2.moveTo(2, 31); g2.quadraticCurveTo(20, 2, 60, 5); g2.quadraticCurveTo(63, 22, 47, 31); g2.closePath();
            g2.moveTo(2, 33); g2.quadraticCurveTo(40, 29, 49, 38); g2.quadraticCurveTo(47, 58, 26, 61); g2.quadraticCurveTo(8, 56, 2, 41); g2.closePath();
          },
          scallop: function () {
            g2.beginPath();
            g2.moveTo(2, 30); g2.quadraticCurveTo(18, 2, 58, 4); g2.lineTo(62, 12); g2.lineTo(57, 17); g2.lineTo(60, 23); g2.quadraticCurveTo(52, 31, 44, 31); g2.closePath();
            g2.moveTo(2, 33); g2.quadraticCurveTo(38, 29, 50, 37); g2.lineTo(47, 44); g2.lineTo(49, 50); g2.quadraticCurveTo(42, 60, 26, 61); g2.quadraticCurveTo(8, 56, 2, 41); g2.closePath();
          },
          tail: function () {
            g2.beginPath();
            g2.moveTo(2, 30); g2.quadraticCurveTo(22, 1, 62, 3); g2.quadraticCurveTo(57, 21, 44, 30); g2.closePath();
            g2.moveTo(2, 33); g2.quadraticCurveTo(36, 30, 45, 37); g2.quadraticCurveTo(46, 48, 39, 53); g2.lineTo(41, 63); g2.lineTo(35, 63); g2.lineTo(32, 56); g2.quadraticCurveTo(12, 58, 2, 42); g2.closePath();
          },
          long: function () {
            g2.beginPath();
            g2.moveTo(2, 30); g2.quadraticCurveTo(16, 2, 63, 3); g2.quadraticCurveTo(62, 20, 46, 30); g2.closePath();
            g2.moveTo(2, 33); g2.quadraticCurveTo(38, 29, 48, 37); g2.quadraticCurveTo(48, 56, 26, 60); g2.quadraticCurveTo(8, 56, 2, 41); g2.closePath();
          },
          broad: function () {
            g2.beginPath();
            g2.moveTo(2, 30); g2.quadraticCurveTo(16, 0, 62, 4); g2.quadraticCurveTo(64, 24, 46, 31); g2.closePath();
            g2.moveTo(2, 33); g2.quadraticCurveTo(46, 28, 55, 40); g2.quadraticCurveTo(52, 62, 24, 62); g2.quadraticCurveTo(6, 57, 2, 42); g2.closePath();
          }
        };
        var shapeNow = shapes.std;
        function dot(x, y, r, c) { g2.fillStyle = c; g2.beginPath(); g2.arc(x, y, r, 0, 6.2832); g2.fill(); }
        function base(c0, c1, cx, cy, r) { var gr = g2.createRadialGradient(cx || 0, cy || 32, 2, cx || 0, cy || 32, r || 64); gr.addColorStop(0, c0); gr.addColorStop(1, c1); g2.fillStyle = gr; g2.fillRect(0, 0, 64, 64); }
        // a dark wing margin: the outline stroke, clipped to the wing so only its inner half shows
        function margin(w, c) { g2.strokeStyle = c; g2.lineWidth = w; shapeNow(); g2.stroke(); }
        function veins(c, w, n) { g2.strokeStyle = c; g2.lineWidth = w; for (var v2 = 0; v2 < n; v2++) { g2.beginPath(); g2.moveTo(2, 32); g2.lineTo(64, 2 + v2 * (60 / (n - 1))); g2.stroke(); } }
        var SPECIES = [
          { shape: "std", paint: function () { base("#cfcbbf", "#f6f4ec"); dot(57, 8, 9, "#2b2a28"); dot(37, 18, 3.6, "#2b2a28"); } },
          { shape: "std", paint: function () { base("#d6cf5a", "#f2ea86"); dot(31, 18, 2.4, "#e08a2c"); dot(26, 46, 2.6, "#e08a2c"); } },
          { shape: "scallop", paint: function () {
            base("#5a2a14", "#e06a1c"); g2.fillStyle = "#1d1410";
            g2.fillRect(17, 3, 8, 8); g2.fillRect(29, 3, 8, 9); g2.fillRect(43, 5, 7, 8);
            dot(55, 10, 2.6, "#f3ead6"); dot(27, 20, 3, "#f2c34a");
            margin(5, "#1d1410");
            for (var k = 0; k < 5; k++) dot(46 - k * 5, 46 + k * 3, 1.4, "#4f7fd6");
          } },
          { shape: "std", paint: function () { base("#a9c1f2", "#5c7cc9"); margin(3, "rgba(255,255,255,0.95)"); } },
          { shape: "scallop", paint: function () {
            base("#4a120c", "#c4301c", 0, 30, 58);
            margin(4, "#3a1610");
            g2.fillStyle = "#2a1610"; g2.fillRect(28, 3, 6, 9); g2.fillRect(40, 4, 5, 7);
            dot(48, 13, 9.5, "#1b1210"); dot(48, 13, 8, "#e8d7a2"); dot(48, 13, 6, "#2f63d6"); dot(48, 13, 3.4, "#0f0c0a"); dot(46, 11, 1.2, "#f6f2e8"); dot(50, 15, 0.9, "#9cc6ff");
            dot(36, 49, 8.5, "#140d0b"); dot(36, 49, 5.6, "#3a66d0"); dot(35, 47, 1.4, "#f6f2e8"); dot(38, 51, 1.0, "#cfe2ff");
          } },
          { shape: "tail", paint: function () {
            base("#f2dc7a", "#f7eaa2");
            veins("#1a1612", 2.2, 7);
            g2.fillStyle = "#1a1612"; g2.fillRect(0, 0, 64, 4);
            g2.beginPath(); g2.moveTo(12, 4); g2.lineTo(18, 4); g2.lineTo(10, 30); g2.lineTo(6, 30); g2.fill();
            margin(9, "#1a1612");
            for (var k = 0; k < 5; k++) dot(54 - k * 2, 9 + k * 4.4, 1.4, "#f6e7a2");
            for (k = 0; k < 4; k++) dot(46 - k * 5, 43 + k * 3, 1.8, "#4c86e8");
            dot(32, 55, 3.2, "#e0461e"); dot(32, 55, 1.4, "#1a1612");
          } },
          { shape: "long", paint: function () {
            base("#c8510e", "#f59a2e", 0, 32, 70);
            veins("#16110d", 2.4, 8);
            margin(8, "#16110d");
            g2.fillStyle = "#16110d"; g2.beginPath(); g2.moveTo(44, 2); g2.lineTo(64, 2); g2.lineTo(64, 22); g2.closePath(); g2.fill();
            for (var k = 0; k < 6; k++) dot(58 - k * 3.2, 4 + k * 4.2, 1.1, "#fbf3e6");
            dot(55, 9, 1.6, "#ffb24a"); dot(51, 13, 1.4, "#ffb24a");
            for (k = 0; k < 6; k++) dot(46 - k * 4, 45 + k * 2.6, 0.9, "#fbf3e6");
          } },
          { shape: "broad", paint: function () {
            base("#1d55e6", "#7fdcff", 2, 34, 60);
            margin(10, "#0c0f1c");
            for (var k = 0; k < 4; k++) dot(54 - k * 3.4, 7 + k * 5, 1.3, "#f2f6ff");
            g2.fillStyle = "rgba(255,255,255,0.18)"; g2.beginPath(); g2.ellipse(30, 18, 16, 6, -0.35, 0, 6.2832); g2.fill();
          } }
        ];
        SPECIES.forEach(function (sp, k) {
          var ox = (k % 4) * 128, oy = (k >> 2) * 128;
          shapeNow = shapes[sp.shape];
          g2.save(); g2.setTransform(2, 0, 0, 2, ox, oy);
          shapeNow(); g2.clip(); sp.paint();
          if (sp.shape !== "tail") { g2.strokeStyle = "rgba(40,28,18,0.3)"; g2.lineWidth = 0.6; for (var v2 = 0; v2 < 5; v2++) { g2.beginPath(); g2.moveTo(2, 32); g2.lineTo(64, 4 + v2 * 14); g2.stroke(); } }
          g2.restore();
          g2.save(); g2.setTransform(2, 0, 0, 2, ox, oy); g2.strokeStyle = "rgba(30,20,12,0.65)"; g2.lineWidth = 0.9; shapeNow(); g2.stroke(); g2.restore();
        });
      });
      bflyTex.encoding = THREE.sRGBEncoding; bflyTex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      var bflyMats = [];
      for (var bk = 0; bk < BSP; bk++) {
        var bt = bflyTex.clone(); bt.needsUpdate = true; bt.repeat.set(0.25, 0.5); bt.offset.set((bk % 4) * 0.25, bk < 4 ? 0.5 : 0); keep(bt);
        // a little self-glow: thin wings let the light through, so they stay vivid in shade
        bflyMats.push(keep(new THREE.MeshStandardMaterial({ map: bt, emissiveMap: bt, emissive: new THREE.Color(1, 1, 1), emissiveIntensity: 0.2, alphaTest: 0.5, alphaToCoverage: true, side: THREE.DoubleSide, roughness: bk === 7 ? 0.3 : 0.6, metalness: bk === 7 ? 0.35 : 0 })));
      }
      var bwGeo = keep(new THREE.PlaneGeometry(1, 1)); bwGeo.translate(0.5, 0, 0); bwGeo.rotateX(Math.PI / 2);
      var bbGeo = keep(new THREE.SphereGeometry(0.5, 8, 6)), bbMat = keep(new THREE.MeshStandardMaterial({ color: Lc("#2b2219"), roughness: 0.8 }));
      var SPAN = [0.062, 0.066, 0.07, 0.048, 0.072, 0.085, 0.09, 0.1], BFN = lowQ ? 5 : (narrowScreen ? 8 : 14), butterflies = [], rB = mulberry(909);
      var BMIX = [4, 6, 0, 5, 7, 2, 1, 3, 4, 6, 5, 7, 0, 2];
      for (i = 0; i < BFN; i++) {
        var spc = BMIX[i % BMIX.length], bg2 = new THREE.Group(), span = SPAN[spc] * 2.4;
        var wR = new THREE.Mesh(bwGeo, bflyMats[spc]), wL = new THREE.Mesh(bwGeo, bflyMats[spc]);
        wR.scale.set(span / 2, 1, span * 0.47); wL.scale.set(-span / 2, 1, span * 0.47);
        var bd2 = new THREE.Mesh(bbGeo, bbMat); bd2.scale.set(span * 0.08, span * 0.08, span * 0.45);
        bg2.add(wR); bg2.add(wL); bg2.add(bd2); bg2.visible = false; scene.add(bg2);
        butterflies.push({ g: bg2, wR: wR, wL: wL, st: 0, t: 0, ph: rB() * 6.28, rate: 6 + rB() * 3, x: 0, y: 0, z: 0, hd: 0, seed: rB() * 100, fl: -1, flee: 0, rest: 0, spc: spc });
      }
      // the same wind the flower shader uses, so a butterfly can sit on a swaying flower head
      function hash12(x, y) { var a = fract(x * 0.1031), b = fract(y * 0.1031), c = a; var d = a * (b + 33.33) + b * (c + 33.33) + c * (a + 33.33); a += d; b += d; c += d; return fract((a + b) * c); }
      function fract(v) { return v - Math.floor(v); }
      function vnoise(x, y) {
        var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
        var a = hash12(ix, iy), b = hash12(ix + 1, iy), c = hash12(ix, iy + 1), d = hash12(ix + 1, iy + 1);
        return (a + (b - a) * ux) * (1 - uy) + (c + (d - c) * ux) * uy;
      }
      var WDX = 0.9437, WDZ = 0.3303;
      function flowerHead(k, out) {
        var x = fOff[k * 3], z = fOff[k * 3 + 2], ht = fPrm[k * 4] * U.uHeight.value, rnd = fPrm[k * 4 + 3], t = U.uTime.value;
        var n = vnoise(x * 0.07 - WDX * t * 0.55, z * 0.07 - WDZ * t * 0.55), n2 = vnoise(x * 0.21 - t * 0.35, z * 0.21 + t * 0.22);
        var gust = smooth(0.25, 0.85, n) * 0.85 + n2 * 0.25;
        var fl = Math.sin(t * 5.3 + rnd * 31 + x * 0.8) * 0.05 + Math.sin(t * 7.7 + rnd * 17) * 0.025;
        var o = (gust * 0.85 + 0.12 + fl) * U.uWind.value * ht;
        return out.set(x + WDX * o, fOff[k * 3 + 1] + ht, z + WDZ * o);
      }
      function angTo(a, b) { var d = (a - b) % 6.2832; if (d > 3.1416) d -= 6.2832; if (d < -3.1416) d += 6.2832; return d; }
      var fHead = new THREE.Vector3();
      function pickFlower(b) {
        var best = -1, bd = 1e9;
        for (var k = 0; k < FN; k += 3) {
          if (fPrm[k * 4 + 3] > P.flowers) continue;
          var taken = false;
          for (var j = 0; j < butterflies.length; j++) if (butterflies[j] !== b && butterflies[j].fl === k) taken = true;
          if (taken) continue;
          var dx = fOff[k * 3] - b.x, dz = fOff[k * 3 + 2] - b.z, d = dx * dx + dz * dz;
          if (d < 0.6 || d > 30 || fOff[k * 3 + 2] > camNear - 3.6 || fOff[k * 3 + 2] < camNear - 10) continue;
          // favour flowers toward the middle of the view
          d += rB() * 12 + fOff[k * 3] * fOff[k * 3] * 0.6;
          if (d < bd) { bd = d; best = k; }
        }
        return best;
      }
      function bflySpawn(b) {
        var side = rB() < 0.5 ? -1 : 1;
        b.z = camNear - 4 - rB() * 5.5; b.x = side * (1.0 + (camNear - b.z) * 0.4); b.y = terrainH(b.x, b.z) + 1.3 + rB() * 0.5;
        b.hd = side > 0 ? -1.57 : 1.57; b.st = 1; b.t = 4 + rB() * 6; b.fl = -1; b.g.visible = true; b.lv = 1; b.g.scale.setScalar(1);
      }
      var bflyFrozen = false, bF = new THREE.Vector3(), bC = new THREE.Vector3(), bUp = new THREE.Vector3(), bRt = new THREE.Vector3(), bM = new THREE.Matrix4();
      function updateButterflies(dt, want, L) {
        if (bflyFrozen) return;
        butterflies.forEach(function (b, k) {
          if (k < want && b.st === 0) bflySpawn(b);
          if (k >= want && (b.st === 1 || b.st === 2 || b.st === 4)) { b.st = 3; b.fl = -1; }
          if (b.st === 0) return;
          var fdx = b.x - cursor.x, fdz = b.z - cursor.z, near = cursorOn > 0.4 && fdx * fdx + fdz * fdz < 3.2;
          var gd = Math.hypot(b.x - U.uGust.value.x, b.z - U.uGust.value.y), ga = gTime - U.uGust.value.z;
          if (ga > 0 && ga < 2.5 && Math.abs(gd - ga * 6) < 1.5) near = true;
          if (near && b.st === 2) { b.st = 1; b.t = 3; b.y += 0.05; }
          if (near) b.flee = 1.4;
          b.flee = Math.max(0, b.flee - dt);
          var flap;
          if (b.st === 2) {
            // perched: sway with the flower, wings open and close slowly
            flowerHead(b.fl, fHead);
            b.x = fHead.x; b.y = fHead.y + 0.012; b.z = fHead.z;
            b.ph += dt * 1.6;
            flap = 0.15 + Math.max(0, Math.sin(b.ph)) * 1.25;
            b.t -= dt; if (b.t < 0) { b.st = 1; b.t = 5 + rB() * 7; }
          } else {
            var w = Math.sin(gTime * 0.9 + b.seed) * 0.8 + Math.sin(gTime * 2.3 + b.seed * 1.7) * 0.6;
            b.hd += w * dt * 1.8;
            if (b.st === 4 && b.fl >= 0) {
              flowerHead(b.fl, fHead);
              var tdx = fHead.x - b.x, tdz = fHead.z - b.z, td = Math.hypot(tdx, tdz);
              b.hd += angTo(Math.atan2(tdx, tdz), b.hd) * Math.min(1, dt * 5);
              if (td < 0.06 && Math.abs(fHead.y - b.y) < 0.08) { b.st = 2; b.t = 2.5 + rB() * 4.5; b.ph = 0; }
              if (td > 9) b.st = 1;
            } else if (b.st === 1 && (Math.abs(b.x) > 0.8 + (camNear - b.z) * 0.4 || b.z > camNear - 3.6 || b.z < camNear - 10)) {
              // stay where they can be seen: in the near meadow, inside the view
              b.hd += angTo(Math.atan2(-b.x, camNear - 6.5 - b.z), b.hd) * Math.min(1, dt * 2.4);
            }
            if (b.flee > 0) b.hd += angTo(Math.atan2(fdx, fdz), b.hd) * Math.min(1, dt * 6);
            var spd = (b.st === 4 ? 0.7 : 1.0 + 0.35 * Math.sin(gTime * 1.3 + b.seed)) * (1 + b.flee * 1.3);
            b.x += Math.sin(b.hd) * spd * dt; b.z += Math.cos(b.hd) * spd * dt;
            var gnd = terrainH(b.x, b.z);
            var ty = b.st === 3 ? b.y + 2 : b.st === 4 ? fHead.y + 0.02 : gnd + 1.25 + 0.6 * (0.5 + 0.5 * Math.sin(gTime * 0.7 + b.seed * 3)) + b.flee * 0.7;
            b.y += (ty - b.y) * Math.min(1, dt * (b.st === 4 ? 3 : 1.4));
            b.y = Math.max(b.y, gnd + 0.25);
            if (b.z > camNear - 3.0 && b.st !== 3) { b.z = camNear - 3.0; b.hd += angTo(Math.PI, b.hd) * Math.min(1, dt * 4); }
            var glide = b.st === 1 && b.flee <= 0 && Math.sin(gTime * 0.8 + b.seed * 5) > 0.72;
            b.ph += dt * b.rate * 6.2832 * (glide ? 0.12 : 1) * (reduce ? 0.6 : 1);
            flap = glide ? 0.3 + Math.sin(b.ph) * 0.06 : 0.5 + Math.sin(b.ph) * 0.85;
            b.t -= dt;
            if (b.st === 1 && b.t < 0 && b.flee <= 0) { b.fl = rB() < 0.3 ? pickFlower(b) : -1; if (b.fl >= 0) b.st = 4; else b.t = 3 + rB() * 5; }
            if (b.st === 3) {
              b.lv = (b.lv == null ? 1 : b.lv) - dt * 0.9;
              b.g.scale.setScalar(Math.max(0.001, b.lv));
              if (b.lv <= 0 || b.y > gnd + 5) { b.st = 0; b.g.visible = false; return; }
            }
          }
          b.wR.rotation.z = flap; b.wL.rotation.z = -flap;
          b.g.position.set(b.x, b.y + (b.st === 2 ? 0 : Math.sin(b.ph) * 0.012), b.z);
          // butterflies roll and pitch all the time; leaning the wings toward the viewer shows their colours
          bF.set(Math.sin(b.hd), 0, Math.cos(b.hd));
          bC.set(camera.position.x - b.x, camera.position.y - b.y, camera.position.z - b.z).normalize();
          bUp.set(0, 1, 0).addScaledVector(bC, b.st === 2 ? 0.45 : 0.9 + 0.25 * Math.sin(gTime * 1.7 + b.seed));
          bUp.addScaledVector(bF, -bUp.dot(bF)).normalize();
          bRt.crossVectors(bUp, bF).normalize();
          b.g.quaternion.setFromRotationMatrix(bM.makeBasis(bRt, bUp, bF));
          b.g.rotateX(b.st === 2 ? -0.25 : -0.1 - Math.cos(b.ph) * 0.08);
        });
      }

      /* ---------- dandelion clocks: brush through the meadow (or send a gust) and their seeds take off on the wind ---------- */
      var PUFFN = lowQ ? 110 : (narrowScreen ? 170 : 340), SEEDN = lowQ ? 1600 : (narrowScreen ? 3200 : 6400);
      var rD = mulberry(4242), dand = [];
      // a seed head: a white globe of fine filaments around a pale centre
      var puffTex = canvasTex(128, 128, function (g2) {
        var r5 = mulberry(31);
        g2.translate(64, 64);
        var core = g2.createRadialGradient(0, 0, 0, 0, 0, 62);
        core.addColorStop(0, "rgba(255,255,255,0.95)"); core.addColorStop(0.2, "rgba(252,252,248,0.8)"); core.addColorStop(0.62, "rgba(246,246,240,0.38)"); core.addColorStop(1, "rgba(240,240,235,0)");
        g2.fillStyle = core; g2.beginPath(); g2.arc(0, 0, 62, 0, 6.2832); g2.fill();
        g2.lineWidth = 1;
        for (var k = 0; k < 140; k++) {
          var a = r5() * 6.2832, l = 36 + r5() * 24;
          g2.strokeStyle = "rgba(255,255,255," + (0.35 + r5() * 0.4).toFixed(2) + ")";
          g2.beginPath(); g2.moveTo(Math.cos(a) * 7, Math.sin(a) * 7); g2.lineTo(Math.cos(a) * l, Math.sin(a) * l); g2.stroke();
          g2.fillStyle = "rgba(255,255,255,0.75)"; g2.beginPath(); g2.arc(Math.cos(a) * l, Math.sin(a) * l, 1.5, 0, 6.2832); g2.fill();
        }
        g2.fillStyle = "rgba(190,176,140,0.95)"; g2.beginPath(); g2.arc(0, 0, 6.5, 0, 6.2832); g2.fill();
      });
      // a single seed: a tiny parachute of filaments
      var seedTex = canvasTex(64, 64, function (g2) {
        var r5 = mulberry(57);
        g2.translate(32, 32);
        var gr = g2.createRadialGradient(0, 0, 0, 0, 0, 30);
        gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.22, "rgba(255,255,255,0.6)"); gr.addColorStop(1, "rgba(255,255,255,0)");
        g2.fillStyle = gr; g2.beginPath(); g2.arc(0, 0, 30, 0, 6.2832); g2.fill();
        g2.lineWidth = 1.3;
        for (var k = 0; k < 26; k++) { var a = r5() * 6.2832, l = 17 + r5() * 12; g2.strokeStyle = "rgba(255,255,255,0.65)"; g2.beginPath(); g2.moveTo(0, 0); g2.lineTo(Math.cos(a) * l, Math.sin(a) * l); g2.stroke(); }
      });
      var pxU = { value: 0.001 }, pxInvU = { value: 1000 };
      // puff instances: placed across the meadow in loose clumps, away from the van and the tree
      var pOff = new Float32Array(PUFFN * 3), pPrm = new Float32Array(PUFFN * 4), pBald = new Float32Array(PUFFN);
      for (i = 0; i < PUFFN; i++) {
        var pz, px, tries = 0;
        do {
          pz = camNear - 1.8 - 36 * Math.pow(rD(), 1.4);
          px = (rD() * 2 - 1) * (1.2 + (camNear - pz) * 0.8);
          if (i > 10 && rD() < 0.45) { var jn = Math.floor(rD() * i); px = pOff[jn * 3] + (rD() - 0.5) * 1.6; pz = Math.min(camNear - 1.5, pOff[jn * 3 + 2] + (rD() - 0.5) * 1.6); }
          tries++;
        } while (tries < 30 && ((Math.abs(px - VAN_HOME.x) < 3.3 && Math.abs(pz - VAN_HOME.z) < 2.5) || Math.hypot(px - TREE_HOME.x, pz - TREE_HOME.z) < 2.2));
        pOff[i * 3] = px; pOff[i * 3 + 1] = terrainH(px, pz); pOff[i * 3 + 2] = pz;
        pPrm[i * 4] = 0.5 + rD() * 0.42;
        pPrm[i * 4 + 1] = 0.05 + rD() * 0.025;
        pPrm[i * 4 + 2] = rD();
        pPrm[i * 4 + 3] = rD() * 6.2832;
        pBald[i] = -1e4;
        dand.push({ i: i, x: px, z: pz, h: pPrm[i * 4], rnd: pPrm[i * 4 + 2], bald: -1e4, gust: -1 });
      }
      // one instance = a stem ribbon (4 verts) + a camera-facing head (4 verts)
      var puffGeo = keep(new THREE.InstancedBufferGeometry());
      puffGeo.setAttribute("position", new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, -0.5, 1, 0, 0.5, 1, 0, -0.5, -0.5, 0, 0.5, -0.5, 0, -0.5, 0.5, 0, 0.5, 0.5, 0], 3));
      puffGeo.setAttribute("aPart", new THREE.Float32BufferAttribute([0, 0, 0, 0, 1, 1, 1, 1], 1));
      puffGeo.setIndex([0, 1, 2, 1, 3, 2, 4, 5, 6, 5, 7, 6]);
      puffGeo.setAttribute("aOffset", new THREE.InstancedBufferAttribute(pOff, 3));
      puffGeo.setAttribute("aP", new THREE.InstancedBufferAttribute(pPrm, 4));
      var pBaldAttr = new THREE.InstancedBufferAttribute(pBald, 1); pBaldAttr.setUsage(THREE.DynamicDrawUsage);
      puffGeo.setAttribute("aBald", pBaldAttr);
      puffGeo.instanceCount = PUFFN;
      var puffMat = shaderMat({ uPuff: { value: puffTex }, uShow: { value: 1 }, uPx: pxU },
        [
          "attribute vec3 aOffset; attribute vec4 aP; attribute float aBald; attribute float aPart;",
          "uniform float uHeight, uFogD, uVanRot, uShow, uPx; uniform vec3 uVanPos;",
          "varying vec2 vUv; varying float vPart, vFog, vGrow, vSh, vRnd; varying vec3 vW;",
          NOISE, WIND, SHADOW, CLOUDSH,
          "void main(){",
          " float ht = aP.x*uHeight; float gust;",
          " vec3 tip = aOffset + vec3(0.0, ht, 0.0) + bend(aOffset.xz, 1.0, ht, aP.z, gust);",
          FLATTEN,
          " float on = uShow*(1.0 - inside);",
          " float grow = aBald < -1000.0 ? 1.0 : smoothstep(aBald + 14.0, aBald + 22.0, uTime);",
          " vGrow = grow; vPart = aPart; vRnd = aP.z;",
          " vec4 mv;",
          " if (aPart < 0.5) {",
          "  vec3 p = mix(aOffset, tip, position.y); p.xz += (tip.xz - aOffset.xz)*position.y*(position.y - 1.0)*0.35;",
          "  mv = viewMatrix*vec4(p, 1.0);",
          "  mv.x += position.x*max(0.0032, -mv.z*uPx*0.9)*on;",
          "  vUv = vec2(position.x + 0.5, position.y); vW = p;",
          " } else {",
          "  mv = viewMatrix*vec4(tip, 1.0);",
          "  float sz = mix(0.016, aP.y, grow);",
          "  sz = max(sz, -mv.z*uPx*2.4);",
          "  float c = cos(aP.w), s = sin(aP.w);",
          "  mv.xy += mat2(c, -s, s, c)*position.xy*sz*on;",
          "  vUv = position.xy + 0.5; vW = tip;",
          " }",
          " vSh = sunShadowFast(tip)*cloudShadow(tip);",
          " float d = -mv.z; vFog = 1.0 - exp(-uFogD*d);",
          " gl_Position = projectionMatrix*mv;",
          "}"
        ].join("\n"),
        [
          "uniform sampler2D uPuff; uniform float uShow;",
          "varying vec2 vUv; varying float vPart, vFog, vGrow, vSh, vRnd; varying vec3 vW;",
          NOISE, LIGHT, HEADL,
          "void main(){",
          " vec3 V = normalize(cameraPosition - vW); vec3 Ld = normalize(uSunDir);",
          " float sh = shadowAt(vW.xz)*vSh;",
          " vec3 col; float a;",
          " if (vPart < 0.5) {",
          "  col = vec3(0.16, 0.26, 0.08)*(uAmbC*0.9 + uSunC*0.5*sh);",
          "  a = 1.0;",
          " } else {",
          "  vec4 t = texture2D(uPuff, vUv);",
          "  float r = length(vUv - 0.5)*2.0;",
          // a bald head after the seeds have flown: a small brown receptacle
          "  float bald = 1.0 - vGrow;",
          "  a = mix(t.a, 1.0 - smoothstep(0.55, 0.8, r), bald);",
          "  vec3 alb = mix(vec3(0.95, 0.95, 0.92)*(0.85 + 0.15*t.r), vec3(0.42, 0.36, 0.22), bald);",
          "  float back = pow(max(dot(V, -Ld), 0.0), 4.0)*uTransK;",
          "  col = alb*(uAmbC*1.15 + uSunC*0.55*sh) + uSunC*back*1.4*sh*(1.0 - bald)*(0.4 + 0.6*(1.0 - r));",
          " }",
          " col += headlight(vW)*0.6 + vanGlow(vW)*0.4;",
          " if (a < 0.03) discard;",
          " col = mix(col, uFogC, vFog);",
          " gl_FragColor = vec4(col, a);", OUT,
          "}"
        ].join("\n"), { lights: true, alphaToCoverage: true, side: THREE.DoubleSide, extensions: { derivatives: true } });
      var puffs = new THREE.Mesh(puffGeo, puffMat); puffs.frustumCulled = false; scene.add(puffs);
      // flying seeds: a ring buffer of GPU particles; each one's whole flight is computed in the shader from its launch time
      var sOrg = new Float32Array(SEEDN * 3), sT0 = new Float32Array(SEEDN), sRnd = new Float32Array(SEEDN * 4), sHead = 0, sDirty = false;
      for (i = 0; i < SEEDN; i++) sT0[i] = -1e4;
      var seedGeo = keep(new THREE.BufferGeometry());
      seedGeo.setAttribute("position", new THREE.BufferAttribute(sOrg, 3).setUsage(THREE.DynamicDrawUsage));
      seedGeo.setAttribute("aT0", new THREE.BufferAttribute(sT0, 1).setUsage(THREE.DynamicDrawUsage));
      seedGeo.setAttribute("aRnd", new THREE.BufferAttribute(sRnd, 4).setUsage(THREE.DynamicDrawUsage));
      var seedMat = shaderMat({ uSeed: { value: seedTex }, uPxInv: pxInvU, uShowSeeds: { value: 1 } },
        [
          "attribute float aT0; attribute vec4 aRnd;",
          "uniform float uTime, uWind, uFogD, uPxInv, uShowSeeds; uniform vec3 uSunDir;",
          "varying float vA, vScat, vFog;",
          "void main(){",
          " float age = uTime - aT0;",
          " float life = 7.0 + aRnd.w*8.0;",
          " if (age < 0.0 || age > life) { vA = 0.0; vScat = 0.0; vFog = 0.0; gl_PointSize = 0.0; gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }",
          " vec3 v0 = normalize(vec3(aRnd.x - 0.5, 0.45 + aRnd.y*0.9, aRnd.z - 0.5))*(0.35 + aRnd.w*0.75);",
          " float e = (1.0 - exp(-1.7*age))/1.7;",
          " vec3 p = position + v0*e;",
          " vec2 wd = normalize(vec2(1.0, 0.35));",
          " float ws = (0.75 + 0.8*aRnd.y)*(0.35 + 0.65*uWind);",
          " p.xz += wd*ws*(age - e);",
          " p.y += (0.1 + 0.2*aRnd.x)*age - 0.0045*age*age;",
          " float g = min(age, 2.5);",
          " p.x += sin(age*1.3 + aRnd.z*30.0)*0.22*g;",
          " p.z += cos(age*1.1 + aRnd.x*30.0)*0.22*g;",
          " p.y += sin(age*1.9 + aRnd.w*20.0)*0.05*g;",
          " vec4 mv = viewMatrix*vec4(p, 1.0);",
          " float d = max(-mv.z, 0.05);",
          " float px = uPxInv*(0.028 + 0.016*aRnd.x)/d;",
          " vA = smoothstep(0.0, 0.3, age)*(1.0 - smoothstep(life*0.65, life, age))*uShowSeeds*min(1.0, px/1.4);",
          " gl_PointSize = clamp(px, 2.2, 13.0);",
          " vScat = pow(max(dot(normalize(p - cameraPosition), normalize(uSunDir)), 0.0), 6.0);",
          " vFog = 1.0 - exp(-uFogD*d);",
          " gl_Position = projectionMatrix*mv;",
          "}"
        ].join("\n"),
        [
          "uniform sampler2D uSeed; uniform vec3 uAmbC, uSunC, uFogC; uniform float uTransK;",
          "varying float vA, vScat, vFog;",
          "void main(){",
          " float a = min(1.0, texture2D(uSeed, gl_PointCoord).a*1.7)*vA;",
          " if (a < 0.02) discard;",
          " vec3 col = vec3(1.0)*(uAmbC*1.7 + uSunC*0.85 + 0.04) + uSunC*vScat*2.6*uTransK;",
          " col = mix(col, uFogC, vFog*0.8);",
          " gl_FragColor = vec4(col, a);", OUT,
          "}"
        ].join("\n"), { transparent: true, depthWrite: false });
      var seedPts = new THREE.Points(seedGeo, seedMat); seedPts.frustumCulled = false; seedPts.renderOrder = 5; scene.add(seedPts);
      function emitSeeds(x, y, z, n, t0) {
        for (var q = 0; q < n; q++) {
          var k = sHead; sHead = (sHead + 1) % SEEDN;
          sOrg[k * 3] = x + (rD() - 0.5) * 0.05; sOrg[k * 3 + 1] = y + (rD() - 0.5) * 0.05; sOrg[k * 3 + 2] = z + (rD() - 0.5) * 0.05;
          sT0[k] = t0 + rD() * 0.3;
          sRnd[k * 4] = rD(); sRnd[k * 4 + 1] = rD(); sRnd[k * 4 + 2] = rD(); sRnd[k * 4 + 3] = rD();
        }
        sDirty = true;
      }
      var ptip = new THREE.Vector3();
      function puffTip(d, out) {
        // the same lean as the shader's wind, so seeds leave from where the head is drawn
        var t = U.uTime.value, ht = d.h * U.uHeight.value;
        var n = vnoise(d.x * 0.07 - WDX * t * 0.55, d.z * 0.07 - WDZ * t * 0.55), n2 = vnoise(d.x * 0.21 - t * 0.35, d.z * 0.21 + t * 0.22);
        var lean = ((smooth(0.25, 0.85, n) * 0.85 + n2 * 0.25) * 0.85 + 0.12) * U.uWind.value * ht;
        return out.set(d.x + WDX * lean, terrainH(d.x, d.z) + ht, d.z + WDZ * lean);
      }
      function intact(d, t) { return d.bald < -1000 || t - d.bald > 22; }
      function releasePuff(d, t, n) {
        puffTip(d, ptip);
        emitSeeds(ptip.x, ptip.y, ptip.z, n || (40 + Math.floor(rD() * 16)), t);
        d.bald = t; pBald[d.i] = t; pBaldAttr.needsUpdate = true;
      }
      var lastCur = new THREE.Vector3(0, 0, -999), ambT = 0;
      function updateDandelions(dt, show) {
        var t = U.uTime.value;
        puffMat.uniforms.uShow.value = show;
        seedMat.uniforms.uShowSeeds.value += ((show > 0.02 ? 1 : 0) - seedMat.uniforms.uShowSeeds.value) * Math.min(1, dt * 2);
        puffs.visible = show > 0.02;
        var dh = renderer.getDrawingBufferSize(drawSize).y, th = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        pxU.value = 2 * th / Math.max(1, dh); pxInvU.value = dh / (2 * th);
        if (show > 0.5) {
          // brushing: every head near the cursor's path lets go
          if (cursorOn > 0.4 && cursor.z > -900) {
            var ax = lastCur.z < -900 ? cursor.x : lastCur.x, az = lastCur.z < -900 ? cursor.z : lastCur.z;
            var sx = cursor.x - ax, sz = cursor.z - az, sl = sx * sx + sz * sz;
            for (var q = 0; q < dand.length; q++) {
              var d = dand[q];
              if (!intact(d, t)) continue;
              var u = sl > 1e-6 ? Math.min(1, Math.max(0, ((d.x - ax) * sx + (d.z - az) * sz) / sl)) : 0;
              var qx = ax + sx * u - d.x, qz = az + sz * u - d.z;
              if (qx * qx + qz * qz < 0.85 * 0.85) releasePuff(d, t);
            }
            lastCur.copy(cursor);
          } else lastCur.z = -999;
          // a gust ring sweeps most of them clean
          var ga = t - U.uGust.value.z;
          if (ga > 0 && ga < 2.6) {
            for (q = 0; q < dand.length; q++) {
              d = dand[q];
              if (d.gust === U.uGust.value.z || !intact(d, t)) continue;
              var gd = Math.hypot(d.x - U.uGust.value.x, d.z - U.uGust.value.y);
              if (Math.abs(gd - ga * 6) < 0.9) { d.gust = U.uGust.value.z; if (rD() < 0.8) releasePuff(d, t); }
            }
          }
          // and the breeze always lifts a few
          ambT -= dt;
          if (ambT < 0) {
            ambT = 0.1 + rD() * 0.22;
            d = dand[Math.floor(rD() * dand.length)];
            if (intact(d, t)) { puffTip(d, ptip); emitSeeds(ptip.x, ptip.y, ptip.z, 1 + Math.floor(rD() * 3), t); }
          }
        }
        if (sDirty) { seedGeo.attributes.position.needsUpdate = true; seedGeo.attributes.aT0.needsUpdate = true; seedGeo.attributes.aRnd.needsUpdate = true; sDirty = false; }
      }

      /* ---------- precipitation: rain streaks + snowflakes/pollen ---------- */
      function precip(count, isRain) {
        var g = keep(new THREE.InstancedBufferGeometry());
        var q = new THREE.PlaneGeometry(1, 1);
        g.index = q.index; g.attributes.position = q.attributes.position; g.attributes.uv = q.attributes.uv;
        var a = new Float32Array(count * 4), rr2 = mulberry(isRain ? 3 : 4);
        for (var k = 0; k < count; k++) { a[k * 4] = rr2() * 40; a[k * 4 + 1] = rr2() * 22; a[k * 4 + 2] = rr2() * 40; a[k * 4 + 3] = rr2(); }
        g.setAttribute("aP", new THREE.InstancedBufferAttribute(a, 4));
        g.instanceCount = count;
        return g;
      }
      var RAIN_N = lowQ ? 2500 : 7000, FLAKE_N = lowQ ? 2500 : 6000;
      var rainU = { uAmt: { value: 0 }, uCam: { value: new THREE.Vector3() }, uPTime: { value: 0 } };
      var rainMat = shaderMat(rainU,
        [
          "attribute vec4 aP; uniform float uAmt, uPTime, uFogD; uniform vec3 uCam;",
          "varying vec2 vUv; varying float vA;",
          "void main(){",
          " vec3 p;",
          " p.x = mod(aP.x - uCam.x + uPTime*2.2, 40.0) - 20.0 + uCam.x;",
          " p.z = mod(aP.z - uCam.z, 40.0) - 30.0 + uCam.z;",
          " p.y = mod(aP.y - uPTime*16.0, 22.0) - 1.0;",
          " vec4 mv = viewMatrix*vec4(p, 1.0);",
          " float on = step(aP.w, uAmt);",
          " mv.x += (position.x*0.02 + position.y*0.1)*on;",
          " mv.y += position.y*0.85*on;",
          " vUv = position.xy + 0.5;",
          " float d = -mv.z; vA = (1.0 - smoothstep(10.0, 38.0, d)) * smoothstep(0.5, 2.0, d) * on;",
          " gl_Position = projectionMatrix*mv;",
          "}"
        ].join("\n"),
        [
          "uniform vec3 uAmbC, uFogC; varying vec2 vUv; varying float vA;",
          "void main(){ float a = (1.0 - abs(vUv.x*2.0 - 1.0)) * smoothstep(0.0, 0.4, vUv.y) * (1.0 - smoothstep(0.85, 1.0, vUv.y)) * vA * 0.5;",
          " vec3 col = mix(uFogC, vec3(1.0), 0.35) + uAmbC*0.4;",
          " gl_FragColor = vec4(col*a, a);", OUT, "}"
        ].join("\n"), { transparent: true, depthWrite: false });
      var rain = new THREE.Mesh(precip(RAIN_N, true), rainMat);
      rain.frustumCulled = false; rain.renderOrder = 5;
      scene.add(rain);
      var flakeU = { uAmt: { value: 0 }, uCam: rainU.uCam, uPTime: rainU.uPTime, uMode: { value: 1 } };
      var flakeMat = shaderMat(flakeU,
        [
          "attribute vec4 aP; uniform float uAmt, uPTime, uFogD, uMode; uniform vec3 uCam;",
          "uniform vec3 uSunDir;",
          "varying vec2 vUv; varying float vA; varying float vNear; varying float vScat;",
          "void main(){",
          " float speed = mix(0.35, 1.3 + aP.w*0.7, uMode);",
          " vec3 p;",
          " float t = uPTime;",
          " p.x = mod(aP.x - uCam.x + t*mix(0.25, 0.9, uMode) + sin(t*0.6 + aP.w*30.0)*0.6, 40.0) - 20.0 + uCam.x;",
          " p.z = mod(aP.z - uCam.z + cos(t*0.5 + aP.w*20.0)*0.5, 40.0) - 30.0 + uCam.z;",
          " p.y = mod(aP.y - t*speed, 22.0) - 1.0;",
          " vec4 mv = viewMatrix*vec4(p, 1.0);",
          " float on = step(aP.w, uAmt);",
          " float sz = mix(0.018, 0.06 + aP.w*0.06, uMode);",
          " float d = -mv.z;",
          " vNear = 1.0 - smoothstep(0.6, 3.5, d);",
          " sz *= 1.0 + vNear*2.5*uMode;",
          " mv.xy += position.xy*sz*on;",
          " vUv = position.xy + 0.5;",
          " vA = (1.0 - smoothstep(14.0, 38.0, d)) * smoothstep(0.3, 1.0, d) * on;",
          " vScat = pow(max(dot(normalize(p - cameraPosition), normalize(uSunDir)), 0.0), 5.0);",
          " gl_Position = projectionMatrix*mv;",
          "}"
        ].join("\n"),
        [
          "uniform vec3 uAmbC, uSunC, uFogC; uniform float uMode, uTransK; varying vec2 vUv; varying float vA; varying float vNear; varying float vScat;",
          "void main(){ float r = length(vUv - 0.5)*2.0; float soft = mix(0.35, 0.95, vNear);",
          " float a = (1.0 - smoothstep(1.0 - soft, 1.0, r)) * vA * mix(0.75, 0.9 - vNear*0.45, uMode);",
          " vec3 col = mix(vec3(1.0, 0.92, 0.7)*(uSunC*(0.6 + vScat*2.5*uTransK) + uAmbC), vec3(0.95, 0.97, 1.0)*(uAmbC*1.3 + uSunC*0.3 + 0.15), uMode);",
          " gl_FragColor = vec4(col*a, a);", OUT, "}"
        ].join("\n"), { transparent: true, depthWrite: false });
      var flakes = new THREE.Mesh(precip(FLAKE_N, false), flakeMat);
      flakes.frustumCulled = false; flakes.renderOrder = 6;
      scene.add(flakes);

      /* rain splashes: on the grass tops and on the van roof */
      function splashes(count, bmin, bmax, seed) {
        var g = keep(new THREE.InstancedBufferGeometry());
        var q = new THREE.PlaneGeometry(1, 1);
        g.index = q.index; g.attributes.position = q.attributes.position;
        var a = new Float32Array(count * 4), rr3 = mulberry(seed);
        for (var k = 0; k < count; k++) { a[k * 4] = rr3(); a[k * 4 + 1] = rr3(); a[k * 4 + 2] = rr3(); a[k * 4 + 3] = rr3(); }
        g.setAttribute("aS", new THREE.InstancedBufferAttribute(a, 4));
        g.instanceCount = count;
        var m = shaderMat({ uAmt: rainU.uAmt, uPTime: rainU.uPTime, uBMin: { value: bmin }, uBMax: { value: bmax } }, [
          "attribute vec4 aS; uniform float uAmt, uPTime, uFogD; uniform vec3 uBMin, uBMax;",
          "varying vec2 vUv; varying float vF; varying float vFog;",
          NOISE,
          "void main(){",
          " float cyc = uPTime*2.6 + aS.w*7.0; float f = fract(cyc); float ci = floor(cyc);",
          " vec3 r = vec3(hash12(vec2(ci, aS.x*91.7)), hash12(vec2(ci + 3.1, aS.y*57.3)), hash12(vec2(ci + 7.7, aS.z*33.1)));",
          " vec3 p = mix(uBMin, uBMax, r);",
          " vec4 mv = viewMatrix*modelMatrix*vec4(p, 1.0);",
          " float on = step(aS.x, uAmt);",
          " float sz = 0.09*on;",
          " mv.xy += position.xy*sz;",
          " vUv = position.xy + 0.5; vF = f;",
          " float d = -mv.z; vFog = 1.0 - exp(-uFogD*d);",
          " gl_Position = projectionMatrix*mv;",
          "}"
        ].join("\n"), [
          "uniform vec3 uAmbC, uFogC; varying vec2 vUv; varying float vF; varying float vFog;",
          "void main(){ vec2 q = (vUv - vec2(0.5, 0.25))*2.0; float a = 0.0;",
          " for (int k = 0; k < 6; k++) {",
          "  float ang = 0.35 + float(k)*0.49;",
          "  vec2 c = vec2(cos(ang)*vF*0.85, sin(ang)*vF*1.1 - vF*vF*0.9);",
          "  a += 1.0 - smoothstep(0.02, 0.07, length(q - c));",
          " }",
          " a += (1.0 - smoothstep(0.0, 0.12, length(q)))*(1.0 - smoothstep(0.0, 0.3, vF));",
          " a = clamp(a, 0.0, 1.0) * (1.0 - vF) * 0.75 * (1.0 - vFog);",
          " vec3 col = mix(uFogC, vec3(1.0), 0.35) + uAmbC*0.3;",
          " gl_FragColor = vec4(col, a);", OUT, "}"
        ].join("\n"), { transparent: true, depthWrite: false });
        var mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 4;
        return mesh;
      }
      var meadowSplash = splashes(lowQ ? 200 : 520, new THREE.Vector3(-10, 0.55, -16), new THREE.Vector3(10, 1.05, camNear - 3), 31);
      scene.add(meadowSplash);
      var roofSplash = splashes(150, new THREE.Vector3(-2.0, ROOF + 0.01, -0.92), new THREE.Vector3(2.0, ROOF + 0.02, 0.92), 37);
      roofG.add(roofSplash);

      /* drifting mist banks */
      var mistTex = canvasTex(256, 128, function (g, w, h) {
        var r4 = mulberry(12);
        for (var k = 0; k < 46; k++) {
          var x = r4() * w, y = h * 0.3 + r4() * h * 0.4, rad = 18 + r4() * 46;
          var gr = g.createRadialGradient(x, y, 0, x, y, rad);
          gr.addColorStop(0, "rgba(255,255,255,0.2)"); gr.addColorStop(1, "rgba(255,255,255,0)");
          g.fillStyle = gr; g.fillRect(0, 0, w, h);
        }
        // feather every edge so overlapping banks never show a seam
        g.globalCompositeOperation = "destination-in";
        var fx = g.createLinearGradient(0, 0, w, 0);
        fx.addColorStop(0, "rgba(0,0,0,0)"); fx.addColorStop(0.28, "rgba(0,0,0,1)"); fx.addColorStop(0.72, "rgba(0,0,0,1)"); fx.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = fx; g.fillRect(0, 0, w, h);
        var fy = g.createLinearGradient(0, 0, 0, h);
        fy.addColorStop(0, "rgba(0,0,0,0)"); fy.addColorStop(0.3, "rgba(0,0,0,1)"); fy.addColorStop(0.7, "rgba(0,0,0,1)"); fy.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = fy; g.fillRect(0, 0, w, h);
        g.globalCompositeOperation = "source-over";
      });
      var mists = [], rm = mulberry(44);
      for (i = 0; i < 12; i++) {
        var ms = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: mistTex, transparent: true, depthWrite: false, opacity: 0, fog: true })));
        ms.position.set(-45 + rm() * 90, 0.9 + rm() * 2.2, -10 - rm() * 55);
        ms.scale.set(26 + rm() * 22, 4.5 + rm() * 3, 1);
        ms.renderOrder = 3;
        scene.add(ms); mists.push({ s: ms, v: 0.25 + rm() * 0.35 });
      }

      /* ---------- framing ---------- */
      var camBase = new THREE.Vector3(), look = new THREE.Vector3(), sunAzK = 1, viewMode="scene";
      var composer = null, bloomPass = null, gradeU = null, cssFilter = "", cssGlare = "";
      function frame() {
        var w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight);
        if(autoQ){
          var pixelBudget=[1250000,950000,720000,520000][adaptiveLevel||0];
          renderer.setPixelRatio(Math.min(global.devicePixelRatio||1,1.25,Math.sqrt(pixelBudget/(w*h))));
        }
        renderer.setSize(w, h, false);
        if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); }
        camera.aspect = w / h;
        var narrow = camera.aspect < 0.9;
        // a wide, slightly upturned view: plenty of sky over the meadow
        camera.fov = narrow ? 64 : 52;
        camera.updateProjectionMatrix();
        if (narrow) { camBase.set(0.6, 2.4, 11); look.set(0.6, 3.1, -40); }
        else { camBase.set(0, 2.35, 7.5); look.set(0.8, 3.7, -40); }
        sunAzK = Math.min(1, Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect) / 0.57);
      }
      frame();
      api.setView=function(mode){if(['scene','vehicle','character'].indexOf(mode)<0)return;viewMode=mode;frame();};
      var ro = null;
      if ("ResizeObserver" in global) { ro = new ResizeObserver(frame); ro.observe(container); }
      else on(global, "resize", frame);

      /* ---------- pointer: grass wake + dragging ---------- */
      var ray = new THREE.Raycaster();
      var ndc = new THREE.Vector2();
      var gPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      function groundHit(r, lift, out) {
        // march the plane height toward the terrain a few times
        var y = lift;
        for (var it = 0; it < 4; it++) {
          gPlane.constant = -y;
          if (!r.intersectPlane(gPlane, out)) return false;
          y = terrainH(out.x, out.z) + lift;
        }
        return true;
      }
      var hitP = new THREE.Vector3(), cursor = new THREE.Vector3(0, 0, -999), cursorOn = 0, cursorTarget = 0;
      var lastDrop = new THREE.Vector3(0, 0, -999), dropIdx = 1;
      var drag = null, dragOff = new THREE.Vector3();
      var pickables = T.parts.concat(vanParts);
      function rootOf(o) { while (o && o !== tree && o !== van) o = o.parent; return o; }
      function setNdc(e) {
        var r = container.getBoundingClientRect();
        ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      }
      function pick() {
        ray.setFromCamera(ndc, camera);
        var hits = ray.intersectObjects(pickables, false);
        return hits.length ? rootOf(hits[0].object) : null;
      }
      on(container, "pointermove", function (e) {
        setNdc(e);
        ray.setFromCamera(ndc, camera);
        if (groundHit(ray.ray, 0.4, hitP)) {
          cursor.copy(hitP); cursorTarget = 1;
          if (hitP.distanceTo(lastDrop) > 0.45) { lastDrop.copy(hitP); trail[dropIdx].set(hitP.x, 0, hitP.z, 1); dropIdx = dropIdx % 7 + 1; }
        }
        if (drag) {
          if (groundHit(ray.ray, 0.0, hitP)) {
            drag.position.x = Math.max(-26, Math.min(26, hitP.x + dragOff.x));
            drag.position.z = Math.max(-60, Math.min(camNear - 9, hitP.z + dragOff.z));
            drag.position.y = terrainH(drag.position.x, drag.position.z) - (drag === tree ? 0.1 : 0);
          }
          e.preventDefault();
        } else if (e.target === canvas && e.pointerType === "mouse") {
          canvas.style.cursor = pick() ? "grab" : "";
        }
      }, { passive: false });
      on(container, "pointerdown", function (e) {
        if (e.target !== canvas) return;
        setNdc(e);
        var obj = pick();
        if (!obj) {
          ray.setFromCamera(ndc, camera);
          if (groundHit(ray.ray, 0.0, hitP)) U.uGust.value.set(hitP.x, hitP.z, gTime, 1);
          return;
        }
        drag = obj;
        ray.setFromCamera(ndc, camera);
        if (groundHit(ray.ray, 0.0, hitP)) dragOff.set(obj.position.x - hitP.x, 0, obj.position.z - hitP.z); else dragOff.set(0, 0, 0);
        canvas.style.cursor = "grabbing";
        try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      });
      function endDrag() { if (drag) { drag = null; canvas.style.cursor = ""; } }
      on(global, "pointerup", function (e) { endDrag(); if (e.pointerType !== "mouse") cursorTarget = 0; });
      on(global, "pointercancel", function () { endDrag(); cursorTarget = 0; });
      on(container, "pointerleave", function () { cursorTarget = 0; });
      on(canvas, "touchstart", function (e) {
        var t0 = e.touches[0]; if (!t0) return;
        setNdc(t0);
        if (pick()) e.preventDefault();
      }, { passive: false });
      on(canvas, "dblclick", resetObjects);

      /* ---------- per-frame ---------- */
      var sunDir = new THREE.Vector3(), moonDir = skyU.uMoonDir.value, lightDir = new THREE.Vector3(), tmpV = new THREE.Vector3(), tmpC = new THREE.Color(), tmpC2 = new THREE.Color();
      var mouseNdcS = new THREE.Vector2();
      var gTime = 0, pTime = 0, frames = 0, ftSum = 0, degraded = lowQ, sunVisS = 1, panoRotA = [0, 0, 0];
      var cloudTimeOverride = null;
      var envTarget = {};
      var skyTopC = new THREE.Color(), skyHorC = new THREE.Color();

      function render(time, dt) {
        // ease environment toward targets
        envTarget = targetEnv();
        var kk = Math.min(1, dt * (reduce ? 10 : 1.6));
        Object.keys(envTarget).forEach(function (key) {
          var rate = key === "light" ? Math.min(1, dt * (reduce ? 20 : 3.2)) : (key === "snow" ? Math.min(1, dt * 0.7) : kk);
          P[key] += (envTarget[key] - P[key]) * rate;
        });
        var sl = seasonLin[state.season];
        Object.keys(PC).forEach(function (key) { PC[key].lerp(sl[key], kk); });

        // Measure real frame intervals, independent of the simulation's dt clamp.
        if(autoQ && dt>0){
          var elapsed=perfLast ? time-perfLast : 0;perfLast=time;
          if(elapsed>0 && elapsed<.5){perfSum+=elapsed;perfCount++;perfWindow+=elapsed;perfCooldown-=elapsed;}
          if(perfWindow>=2){
            perfMs=1000*perfSum/Math.max(1,perfCount);
            var next=adaptiveLevel;
            if(perfCooldown<=0){if(perfMs>25 && next<3)next++;else if(perfMs<18 && next>0)next--;}
            if(next!==adaptiveLevel){adaptiveLevel=next;perfCooldown=8;
              grassGeo.instanceCount=Math.floor(N*[1,.8,.6,.45][next]);
              flwGeo.instanceCount=Math.floor(FN*[1,.85,.7,.55][next]);
              rain.geometry.instanceCount=Math.floor(RAIN_N*[1,.7,.5,.35][next]);
              flakes.geometry.instanceCount=Math.floor(FLAKE_N*[1,.7,.5,.35][next]);
              cloudScale=[.4,.35,.3,.25][next];cloudU.uSteps.value=[32,28,24,20][next];
              degraded=next===3;frame();
            }
            perfSum=0;perfCount=0;perfWindow=0;
          }
        }

        var L = P.light, ov = P.overcast;
        var k = sampleLight(L);
        var night = smooth(0.72, 0.95, L);
        var day = 1 - smooth(0.5, 0.8, L);
        var vanOn = smooth(0.48, 0.72, L);

        // weather-adjusted sky colours
        var greyMul = state.weather === "rain" ? 0.72 : 1.06;
        tmpC.copy(k.otop).multiplyScalar(greyMul); tmpC2.copy(k.ohor).multiplyScalar(greyMul);
        var skyTop = skyTopC.copy(k.top).lerp(tmpC, ov);
        var skyHor = skyHorC.copy(k.hor).lerp(tmpC2, ov);

        var az = THREE.MathUtils.degToRad(k.az * sunAzK), el = THREE.MathUtils.degToRad(k.el);
        sunDir.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
        var mel = THREE.MathUtils.degToRad(lerp(3, 15, smooth(0.62, 1.0, L))), maz = THREE.MathUtils.degToRad(-12);
        moonDir.set(Math.sin(maz) * Math.cos(mel), Math.sin(mel), -Math.cos(maz) * Math.cos(mel)).normalize();
        lightDir.copy(sunDir).lerp(moonDir, night).normalize();
        if (lightDir.y < 0.08) { lightDir.y = 0.08; lightDir.normalize(); }

        renderer.toneMappingExposure = k.exp * (1 + ov * 0.08);
        skyGroup.position.copy(camera.position);
        skyU.uTop.value.copy(skyTop); skyU.uHor.value.copy(skyHor); skyU.uSun.value.copy(k.sun); skyU.uGexp.value = k.gexp;
        skyU.uMid.value.copy(k.mid); skyU.uMidK.value = k.midK;
        skyU.uSunDir.value.copy(sunDir); skyU.uNight.value = night; skyU.uDay.value = day; skyU.uTime.value = time; skyU.uOver.value = ov;
        skyU.uTwilight.value = k.tw * (1 - ov * 0.8);
        // the cheap 2D layer only stands in when neither the baked sky nor the raymarched clouds can show the weather
        skyU.uFlat.value = cloudsOK ? 0 : ((panoReady && ov < 0.3) ? 0 : 1);
        var rmTarget = cloudsOK ? ((panoWanted && !panoFailed) ? smooth(0.12, 0.45, ov) : 1) : 0;
        skyU.uCloudMix.value += (rmTarget - skyU.uCloudMix.value) * kk;
        skyU.uPanoOn.value += (panoReady * (1 - smooth(0.2, 0.62, ov)) * (1 - 0.94 * night) - skyU.uPanoOn.value) * kk;
        // the cloud layers drift to the right with the wind: near clouds cross the sky faster than distant ones
        for (var pli = 0; pli < 3; pli++) {
          var plL = PANO.layers[pli], plP = (plL.az1 - plL.az0) * D2R;
          panoRotA[pli] = ((cloudTimeOverride == null ? gTime : cloudTimeOverride) * plL.speed * D2R) % plP;
        }
        skyU.uPanoRot.value.set(panoRotA[0], panoRotA[1], panoRotA[2]);
        // when a drifting cloud covers the sun, the meadow's sunlight dims softly
        var sunOcc = 0;
        if (panoAlphaPx && skyU.uPanoOn.value > 0.01 && sunDir.y > -0.04) {
          var saz = Math.atan2(sunDir.x, -sunDir.z), sel = Math.asin(Math.max(-1, Math.min(1, sunDir.y))), so = 0.35 * D2R;
          sunOcc = (panoAlphaAt(saz, sel, panoRotA) * 2 + panoAlphaAt(saz - so, sel, panoRotA) + panoAlphaAt(saz + so, sel, panoRotA) + panoAlphaAt(saz, sel - so, panoRotA) + panoAlphaAt(saz, sel + so, panoRotA)) / 6 * skyU.uPanoOn.value;
        }
        sunVisS += (Math.pow(Math.max(0, 1 - Math.min(1, sunOcc*1.03)), 3.0) - sunVisS) * Math.min(1, dt * 9);
        var sunVis = lerp(1, sunVisS, 1 - night);
        skyU.uSunVisibility.value = sunVis;
        envU.uFlat.value = 1;

        // the sky colour a little above the horizon (same curve as the sky shader) tints the haze
        var gx = lerp(k.gexp, 0.75, ov);
        var gk0 = Math.pow(0.035, gx), midT = tmpC2.copy(skyHor).add(skyTop).multiplyScalar(0.5).lerp(k.mid, k.midK * (1 - ov));
        var fogC = U.uFogC.value.copy(skyHor).lerp(midT, Math.min(1, gk0 * 2));
        scene.fog.color.copy(fogC);
        var haze = smooth(0.12, 0.33, L) * (1 - smooth(0.5, 0.75, L));
        U.uFogD.value = lerp(0.00040, 0.00072, haze) * (1 + ov * 4.6 + P.rain * 4.2 + P.snowfall * 6.6) + night * 0.0003;
        scene.fog.density = U.uFogD.value * 3.2;
        // cloud layer lighting: the sun still lights the cloud bases after it has set
        cloudU.uLightDir.value.copy(sunDir).lerp(moonDir, night).normalize();
        cloudU.uLightC.value.copy(k.sun).multiplyScalar(k.sunI * (1 - ov * 0.55) * lerp(1.15, 0.5, night));
        // clouds are lit by the whole sky dome, closer to the mid-sky colour than the zenith
        cloudU.uAmbTop.value.copy(skyHor).lerp(skyTop, Math.pow(0.35, gx)).multiplyScalar(1.2); cloudU.uAmbHor.value.copy(skyHor).lerp(skyTop, Math.pow(0.05, gx));
        cloudU.uFogC.value.copy(fogC);
        cloudU.uCoverage.value = lerp(k.cov, 0.97, ov);
        cloudU.uDensity.value = 1 + ov * 0.7;
        cloudU.uDark.value = P.rain * 0.85 + ov * 0.2;
        cloudU.uTime.value = cloudTimeOverride == null ? gTime : cloudTimeOverride;

        var sunK = 1 - ov * 0.72, sunKs = sunK * sunVis;
        if (panoReady) {
          // sun A = the high noon sun, sun B = a low sun ahead (golden hour, dusk) and the moon at night
          var wG = smooth(0.0, 0.33, L), pAmb = PANO_K.amb * lerp(1, 1.14, wG) * (1 - 0.55 * night);
          skyU.uPanoSunA.value.copy(k.sun).multiplyScalar(k.sunI * sunK * PANO_K.sunA * (1 - wG) * PANO.max[0]);
          var dk = smooth(0.42, 0.66, L);
          skyU.uPanoSunB.value.copy(k.sun).multiplyScalar(k.sunI * sunK * lerp(PANO_K.sunB, 0.35, Math.max(dk * 0.55, night)) * wG * PANO.max[1]);
          skyU.uPanoAmb.value.copy(skyHor).multiplyScalar(lerp(0.6, 0.25, dk)).add(tmpC2.copy(skyTop).multiplyScalar(lerp(0.4, 0.75, dk))).multiplyScalar(pAmb * lerp(1, 1.5, dk) * PANO.max[2]);
          skyU.uPanoRim.value.copy(k.sun).multiplyScalar(k.sunI * sunK * PANO_K.rim * wG * (1 - night));
        }
        U.uSunDir.value.copy(lightDir);
        U.uSunC.value.copy(k.sun).lerp(skyHor, ov * 0.6).multiplyScalar(k.sunI * sunKs);
        U.uAmbC.value.copy(k.amb).lerp(skyHor, ov * 0.6).multiplyScalar(k.ambI * (1 + ov * 0.45 + P.snow * 0.25));
        U.uTransK.value = day * sunKs;
        U.uSnow.value = P.snow; U.uWet.value = P.wet;
        U.uFlowers.value = P.flowers;
        U.uYellow.value += ((SEASONS[state.season].yellow || 0) - U.uYellow.value) * kk;
        leafU.uLeafAmt.value = P.leafAmt; leafU.uBlossom.value = P.blossom; leafU.uRecolor.value = P.recolor; fieldU.uLeafAmt.value = P.leafAmt;
        leafU.uNightDim.value = night;
        fallU.uFall.value = P.fall;

        hemi.color.copy(U.uAmbC.value).multiplyScalar(1 / Math.max(0.05, k.ambI));
        hemi.groundColor.copy(PC.tip).multiplyScalar(0.3).lerp(tmpC.setRGB(0.8, 0.82, 0.86), P.snow);
        hemi.intensity = k.ambI * (scene.environment ? 0.55 : 1.6) * (1 + ov * 0.3);
        // keep the sky-lit environment map in step with the light and weather
        envTimer -= dt;
        if (envTimer <= 0) {
          envTimer = autoQ ? 1.5 : 0.8;
          skyU.uEnvGround.value.copy(PC.tip).multiplyScalar(0.18).lerp(tmpC.setRGB(0.75, 0.78, 0.84), P.snow).multiply(tmpC2.copy(U.uAmbC.value).add(U.uSunC.value).multiplyScalar(0.5));
          var key = [P.light.toFixed(2), P.overcast.toFixed(2), P.snow.toFixed(2), state.season,Math.round(van.position.x),Math.round(van.position.z),Math.round(tree.position.x),Math.round(tree.position.z)].join("|");
          if (key !== envKey) { envKey = key; updateEnv(); }
        }
        sunLight.position.copy(lightDir).multiplyScalar(60);
        sunLight.color.copy(k.sun).lerp(skyHor, ov * 0.6); sunLight.intensity = k.sunI * 0.9 * sunKs;

        // soft fake shadows from crown and van, fading under cloud
        var horiz = Math.max(0.0001, Math.sqrt(lightDir.x * lightDir.x + lightDir.z * lightDir.z));
        var tanE = Math.max(0.2, lightDir.y / horiz);
        U.uShDir.value.set(-lightDir.x / horiz, -lightDir.z / horiz);
        var crownC = tmpV.copy(T.center).multiplyScalar(tree.scale.x).add(tree.position);
        var off = Math.min(crownC.y / tanE, 24);
        U.uTreeSh.value.set(crownC.x + U.uShDir.value.x * off, crownC.z + U.uShDir.value.y * off, T.crownR * tree.scale.x * 0.95);
        U.uShStretch.value = Math.min(2.6, Math.max(1, 0.6 / tanE + 0.6));
        var vo = Math.min(1.4 / tanE, 5);
        U.uVanSh.value.set(van.position.x + U.uShDir.value.x * vo, van.position.z + U.uShDir.value.y * vo, van.visible ? 2.6 : 0.001, van.visible ? 1.15 : 0.001);
        U.uShK.value = shadowsOn ? 0 : (0.62 * (1 - smooth(0.4, 0.62, L)) + 0.2 * night) * (1 - ov * 0.85) * sunVis;
        if (shadowsOn) {
          var shT = tmpV.copy(van.position).lerp(tree.position, 0.45);
          sunLight.target.position.copy(shT);
          sunLight.position.copy(shT).addScaledVector(lightDir, 70);
        }

        // van + lantern lights
        var vanVis = van.visible ? 1 : 0;
        glassMat.emissiveIntensity = vanOn * 0.34;
        if (vanGlassM) { vanGlassM.emissiveIntensity = vanOn * 0.30; vanGlassM.opacity = lerp(0.66,1,vanOn); vanGlassM.envMapIntensity=lerp(1.1,0.4,vanOn); } if(vanPaintM){vanPaintM.envMapIntensity=lerp(0.85,0.22,vanOn);vanPaintM.clearcoat=lerp(0.65,0.24,vanOn);}
        lensMat.emissiveIntensity = vanOn * 3.1;
        tailMat.emissiveIntensity = vanOn * 0.65;
        indMat.emissiveIntensity = 0;
        var eyeToVan=tmpV.copy(camera.position).sub(van.position).normalize();
        var lampFacing=Math.max(0,eyeToVan.x*Math.cos(van.rotation.y)-eyeToVan.z*Math.sin(van.rotation.y));
        headSprites.forEach(function (s) { s.material.opacity = vanOn * (0.08+0.32*Math.pow(lampFacing,4)); });
        beamMat.uniforms.uOn.value = vanOn; beamMat.uniforms.uHaze.value = Math.max(P.rain, P.snowfall, ov * 0.5);
        for (var bc = 0; bc < beamCones.length; bc++) beamCones[bc].visible = vanOn * vanVis > 0.004;
        tmpV.set(0.2, 1.5, -1.6); van.localToWorld(tmpV); vanPoint.position.copy(tmpV); vanPoint.intensity = vanOn * 0.075 * vanVis;
        tmpV.set(0, 0.6, -1.6); van.localToWorld(tmpV); U.uGlowPos.value.copy(tmpV); U.uVanOn.value = vanOn * 0.16 * vanVis;
        van.updateMatrixWorld();
        U.uHeadPos.value.copy(headLocal); van.localToWorld(U.uHeadPos.value);
        tmpV.set(12, -0.6, 0); van.localToWorld(tmpV); U.uHeadDir.value.copy(tmpV).sub(U.uHeadPos.value).normalize();
        U.uHeadOn.value = vanOn * (1 - P.snow * 0.3) * vanVis;
        impTimer -= dt;
        var ik2 = [state.season, P.leafAmt.toFixed(2), P.snow.toFixed(2), P.recolor.toFixed(2), P.blossom.toFixed(2)].join("|");
        if ((impDirty || ik2 !== impKey) && (impTimer <= 0 || ik2.split("|")[0] !== impKey.split("|")[0])) { impKey = ik2; impDirty = false; impTimer = 0.3; renderImpostors(); }
        var lanternOn = person.visible ? vanOn * vanVis : 0;
        if(glbPerson && person.visible){tmpV.set(0,0.94,1.0);person.localToWorld(tmpV);faceFill.position.copy(tmpV);faceFill.intensity=day*0.11;}else faceFill.intensity=0;
        lanternGlassMat.emissiveIntensity = lanternOn * 1.7;
        lspr.material.opacity = lanternOn * (0.22 + 0.015 * Math.sin(time * 2.3));
        lantern.getWorldPosition(tmpV); tmpV.y += 0.15; lanternLight.position.copy(tmpV); lanternLight.intensity = lanternOn * 0.18;

        // wind, wake, object uniforms
        gTime += dt * (reduce ? 0.4 : 1);
        pTime += dt * (reduce ? 0.5 : 1);
        U.uTime.value = gTime;
        var windTarget = 1 + P.rain * 0.6 - P.snowfall * 0.35;
        U.uWind.value += (windTarget - U.uWind.value) * Math.min(1, dt * 2);
        cursorOn += (cursorTarget - cursorOn) * Math.min(1, dt * 5);
        trail[0].set(trail[0].x + (cursor.x - trail[0].x) * Math.min(1, dt * 10), 0, trail[0].z + (cursor.z - trail[0].z) * Math.min(1, dt * 10), cursorOn);
        for (var n = 1; n < 8; n++) trail[n].w = Math.max(0, trail[n].w - dt * 0.8);
        U.uTreePos.value.copy(tree.position);
        U.uVanPos.value.copy(van.position);
        U.uVanRot.value = van.rotation.y;

        // precipitation
        rainU.uCam.value.copy(camera.position);
        rainU.uPTime.value = pTime;
        rainU.uAmt.value = P.rain;
        var pollen = (1 - ov) * day * (state.season === "spring" || state.season === "summer" ? 0.035 : 0.012) * (1 + 1.2 * smooth(0.12, 0.3, L) * (1 - smooth(0.45, 0.6, L)));
        flakeU.uMode.value = Math.min(1, P.snowfall * 1.5);
        flakeU.uAmt.value = Math.max(P.snowfall, pollen);
        rain.visible = P.rain > 0.01;
        meadowSplash.visible = roofSplash.visible = P.rain > 0.02;
        var mistK = Math.max(P.rain * 0.55, P.snowfall * 0.4, ov * 0.18, smooth(0.42, 0.62, L) * (1 - smooth(0.8, 0.95, L)) * 0.12);
        mists.forEach(function (m) {
          m.s.position.x += dt * m.v * U.uWind.value; if (m.s.position.x > 50) m.s.position.x = -50;
          m.s.material.opacity = mistK; m.s.material.color.copy(fogC);
          m.s.visible = mistK > 0.01;
        });
        snowCap.visible = P.snow > 0.02; snowCap.scale.y = Math.max(0.02, P.snow);
        beanie.visible = scarf.visible = P.cold > 0.02;
        beanie.scale.setScalar(Math.max(0.001, P.cold) * beanieS); scarf.scale.setScalar(Math.max(0.001, P.cold));
        umbrella.visible = P.rain > 0.02 && person.visible;
        umbrella.scale.setScalar(Math.max(0.001, P.rain));
        umbrella.rotation.z = umbZ0 + Math.sin(gTime * 1.3) * 0.04 * U.uWind.value;
        flakes.visible = flakeU.uAmt.value > 0.01;

        ffMat.uniforms.uTime.value = time;
        ffMat.uniforms.uNight.value = night * (1 - ov) * (state.season === "summer" || state.season === "spring" ? 1 : 0.15);
        fireflies.position.set(van.position.x - VAN_HOME.x, 0, van.position.z - VAN_HOME.z).multiplyScalar(0.5);

        // squirrel (tree-local), only on calm days
        var squirrelK = (1 - smooth(0.4, 0.6, L)) * (1 - ov) * (1 - P.snow * 0.8);
        squirrel.visible = squirrelK > 0.02;
        squirrel.scale.setScalar(squirrelK);
        var cyc = ((reduce ? gTime * 0.5 : gTime) % 16) / 16;
        var sx = 0.12, sy = 0, sz = 0, rx = 0, ry = 0, bounce = 0;
        var start = { x: 2.4, z: 1.5 }, base = { x: 0.12, z: 0.56 };
        var radAt = function (yy) { return 0.46 - yy * 0.04 + 0.08; };
        if (cyc < 0.25) { var f1 = cyc / 0.25; sx = lerp(start.x, base.x, f1); sz = lerp(start.z, base.z, f1); ry = Math.atan2(base.x - start.x, base.z - start.z); bounce = Math.abs(Math.sin(gTime * 18)) * 0.06; }
        else if (cyc < 0.45) { sy = 0.2 + ((cyc - 0.25) / 0.2) * 2.5; sz = radAt(sy); rx = -Math.PI / 2; }
        else if (cyc < 0.6) { sy = 2.7; sz = radAt(sy); rx = -Math.PI / 2 + 0.25 * Math.sin(gTime * 3); }
        else if (cyc < 0.75) { sy = 2.7 - ((cyc - 0.6) / 0.15) * 2.5; sz = radAt(sy); rx = Math.PI / 2; ry = Math.PI; }
        else { var f4 = (cyc - 0.75) / 0.25; sx = lerp(base.x, start.x, f4); sz = lerp(base.z, start.z, f4); ry = Math.atan2(start.x - base.x, start.z - base.z); bounce = Math.abs(Math.sin(gTime * 18)) * 0.06; }
        squirrel.position.set(sx, sy + bounce, sz);
        squirrel.rotation.set(0, ry, 0);
        squirrel.rotateX(rx);
        tail.rotation.x = Math.sin(gTime * 6) * 0.15;

        // birds: fly on fair days, perch at night or in bad weather
        var perchK = Math.max(smooth(0.55, 0.75, L), Math.min(1, P.rain + P.snowfall));
        birds.forEach(function (b) {
          var d = b.userData;
          var ang = gTime * d.speed * (reduce ? 0.5 : 1) + d.phase;
          var cx2 = tree.position.x + T.center.x * tree.scale.x, cz2 = tree.position.z + T.center.z * tree.scale.x;
          var fx2 = cx2 + Math.cos(ang) * d.R, fz2 = cz2 + Math.sin(ang) * d.R * 0.7;
          var fy2 = d.alt + Math.sin(gTime * 0.8 + d.phase) * 0.6;
          tmpV.copy(d.perch).add(tree.position);
          b.position.set(lerp(fx2, tmpV.x, perchK), lerp(fy2, tmpV.y, perchK), lerp(fz2, tmpV.z, perchK));
          b.rotation.set(0, Math.atan2(-Math.sin(ang), Math.cos(ang) * 0.7) * (1 - perchK) + perchK * 0.4, 0);
          var flap = Math.sin(gTime * 11 + d.phase * 3) * 0.8 * (1 - perchK) + perchK * 0.1;
          if (!reduce && Math.sin(gTime * 0.9 + d.phase) > 0.55) flap *= 0.15;
          d.wl.rotation.z = flap; d.wr.rotation.z = -flap;
        });

        // butterflies on warm calm days (a few in autumn's early light), dandelion clocks in spring and summer
        var warm = state.season === "spring" || state.season === "summer" ? 1 : state.season === "autumn" ? (L > 0.2 && L < 0.45 ? 0.6 : 0.35) : 0;
        var calm = 1 - Math.min(1, P.rain * 2 + P.snowfall * 2 + Math.max(0, ov - 0.25) * 1.5);
        var bGlow = (0.12 + 0.16 * U.uTransK.value) * day;
        for (var bm = 0; bm < bflyMats.length; bm++) bflyMats[bm].emissiveIntensity = bGlow;
        updateButterflies(dt, Math.round(warm * calm * (1 - smooth(0.42, 0.56, L)) * BFN), L);
        var dShow = (state.season === "spring" || state.season === "summer" ? 1 : state.season === "autumn" ? 0.7 : 0) * (1 - P.snow) * (1 - P.rain);
        updateDandelions(dt, dShow);
        if (dandChip) { var dOff = dShow < 0.5 || state.weather !== "clear" ? "1" : "0"; if (dandChip.dataset.off !== dOff) dandChip.dataset.off = dOff; }

        // the person: slow breathing, looking around, hair in the wind
        if (person.visible) {
          torso.scale.set(1, 1 + Math.sin(time * 1.6) * 0.008, 1);
          headG.rotation.y = Math.sin(time * 0.17) * 0.45 + Math.sin(time * 0.05) * 0.2;
          headG.rotation.x = -0.25 + Math.sin(time * 0.11) * 0.06;
          hairLong.rotation.x = 0.08 + Math.sin(gTime * 2.1) * 0.05 * U.uWind.value;
          hairLong.rotation.z = Math.sin(gTime * 1.7 + 1) * 0.04 * U.uWind.value;
        }
        // the modelled woman: she breathes and slowly looks around
        if (rig && person.visible) {
          var amp = reduce ? 0.4 : 1;
          var yaw = (Math.sin(time * 0.17) * 0.3 + Math.sin(time * 0.05 + 1.3) * 0.16) * amp, pitch = (Math.sin(time * 0.11) * 0.05 - 0.02) * amp;
          boneRot(rig.head, -0.16 + yaw * 0.5, pitch + 0.025);
          boneRot(rig.neck, -0.06 + yaw * 0.25, pitch * 0.3);
          boneRot(rig.chest, 0, Math.sin(time * 1.5) * 0.01 * amp);
        }

        if(viewMode==='vehicle'){
          camBase.copy(van.position).add(new THREE.Vector3(1.5,2.4,6.3));look.copy(van.position).add(new THREE.Vector3(0,1.5,0));
        }else if(viewMode==='character'){
          person.getWorldPosition(tmpV);camBase.copy(tmpV).add(new THREE.Vector3(1.9,0.80,1.8));look.copy(tmpV).add(new THREE.Vector3(0,0.52,0));
        }
        if (!reduce) mouseNdcS.lerp(ndc, Math.min(1, dt * 2));
        camera.position.set(camBase.x + mouseNdcS.x * 0.3, camBase.y + mouseNdcS.y * 0.1, camBase.z);
        tmpV.set(look.x + mouseNdcS.x * 0.7, look.y + mouseNdcS.y * 0.3, look.z);
        camera.lookAt(tmpV);

        var tone = L < 0.5 ? "bright" : "dim";
        if (container.dataset.mhTone !== tone) container.dataset.mhTone = tone;

        if (skyU.uCloudMix.value > 0.002 || rmTarget > 0) renderClouds();
        // gentler glow by day (bright skies would wash out), more at night for lamps and the moon
        if (bloomPass) bloomPass.strength = 0.12 + 0.10 * smooth(0.5, 0.9, L);
        var gr = sampleGrade(L, kk, P.rain, Math.max(P.snowfall, P.snow * 0.5));
        // where the sun sits on screen, for the lens glare
        tmpV.copy(sunDir).multiplyScalar(1000).add(camera.position).project(camera);
        var onScr = tmpV.z < 1 ? 1 - smooth(1.0, 1.6, Math.max(Math.abs(tmpV.x), Math.abs(tmpV.y))) : 0;
        var glare = 0.035 * onScr * day * (1 - ov) * smooth(-0.02, 0.06, sunDir.y) * (1 - smooth(0.35, 0.7, sunDir.y)) * Math.pow(sunVisS, 2);
        var useComposer = !!(composer && !degraded);
        if (gradeU) {
          gradeU.uSunUV.value.set(tmpV.x * 0.5 + 0.5, tmpV.y * 0.5 + 0.5); gradeU.uAspect.value = camera.aspect;
          gradeU.uExposure.value = renderer.toneMappingExposure;
          gradeU.uGlare.value = glare; gradeU.uGlareK.value = Math.pow(camera.fov / 40, 2);
          gradeU.uGlareC.value.copy(k.sun).lerp(tmpC.setRGB(1, 1, 1), 0.6);
          gradeU.uGain.value.copy(gr.gain); gradeU.uLift.value.copy(gr.lift);
          gradeU.uGam.value = gr.gam; gradeU.uCon.value = gr.con; gradeU.uSat.value = gr.sat; gradeU.uBlk.value = gr.blk;
        }
        // without post-processing (older or slower devices) the grade and the glare are approximated in CSS
        var cssF = useComposer ? "" : "saturate(" + gr.sat.toFixed(2) + ") contrast(" + (gr.con * (1 + gr.blk)).toFixed(2) + ") brightness(" + (Math.pow(0.5, gr.gam) / 0.5).toFixed(2) + ")";
        if (cssF !== cssFilter) { cssFilter = cssF; canvas.style.filter = cssF; }
        var cssG = "";
        if (!useComposer && glare > 0.005) {
          var gx2 = Math.round((tmpV.x * 0.5 + 0.5) * 200) / 2, gy2 = Math.round((0.5 - tmpV.y * 0.5) * 200) / 2;
          var gH = Math.max(1, container.clientHeight) * 40 / camera.fov;
          cssG = "radial-gradient(circle at " + gx2 + "% " + gy2 + "%,rgba(255,242,222," + Math.min(0.8, glare * 4.6).toFixed(2) + ") 0,rgba(255,242,222," + (glare * 1.9).toFixed(2) + ") " + Math.round(gH * 0.28) + "px,rgba(255,242,222,0) " + Math.round(gH * 0.95) + "px),radial-gradient(125% 100% at 55% 42%,rgba(0,0,0,0) 58%,rgba(0,0,0,.24) 100%)";
        }
        if (cssG !== cssGlare) { cssGlare = cssG; fxLayer.style.background = cssG; }
        renderer.shadowMap.needsUpdate = time-shadowTime > (autoQ ? 1/24 : 1/40);
        if(renderer.shadowMap.needsUpdate)shadowTime=time;
        if (composer && !degraded) {
          var displayToneMapping = renderer.toneMapping;
          renderer.toneMapping = THREE.NoToneMapping;
          composer.render();
          renderer.toneMapping = displayToneMapping;
        } else renderer.render(scene, camera);
      }

      /* ---------- add-ons: bloom post-processing, glTF loader + mesh decoder (cdn.jsdelivr.net) ---------- */
      var CDN = opts.scriptsPath || "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/";
      var wantModels = opts.models !== false;
      var BLOOM_JS = [["CopyShader", "shaders/CopyShader.js"], ["LuminosityHighPassShader", "shaders/LuminosityHighPassShader.js"], ["EffectComposer", "postprocessing/EffectComposer.js"], ["RenderPass", "postprocessing/RenderPass.js"], ["ShaderPass", "postprocessing/ShaderPass.js"], ["UnrealBloomPass", "postprocessing/UnrealBloomPass.js"]];
      // the compact models need WebAssembly to decode; pages that block it get the larger gzip copies instead
      var wasmOK = (function () { try { return typeof WebAssembly === "object" && new WebAssembly.Module(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0])) instanceof WebAssembly.Module; } catch (e) { return false; } })();
      var MODEL_JS = [["GLTFLoader", "loaders/GLTFLoader.js"]];
      if (wasmOK) MODEL_JS.push(["MeshoptDecoder", "libs/meshopt_decoder.js", 1]);
      function loadScripts(list, done) {
        list = list.filter(function (a) { return a[2] ? !global[a[0]] : !THREE[a[0]]; });
        var idx = 0;
        (function next() {
          if (disposed) return;
          if (idx >= list.length) return done();
          var el = document.createElement("script");
          el.src = CDN + list[idx++][1];
          el.onload = next; el.onerror = next;
          document.head.appendChild(el);
        })();
      }
      function setupComposer() {
        if (disposed || degraded || !renderer.capabilities.isWebGL2) return;
        if (!THREE.EffectComposer || !THREE.RenderPass || !THREE.ShaderPass || !THREE.UnrealBloomPass || !THREE.WebGLMultisampleRenderTarget) return;
        var size = renderer.getSize(new THREE.Vector2()), pr = renderer.getPixelRatio();
        // a stencil makes three allocate DEPTH24_STENCIL8; the default 16-bit depth z-fights at meadow distances
        var target = new THREE.WebGLMultisampleRenderTarget(size.x * pr, size.y * pr, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type: THREE.HalfFloatType, stencilBuffer: true });
        target.samples = autoQ ? 2 : 4;
        var c = new THREE.EffectComposer(renderer, target);
        c.addPass(new THREE.RenderPass(scene, camera));
        bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.12, 0.38, 1.35);
        [bloomPass.renderTargetBright].concat(bloomPass.renderTargetsHorizontal, bloomPass.renderTargetsVertical).forEach(function(rt) { rt.texture.type = THREE.HalfFloatType; });
        bloomPass.enabled=!autoQ;
        c.addPass(bloomPass);
        var gp = new THREE.ShaderPass({
          uniforms: { tDiffuse: { value: null }, uExposure: { value: 1 }, uGain: { value: new THREE.Vector3(1, 1, 1) }, uLift: { value: new THREE.Vector3() }, uGam: { value: 1 }, uCon: { value: 1 }, uSat: { value: 1 }, uBlk: { value: 0 },
            uSunUV: { value: new THREE.Vector2(0.5, 1.5) }, uGlare: { value: 0 }, uGlareC: { value: new THREE.Color(1, 1, 1) }, uAspect: { value: 1.6 }, uGlareK: { value: 1 } },
          vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.0); }",
          fragmentShader: [
            "uniform sampler2D tDiffuse; uniform vec3 uGain, uLift, uGlareC; uniform vec2 uSunUV; uniform float uExposure, uGam, uCon, uSat, uBlk, uGlare, uAspect, uGlareK; varying vec2 vUv;",
            "vec3 meadowACES(vec3 c){",
            " mat3 inputM = mat3(vec3(0.59719,0.07600,0.02840),vec3(0.35458,0.90834,0.13383),vec3(0.04823,0.01566,0.83777));",
            " mat3 outputM = mat3(vec3(1.60475,-0.10208,-0.00327),vec3(-0.53108,1.10813,-0.07276),vec3(-0.07367,-0.00605,1.07602));",
            " c = inputM*(c*uExposure/0.6);",
            " vec3 a = c*(c + 0.0245786) - 0.000090537;",
            " vec3 b = c*(0.983729*c + 0.4329510) + 0.238081;",
            " return clamp(outputM*(a/b),0.0,1.0);",
            "}",
            "void main(){",
            " vec3 lin = max(texture2D(tDiffuse, vUv).rgb, 0.0);",
            " vec2 dv = (vUv - uSunUV)*vec2(uAspect, 1.0);",
            " float q = dot(dv, dv)*uGlareK;",
            " lin += uGlareC*uGlare*(exp(-q*3.0)*0.75 + exp(-q*0.6)*0.25);",
            " vec3 c = LinearTosRGB(vec4(meadowACES(lin), 1.0)).rgb;",
            " c *= uGain; c += uLift*(1.0 - c);",
            " c = pow(max(c, 0.0), vec3(uGam));",
            " c = (c - 0.5)*uCon + 0.5;",
            " float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = l + (c - l)*uSat;",
            " c = (c - uBlk)/(1.0 - uBlk);",
            // a touch of dither keeps the graded sky gradients from banding
            " c += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)))*43758.5453) - 0.5)/255.0;",
            " gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);",
            "}"
          ].join("\n")
        });
        gp.material.toneMapped = false;
        c.addPass(gp); gradeU = gp.uniforms;
        composer = c;
        frame();
      }

      /* ---------- the camper van and the woman on its roof: real 3D models built in Blender ---------- */
      // (the procedural van and figure above stay as the fallback if the models can't load)
      var glbVan = null, glbPerson = null, rig = null, vanPaintM = null, vanGlassM = null, revealed = false;
      var headLocal = new THREE.Vector3(2.55, 0.95, 0), umbZ0 = -0.22, beanieS = 1;
      var revealTimer = 0;
      if (wantModels) { van.visible = false; revealTimer = setTimeout(revealModels, 10000); }
      function shown(o) { for (; o && o !== van; o = o.parent) if (!o.visible) return false; return true; }
      function revealModels() {
        if (disposed) return;
        clearTimeout(revealTimer);
        if (!glbVan) bodyG.visible = true;
        if (!glbPerson) personBody.visible = true;
        van.visible = true; revealed = true;
        pickables = T.parts.concat(vanParts.filter(shown));
      }
      function modelSpec(m) { return typeof m === "string" ? { url: m } : (m || {}); }
      // fetch a .glb, gunzipping it first when it arrives gzip-compressed
      function fetchModel(url, onBuf, onErr) {
        var fl = new THREE.FileLoader(); fl.setResponseType("arraybuffer");
        fl.load(url, function (buf) {
          var b = new Uint8Array(buf, 0, Math.min(2, buf.byteLength));
          if (b[0] === 0x1f && b[1] === 0x8b) {
            if (typeof DecompressionStream === "undefined" || typeof Response === "undefined") return onErr(new Error("gzip not supported here"));
            new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer().then(onBuf, onErr);
          } else onBuf(buf);
        }, undefined, onErr);
      }
      function loadModels() {
        if (disposed) return;
        if (!wantModels || !THREE.GLTFLoader) return revealModels();
        // models given in options win; otherwise meadow-assets/models.js (embedded copies) if the page loaded it
        var M = opts.models && typeof opts.models === "object" ? opts.models : (global.MeadowHeroModels || {});
        var meshopt = wasmOK && !!global.MeshoptDecoder, canGz = typeof DecompressionStream !== "undefined";
        function spec(key, file) {
          if (M[key] !== undefined) return modelSpec(M[key]);
          if(key==="person") return {url:assets+"person-remade.glb"};
          var gz = canGz ? assets + file + "-q.glbz" : null;
          return meshopt ? { url: assets + file + ".glb", alt: gz } : { url: gz };
        }
        var jobs = [[spec("van", "van"), setupVan]];
        if (opts.character !== false) jobs.push([spec("person", "person"), setupPerson]);
        jobs = jobs.filter(function (j) { return j[0].url; });
        var pending = jobs.length;
        if (!pending) return revealModels();
        var loader = new THREE.GLTFLoader();
        if (meshopt) loader.setMeshoptDecoder(global.MeshoptDecoder);
        function finish() { if (--pending <= 0) revealModels(); }
        jobs.forEach(function (j) {
          var s = j[0];
          (function attempt(url, alt) {
            var fail = function (e) { if (alt) return attempt(alt, null); console.warn("MeadowHero: could not load " + url, e); finish(); };
            fetchModel(url, function (buf) {
              if (disposed) return;
              loader.parse(buf, url.replace(/[^\/]*$/, ""), function (g) {
                if (disposed) return;
                try { j[1](g.scene, s); } catch (e) { console.warn("MeadowHero: model setup failed", e); }
                finish();
              }, fail);
            }, fail);
          })(s.url, s.alt);
        });
      }
      // quantized models store positions as normalized integers: turn them back into floats and bake the
      // node transform in, so picking, shading and snow all work in plain van space
      function deq(a) {
        var arr = a.isInterleavedBufferAttribute ? a.data.array : a.array;
        if (!a.normalized && !a.isInterleavedBufferAttribute && arr instanceof Float32Array) return a;
        var d = 1, lo = -Infinity;
        if (a.normalized) {
          if (arr instanceof Int8Array) { d = 127; lo = -1; } else if (arr instanceof Uint8Array) d = 255;
          else if (arr instanceof Int16Array) { d = 32767; lo = -1; } else if (arr instanceof Uint16Array) d = 65535;
        }
        var n = a.count, s = a.itemSize, f = new Float32Array(n * s), get = [a.getX, a.getY, a.getZ, a.getW];
        for (var i = 0; i < n; i++) for (var c = 0; c < s; c++) f[i * s + c] = Math.max(lo, get[c].call(a, i) / d);
        return new THREE.BufferAttribute(f, s);
      }
      function bakeGeometry(mesh, m4) {
        var g = mesh.geometry;
        ["position", "normal"].forEach(function (k) { if (g.attributes[k]) g.setAttribute(k, deq(g.attributes[k])); });
        g.applyMatrix4(m4);
        g.computeBoundingBox(); g.computeBoundingSphere();
        mesh.position.set(0, 0, 0); mesh.quaternion.identity(); mesh.scale.set(1, 1, 1);
      }
      function genericModel(root, s, isVan) {
        root.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (isVan) vanParts.push(o); if (o.material && o.material.map) o.material.map.anisotropy = Math.min(8, maxAniso); } });
        root.rotation.y = s.rotationY || 0;
        var box = new THREE.Box3().setFromObject(root), sz = box.getSize(new THREE.Vector3());
        root.scale.multiplyScalar(isVan ? (s.length || 4.65) / Math.max(sz.x, sz.z) : (s.height || 0.95) / sz.y);
        box.setFromObject(root);
        var ctr = box.getCenter(new THREE.Vector3());
        root.position.set(-ctr.x, -box.min.y, -ctr.z);
        if (isVan) { bodyG.visible = false; van.add(root); glbVan = root; roofG.position.y = (box.max.y - box.min.y) - ROOF; }
        else { personBody.visible = false; person.add(root); glbPerson = root; }
      }

      function setupVan(root, s) {
        root.updateMatrixWorld(true);
        var parts = {};
        root.traverse(function (o) { if (o.isMesh) parts[o.name] = o; });
        if (!parts.van_body) return genericModel(root, s, true);
        var BLUE = Lc(s.color || "#729da9"), WHITE = Lc("#e5e1d3"), WELL = Lc("#0b0c0e");
        // two-tone paint by position: blue below the belt crease, white above with the classic V on the nose, dark wheel wells
        var paintX = "((vLy < 0.335 || (length(vec2(abs(vLx) - 1.2, vLy - 0.33)) < 0.405 && abs(vLz) < 0.86)) ? " + glsl(WELL) +
          " : (vLy < min(1.165, mix(1.165, 0.95 + 0.26*abs(vLz), smoothstep(1.90, 2.05, vLx))) ? " + glsl(BLUE) + " : " + glsl(WHITE) + "))";
        // night: warm light through pleated curtains in the living area, a dim glow in the cab
        var CURTAIN = [
          "float cab = smoothstep(0.95, 1.20, vLx), rear = 1.0 - smoothstep(-2.2, -2.05, vLx);",
          "float fold = 0.5 + 0.5*sin(mix(vLx, vLz, rear)*60.0 + sin(vLy*11.0)*0.7);",
          "fold = mix(0.75, fold, 1.0 - smoothstep(5.0, 14.0, length(vViewPosition)));",
          "float lamp = 0.6 + 0.4*(1.0 - smoothstep(1.35, 1.85, vLy));",
          "float edge = smoothstep(1.31,1.38,vLy)*(1.0-smoothstep(1.73,1.82,vLy));",
          "float opening = smoothstep(0.23,0.31,abs(sin((vLx+0.03)*3.55)));",
          "float curtain = (0.45 + 0.55*fold)*lamp*mix(0.08,1.0,opening)*edge;",
          "float cabLight=0.14*(0.25+0.75*(1.0-smoothstep(1.35,1.75,vLy)))*(0.45+0.55*smoothstep(0.2,0.36,abs(vLz)));",
          "totalEmissiveRadiance *= mix(curtain,cabLight,cab);"
        ].join("\n");
        vanGlassM = snowify(new THREE.MeshPhysicalMaterial({ color: Lc("#17222b"), roughness: 0.055, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.06, envMapIntensity: 1.1, transparent: true, opacity: 0.44, depthWrite: false, emissive: new THREE.Color(1.0, 0.55, 0.22), emissiveIntensity: 0 }), null, "vglass", CURTAIN);
        var MATS = {
          van_body: snowify(new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.26, metalness: 0, clearcoat: 0.65, clearcoatRoughness: 0.19, envMapIntensity: 0.85, vertexColors: true }), paintX, "vpaint"),
          van_glass: vanGlassM, van_lens: lensMat, van_redlens: tailMat, van_amber: indMat, van_rubber: seal,
          van_chrome: keep(new THREE.MeshStandardMaterial({ color: Lc("#c9cccb"), roughness: 0.22, metalness: 1, vertexColors: true })),
          van_dark: snowify(new THREE.MeshStandardMaterial({ color: Lc("#0c0d0f"), roughness: 0.8 }), null, "vdark"),
          van_tire: snowify(new THREE.MeshStandardMaterial({ color: Lc("#1b1c1e"), roughness: 0.93, vertexColors: true }), null, "vtire"),
          van_rim: keep(new THREE.MeshStandardMaterial({ color: Lc("#eeebe3"), roughness: 0.3, metalness: 0.25, vertexColors: true })),
          van_rack: snowify(new THREE.MeshStandardMaterial({ color: Lc("#28292c"), roughness: 0.45, metalness: 0.7, vertexColors: true }), null, "vrack")
        };
        vanPaintM=MATS.van_body;finishSurface(MATS.van_body,'paint');finishSurface(MATS.van_tire,'rubber');finishSurface(MATS.van_rubber,'rubber');finishSurface(MATS.van_chrome,'metal');finishSurface(MATS.van_rim,'metal');finishSurface(MATS.van_rack,'metal');
        var g = new THREE.Group();
        Object.keys(parts).forEach(function (k) {
          var m = parts[k], nm = MATS[k];
          bakeGeometry(m, m.matrixWorld.clone());
          if (nm && !(nm.vertexColors && !m.geometry.attributes.color)) { var old = m.material; m.material = nm; if (old && old !== nm && old.dispose) old.dispose(); }
          m.castShadow = true; m.receiveShadow = true;
          keep(m.geometry); g.add(m); vanParts.push(m);
        });
        if (glbVan) van.remove(glbVan);
        glbVan = g; van.add(g);
        bodyG.visible = false;
        var cabinMat=finishSurface(keep(new THREE.MeshStandardMaterial({color:Lc('#36332c'),roughness:0.9})),'cloth');
        var dashMat=finishSurface(keep(new THREE.MeshStandardMaterial({color:Lc('#242823'),roughness:0.72})),'rubber');
        function cabinBox(w,h,d,x,y,z,mat){var m=new THREE.Mesh(keep(new THREE.BoxGeometry(w,h,d)),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
        cabinBox(4.15,0.08,1.55,0,0.76,0,cabinMat);
        cabinBox(0.40,0.17,1.49,1.87,1.20,0,dashMat);
        [-0.43,0.43].forEach(function(z){cabinBox(0.58,0.14,0.54,1.24,0.93,z,cabinMat);var seat=cabinBox(0.12,0.6,0.52,0.99,1.20,z,cabinMat);seat.rotation.z=-0.1;});
        var steering=new THREE.Mesh(keep(new THREE.TorusGeometry(0.16,0.017,8,32)),dashMat);steering.rotation.y=Math.PI/2;steering.rotation.z=-0.25;steering.position.set(1.73,1.34,-0.43);g.add(steering);
        [-0.6,0.6].forEach(function(z){
          var housing=new THREE.Mesh(keep(new THREE.CylinderGeometry(0.122,0.122,0.035,48)),MATS.van_chrome);housing.rotation.z=-Math.PI/2;housing.position.set(2.244,0.86,z);g.add(housing);
          var lens=new THREE.Mesh(keep(new THREE.SphereGeometry(0.11,32,20)),lensMat);lens.scale.x=0.28;lens.position.set(2.262,0.86,z);g.add(lens);
        });
        [0.72,0.765,0.81,0.855].forEach(function(y){cabinBox(0.022,0.012,0.86,2.254,y,0,MATS.van_chrome);});
        var plateTex=keep(canvasTex(512,128,function(ctx){ctx.fillStyle='#d6d3bf';ctx.fillRect(0,0,512,128);ctx.strokeStyle='#313530';ctx.lineWidth=6;ctx.strokeRect(8,8,496,112);ctx.font='bold 65px monospace';ctx.textAlign='center';ctx.fillStyle='#30372f';ctx.fillText('MEADOW 36',256,88);}));plateTex.encoding=THREE.sRGBEncoding;
        var plate=new THREE.Mesh(keep(new THREE.PlaneGeometry(0.43,0.108)),keep(new THREE.MeshStandardMaterial({map:plateTex,roughness:0.5,metalness:0.1})));plate.rotation.y=Math.PI/2;plate.position.set(2.274,0.51,0);g.add(plate);
        rackParts.forEach(function (o) { o.visible = false; });
        // lamp glows, light beams and the contact shadow move from the old body onto the van itself
        [ao].concat(headSprites, beamCones).forEach(function (o) { van.add(o); });
        headSprites.forEach(function (sp, i) { sp.position.set(2.29, 0.86, i ? -0.6 : 0.6); sp.scale.setScalar(0.34); });
        beamCones.forEach(function (c, i) { c.position.set(2.3 + 4.5, 0.86, i ? -0.6 : 0.6); });
        ao.scale.set(0.9, 0.82, 1);
        headLocal.set(2.3, 0.86, 0);
        // roof: luggage, a blanket and the woman sit on the model's rack (its top is at y = 2.118)
        roofG.position.y = 2.118 - (ROOF + 0.15);
        var Y = function (y) { return y - roofG.position.y; };
        crate.position.set(0.95, Y(2.23), -0.26); crate.rotation.set(0, 0.25, 0); crate.scale.setScalar(0.85); crate.material = woodMat;
        duffel.position.set(-0.74, Y(2.275), 0.26); duffel.scale.set(0.78, 0.72, 0.66);
        strap.position.set(-0.74, Y(2.33), 0.26); strap.scale.setScalar(0.72);
        bag2.position.set(0.9, Y(2.24), 0.36); bag2.scale.setScalar(0.7);
        rollM.position.set(-1.3, Y(2.21), 0.0); rollM.scale.set(0.7, 0.7, 0.75); rollM.material = matFoam;
        snowCap.position.set(-0.02, Y(1.955), 0); snowCap.scale.x = 1.03; snowCap.scale.z = 0.86;
        blanketM.visible = true; blanketM.position.set(0.16, Y(2.13), -0.2);
        person.position.set(0.16, Y(2.143), 0.0); person.rotation.y = 3.0;
        if (revealed) pickables = T.parts.concat(vanParts.filter(shown));
      }

      var woodTex = canvasTex(128, 128, function (g2, w, h) {
        var r = mulberry(31); g2.fillStyle = "#8b6a49"; g2.fillRect(0, 0, w, h);
        for (var i = 0; i < 160; i++) { g2.fillStyle = "rgba(" + (r() < 0.5 ? "60,40,25," : "170,140,105,") + (0.08 + r() * 0.18) + ")"; g2.fillRect(0, r() * h, w, 1 + r() * 2); }
        g2.fillStyle = "rgba(35,24,16,0.85)"; for (var k = 0; k < 4; k++) g2.fillRect(0, k * 32, w, 3);
      });
      woodTex.encoding = THREE.sRGBEncoding;
      var woodMat = snowify(new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.85 }), null, "wood");
      var matFoam = snowify(new THREE.MeshStandardMaterial({ color: Lc("#3e5a4c"), roughness: 0.9 }), null, "foam");
      var twillTex = canvasTex(64, 64, function (g2) {
        g2.fillStyle = "rgb(128,128,255)"; g2.fillRect(0, 0, 64, 64);
        g2.strokeStyle = "rgba(92,150,250,0.85)"; g2.lineWidth = 2;
        for (var k = -64; k < 128; k += 6) { g2.beginPath(); g2.moveTo(k, 0); g2.lineTo(k + 64, 64); g2.stroke(); }
      });
      twillTex.wrapS = twillTex.wrapT = THREE.RepeatWrapping; twillTex.repeat.set(14, 14);
      function hairTexture() {
        var t=canvasTex(256,512,function(ctx,w,h){
          var rng=mulberry(77);ctx.clearRect(0,0,w,h);
          for(var i=0;i<360;i++){var x=rng()*w,tip=h*(0.82+0.18*rng()),bend=(rng()-0.5)*7;
            var v=Math.floor(125+rng()*100);ctx.strokeStyle='rgb('+v+','+Math.floor(v*.95)+','+Math.floor(v*.88)+')';ctx.lineWidth=.4+rng()*1.5;
            ctx.beginPath();ctx.moveTo(x,0);ctx.bezierCurveTo(x+bend,h*.3,x-bend,h*.65,x+bend*.4,tip);ctx.stroke();
          }
          ctx.globalCompositeOperation='destination-in';var edge=ctx.createLinearGradient(0,0,w,0);edge.addColorStop(0,'transparent');edge.addColorStop(.10,'white');edge.addColorStop(.90,'white');edge.addColorStop(1,'transparent');ctx.fillStyle=edge;ctx.fillRect(0,0,w,h);
        });t.encoding=THREE.sRGBEncoding;t.anisotropy=Math.min(8,maxAniso);return t;
      }
      var qTmp = new THREE.Quaternion(), axY = new THREE.Vector3(0, 1, 0), axX = new THREE.Vector3(1, 0, 0);
      function boneRot(b, yaw, pitch) {
        if (!b) return;
        b.quaternion.copy(b.userData.q0);
        if (yaw) b.quaternion.multiply(qTmp.setFromAxisAngle(axY, yaw));
        if (pitch) b.quaternion.multiply(qTmp.setFromAxisAngle(axX, pitch));
      }

      function makeGroom(){
        var group=new THREE.Group(),rng=mulberry(181),center=new THREE.Vector3(0,0.718,0.305);
        function pathAt(az,t,phase){
          var frontal=Math.max(0,Math.cos(az)),end=2.02-frontal*1.05,flow=smooth(0.40,1.05,Math.abs(az));
          var p=Math.min(t/0.62,1)*end,drop=Math.max(0,(t-.62)/.38)*flow;
          var x=.097*Math.sin(p)*Math.sin(az),y=.104*Math.cos(p),z=.102*Math.sin(p)*Math.cos(az);
          x+=Math.sign(Math.sin(az))*drop*.018+Math.sin(drop*9+phase)*.004*drop;
          y-=drop*(.22+.025*Math.sin(az*2));z-=drop*.105;
          return new THREE.Vector3(x,y,z).add(center);
        }
        var verts=[],normals=[],colors=[],indices=[],uv=[];
        var count=lowQ?180:(autoQ?260:420),steps=14,sides=3;
        for(var strand=0;strand<count;strand++){
          var az=-Math.PI+(strand+.3+rng()*.4)/count*Math.PI*2,phase=rng()*6.28;
          var length=smooth(.4,1.05,Math.abs(az)),tmax=length<.02?.62:.87+rng()*.13;
          var radius=.00065+rng()*.0007,shade=.55+rng()*.65;
          var color=Lc('#67503b').multiplyScalar(shade),start=verts.length/3;
          for(var j=0;j<=steps;j++){
            var t=.03+j/steps*(tmax-.03),v=pathAt(az,t,phase),a=pathAt(az,Math.max(.001,t-.003),phase),b=pathAt(az,Math.min(1,t+.003),phase);
            var tangent=b.sub(a).normalize(),n=new THREE.Vector3(Math.sin(az),0,Math.cos(az)),side=new THREE.Vector3().crossVectors(tangent,n).normalize();n.crossVectors(side,tangent).normalize();
            var taper=1-smooth(.78,1,j/steps)*.88;
            for(var k=0;k<sides;k++){var angle=k/sides*Math.PI*2,q=n.clone().multiplyScalar(Math.cos(angle)).addScaledVector(side,Math.sin(angle));verts.push(v.x+q.x*radius*taper,v.y+q.y*radius*taper,v.z+q.z*radius*taper);normals.push(q.x,q.y,q.z);colors.push(color.r,color.g,color.b);uv.push(k/sides,j/steps);}
            if(j<steps)for(var k=0;k<sides;k++){var x=start+j*sides+k,y=start+j*sides+(k+1)%sides;indices.push(x,y,y+sides,x,y+sides,x+sides);}
          }
        }
        var geo=keep(new THREE.BufferGeometry());geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);
        var mat=keep(new THREE.MeshStandardMaterial({vertexColors:true,roughness:.76,envMapIntensity:.2}));var hair=new THREE.Mesh(geo,mat);hair.castShadow=true;hair.receiveShadow=false;group.add(hair);
        // A smooth scalp under the separate fibres prevents a patchy, transparent crown.
        var p=[],ix=[],cols=80,rows=20;
        for(var row=0;row<=rows;row++)for(var col=0;col<=cols;col++){var az=-Math.PI+col/cols*Math.PI*2,v=pathAt(az,.006+row/rows*.61,0);v.sub(center).multiplyScalar(.987).add(center);p.push(v.x,v.y,v.z);if(row<rows&&col<cols){var i=row*(cols+1)+col;ix.push(i,i+cols+1,i+1,i+1,i+cols+1,i+cols+2);}}
        var cap=keep(new THREE.BufferGeometry());cap.setAttribute('position',new THREE.Float32BufferAttribute(p,3));cap.setIndex(ix);cap.computeVertexNormals();
        var under=new THREE.Mesh(cap,keep(new THREE.MeshStandardMaterial({color:Lc('#49372d'),roughness:.8,side:THREE.DoubleSide,envMapIntensity:.2})));under.castShadow=true;group.add(under);return group;
      }

      function smoothCharacterNormals(geo){
        geo.setAttribute('position',deq(geo.attributes.position));
        geo.deleteAttribute('normal');geo.computeVertexNormals();
        var p=geo.attributes.position,n=geo.attributes.normal,groups={},keys=[];
        for(var i=0;i<p.count;i++){var key=[Math.round(p.getX(i)*1e5),Math.round(p.getY(i)*1e5),Math.round(p.getZ(i)*1e5)].join(',');keys[i]=key;var q=groups[key]||(groups[key]=new THREE.Vector3());q.x+=n.getX(i);q.y+=n.getY(i);q.z+=n.getZ(i);}
        Object.keys(groups).forEach(function(k){groups[k].normalize();});
        for(var i=0;i<p.count;i++){var q=groups[keys[i]];n.setXYZ(i,q.x,q.y,q.z);}n.needsUpdate=true;
      }
      function setupRemadePerson(root,s){
        var bones={};
        root.traverse(function(o){
          if(o.isBone){bones[o.name]=o;o.userData.q0=o.quaternion.clone();}
          if(!o.isMesh)return;
          keep(o.geometry);keep(o.material);var m=o.material;m.skinning=true;
          if(m.map){keep(m.map);m.map.anisotropy=Math.min(4,maxAniso);}
          if(['sweater','jeans','shoes'].indexOf(o.name)>=0)snowify(m,null,'remade-'+o.name,null,.4);
          if(o.name==='body'){finishSurface(m,'skin');m.envMapIntensity=.45;}
          if(o.name==='sweater'){var tex=keep(knitTex.clone());tex.repeat.set(32,32);tex.needsUpdate=true;m.normalMap=tex;m.normalScale=new THREE.Vector2(.13,.13);finishSurface(m,'cloth');}
          if(o.name==='jeans'){m.normalMap=twillTex;m.normalScale=new THREE.Vector2(.12,.12);finishSurface(m,'cloth');}
          if(o.name==='hair'||o.name==='hairHighlights'){m.envMapIntensity=.28;m.roughness=.58;}
          o.castShadow=true;o.receiveShadow=['sweater','jeans','shoes'].indexOf(o.name)>=0;
          o.frustumCulled=false;m.needsUpdate=true;
        });
        if(glbPerson)person.remove(glbPerson);glbPerson=root;rig=bones;person.add(root);personBody.visible=false;
        var v=new THREE.Vector3();
        sc1.geometry=keep(new THREE.TorusGeometry(.083,.032,12,28));
        person.add(scarf);scarf.position.set(0,.56,.255);scarf.quaternion.setFromUnitVectors(up,v.set(0,.753,.658));
        sc1.position.set(0,0,0);sc1.rotation.set(Math.PI/2,0,0);sc2.position.set(.035,-.06,.15);sc2.rotation.set(-.72,0,.1);sc2.scale.set(1,.62,1);
        person.add(beanie);beanieS=.94;beanie.position.set(0,.632,.292);beanie.rotation.set(-.1,0,0);beanie.scale.setScalar(beanieS);bn.scale.y=.95;
        person.updateMatrixWorld(true);bones.head.attach(beanie);
        person.add(umbrella);umbrella.position.set(.25,1.06,.22);umbrella.quaternion.setFromUnitVectors(up,v.set(.25,.77,-.09).normalize());umbZ0=umbrella.rotation.z;
        if(revealed)pickables=T.parts.concat(vanParts.filter(shown));
      }

      function setupPerson(root, s) {
        if(root.userData.remadeCharacter || root.getObjectByName("MeadowCharacter38"))return setupRemadePerson(root,s);
        var bones = {}, meshes = {};
        var list = [];
        root.traverse(function (o) { if (o.isBone) bones[o.name] = o; if (o.isMesh) { list.push(o); meshes[o.name] = o; } });
        if (!bones.head || !meshes.body) return genericModel(root, s, false);
        var hairC = Lc(s.hair || "#3b2a1f");
        var knitP = knitTex.clone(); knitP.repeat.set(32, 32); knitP.needsUpdate = true; keep(knitP);
        var M = {
          body: finishSurface(keep(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(1.0, 0.86, 0.77), vertexColors: true, roughness: 0.57, clearcoat: 0.025, clearcoatRoughness: 0.6, envMapIntensity: 0.75, skinning: true })), "skin"),
          eyes: finishSurface(keep(new THREE.MeshPhysicalMaterial({ color: Lc("#a6a49b"), roughness: 0.22, clearcoat: 0.8, clearcoatRoughness: 0.06, skinning: true })), "eyes"),
          sweater: snowify(new THREE.MeshPhysicalMaterial({ color: Lc(s.top || "#af8959"), roughness: 0.9, sheen: Lc("#64563d"), normalMap: knitP, normalScale: new THREE.Vector2(0.19, 0.19), skinning: true }), null, "psweater", null, 0.4),
          jeans: snowify(new THREE.MeshStandardMaterial({ color: Lc("#455565"), roughness: 0.86, normalMap: twillTex, normalScale: new THREE.Vector2(0.18, 0.18), skinning: true }), null, "pjeans", null, 0.4),
          shoes: snowify(new THREE.MeshStandardMaterial({ color: Lc("#e7e3da"), roughness: 0.68, skinning: true }), null, "pshoes", null, 0.4),
          hairshell: keep(new THREE.MeshStandardMaterial({ color: hairC.clone().multiplyScalar(0.7), roughness: 0.82, envMapIntensity: 0.3, skinning: true })),
          strands: snowify(new THREE.MeshStandardMaterial({ color: hairC.clone().multiplyScalar(1.3), map: keep(hairTexture()), roughness: 0.68, envMapIntensity: 0.4, side: THREE.DoubleSide, skinning: true }), null, "pstrands", null, 0.25)
        };
        loadTex('skin-diffuse.png',function(t){t.flipY=false;t.encoding=THREE.sRGBEncoding;M.body.map=t;M.body.color.setRGB(1,1,1);M.body.vertexColors=false;M.body.envMapIntensity=0.3;M.body.needsUpdate=true;});
        ['sweater','jeans','shoes'].forEach(function(k){finishSurface(M[k],'cloth');});
        finishSurface(M.hairshell,'hair');finishSurface(M.strands,'hair');
        M.strands.alphaTest=0.3;M.strands.alphaToCoverage=true;M.strands.depthWrite=true;
        M.hairshell.color.copy(hairC).multiplyScalar(0.65);M.hairshell.roughness=0.65;
        list.forEach(function (m) {
          var clothName=m.name==='sweater'||m.name==='jeans'?m.name:(m.parent&&m.parent.name);
          if(clothName==='sweater'||clothName==='jeans'){
            var geo=m.geometry;geo.setAttribute('position',deq(geo.attributes.position));geo.setAttribute('normal',deq(geo.attributes.normal));
            var pos=geo.attributes.position,norm=geo.attributes.normal,off=clothName==='sweater'?0.010:0.004;
            for(var v=0;v<pos.count;v++){pos.setXYZ(v,pos.getX(v)+norm.getX(v)*off,pos.getY(v)+norm.getY(v)*off,pos.getZ(v)+norm.getZ(v)*off);}
            pos.needsUpdate=true;geo.computeBoundingSphere();
          }
          // multi-material nodes load as a group of meshes: match on the node name too
          var nm = M[m.name] || (m.parent && M[m.parent.name]);
          if (nm) { var old = m.material; m.material = nm; if (old && old !== nm && old.dispose) old.dispose(); }
          if(m.name==='hairshell'||m.name==='body'||m.name==='sweater'||m.name==='jeans')smoothCharacterNormals(m.geometry);
          m.castShadow = true; m.receiveShadow = !(m.name==='body'||m.name==='eyes'||m.name==='hairshell'||m.name==='strands'); m.frustumCulled = false;
          keep(m.geometry);
        });
        Object.keys(bones).forEach(function (k) { bones[k].userData.q0 = bones[k].quaternion.clone(); });
        root.position.set(0, 0, 0);
        if (glbPerson) person.remove(glbPerson);
        glbPerson = root; rig = bones;
        person.add(root);
        personBody.visible = false;
        // refit the scarf, beanie and umbrella to the new body (person space: seat at the origin, facing +Z)
        var v = new THREE.Vector3();
        sc1.geometry = keep(new THREE.TorusGeometry(0.083, 0.032, 12, 28));
        person.add(scarf); scarf.position.set(0, 0.56, 0.255); scarf.quaternion.setFromUnitVectors(up, v.set(0, 0.753, 0.658));
        sc1.position.set(0, 0, 0); sc1.rotation.set(Math.PI / 2, 0, 0);
        sc2.position.set(0.035, -0.06, 0.15); sc2.rotation.set(-0.72, 0, 0.1); sc2.scale.set(1, 0.62, 1);
        person.add(beanie); beanieS = 0.97;
        beanie.position.set(0, 0.632, 0.292); beanie.rotation.set(-0.1, 0, 0); beanie.scale.setScalar(beanieS); bn.scale.y = 0.95;
        person.updateMatrixWorld(true); bones.head.attach(beanie);
        if(meshes.hairshell&&meshes.strands){meshes.hairshell.visible=false;meshes.strands.visible=false;var groom=makeGroom();person.add(groom);person.updateMatrixWorld(true);bones.head.attach(groom);}
        person.add(umbrella); umbrella.position.set(0.25, 1.06, 0.22);
        umbrella.quaternion.setFromUnitVectors(up, v.set(0.25, 0.77, -0.09).normalize()); umbZ0 = umbrella.rotation.z;
        if (revealed) pickables = T.parts.concat(vanParts.filter(shown));
      }
      finishSurface(leather,'leather');finishSurface(canvasBag,'cloth');finishSurface(blanket,'cloth');finishSurface(woolRed,'cloth');finishSurface(woolCream,'cloth');finishSurface(rubber,'rubber');finishSurface(chrome,'metal');
      if (wantModels) loadScripts(MODEL_JS, loadModels);
      if (opts.extras !== false) loadScripts(BLOOM_JS, setupComposer);

      function dispose() {
        disposed = true; clearTimeout(revealTimer);
        if (envRT) envRT.dispose();
        if (composer) {
          composer.passes.forEach(function(pass) {
            if (pass.dispose) pass.dispose();
            else { if (pass.material) pass.material.dispose(); if (pass.fsQuad) pass.fsQuad.dispose(); }
          });
          composer.renderTarget1.dispose(); composer.renderTarget2.dispose();
          if (composer.copyPass) { composer.copyPass.material.dispose(); composer.copyPass.fsQuad.dispose(); }
        }
        cloudRT.dispose();
        pmrem.dispose();
        if (ro) ro.disconnect();
        disposables.forEach(function (d) { try { d.dispose(); } catch (e) {} });
        renderer.dispose();
      }
      api.capture = function () { render(performance.now()/1000, 0); return canvas.toDataURL("image/png"); };
      if (opts.debug) api._debug = { scene: scene, camera: camera, U: U, cloudU: cloudU, skyU: skyU, tree: tree, van: van, renderer: renderer, P: P, camBase: camBase, look: look, person: person, roofG: roofG, grass: grass, ground: ground, flowers: flowers, mists: mists, butterflies: butterflies, dand: dand, cursor: function (x, z, on) { cursor.set(x, 0, z); cursorTarget = on; cursorOn = on; },
        cloudTime: function(t) { cloudTimeOverride = t; },
        sunCover: function() {
          var saz=Math.atan2(sunDir.x,-sunDir.z),sel=Math.asin(sunDir.y),lo={alpha:1,time:0},hi={alpha:0,time:0};
          for(var t=0;t<7200;t+=3){var r=PANO.layers.map(function(l){return (t*l.speed*D2R)%((l.az1-l.az0)*D2R);});var a=panoAlphaAt(saz,sel,r);if(a<lo.alpha)lo={alpha:a,time:t};if(a>hi.alpha)hi={alpha:a,time:t};}
          return {clear:lo,covered:hi};
        },
        freeze: function (v) { bflyFrozen = v; },
        sim: function (n, dt) { for (var q = 0; q < n; q++) { gTime += dt; U.uTime.value = gTime; updateButterflies(dt, Math.round(BFN), P.light); updateDandelions(dt, 1); } }, models: function () { return { van: glbVan, person: glbPerson, rig: rig, revealed: revealed, wasm: wasmOK }; }, fx: function () { return { composer: composer, bloom: bloomPass }; }, imp: function () { return { rt: impRT, render: renderImpostors, key: impKey, dirty: impDirty }; }, noComposer: function () { composer = null; frame(); }, performance: function(){return {level:adaptiveLevel,frameMs:perfMs,grassInstances:grassGeo.instanceCount,grassTriangles:grassGeo.index.count/3*grassGeo.instanceCount,shadows:shadowSize,bloom:!!(bloomPass&&bloomPass.enabled)};}, degraded: function () { return degraded; }, pano: function () { return { ready: panoReady, failed: panoFailed, alpha: !!panoAlphaPx, sunVis: sunVisS, rot: panoRotA.slice() }; } };
      return { render: render, dispose: dispose, reset: resetObjects };
    }

    api.reset = function () { if (scene3d) scene3d.reset(); };
    return api;
  }

  global.MeadowHero = { mount: mount, version: "3.8.0" };
})(typeof window !== "undefined" ? window : this);
