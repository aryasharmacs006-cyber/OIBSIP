/* The Sugar Cloud — small enhancements only.
   The page is fully usable without this file (progressive enhancement). */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- footer year ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- loader ---------- */
  var started = Date.now();
  var MIN_SHOW = reduceMotion ? 0 : 1500;
  var finished = false;

  function finishLoading() {
    if (finished) return;
    finished = true;
    var wait = Math.max(0, MIN_SHOW - (Date.now() - started));
    setTimeout(function () {
      root.classList.add('loaded');
      // let the curtain start lifting, then reveal hero content
      setTimeout(startReveals, reduceMotion ? 0 : 350);
    }, wait);
  }
  if (document.readyState === 'complete') finishLoading();
  else window.addEventListener('load', finishLoading);
  setTimeout(finishLoading, 4500); // fail-safe: never trap the visitor behind the loader

  /* ---------- scroll reveal ---------- */
  function startReveals() {
    var items = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || reduceMotion) {
      items.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- mobile nav ---------- */
  var nav = document.querySelector('.nav');
  var toggle = document.querySelector('.nav-toggle');
  if (nav && toggle) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    nav.querySelectorAll('.nav-links a').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Open menu');
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) toggle.click();
    });
  }

  /* ---------- active nav link ---------- */
  var links = {};
  document.querySelectorAll('.nav-links a[href^="#"]').forEach(function (a) {
    links[a.getAttribute('href').slice(1)] = a;
  });
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.target.id === 'home' && entry.isIntersecting) {
          Object.keys(links).forEach(function (k) { links[k].classList.remove('active'); });
          return;
        }
        var link = links[entry.target.id];
        if (!link) return;
        if (entry.isIntersecting) {
          Object.keys(links).forEach(function (k) { links[k].classList.remove('active'); });
          if (!link.classList.contains('nav-cta')) link.classList.add('active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(links).concat('home').forEach(function (id) {
      var sec = document.getElementById(id);
      if (sec) spy.observe(sec);
    });
  }

  /* ---------- image tilt ---------- */
  if (finePointer && !reduceMotion) {
    document.querySelectorAll('[data-tilt]').forEach(function (el) {
      var base = getComputedStyle(el).getPropertyValue('--rot').trim() || getComputedStyle(el).getPropertyValue('--r').trim() || '0deg';
      var MAX = 9;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transition = 'transform .08s linear, background-color .4s, box-shadow .3s';
        el.style.transform = 'perspective(800px) rotate(' + base + ') rotateX(' + (-py * MAX).toFixed(2) + 'deg) rotateY(' + (px * MAX).toFixed(2) + 'deg) translateY(-6px) scale(1.02)';
      });
      el.addEventListener('pointerleave', function () {
        el.style.transition = '';
        el.style.transform = '';
      });
    });
  }

  /* ---------- heart cursor with sparkle trail ---------- */
  if (finePointer && !reduceMotion) {
    var SVGNS = 'http://www.w3.org/2000/svg';
    var heart = document.createElement('div');
    heart.className = 'heart-cursor';
    heart.setAttribute('aria-hidden', 'true');
    heart.innerHTML =
      '<svg viewBox="0 0 32 30"><defs><linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#FFB3C8"/><stop offset="1" stop-color="#F0709A"/></linearGradient></defs>' +
      '<path d="M16 28 C6 20 2 14 2 9 C2 5 5 2 9 2 C12 2 15 4 16 7 C17 4 20 2 23 2 C27 2 30 5 30 9 C30 14 26 20 16 28 Z" ' +
      'fill="url(#hg)" stroke="#4A3338" stroke-width="2.2" stroke-linejoin="round"/>' +
      '<path d="M7.5 9 Q8 5.6 11.5 5.4" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".9"/></svg>';
    document.body.appendChild(heart);

    var COLORS = ['#F28BA8', '#7CBFE3', '#F5C84C', '#8FC79E', '#FFFFFF', '#F9C6D4'];
    var live = 0, MAX_LIVE = 70;

    function spark(x, y, spread, kind) {
      if (live >= MAX_LIVE) return;
      var isHeart = kind === 'heart';
      var size = isHeart ? 8 + Math.random() * 7 : 7 + Math.random() * 11;
      var el = document.createElementNS(SVGNS, 'svg');
      var use = document.createElementNS(SVGNS, 'use');
      use.setAttribute('href', isHeart ? '#i-heart' : '#i-sparkle');
      el.appendChild(use);
      el.setAttribute('class', 'spark');
      el.setAttribute('aria-hidden', 'true');
      var color = COLORS[Math.floor(Math.random() * COLORS.length)];
      if (color === '#FFFFFF') el.style.filter = 'drop-shadow(0 0 1.5px #4A3338) drop-shadow(0 0 3px rgba(242,139,168,.9))';
      else el.style.filter = 'drop-shadow(0 0 3px rgba(255,255,255,.9))';
      el.style.setProperty('--c', isHeart ? '#F28BA8' : color);
      el.style.setProperty('--s', size.toFixed(1) + 'px');
      el.style.setProperty('--x', (x + (Math.random() - 0.5) * spread).toFixed(1) + 'px');
      el.style.setProperty('--y', (y + (Math.random() - 0.5) * spread).toFixed(1) + 'px');
      el.style.setProperty('--dx', ((Math.random() - 0.5) * (spread * 2.2)).toFixed(0) + 'px');
      el.style.setProperty('--dy', (10 + Math.random() * (spread * 2.4)).toFixed(0) + 'px');
      el.style.setProperty('--t', (0.7 + Math.random() * 0.6).toFixed(2) + 's');
      live++;
      el.addEventListener('animationend', function () { el.remove(); live--; });
      document.body.appendChild(el);
    }

    var shown = false, lastX = 0, lastY = 0, acc = 0;
    window.addEventListener('pointermove', function (e) {
      var x = e.clientX, y = e.clientY;
      if (!shown) { shown = true; lastX = x; lastY = y; root.classList.add('has-cursor'); }
      heart.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) translate(-50%,-50%)';
      acc += Math.hypot(x - lastX, y - lastY);
      lastX = x; lastY = y;
      if (acc > 14) { // one little sparkle every ~14px of travel
        acc = 0;
        spark(x, y, 16, Math.random() < 0.28 ? 'heart' : 'star');
        if (Math.random() < 0.4) spark(x, y, 24, 'star');
      }
    }, { passive: true });

    var hoverSel = 'a, button, summary, [data-tilt]';
    document.addEventListener('pointerover', function (e) {
      if (e.target.closest && e.target.closest(hoverSel)) heart.classList.add('is-hover');
    });
    document.addEventListener('pointerout', function (e) {
      if (e.target.closest && e.target.closest(hoverSel)) heart.classList.remove('is-hover');
    });
    document.addEventListener('pointerdown', function (e) {
      heart.classList.add('is-down');
      for (var i = 0; i < 9; i++) spark(e.clientX, e.clientY, 30, i % 3 === 0 ? 'heart' : 'star'); // click burst
    });
    document.addEventListener('pointerup', function () { heart.classList.remove('is-down'); });
    document.documentElement.addEventListener('mouseleave', function () { root.classList.remove('has-cursor'); shown = false; });
  }
})();
