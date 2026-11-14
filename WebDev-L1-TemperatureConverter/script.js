/* Degrees — temperature converter
   Vanilla JS. No libraries. */
(function () {
  'use strict';

  /* ---------- constants ---------- */
  var UNITS = {
    C: { sym: '°C', name: 'Celsius',    min: -273.15 },
    F: { sym: '°F', name: 'Fahrenheit', min: -459.67 },
    K: { sym: 'K',  name: 'Kelvin',     min: 0 }
  };
  var ABS_ZERO_C = -273.15;
  var EPS = 1e-9;
  var MAX_ABS = 1e9;

  // mood bands by Celsius value (upper bound is exclusive)
  var MOODS = [
    { id: 'frozen',  below: 0,        weather: '❄️', face: '🥶', word: 'frozen solid' },
    { id: 'chilly',  below: 15,       weather: '☁️', face: '😶‍🌫️', word: 'cosy' },
    { id: 'mild',    below: 26,       weather: '🌤️', face: '😌', word: 'just right' },
    { id: 'warm',    below: 35,       weather: '☀️', face: '😎', word: 'sunny' },
    { id: 'hot',     below: 100,      weather: '🔥', face: '🥵', word: 'sizzling' },
    { id: 'boiling', below: Infinity, weather: '🌋', face: '🫠', word: 'molten' }
  ];

  /* ---------- elements ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var root = document.documentElement;
  var form = $('form'), input = $('value'), inputUnit = $('inputUnit'), errorEl = $('error');
  var bigNumber = $('bigNumber'), bigUnit = $('bigUnit'), fromLine = $('fromLine'), fact = $('fact');
  var moodWord = $('moodWord'), weatherEl = $('weatherEmoji'), faceEl = $('faceEmoji'), srResult = $('srResult');
  var emojiWrap = document.querySelector('.emoji-wrap');
  var vEls = { C: $('vC'), F: $('vF'), K: $('vK') };
  var allUnits = $('allUnits');
  var swapBtn = $('swapBtn'), copyBtn = $('copyBtn'), clearBtn = $('clearBtn');
  var historyList = $('historyList'), historyEmpty = $('historyEmpty');
  var soundBtn = $('soundBtn'), themeBtn = $('themeBtn'), toast = $('toast');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- state ---------- */
  var state = { from: 'C', to: 'F', last: null, shownNumber: 71.6, rafId: 0 };
  var history = [];
  var soundOn = true;

  /* ---------- safe storage ---------- */
  function store(key, val) { try { localStorage.setItem(key, val); } catch (e) { /* private mode etc. */ } }
  function read(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }

  /* ---------- maths ---------- */
  function toC(v, u) {
    if (u === 'C') return v;
    if (u === 'F') return (v - 32) * 5 / 9;
    return v - 273.15;
  }
  function fromC(c, u) {
    if (u === 'C') return c;
    if (u === 'F') return c * 9 / 5 + 32;
    return c + 273.15;
  }
  function round2(n) {
    var r = Math.round(n * 100) / 100;
    return Math.abs(r) < 0.005 ? 0 : r; // kill -0
  }
  function fmt(n) {
    return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
  function decimalsOf(n) {
    var s = String(round2(n));
    var i = s.indexOf('.');
    return i === -1 ? 0 : s.length - i - 1;
  }

  /* ---------- validation ---------- */
  function parseValue(raw) {
    var s = raw.trim().replace(/[−–]/g, '-');
    if (s === '') return { ok: false, msg: 'Type a number first — I can’t convert a vibe. 🫠' };
    if (s.indexOf('.') === -1 && (s.match(/,/g) || []).length === 1) s = s.replace(',', '.');
    if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(s)) {
      return { ok: false, msg: 'Hmm, “' + raw.trim().slice(0, 18) + '” doesn’t look like a number. Try 36.6 or -4. 🔢' };
    }
    var v = parseFloat(s);
    if (Math.abs(v) > MAX_ABS) return { ok: false, msg: 'Whoa, that’s a lot of zeros. Let’s keep it under a billion. 🚀' };
    return { ok: true, value: v };
  }

  function belowAbsoluteZero(v, unit) {
    return toC(v, unit) < ABS_ZERO_C - EPS;
  }

  function showError(msg) {
    errorEl.textContent = msg;
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (msg) { // restart the shake
      input.style.animation = 'none';
      void input.offsetWidth;
      input.style.animation = '';
    }
  }

  /* ---------- mood + facts ---------- */
  function moodFor(c) {
    for (var i = 0; i < MOODS.length; i++) if (c < MOODS[i].below) return { i: i, m: MOODS[i] };
    return { i: MOODS.length - 1, m: MOODS[MOODS.length - 1] };
  }

  function factFor(c) {
    if (c <= ABS_ZERO_C + EPS) return 'Absolute zero. Atoms have basically stopped dancing.';
    if (c < -173) return 'Colder than a night on the Moon (about −173 °C). Pack a coat.';
    if (c < -89.2) return 'Colder than the coldest air ever recorded on Earth (−89.2 °C, Antarctica).';
    if (Math.abs(c + 40) < EPS) return 'Fun fact: −40 is the one spot where °C and °F agree.';
    if (c < -40) return 'Polar-winter cold. Your eyelashes would freeze.';
    if (c < -18) return 'Deep-freezer territory. Ice cream is very safe here.';
    if (c < 0) return 'Below freezing. Puddles are now skating rinks.';
    if (Math.abs(c) < EPS) return 'Water freezes right about here. Ice cubes, assemble.';
    if (c < 5) return 'Fridge-cold. Your leftovers approve.';
    if (c < 15) return 'Sweater weather. Hot-chocolate o’clock.';
    if (c < 21) return 'Light-jacket cool. Great walking weather.';
    if (c < 26) return 'Cosy room temperature. Nobody’s complaining.';
    if (c < 32) return 'Warm and sunny. Iced coffee has entered the chat.';
    if (c < 36) return 'Properly hot. Shade is a love language.';
    if (c < 38) return 'Right around normal body temperature (about 37 °C).';
    if (c < 45) return 'Heatwave or fever? Either way: water, shade, rest.';
    if (c < 56.7) return 'Desert-summer hot. Hottest air ever recorded: 56.7 °C, Death Valley, 1913.';
    if (c < 70) return 'Hotter than any air Earth has ever recorded. Please stay inside.';
    if (c < 100 - EPS) return 'Teapot-hot. The steam is thinking about it.';
    if (Math.abs(c - 100) < EPS) return 'Water boils at sea level. The kettle is singing.';
    if (c < 180) return 'Past boiling. Steam, sizzle, and a very bad idea to touch.';
    if (c < 230) return 'Baking temperature. Cookies and cakes live here.';
    if (c < 300) return 'Hot-oven roast zone. Crispy edges guaranteed.';
    if (c < 500) return 'Wood-fired pizza oven range. Dinner in 90 seconds.';
    if (c < 1000) return 'Glowing-metal hot. Hello, blacksmith.';
    if (c < 1500) return 'Lava territory. Volcanoes are casually this hot.';
    if (c < 5500) return 'Hotter than lava — steel melts at around 1,500 °C.';
    if (c < 1e7) return 'Sun-surface hot (about 5,500 °C) and beyond.';
    return 'Sun’s-core territory (about 15 million °C). Nothing survives this.';
  }

  /* ---------- sound ---------- */
  var audioCtx = null;
  function plink(moodIndex) {
    if (!soundOn) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audioCtx = audioCtx || new AC();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      var t = audioCtx.currentTime;
      var f = [262, 330, 392, 494, 587, 698][moodIndex] || 440;
      [[f, 'triangle', 0.16], [f * 2, 'sine', 0.06]].forEach(function (p) {
        var o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = p[1]; o.frequency.setValueAtTime(p[0], t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(p[2], t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(t); o.stop(t + 0.28);
      });
    } catch (e) { /* audio is a bonus, never an error */ }
  }

  /* ---------- count-up ---------- */
  function setBig(text) {
    bigNumber.textContent = text;
    var len = text.length;
    bigNumber.classList.toggle('long', len > 8 && len <= 12);
    bigNumber.classList.toggle('xlong', len > 12);
  }

  function countTo(target) {
    cancelAnimationFrame(state.rafId);
    var final = round2(target);
    var dec = decimalsOf(final);
    var finalText = fmt(final);
    if (reduceMotion) { setBig(finalText); state.shownNumber = final; return; }
    var start = state.shownNumber, t0 = null, dur = 750;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      var v = start + (final - start) * e;
      setBig(p === 1 ? finalText : v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }));
      if (p < 1) state.rafId = requestAnimationFrame(step);
      else state.shownNumber = final;
    }
    state.rafId = requestAnimationFrame(step);
  }

  /* ---------- UI helpers ---------- */
  function syncUnitUI() {
    document.querySelector('input[name="from"][value="' + state.from + '"]').checked = true;
    document.querySelector('input[name="to"][value="' + state.to + '"]').checked = true;
    inputUnit.textContent = UNITS[state.from].sym;
  }

  function setMood(c, animateEmoji) {
    var r = moodFor(c), m = r.m;
    root.setAttribute('data-mood', m.id);
    weatherEl.textContent = m.weather;
    faceEl.textContent = m.face;
    moodWord.textContent = m.word;
    var fx = weatherFx(m.id, c);
    FX.set(fx[0], fx[1]);
    if (animateEmoji && !reduceMotion) {
      emojiWrap.classList.remove('pop'); void emojiWrap.offsetWidth; emojiWrap.classList.add('pop');
    }
    return r.i;
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(showToast.t);
    showToast.t = setTimeout(function () { toast.classList.remove('show'); }, 1800);
  }

  /* ---------- core: convert ---------- */
  function convert(opts) {
    opts = opts || {};
    var parsed = parseValue(input.value);
    if (!parsed.ok) { showError(parsed.msg); return false; }
    var v = parsed.value, from = state.from, to = state.to;

    if (belowAbsoluteZero(v, from)) {
      showError('Colder than absolute zero? Physics says no. 🧊 The lowest I can do in ' + UNITS[from].sym + ' is ' + fmt(UNITS[from].min) + '.');
      return false;
    }
    showError('');

    var c = toC(v, from);
    var out = round2(fromC(c, to));
    var inputRounded = round2(v);

    // all units at once
    ['C', 'F', 'K'].forEach(function (u) { vEls[u].textContent = fmt(round2(fromC(c, u))); });
    Array.prototype.forEach.call(allUnits.children, function (li) { li.classList.toggle('is-to', li.getAttribute('data-u') === to); });

    // poster
    var moodIndex = setMood(c, !opts.silent);
    fromLine.textContent = fmt(inputRounded) + ' ' + UNITS[from].sym + ' is';
    bigUnit.textContent = UNITS[to].sym;
    fact.textContent = factFor(c);
    countTo(out);

    var plain = fmt(inputRounded) + ' ' + UNITS[from].sym + ' = ' + fmt(out) + ' ' + UNITS[to].sym;
    srResult.textContent = plain + '. Feeling ' + MOODS[moodIndex].word + '.';
    state.last = { text: plain, out: out, outUnit: to, from: from, to: to, value: inputRounded, face: MOODS[moodIndex].face };
    copyBtn.disabled = false;

    if (!opts.silent) plink(moodIndex);
    if (opts.record !== false) addHistory(state.last);
    return true;
  }

  /* ---------- history ---------- */
  function addHistory(item) {
    var entry = { value: item.value, from: item.from, to: item.to, out: item.out, face: item.face };
    // drop an identical previous entry so the list doesn't fill with repeats
    history = history.filter(function (h) { return !(h.value === entry.value && h.from === entry.from && h.to === entry.to); });
    history.unshift(entry);
    history = history.slice(0, 8);
    renderHistory();
    store('degrees.history', JSON.stringify(history));
  }

  function renderHistory() {
    historyList.innerHTML = '';
    history.forEach(function (h) {
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button';
      b.title = 'Convert this again';
      var face = document.createElement('span'); face.className = 'face-h'; face.setAttribute('aria-hidden', 'true'); face.textContent = h.face;
      var eq = document.createElement('span'); eq.className = 'eq'; eq.textContent = fmt(h.value) + ' ' + UNITS[h.from].sym + '  →  ' + fmt(h.out) + ' ' + UNITS[h.to].sym;
      b.appendChild(face); b.appendChild(eq);
      b.addEventListener('click', function () {
        state.from = h.from; state.to = h.to; syncUnitUI();
        input.value = String(h.value);
        convert({ record: false });
      });
      li.appendChild(b);
      historyList.appendChild(li);
    });
    var has = history.length > 0;
    historyEmpty.hidden = has;
    clearBtn.hidden = !has;
  }

  function loadHistory() {
    try {
      var saved = JSON.parse(read('degrees.history') || '[]');
      if (Array.isArray(saved)) {
        history = saved.filter(function (h) {
          return h && typeof h.value === 'number' && typeof h.out === 'number' && UNITS[h.from] && UNITS[h.to] && typeof h.face === 'string';
        }).slice(0, 8);
      }
    } catch (e) { history = []; }
    renderHistory();
  }

  /* ---------- events ---------- */
  form.addEventListener('submit', function (e) { e.preventDefault(); convert(); });

  input.addEventListener('input', function () { if (errorEl.textContent) showError(''); });

  function onUnitChange(which) {
    return function (e) {
      var val = e.target.value;
      if (which === 'from') {
        if (val === state.to) state.to = state.from; // never convert a unit to itself
        state.from = val;
      } else {
        if (val === state.from) state.from = state.to;
        state.to = val;
      }
      syncUnitUI();
    };
  }
  Array.prototype.forEach.call(document.querySelectorAll('input[name="from"]'), function (r) { r.addEventListener('change', onUnitChange('from')); });
  Array.prototype.forEach.call(document.querySelectorAll('input[name="to"]'), function (r) { r.addEventListener('change', onUnitChange('to')); });

  swapBtn.addEventListener('click', function () {
    var f = state.from; state.from = state.to; state.to = f;
    syncUnitUI();
    if (state.last) { // chain: the result becomes the new input
      input.value = String(state.last.out);
      convert();
    }
  });

  Array.prototype.forEach.call(document.querySelectorAll('.chip'), function (chip) {
    chip.addEventListener('click', function () {
      state.from = 'C';
      if (state.to === 'C') state.to = 'F';
      syncUnitUI();
      input.value = chip.getAttribute('data-c');
      convert();
    });
  });

  copyBtn.addEventListener('click', function () {
    if (!state.last) return;
    var text = state.last.text;
    function done() { showToast('Copied ✨  ' + text); }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { showToast('Press Ctrl/Cmd + C to copy'); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  });

  clearBtn.addEventListener('click', function () {
    history = []; renderHistory(); store('degrees.history', '[]');
  });

  /* sound toggle */
  function applySound() {
    soundBtn.textContent = soundOn ? '🔊' : '🔇';
    soundBtn.setAttribute('aria-pressed', String(soundOn));
    soundBtn.setAttribute('aria-label', soundOn ? 'Sound on' : 'Sound off');
  }
  soundBtn.addEventListener('click', function () {
    soundOn = !soundOn; store('degrees.sound', soundOn ? '1' : '0'); applySound();
    if (soundOn) plink(2);
  });

  /* theme toggle */
  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    themeBtn.textContent = t === 'dark' ? '☀️' : '🌙';
    themeBtn.setAttribute('aria-pressed', String(t === 'dark'));
    themeBtn.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }
  themeBtn.addEventListener('click', function () {
    var t = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(t); store('degrees.theme', t);
  });

  /* ---------- weather particles: snowfall, embers, pollen ---------- */
  // Which particles each mood gets, and how dense (1 = a full screen of them).
  function weatherFx(id, c) {
    if (id === 'frozen')  return ['snow', Math.min(1.7, 1 + Math.max(0, -c) / 40)]; // colder = heavier snow
    if (id === 'chilly')  return c < 5 ? ['snow', 0.3] : ['none', 0];               // light flurries near freezing
    if (id === 'warm')    return ['mote', 0.5];                                      // floating pollen in the sun
    if (id === 'hot')     return ['mote', 1];                                        // heat-haze dust
    if (id === 'boiling') return ['ember', Math.min(1.5, 1 + Math.max(0, c - 100) / 400)]; // rising embers
    return ['none', 0];
  }

  var FX = (function () {
    var canvas = $('fx');
    if (!canvas || !canvas.getContext || reduceMotion) {
      if (canvas) canvas.style.display = 'none';
      return { set: function () {} };
    }
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0, parts = [], cfg = { kind: 'none', density: 0 }, running = false, last = 0, wind = 0;

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    window.addEventListener('resize', resize);
    resize();

    // soft round sprites, drawn once and stamped many times (cheap and blurry like real bokeh)
    function sprite(rgb) {
      var s = 48, c = document.createElement('canvas');
      c.width = c.height = s;
      var g = c.getContext('2d'), gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      gr.addColorStop(0, 'rgba(' + rgb + ',1)');
      gr.addColorStop(0.35, 'rgba(' + rgb + ',.65)');
      gr.addColorStop(1, 'rgba(' + rgb + ',0)');
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
      return c;
    }
    var SPR = { snow: sprite('255,255,255'), ember: sprite('255,140,40'), mote: sprite('255,232,150') };
    var BASE = { snow: 230, ember: 95, mote: 30 }; // particles at density 1 on a 1280×800 screen

    function target() {
      if (cfg.kind === 'none') return 0;
      var area = Math.max(0.45, Math.min(1.8, (W * H) / (1280 * 800)));
      return Math.round(BASE[cfg.kind] * cfg.density * area);
    }

    function make(kind, anywhere) {
      var p = { kind: kind, life: 0, dying: false, ph: Math.random() * 6.28, x: Math.random() * W, z: 0 };
      if (kind === 'snow') {
        var z = Math.random(); // depth: 0 far … 1 near. Near flakes are big, soft and fast.
        p.z = z;
        p.r = z < 0.55 ? 1.6 + Math.random() * 1.6 : z < 0.88 ? 3 + Math.random() * 2.5 : 6 + Math.random() * 5;
        p.a = z < 0.55 ? 0.6 : z < 0.88 ? 0.8 : 0.4;
        p.vy = 0.5 + z * 2.4 + Math.random() * 0.5;
        p.sw = 0.6 + Math.random() * 0.9;
        p.y = anywhere ? Math.random() * H : -20 - Math.random() * 60;
      } else if (kind === 'ember') {
        p.r = 1.6 + Math.random() * 3.2; p.a = 0.9; p.vy = 0.7 + Math.random() * 1.7; p.sw = 0.8 + Math.random();
        p.y = anywhere ? Math.random() * H : H + 20;
      } else {
        p.r = 1.4 + Math.random() * 2.2; p.a = 0.55; p.vy = 0.15 + Math.random() * 0.4; p.sw = 0.5 + Math.random() * 0.8;
        p.y = anywhere ? Math.random() * H : H + 10;
      }
      return p;
    }

    function tick(ts) {
      var dt = last ? Math.min(3, (ts - last) / 16.67) : 1;
      last = ts;
      wind = Math.sin(ts * 0.00025) * 0.5 + 0.1; // slow gusts
      var want = target(), alive = 0, i, p;
      for (i = 0; i < parts.length; i++) if (parts[i].kind === cfg.kind && !parts[i].dying) alive++;
      for (i = 0; i < Math.min(6, want - alive); i++) parts.push(make(cfg.kind, true));
      if (alive > want) {
        var cut = alive - want;
        for (i = 0; i < parts.length && cut > 0; i++) if (parts[i].kind === cfg.kind && !parts[i].dying) { parts[i].dying = true; cut--; }
      }

      ctx.clearRect(0, 0, W, H);
      for (i = parts.length - 1; i >= 0; i--) {
        p = parts[i];
        var keep = p.kind === cfg.kind && !p.dying;
        p.life += (keep ? 0.025 : -0.03) * dt;
        if (p.life > 1) p.life = 1;
        if (p.life <= 0 && !keep) { parts.splice(i, 1); continue; }

        if (p.kind === 'snow') {
          p.y += p.vy * dt;
          p.x += (Math.sin(ts * 0.0007 * p.sw + p.ph) * 0.45 + wind * (0.4 + p.z)) * dt;
          if (p.y > H + 20) { p.y = -20; p.x = Math.random() * W; }
          if (p.x > W + 20) p.x = -20; else if (p.x < -20) p.x = W + 20;
        } else {
          p.y -= p.vy * dt;
          p.x += Math.sin(ts * (p.kind === 'ember' ? 0.001 : 0.0006) * p.sw + p.ph) * (p.kind === 'ember' ? 0.6 : 0.35) * dt;
          if (p.y < -20) { p.y = H + 20; p.x = Math.random() * W; }
        }
        var a = p.a * Math.max(0, p.life);
        if (p.kind === 'ember') a *= 0.65 + 0.35 * Math.sin(ts * 0.01 * p.sw + p.ph * 3); // flicker
        ctx.globalAlpha = a;
        ctx.drawImage(SPR[p.kind], p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      }
      ctx.globalAlpha = 1;

      if (parts.length === 0 && cfg.kind === 'none') { running = false; last = 0; return; }
      requestAnimationFrame(tick);
    }

    return {
      set: function (kind, density) {
        cfg.kind = kind; cfg.density = density;
        if (!running) { running = true; last = 0; requestAnimationFrame(tick); }
      }
    };
  })();

  /* ---------- init ---------- */
  var savedTheme = read('degrees.theme');
  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(savedTheme || (prefersDark ? 'dark' : 'light'));
  soundOn = read('degrees.sound') !== '0';
  applySound();
  loadHistory();
  syncUnitUI();
  convert({ silent: true, record: false }); // show a live example (22 °C → °F) on load
})();
