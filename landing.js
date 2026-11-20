/* NEWAVE HIRE · landing.js
   Selector de roles, barra que se oculta al bajar, caras que se encienden y entradas al hacer scroll.
   Sin este archivo todo queda visible y los roles se muestran uno debajo de otro. */
(function () {
  var doc = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Barra superior: se oculta al bajar, vuelve al subir */
  var top = document.querySelector('.top');
  var lastY = 0;
  window.addEventListener('scroll', function () {
    var y = window.scrollY;
    if (top) top.classList.toggle('hide', y > lastY && y > 120);
    lastY = y;
  }, { passive: true });

  /* Selector de roles (pestañas accesibles con teclado) */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.role-tabs [role="tab"]'));
  function select(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      if (!panel) return;
      if (on) {
        panel.removeAttribute('data-hidden');
        panel.classList.remove('enter'); void panel.offsetWidth; panel.classList.add('enter');
      } else {
        panel.setAttribute('data-hidden', '');
      }
    });
    if (focus) tab.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { select(t, false); });
    t.addEventListener('keydown', function (e) {
      var n = null;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
      if (e.key === 'Home') n = tabs[0];
      if (e.key === 'End') n = tabs[tabs.length - 1];
      if (n) { e.preventDefault(); select(n, true); }
    });
  });

  /* Franja de caras: entrada escalonada y, cada pocos segundos, una cara toma color */
  var faces = Array.prototype.slice.call(document.querySelectorAll('.roster-face'));
  faces.forEach(function (f, i) { f.style.setProperty('--i', i); });
  if (!reduce && faces.length) {
    var last = -1;
    setInterval(function () {
      if (document.hidden) return;
      faces.forEach(function (f) { f.classList.remove('lit'); });
      var k;
      do { k = Math.floor(Math.random() * faces.length); } while (k === last && faces.length > 1);
      last = k;
      faces[k].classList.add('lit');
    }, 2600);
  }

  if (reduce || !('IntersectionObserver' in window)) return;
  doc.classList.add('anim');

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -5% 0px' });

  /* Partes de cada sección, escalonadas 70 ms dentro de su grupo */
  var groups = [
    '.names > *', '.split-light h2, .split-text, .split-foot .link', '.dark-row',
    '.cert h2, .cert .lead', '.pillar', '.roles-head > *', '.roles-body',
    '.how h2', '.step', '.paper-head > *', '.table-wrap', '.partner > *',
    '.faq-head > *', '.qa', '.close-text > *', '.close-faces', '.foot-top > *', '.foot-contact'
  ];
  groups.forEach(function (sel) {
    document.querySelectorAll(sel).forEach(function (el, i) {
      el.classList.add('rise');
      if (!el.classList.contains('pillar')) el.style.transitionDelay = ((i % 5) * 70) + 'ms';
      else el.style.transitionDelay = (i * 80) + 'ms';
      io.observe(el);
    });
  });
  var diagram = document.querySelector('.diagram');
  if (diagram) io.observe(diagram);

  /* Tabla: las palomitas aparecen fila por fila */
  var rows = document.querySelectorAll('.compare tbody tr');
  var rowIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      rowIO.unobserve(e.target);
      var idx = Array.prototype.indexOf.call(rows, e.target);
      setTimeout(function () { e.target.classList.add('pop'); }, 120 * idx);
    });
  }, { threshold: 0.6 });
  rows.forEach(function (r) { rowIO.observe(r); });
})();
