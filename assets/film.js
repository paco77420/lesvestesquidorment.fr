/* Les Vestes qui Dorment · le film au scroll.
   Un seul plan-séquence vidéo, le défilement est la tête de lecture (lissée) :
   on avance, on recule, tout se rejoue. Aucun texte dans l'animation. */
(function () {
  'use strict';
  var doc = document.documentElement;
  var RM = doc.classList.contains('rm');
  var COARSE = matchMedia('(hover: none) and (pointer: coarse)').matches;
  var LERP = COARSE ? 0.3 : 0.16;
  function c01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function $(s) { return document.querySelector(s); }

  var film = $('.film'), scene = $('.film__scene'), video = $('.film__video'), fond = $('.film__fond');

  // ------------------------------------------------------- rail fermeture éclair
  var zip = $('.zip'), tir = $('.zip__tirette');
  var MAXY = 1, RAILH = 1;
  function mesurerRail() { MAXY = Math.max(1, doc.scrollHeight - innerHeight); RAILH = zip.clientHeight || innerHeight; }
  function rendreRail() {
    var f = c01(scrollY / MAXY);
    zip.style.setProperty('--y', (12 + (RAILH - 24) * f).toFixed(1) + 'px');
    tir.setAttribute('aria-valuenow', Math.round(f * 100));
    var debut = !RM && scrollY < innerHeight * 0.5;
    zip.classList.toggle('est-la', !debut);
    film.classList.toggle('parti', scrollY > innerHeight * 0.3);
  }
  var prise = null;
  tir.addEventListener('pointerdown', function (e) { prise = e.clientY - tir.getBoundingClientRect().top - 14; tir.setPointerCapture(e.pointerId); tir.classList.add('tenue'); e.preventDefault(); });
  tir.addEventListener('pointermove', function (e) { if (prise === null) return; scrollTo(0, c01((e.clientY - prise - 12) / (RAILH - 24)) * MAXY); });
  function lacher() { prise = null; tir.classList.remove('tenue'); }
  tir.addEventListener('pointerup', lacher); tir.addEventListener('pointercancel', lacher);
  tir.addEventListener('keydown', function (e) {
    var m = { ArrowDown: .03, ArrowRight: .03, ArrowUp: -.03, ArrowLeft: -.03 }[e.key], y = null;
    if (m) y = scrollY + m * MAXY;
    if (e.key === 'PageDown') y = scrollY + innerHeight * .9;
    if (e.key === 'PageUp') y = scrollY - innerHeight * .9;
    if (e.key === 'Home') y = 0; if (e.key === 'End') y = MAXY;
    if (y === null) return; e.preventDefault(); scrollTo(0, Math.max(0, Math.min(MAXY, y)));
  });
  var profil = $('#f-profil');
  Array.prototype.forEach.call(document.querySelectorAll('[data-profil]'), function (a) { a.addEventListener('click', function () { profil.value = a.getAttribute('data-profil'); }); });

  if (RM) { mesurerRail(); rendreRail(); addEventListener('scroll', rendreRail, { passive: true }); addEventListener('resize', mesurerRail); return; }

  // ------------------------------------------------------- chargement du film
  var petit = COARSE || Math.max(screen.width, screen.height) * (devicePixelRatio || 1) < 1600 ||
              (navigator.connection && navigator.connection.saveData);
  // écran en hauteur (téléphone) : le film vertical 9:16 ; sinon le 16:9
  var portrait = matchMedia('(orientation: portrait)').matches;
  if (portrait) film.classList.add('vertical');
  var pret = false;
  var SEQ = portrait;   // téléphone : film en images, dessiné sur un canvas
  var NB = 647, FPS = 24, imgs = new Array(NB), seq = null, sctx = null, dernierDessin = -1;

  if (SEQ) {
    // ---- téléphone : 647 images légères, chargées par passes (1 sur 8, puis 1 sur 4, 1 sur 2, toutes)
    film.classList.add('seq');
    seq = document.createElement('canvas'); seq.className = 'film__seq'; seq.setAttribute('aria-hidden', 'true');
    scene.insertBefore(seq, video); video.remove();
    sctx = seq.getContext('2d', { alpha: false });
    var base = 'video/seq/';
    var ordre = [], vu = {};
    [8, 4, 2, 1].forEach(function (pas) { for (var i = 0; i < NB; i += pas) if (!vu[i]) { vu[i] = 1; ordre.push(i); } });
    if (!vu[NB - 1]) ordre.splice(1, 0, NB - 1);
    var k = 0, enCours = 0, MAX = 6, charges = 0;
    function suivant() {
      while (enCours < MAX && k < ordre.length) {
        (function (i) {
          var im = new Image(); im.decoding = 'async'; enCours++;
          im.onload = function () {
            enCours--; charges++;
            var fin = function () { imgs[i] = im; if (!pret && imgs[0] && charges >= 24) { pret = true; film.classList.add('pret'); } dernierDessin = -1; suivant(); };
            if (im.decode) im.decode().then(fin, fin); else fin();
          };
          im.onerror = function () { enCours--; suivant(); };
          im.src = base + String(i).padStart(3, '0') + '.webp';
        })(ordre[k++]);
      }
    }
    suivant();
    var tailleCanvas = function () {
      var r = Math.min(devicePixelRatio || 1, 2);
      seq.width = Math.round(scene.clientWidth * r); seq.height = Math.round(scene.clientHeight * r); dernierDessin = -1;
    };
    tailleCanvas(); addEventListener('resize', tailleCanvas);
  } else {
    var src = video.getAttribute(petit ? 'data-src-720' : 'data-src-1080');
    // la vidéo entière en mémoire : le déplacement dans le temps est alors instantané
    fetch(src).then(function (r) { return r.blob(); }).then(function (b) {
      video.src = URL.createObjectURL(b);
      video.addEventListener('loadeddata', function () { pret = true; film.classList.add('pret'); }, { once: true });
      video.load();
    }).catch(function () { video.src = src; video.addEventListener('loadeddata', function () { pret = true; film.classList.add('pret'); }, { once: true }); });
  }

  function dessiner(i) {
    // l'image demandée, ou la plus proche déjà chargée
    var j = i;
    if (!imgs[j]) { for (var d = 1; d < NB; d++) { if (imgs[i - d]) { j = i - d; break; } if (imgs[i + d]) { j = i + d; break; } } }
    var im = imgs[j]; if (!im || j === dernierDessin) return;
    dernierDessin = j;
    var cw = seq.width, ch = seq.height, s = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
    var w = im.naturalWidth * s, h = im.naturalHeight * s;
    sctx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h);
  }

  // ------------------------------------------------------- géométrie de l'image
  var bulles = Array.prototype.map.call(document.querySelectorAll('.bulle'), function (el) {
    return { el: el, de: +el.dataset.de, a: +el.dataset.a };
  });
  function rendreBulles(t) {
    bulles.forEach(function (b) { b.el.classList.toggle('est-la', t >= b.de && t <= b.a); });
  }
  var ctx = fond && fond.getContext('2d'), dernierFond = -1;
  function peindreFond() {
    if (!ctx || !pret || fond.offsetParent === null) return;
    if (Math.abs(video.currentTime - dernierFond) < 0.08) return;
    dernierFond = video.currentTime;
    try { ctx.drawImage(video, 0, 0, fond.width, fond.height); } catch (e) {}
  }

  // ------------------------------------------------------- boucle
  var api = window.ScrollCraft.mount(document.body);
  var acte = api.acts.filter(function (a) { return a.el === film; })[0];
  mesurerRail();
  addEventListener('resize', mesurerRail); addEventListener('load', mesurerRail);
  var lisse = 0, cur = 0, premier = true;
  (function boucle() {
    var cible = acte ? acte.p : 0, d = cible - lisse;
    if (premier || Math.abs(d) > 0.00002) { lisse = premier || Math.abs(d) < 0.0001 ? cible : lisse + d * LERP; premier = false; }
    if (pret && SEQ) {
      cur += (lisse - cur) * 0.5;
      var idx = Math.round(cur * (NB - 1));
      dessiner(idx);
      rendreBulles(idx / FPS);
    } else if (pret) {
      var D = video.duration || 27;
      cur += (lisse - cur) * 0.35;
      var t = cur * (D - 0.04);
      if (!video.seeking && Math.abs(video.currentTime - t) > 1 / 60) video.currentTime = t;
      peindreFond();
      rendreBulles(video.currentTime);
    }
    rendreRail();
    requestAnimationFrame(boucle);
  })();
})();
