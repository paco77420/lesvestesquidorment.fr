/* Les Vestes qui Dorment · ouverture en fermeture éclair, puis blocs au défilement.
   La doudoune est dessinée sur un canvas plein écran, par-dessus le site :
   - premier écran de défilement : la tirette descend (taille constante) et sort par le bas ;
     au-dessus d'elle, les deux moitiés se courbent comme du tissu, puis s'écartent sur les côtés ;
   - ensuite les bords restent sur les côtés et défilent avec la page (on longe la doudoune),
     sauf pendant qu'un bloc est épinglé : là, rien ne bouge. */
(function () {
  'use strict';
  var doc = document.documentElement;
  var RM = doc.classList.contains('rm');
  var COARSE = matchMedia('(hover: none) and (pointer: coarse)').matches;
  var LERP = COARSE ? 0.3 : 0.18;
  function c01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function up(p, a, b) { return c01((p - a) / (b - a)); }
  function lisse3(t) { return t * t * (3 - 2 * t); }
  function rebond(t) { var c = 1.6; t -= 1; return 1 + (c + 1) * t * t * t + c * t * t; }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  if (window.ScrollCraft) window.ScrollCraft.mount(document.body);

  // ------------------------------------------------------------ la doudoune
  // images des moitiés : 1200 px de haut ; coutures des boudins à 288, 704 et 1120 px
  var IH = 1200, BOUCLE0 = 704, BOUCLE = 416, FIN = 1120, CENTRE = 53;   // CENTRE : marge des dents au-delà du milieu de la fermeture
  var cv = $('.rideau'), ctx = cv && cv.getContext('2d');
  var imG = new Image(), imD = new Image(), charge = 0;
  var tir = $('.tirette'), lang = $('.tirette__languette'), TIR_H = 433 * IH / 1584;
  var W, H, DPR, k, top0, BANDE, blocs = $$('.bloc');
  var dernier = '';

  function mesurer() {
    W = doc.clientWidth; H = innerHeight; DPR = Math.min(2, devicePixelRatio || 1);
    if (cv) { cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); }
    k = Math.max(H / IH, (W / 2) / 1063);
    top0 = H / 2 - IH * k / 2;
    BANDE = W < 760 ? 44 : Math.round(Math.max(30, Math.min(W * 0.11, 170)));
    doc.style.setProperty('--bande-r', BANDE + 'px');
    if (tir) tir.style.width = (433 * 606 / 1373 * IH / 1584 * k).toFixed(1) + 'px';
    dernier = '';
  }

  // ligne de texture -> ligne de l'image source (le haut de la photo, puis un boudin qui se répète)
  function src(t) { return t < FIN ? t : BOUCLE0 + ((t - FIN) % BOUCLE); }
  function reste(t) { return t < FIN ? FIN - t : BOUCLE - ((t - FIN) % BOUCLE); }

  // dessine une moitié ; dx(y) = écart de son bord intérieur au centre de l'écran
  function moitie(img, gauche, dx, decal, pas) {
    var iw = img.naturalWidth, y = 0, garde = 0;
    while (y < H && garde++ < 4000) {
      var t = (y - top0 + decal) / k; if (t < 0) t = 0;
      var hs = Math.max(0.5, Math.min(pas / k, reste(t))), sy = src(t);
      var e = dx(y + hs * k / 2), x = gauche ? W / 2 - (iw - CENTRE) * k - e : W / 2 - CENTRE * k + e;
      ctx.drawImage(img, 0, sy, iw, hs, x, y, iw * k, hs * k + 0.6);
      y += hs * k;
    }
  }

  // ombre portée le long des bords ouverts (visible seulement dans l'ouverture)
  function ombre(dx, pas) {
    ctx.save();
    if ('filter' in ctx) ctx.filter = 'blur(8px)';
    ctx.strokeStyle = 'rgba(30,16,6,.45)'; ctx.lineWidth = 16;
    [-1, 1].forEach(function (s) {
      ctx.beginPath();
      for (var y = 0; y <= H + pas; y += pas) { var x = W / 2 + s * dx(y); if (y === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.stroke();
    });
    ctx.restore();
  }

  // décalage de la doudoune = défilement de la page, moins le défilement « épinglé » des blocs
  function decalage() {
    if (RM) return scrollY;
    var epingle = 0;
    blocs.forEach(function (b) { epingle += Math.max(0, Math.min(scrollY - b.offsetTop, b.offsetHeight - H)); });
    return Math.max(0, scrollY - epingle);
  }

  function rendreDoudoune() {
    if (!ctx || charge < 2) return;
    var o = RM ? 1 : c01(scrollY / H);
    var oa = up(o, 0, 0.72), ob = lisse3(up(o, 0.62, 1));
    var off = decalage();
    var cle = o.toFixed(4) + '|' + off.toFixed(1) + '|' + W + 'x' + H;
    if (cle === dernier) return; dernier = cle;
    doc.classList.toggle('ouvert', o > 0.03);

    var tirH = TIR_H * k, y0 = Math.max(70, top0);
    var ty = y0 + (H + tirH * 1.2 - y0) * lisse3(oa);        // haut de la tirette
    var pointe = ty + tirH * 0.18;                           // pointe du V, sous la tête de la tirette
    var G = W * 0.06 + W * 0.30 * lisse3(oa);                // écart en haut de l'écran
    var DF = W / 2 - BANDE;
    function dx(y) {
      var courbe = 0;
      if (oa > 0 && y < pointe) { var u = (pointe - y) / Math.max(pointe, 1); courbe = G / 2 * Math.pow(u, 0.55); }
      return courbe + (DF - courbe) * ob;
    }

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var deforme = ob < 1;
    if (oa > 0) ombre(dx, deforme ? 6 : 60);
    moitie(imG, true, dx, off, deforme ? 3 : 4000);
    moitie(imD, false, dx, off, deforme ? 3 : 4000);

    if (tir) {
      tirY = ty; tirVisible = ty < H - 10;
      placerTirette();
      tir.style.visibility = ty > H ? 'hidden' : 'visible';
    }
  }
  // ------------------------------------------------------------ essai : la tirette attirée par la souris
  // Seule la languette pivote, autour de la fente enfilée sur le pont, comme un pendule vers le pointeur, sur un ressort amorti ; plus la souris est
  // proche, plus elle s'incline (40° au plus). Souris seulement, tant qu'elle est visible, jamais en mouvement réduit.
  var tirY = 0, tirVisible = false, angle = 0, vitesse = 0, cible = 0, pendTourne = false;
  function placerTirette() {
    tir.style.transform = 'translate(' + (W / 2).toFixed(1) + 'px,' + tirY.toFixed(1) + 'px) translateX(-50%)';
    if (lang) lang.style.transform = 'rotate(' + angle.toFixed(2) + 'deg)';
  }
  function pendule() {
    vitesse = (vitesse + (cible - angle) * 0.06) * 0.86;   // ressort souple, amorti : un léger dépassement puis repos
    angle += vitesse;
    if (Math.abs(cible - angle) < 0.02 && Math.abs(vitesse) < 0.02) { angle = cible; pendTourne = false; placerTirette(); return; }
    placerTirette(); requestAnimationFrame(pendule);
  }
  function relancer() { if (!pendTourne) { pendTourne = true; requestAnimationFrame(pendule); } }
  if (tir && !RM && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    addEventListener('pointermove', function (e) {
      if (!tirVisible) { if (cible !== 0) { cible = 0; relancer(); } return; }
      var px = W / 2, py = tirY + TIR_H * k * 650 / 1373;     // la fente de la languette, sur le pont
      var dxp = e.clientX - px, dyp = e.clientY - py;
      var dist = Math.hypot(dxp, dyp), force = Math.max(0, 1 - dist / (Math.max(W, H) * 0.75));
      var a = -Math.atan2(dxp, Math.max(dyp, 40)) * 180 / Math.PI;   // vers la souris (0° = pend droit)
      cible = Math.max(-40, Math.min(40, a)) * (0.35 + 0.65 * force);
      relancer();
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', function () { cible = 0; relancer(); });
  }

  [imG, imD].forEach(function (im) { im.onload = function () { charge++; dernier = ''; rendreDoudoune(); }; });
  imG.src = 'img/rideau-gauche.webp'; imD.src = 'img/rideau-droite.webp';

  // ------------------------------------------------------------ cadrage « cover » des plans, avec un point d'intérêt
  function cadrer(plan) {
    var zone = plan.parentNode, w = zone.clientWidth, h = zone.clientHeight;
    var fx = parseFloat(plan.getAttribute(W < 760 ? 'data-fx-tel' : 'data-fx')) || 0.5;
    var fy = parseFloat(plan.getAttribute('data-fy')) || 0.5;
    var s = Math.max(w / 1920, h / 1080), pw = 1920 * s, ph = 1080 * s;
    var x = Math.min(0, Math.max(w - pw, w / 2 - fx * pw)), y = Math.min(0, Math.max(h - ph, h / 2 - fy * ph));
    plan.style.width = pw + 'px'; plan.style.height = ph + 'px'; plan.style.left = x + 'px'; plan.style.top = y + 'px';
  }

  // ------------------------------------------------------------ bloc 1 : l'armoire
  var b1 = $('.bloc--1'), plan = b1 && $('.bloc__plan', b1);
  var fen = b1 ? { pr: $('.f-printemps', b1), ete: $('.f-ete', b1), aut: $('.f-automne', b1) } : null;
  var VET = b1 ? [['.v-doudoune', .032], ['.v-pull', .096], ['.v-velours', .16], ['.v-moutarde', .224], ['.v-polaire', .288]]
    .map(function (v) { return { el: $(v[0], b1), t: v[1] }; }) : [];
  function progresBloc(el) {
    var cs = getComputedStyle(el);
    var avant = parseFloat(cs.getPropertyValue('--avant')) || 0, defile = parseFloat(cs.getPropertyValue('--defile')) || 1.5;
    return c01((scrollY - el.offsetTop - avant * H) / (defile * H));
  }
  function rendreB1(p) {
    // d'abord la pile (premier écran), ensuite deux cycles de saisons (écran et demi), chacun finit en hiver
    var CYCLES = [[.44, .52, .60, .68], [.75, .82, .89, .955]], D = .045, o = [0, 0, 0];
    CYCLES.forEach(function (c) {
      var hiver = 1 - up(p, c[3], c[3] + D);
      for (var i = 0; i < 3; i++) o[i] = Math.max(o[i], up(p, c[i], c[i] + D) * hiver);
    });
    fen.pr.style.opacity = o[0].toFixed(3);
    fen.ete.style.opacity = o[1].toFixed(3);
    fen.aut.style.opacity = o[2].toFixed(3);
    var ph = plan.clientHeight;
    VET.forEach(function (v) {
      var t = up(p, v.t, v.t + 0.064);
      v.el.style.opacity = c01(t * 4).toFixed(3);
      v.el.style.transform = 'translateY(' + (-(1 - rebond(t)) * ph * 0.09).toFixed(1) + 'px)';
    });
    plan.style.transform = 'scale(' + (1 + 0.04 * p).toFixed(4) + ')';
  }


  // ------------------------------------------------------------ blocs 2 et 3 : un film au défilement (vidéo, ou images sur téléphone)
  var SEQ = COARSE || matchMedia('(max-width: 759px)').matches;
  function blocFilm(n, NB, dureeDefaut) {
    var bloc = $('.bloc--' + n); if (!bloc) return null;
    var plan = $('.b' + n, bloc), vid = $('.b' + n + '-video', bloc), cv = $('.b' + n + '-seq', bloc);
    var imgs = [], pret = false, lance = false, dernier = -1, l = -1, ctx;
    function lancer() {
      if (lance) return; lance = true;
      if (SEQ) {
        vid.remove(); ctx = cv.getContext('2d', { alpha: false }); var recus = 0, ordre = [];
        [8, 4, 2, 1].forEach(function (pas) { for (var i = 0; i < NB; i += pas) if (ordre.indexOf(i) < 0) ordre.push(i); });
        if (ordre.indexOf(NB - 1) < 0) ordre.splice(1, 0, NB - 1);
        ordre.forEach(function (i) {
          var im = new Image(); im.decoding = 'async';
          im.onload = function () { imgs[i] = im; if (++recus === 1) { pret = true; plan.classList.add('pret'); } };
          im.src = 'img/b' + n + '/seq/' + ('00' + i).slice(-3) + '.webp';
        });
      } else {
        cv.remove();
        var petit = Math.max(screen.width, screen.height) * (devicePixelRatio || 1) < 1800 || (navigator.connection && navigator.connection.saveData);
        fetch(vid.getAttribute(petit ? 'data-src-petit' : 'data-src')).then(function (r) { return r.blob(); }).then(function (b) {
          vid.src = URL.createObjectURL(b);
          vid.addEventListener('loadeddata', function () { pret = true; plan.classList.add('pret'); }, { once: true });
          vid.load();
        });
      }
    }
    function dessiner(i) {
      for (var d = 0; d < NB; d++) {             // image la plus proche déjà chargée
        if (imgs[i - d]) { i = i - d; break; } if (imgs[i + d]) { i = i + d; break; }
      }
      if (i === dernier || !imgs[i]) return; dernier = i; ctx.drawImage(imgs[i], 0, 0, cv.width, cv.height);
    }
    function rendre(p) {
      if (!pret) return;
      if (SEQ) dessiner(Math.round(p * (NB - 1)));
      else { var t = p * ((vid.duration || dureeDefaut) - 0.05); if (!vid.seeking && Math.abs(vid.currentTime - t) > 1 / 48) vid.currentTime = t; }
    }
    return {
      fixe: function () { vid.remove(); cv.remove(); },
      tic: function () {
        if (!lance && bloc.getBoundingClientRect().top < H * 2.5) lancer();
        var q = progresBloc(bloc);
        l = l < 0 ? q : l + (q - l) * LERP;
        if (Math.abs(q - l) < 0.0005) l = q;
        rendre(l);
      }
    };
  }
  var films = [blocFilm(2, 150, 6.25), blocFilm(3, 87, 3.625)].filter(Boolean);

  // ------------------------------------------------------------ boucle
  function toutMesurer() { mesurer(); $$('.bloc__plan').forEach(cadrer); }
  toutMesurer();
  addEventListener('resize', toutMesurer); addEventListener('load', toutMesurer);
  if (RM) {
    if (b1) rendreB1(1);
    films.forEach(function (f) { f.fixe(); });
    rendreDoudoune(); addEventListener('scroll', rendreDoudoune, { passive: true });
    return;
  }
  var l1 = -1;
  (function boucle() {
    rendreDoudoune();
    films.forEach(function (f) { f.tic(); });
    if (b1) {
      var p = progresBloc(b1);
      l1 = l1 < 0 ? p : l1 + (p - l1) * LERP;
      if (Math.abs(p - l1) < 0.0005) l1 = p;
      rendreB1(l1);
    }
    requestAnimationFrame(boucle);
  })();
})();
