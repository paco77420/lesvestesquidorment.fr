/* Les onglets : ils se cachent quand on descend, reviennent dès qu'on remonte,
   où qu'on soit dans la page (y compris pendant le film). */
(function () {
  'use strict';
  var bar = document.querySelector('.onglets');
  if (!bar) return;
  var dernier = window.scrollY, cumul = 0, SEUIL = 12;
  function maj() {
    var y = window.scrollY, d = y - dernier;
    dernier = y;
    if (y < 40) { bar.classList.remove('cache'); cumul = 0; return; }
    if ((d > 0) !== (cumul > 0)) cumul = 0;      // changement de sens : on repart de zéro
    cumul += d;
    if (cumul > SEUIL) bar.classList.add('cache');
    else if (cumul < -SEUIL) bar.classList.remove('cache');
  }
  window.addEventListener('scroll', maj, { passive: true });
  // au clavier, l'onglet qui prend le focus fait réapparaître la barre
  bar.addEventListener('focusin', function () { bar.classList.remove('cache'); });
})();
