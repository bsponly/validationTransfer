/* =========================================================
   Premium experience layer
   — scroll reveals, counters, hero particles, parallax,
     tilt cards, scroll progress, back-to-top, FAQ, fee gate
   ========================================================= */
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* =======================================================
     Injected UI : scroll progress bar + back-to-top button
     ======================================================= */
  var progress = document.createElement('div');
  progress.className = 'scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.appendChild(progress);

  var toTop = document.createElement('button');
  toTop.type = 'button';
  toTop.className = 'back-to-top';
  toTop.setAttribute('aria-label', 'Back to top');
  toTop.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>';
  document.body.appendChild(toTop);
  toTop.addEventListener('click', function () {
    try { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); }
    catch (e) { window.scrollTo(0, 0); }
  });

  /* =======================================================
     Reveal on scroll (staggered per parent)
     ======================================================= */
  var REVEAL_SEL = [
    '[data-reveal]',
    '.section-head', '.grid > *', '.split > *',
    '.facts', '.notice', '.cta-band', '.stats-band', '.ticker', '.stat',
    '.form-card', '.aside-stack > *', '.status-banner', '.confirm-box',
    '.prose > h2', '.table-wrap', '.checklist li', '.page-head .container > *',
    '.faq-item', '.fee-notice', '.confirm-gate'
  ].join(', ');

  var revealEls = qsa(REVEAL_SEL);
  var parentCount = new Map();

  revealEls.forEach(function (el) {
    var p = el.parentElement;
    var i = parentCount.get(p) || 0;
    parentCount.set(p, i + 1);
    el.style.setProperty('--d', Math.min(i, 5) * 80 + 'ms');
  });

  function show(el) { el.classList.add('is-visible'); }

  if (reduce || !('IntersectionObserver' in window)) {
    revealEls.forEach(show);
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          show(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });

    revealEls.forEach(function (el) { io.observe(el); });

    // Fast path: elements already on screen animate immediately (no flash)
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        revealEls.forEach(function (el) {
          var r = el.getBoundingClientRect();
          if (r.top < window.innerHeight * 0.95 && r.bottom > 0) {
            show(el);
            io.unobserve(el);
          }
        });
      });
    });
  }

  /* =======================================================
     Animated counters
     ======================================================= */
  function formatCount(n) { return n.toLocaleString('en-US'); }

  qsa('[data-count]').forEach(function (el) {
    var target = parseFloat(el.getAttribute('data-count'));
    if (isNaN(target)) return;

    if (reduce || !('IntersectionObserver' in window)) {
      el.textContent = formatCount(target);
      return;
    }

    var done = false;
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting || done) return;
        done = true;
        cio.disconnect();
        var start = null;
        var dur = 1500;
        function step(ts) {
          if (start === null) start = ts;
          var p = Math.min((ts - start) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = formatCount(Math.round(target * eased));
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    }, { threshold: 0.4 });
    cio.observe(el);
  });

  /* =======================================================
     Scroll : progress bar, header shrink, back-to-top, parallax
     ======================================================= */
  var header = qs('.site-header');
  var heroInner = qs('.hero-inner');
  var ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      var docH = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = 'scaleX(' + (docH > 0 ? Math.min(y / docH, 1) : 0) + ')';
      if (header) header.classList.toggle('is-scrolled', y > 12);
      toTop.classList.toggle('is-visible', y > 550);
      if (heroInner && !reduce && y < window.innerHeight) {
        heroInner.style.transform = 'translate3d(0,' + (y * 0.13).toFixed(1) + 'px,0)';
        heroInner.style.opacity = String(Math.max(1 - y / 640, 0));
      }
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* =======================================================
     Hero particles (drifting copper/green network)
     ======================================================= */
  (function heroParticles() {
    var hero = qs('.hero');
    if (!hero || reduce || window.innerWidth < 760) return;

    var canvas = document.createElement('canvas');
    canvas.className = 'hero-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    hero.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var w = 0, h = 0;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var dots = [];
    var running = true;
    var rT = null;

    function resize() {
      var r = hero.getBoundingClientRect();
      w = Math.max(r.width, 1);
      h = Math.max(r.height, 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var count = Math.min(Math.round(w / 16), 64);
      dots = [];
      for (var i = 0; i < count; i++) {
        dots.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.34,
          vy: (Math.random() - 0.5) * 0.34,
          r: Math.random() * 1.7 + 0.6
        });
      }
    }

    function loop() {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);

      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < -12) d.x = w + 12;
        if (d.x > w + 12) d.x = -12;
        if (d.y < -12) d.y = h + 12;
        if (d.y > h + 12) d.y = -12;

        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(222,161,105,0.55)';
        ctx.fill();

        for (var j = i + 1; j < dots.length; j++) {
          var e = dots[j];
          var dx = d.x - e.x;
          var dy = d.y - e.y;
          var dist = dx * dx + dy * dy;
          if (dist < 13000) {
            ctx.beginPath();
            ctx.moveTo(d.x, d.y);
            ctx.lineTo(e.x, e.y);
            ctx.strokeStyle = 'rgba(120,205,150,' + (0.16 * (1 - dist / 13000)).toFixed(3) + ')';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(loop);
    }

    resize();
    window.addEventListener('resize', function () {
      clearTimeout(rT);
      rT = setTimeout(resize, 200);
    });
    document.addEventListener('visibilitychange', function () {
      running = !document.hidden;
      if (running) loop();
    });
    loop();
  })();

  /* =======================================================
     3D tilt on cards (desktop, fine pointer only)
     ======================================================= */
  if (!reduce && finePointer) {
    qsa('.card').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform =
          'perspective(900px) rotateX(' + (-py * 4).toFixed(2) + 'deg) ' +
          'rotateY(' + (px * 5).toFixed(2) + 'deg) translateY(-6px)';
      });
      card.addEventListener('mouseleave', function () {
        card.style.transform = '';
      });
    });
  }

  /* =======================================================
     FAQ accordion
     ======================================================= */
  qsa('.faq-item').forEach(function (item) {
    var btn = qs('.faq-q', item);
    var ans = qs('.faq-a', item);
    if (!btn || !ans) return;

    btn.addEventListener('click', function () {
      var isOpen = item.classList.contains('is-open');
      var parent = item.parentElement;
      if (parent) {
        qsa('.faq-item.is-open', parent).forEach(function (other) {
          other.classList.remove('is-open');
          var a = qs('.faq-a', other);
          var b = qs('.faq-q', other);
          if (a) a.style.maxHeight = '0px';
          if (b) b.setAttribute('aria-expanded', 'false');
        });
      }
      if (!isOpen) {
        item.classList.add('is-open');
        ans.style.maxHeight = ans.scrollHeight + 'px';
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* =======================================================
     Fee gate : confirm agreement to unlock continuation
     ======================================================= */
  (function feeGate() {
    var consent = qs('#fee-consent');
    var next = qs('#fee-continue');
    if (!consent || !next) return;

    consent.addEventListener('change', function () {
      if (consent.checked) {
        next.classList.remove('is-disabled');
        next.classList.add('is-ready');
        next.setAttribute('aria-disabled', 'false');
      } else {
        next.classList.add('is-disabled');
        next.classList.remove('is-ready');
        next.setAttribute('aria-disabled', 'true');
      }
    });

    next.addEventListener('click', function () {
      if (next.classList.contains('is-disabled')) return;
      var step = qs('#gate-step');
      var success = qs('#gate-success');
      var gate = qs('#confirm-gate');
      if (step) step.hidden = true;
      if (success) success.hidden = false;
      if (gate) gate.classList.add('is-done');
      if (success && success.scrollIntoView) {
        try {
          success.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
        } catch (e) {
          success.scrollIntoView();
        }
      }
    });
  })();
})();
