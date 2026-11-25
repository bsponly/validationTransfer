/* =========================================================
   Shared behaviour: mobile navigation, footer year,
   safe storage wrapper (LocalStorage with in-memory fallback)
   ========================================================= */
(function () {
  'use strict';

  /* --- Mobile navigation --- */
  var header = document.querySelector('.site-header');
  var toggle = document.querySelector('.nav-toggle');

  if (toggle && header) {
    toggle.addEventListener('click', function () {
      var open = header.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    // Close the menu when a link is chosen
    header.querySelectorAll('.site-nav a').forEach(function (link) {
      link.addEventListener('click', function () {
        header.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* --- Footer year --- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* --- Safe storage (LocalStorage may be blocked in sandboxes) --- */
  var memory = {};

  window.TVBStore = {
    get: function (key) {
      try {
        var v = window.localStorage.getItem(key);
        if (v !== null) return v;
      } catch (e) { /* blocked: fall through to memory */ }
      return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
    },
    set: function (key, value) {
      memory[key] = value;
      try {
        window.localStorage.setItem(key, value);
        return true;
      } catch (e) {
        return false;
      }
    }
  };
})();
