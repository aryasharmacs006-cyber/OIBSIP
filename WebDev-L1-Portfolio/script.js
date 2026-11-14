(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Footer year
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // Nav: solid after scroll, phone menu
  var nav = document.getElementById('nav');
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');
  function onScroll() { nav.classList.toggle('is-solid', window.scrollY > 40); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('is-open');
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        links.classList.remove('is-open');
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Reveal on scroll
  var items = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  }

  // Custom cursor: desktop mouse only, off for reduced motion
  var fine = window.matchMedia('(pointer: fine) and (hover: hover)').matches;
  if (!fine || reduce || !document.body.animate) return;

  function make(cls) { var e = document.createElement('div'); e.className = cls; return e; }
  var STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 0 L14.6 9.4 L24 12 L14.6 14.6 L12 24 L9.4 14.6 L0 12 L9.4 9.4 Z"/></svg>';

  var ring = make('cur-ring');
  var star = make('cur-star');
  star.innerHTML = STAR;
  document.body.appendChild(ring);
  document.body.appendChild(star);
  root.classList.add('has-cursor');

  var COLORS = ['#C9A24B', '#E7C97A', '#B3122E', '#F1E6D3'];
  var MAX = 32;
  var alive = 0;
  var mx = 0, my = 0, rx = 0, ry = 0, lastX = -999, lastY = -999, shown = false;

  function spark(x0, y0, x1, y1, size, dur, kind) {
    if (alive >= MAX) return;
    var p = make('cur-spark' + (kind === 'star' ? ' is-star' : ''));
    p.style.width = p.style.height = size + 'px';
    p.style.background = COLORS[Math.floor(Math.random() * COLORS.length)];
    document.body.appendChild(p);
    alive++;
    var a = p.animate([
      { transform: 'translate3d(' + (x0 - size / 2) + 'px,' + (y0 - size / 2) + 'px,0) scale(1) rotate(0deg)', opacity: 1 },
      { transform: 'translate3d(' + (x1 - size / 2) + 'px,' + (y1 - size / 2) + 'px,0) scale(.1) rotate(160deg)', opacity: 0 }
    ], { duration: dur, easing: 'cubic-bezier(.2,.7,.35,1)' });
    a.onfinish = function () { p.remove(); alive--; };
  }

  function trail(x, y) {
    var size = 3 + Math.random() * 5;
    var dx = (Math.random() - 0.5) * 22, dy = 8 + Math.random() * 24;
    spark(x + (Math.random() - 0.5) * 10, y + (Math.random() - 0.5) * 10,
          x + dx, y + dy, size, 650 + Math.random() * 250,
          Math.random() < 0.4 ? 'star' : 'dot');
  }

  window.addEventListener('mousemove', function (e) {
    mx = e.clientX; my = e.clientY;
    if (!shown) {
      shown = true; rx = mx; ry = my;
      star.style.opacity = '1'; ring.style.opacity = '1';
    }
    star.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
    var hot = !!(e.target.closest && e.target.closest('a, button, .project, .cert, .skill-list li, .stats li'));
    star.classList.toggle('is-hot', hot);
    ring.classList.toggle('is-hot', hot);
    var dx = mx - lastX, dy = my - lastY;
    if (dx * dx + dy * dy > 200) { lastX = mx; lastY = my; trail(mx, my); }
  }, { passive: true });

  // Ring follows the pointer with a slight lag
  (function loop() {
    rx += (mx - rx) * 0.18;
    ry += (my - ry) * 0.18;
    ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';
    requestAnimationFrame(loop);
  })();

  document.documentElement.addEventListener('mouseleave', function () {
    star.style.opacity = '0'; ring.style.opacity = '0';
  });
  document.documentElement.addEventListener('mouseenter', function () {
    if (shown) { star.style.opacity = '1'; ring.style.opacity = '1'; }
  });

  // Click: burst of 8 sparkles
  window.addEventListener('mousedown', function (e) {
    star.classList.add('is-press');
    var off = Math.random() * Math.PI;
    for (var i = 0; i < 8; i++) {
      var a = off + (Math.PI * 2 * i) / 8, r = 26 + Math.random() * 18;
      spark(e.clientX, e.clientY, e.clientX + Math.cos(a) * r, e.clientY + Math.sin(a) * r,
            5 + Math.random() * 4, 520 + Math.random() * 180, i % 2 ? 'star' : 'dot');
    }
  });
  window.addEventListener('mouseup', function () { star.classList.remove('is-press'); });
})();
