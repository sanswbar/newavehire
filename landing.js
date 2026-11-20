/* NEWAVE HIRE · landing.js
   Entradas escalonadas al hacer scroll y el cierre naranja que se abre al llegar.
   Si este archivo no carga, todo el contenido queda visible igual. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!('IntersectionObserver' in window) || reduce) return;

  // Contenedores que antes entraban como un solo bloque: ahora entran sus partes
  var groups = [
    ['.pain-left', '.pain-left > *', 'rise'],
    ['.pain-right', '.pain-point', 'slide'],
    ['.cert-header', '.cert-header > *', 'rise'],
    ['.cert-pillars', '.cert-pillar', 'rise'],
    ['.talent-header', '.talent-header > *', 'rise'],
    ['.talent-list', '.talent-row', 'rise'],
    ['.how-steps', '.how-step', 'rise'],
    ['.faq-header', '.faq-header > *', 'rise'],
    ['.faq-list', '.faq-item', 'rise'],
    ['.partner-inner', '.partner-inner > :not(.partner-divider)', 'rise'],
    ['.cta-field .form-head', '.cta-field .form-head > *', 'rise'],
    ['.footer', '.footer-top > *, .footer-giant', 'rise']
  ];

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

  groups.forEach(function (g) {
    document.querySelectorAll(g[0]).forEach(function (box) {
      box.removeAttribute('data-animate');
      box.querySelectorAll('[data-animate]').forEach(function (el) { el.removeAttribute('data-animate'); });
    });
    var els = document.querySelectorAll(g[1]);
    els.forEach(function (el, i) {
      // Escalonado de 70 ms dentro de cada grupo; las listas largas se reinician cada 4
      el.removeAttribute('data-animate');
      el.classList.add(g[2]);
      el.style.transitionDelay = ((i % 4) * 70) + 'ms';
      io.observe(el);
    });
  });

  // Filas de la tabla: las palomitas aparecen una por una
  var rows = document.querySelectorAll('.comparison-table tbody tr');
  var rowIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      rowIO.unobserve(e.target);
      var idx = Array.prototype.indexOf.call(rows, e.target);
      setTimeout(function () { e.target.classList.add('visible'); }, 120 * idx);
    });
  }, { threshold: 0.6 });
  rows.forEach(function (r) { rowIO.observe(r); });

  // Al llegar al final de la página, muestra lo que quede pendiente (el pie puede no cruzar el umbral)
  window.addEventListener('scroll', function () {
    if (window.innerHeight + window.scrollY < document.documentElement.scrollHeight - 8) return;
    document.querySelectorAll('.rise:not(.in), .slide:not(.in)').forEach(function (el) { el.classList.add('in'); });
  }, { passive: true });

  // Cierre naranja: entra recortado y se abre a todo lo ancho conforme sube
  var cta = document.querySelector('.cta-field');
  if (cta) {
    var ticking = false;
    var update = function () {
      ticking = false;
      var r = cta.getBoundingClientRect();
      var vh = window.innerHeight;
      // 0 cuando el borde superior toca el fondo de la pantalla, 1 cuando llega al 35%
      var p = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.65)));
      var k = 1 - p;
      var mx = Math.min(64, window.innerWidth * 0.06);
      cta.style.setProperty('--clip-x', (k * mx).toFixed(1) + 'px');
      cta.style.setProperty('--clip-y', (k * 40).toFixed(1) + 'px');
      cta.style.setProperty('--clip-r', (k * 28).toFixed(1) + 'px');
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }
})();
