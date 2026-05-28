/*!
 * GILD-TECH corporate intro — Market chooser
 * Calm splash that asks the visitor to pick their market.
 * Shows ONLY on first visit. Persists choice in localStorage (key: gt_market).
 * Subsequent visits skip the splash entirely; users can switch market via the nav dropdown.
 */
(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // ────────────────────────────────────────────────────────────────────────
  // Skip conditions
  // ────────────────────────────────────────────────────────────────────────
  try {
    if (sessionStorage.getItem('gildtech_intro_played') === '1') return;
  } catch (e) {}
  try {
    if (localStorage.getItem('gt_market')) return;
  } catch (e) {}
  if (navigator.webdriver) return;
  var prefersReducedMotion = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ────────────────────────────────────────────────────────────────────────
  // Styles (corporate: anthracite + bone + champagne)
  // ────────────────────────────────────────────────────────────────────────
  var FADE_IN  = prefersReducedMotion ? 100 : 320;
  var FADE_OUT = prefersReducedMotion ? 100 : 280;

  var css = [
    '#gt-intro{',
      'position:fixed;inset:0;z-index:99999;',
      'background:#F6F4EE;',
      'display:flex;flex-direction:column;align-items:center;justify-content:center;',
      'opacity:0;transition:opacity ' + FADE_IN + 'ms ease;',
      'padding:2rem;',
      'font-family:"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;',
      'color:#0E1117;',
    '}',
    '#gt-intro.gt-show{opacity:1;}',
    '#gt-intro.gt-leaving{opacity:0;transition:opacity ' + FADE_OUT + 'ms ease;pointer-events:none;}',

    '.gt-intro-logo{',
      'display:flex;align-items:center;gap:0.7rem;',
      'margin-bottom:2.5rem;',
      'opacity:0;transform:translateY(8px);',
      'transition:opacity 500ms ease 80ms, transform 500ms ease 80ms;',
    '}',
    '#gt-intro.gt-show .gt-intro-logo{opacity:1;transform:translateY(0);}',
    '.gt-intro-logo-mark{',
      'width:36px;height:36px;border-radius:50%;',
      'border:1.5px solid #B79355;',
      'display:flex;align-items:center;justify-content:center;',
      'font-weight:800;font-size:0.85rem;letter-spacing:0.04em;',
      'color:#0E1117;background:#FBF9F3;',
    '}',
    '.gt-intro-logo-mark span{color:#B79355;}',
    '.gt-intro-logo-text{',
      'font-weight:700;font-size:0.92rem;letter-spacing:0.24em;text-transform:uppercase;color:#0E1117;',
    '}',
    '.gt-intro-logo-text span{color:#B79355;font-weight:700;}',

    '.gt-intro-heading{',
      'font-size:clamp(1.5rem, 3.4vw, 2.1rem);font-weight:800;',
      'letter-spacing:-0.015em;line-height:1.2;text-align:center;',
      'margin:0 0 0.6rem;max-width:680px;',
      'opacity:0;transform:translateY(10px);',
      'transition:opacity 500ms ease 160ms, transform 500ms ease 160ms;',
    '}',
    '#gt-intro.gt-show .gt-intro-heading{opacity:1;transform:translateY(0);}',

    '.gt-intro-sub{',
      'font-size:0.92rem;color:#6B6F76;line-height:1.55;text-align:center;',
      'max-width:560px;margin:0 0 2.4rem;font-weight:500;',
      'opacity:0;transform:translateY(10px);',
      'transition:opacity 500ms ease 220ms, transform 500ms ease 220ms;',
    '}',
    '#gt-intro.gt-show .gt-intro-sub{opacity:1;transform:translateY(0);}',

    '.gt-intro-grid{',
      'display:grid;',
      'grid-template-columns:repeat(4, minmax(0, 1fr));',
      'gap:0.9rem;width:100%;max-width:920px;',
      'opacity:0;transform:translateY(12px);',
      'transition:opacity 600ms ease 300ms, transform 600ms ease 300ms;',
    '}',
    '#gt-intro.gt-show .gt-intro-grid{opacity:1;transform:translateY(0);}',
    '@media (max-width: 1024px){',
      '.gt-intro-grid{grid-template-columns:repeat(3, 1fr);max-width:680px;}',
    '}',
    '@media (max-width: 720px){',
      '.gt-intro-grid{grid-template-columns:repeat(2, 1fr);max-width:420px;}',
    '}',

    '.gt-intro-card{',
      'background:#ffffff;border:1px solid #E2E4E7;border-radius:12px;',
      'padding:1.4rem 0.9rem 1.2rem;cursor:pointer;',
      'display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:0.45rem;',
      'transition:border-color 180ms ease, transform 180ms ease, box-shadow 180ms ease;',
      'text-decoration:none;color:inherit;',
      'min-height:140px;',
    '}',
    '.gt-intro-card:hover{',
      'border-color:#1F4D5C;transform:translateY(-2px);',
      'box-shadow:0 14px 36px -10px rgba(14,17,23,0.12);',
    '}',
    '.gt-intro-card-flag{font-size:2.3rem;line-height:1;}',
    '.gt-intro-card-name{font-size:0.93rem;font-weight:700;color:#0E1117;text-align:center;}',
    '.gt-intro-card-meta{font-size:0.7rem;color:#6B6F76;font-weight:500;letter-spacing:0.04em;text-align:center;}',

    '.gt-intro-secondary{',
      'margin-top:2rem;display:flex;align-items:center;gap:0.6rem;flex-wrap:wrap;justify-content:center;',
      'opacity:0;transition:opacity 500ms ease 380ms;',
    '}',
    '#gt-intro.gt-show .gt-intro-secondary{opacity:1;}',
    '.gt-intro-secondary-label{font-size:0.72rem;color:#6B6F76;letter-spacing:0.06em;}',
    '.gt-intro-secondary a{',
      'font-size:0.78rem;color:#6B6F76;text-decoration:none;font-weight:600;',
      'padding:0.3rem 0.55rem;border-radius:6px;border:1px solid transparent;',
      'transition:all 160ms ease;',
    '}',
    '.gt-intro-secondary a:hover{color:#1F4D5C;border-color:#E2E4E7;background:#ffffff;}',

    '.gt-intro-skip{',
      'position:absolute;top:20px;right:24px;',
      'font-size:0.7rem;color:#6B6F76;cursor:pointer;',
      'padding:6px 10px;border-radius:6px;',
      'letter-spacing:0.1em;text-transform:uppercase;font-weight:600;',
      'transition:color 160ms ease;background:transparent;border:none;font-family:inherit;',
    '}',
    '.gt-intro-skip:hover{color:#0E1117;}',
    '@media (max-width: 480px){.gt-intro-skip{top:12px;right:12px;}}',
  ].join('');

  var style = document.createElement('style');
  style.setAttribute('data-gt-intro', '1');
  style.textContent = css;
  document.head.appendChild(style);

  // ────────────────────────────────────────────────────────────────────────
  // DOM
  // ────────────────────────────────────────────────────────────────────────
  var MARKETS = [
    { code: 'ch',    flag: '🇨🇭', name: 'Suisse',         meta: 'CHF · FR',         href: '/sarah-ch.html' },
    { code: 'be-fr', flag: '🇧🇪', name: 'Belgique',       meta: 'EUR · FR',         href: '/sarah-be.html' },
    { code: 'be-nl', flag: '🇧🇪', name: 'België',         meta: 'EUR · NL',         href: '/sarah-be-nl.html' },
    { code: 'fr',    flag: '🇫🇷', name: 'France',         meta: 'EUR · FR',         href: '/sarah-fr.html' },
    { code: 'uk',    flag: '🇬🇧', name: 'United Kingdom', meta: 'GBP · EN',         href: '/sarah-uk.html' },
    { code: 'qc',    flag: '🇨🇦', name: 'Québec',         meta: 'CAD · FR',         href: '/sarah-qc.html' },
    { code: 'ko',    flag: '🇹🇭', name: 'Koh Samui',      meta: 'Thaïlande · EN',   href: '/sarah-ko.html' }
  ];

  var overlay = document.createElement('div');
  overlay.id = 'gt-intro';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Choisir votre marché');

  var skipBtn = document.createElement('button');
  skipBtn.className = 'gt-intro-skip';
  skipBtn.type = 'button';
  skipBtn.textContent = 'Passer →';
  skipBtn.setAttribute('aria-label', 'Passer la sélection de marché');
  overlay.appendChild(skipBtn);

  var logo = document.createElement('div');
  logo.className = 'gt-intro-logo';
  logo.innerHTML =
    '<div class="gt-intro-logo-mark">G<span>T</span></div>' +
    '<div class="gt-intro-logo-text">GILD <span>TECH</span></div>';
  overlay.appendChild(logo);

  var heading = document.createElement('h1');
  heading.className = 'gt-intro-heading';
  heading.textContent = 'Bonjour. Sur quel marché opérez-vous ?';
  overlay.appendChild(heading);

  var sub = document.createElement('p');
  sub.className = 'gt-intro-sub';
  sub.textContent = "Cabinet d'opérations pour agences immobilières. Choisissez votre marché pour accéder au contenu localisé : devise, vocabulaire métier, portails de votre zone.";
  overlay.appendChild(sub);

  var grid = document.createElement('div');
  grid.className = 'gt-intro-grid';
  MARKETS.forEach(function (m) {
    var card = document.createElement('a');
    card.className = 'gt-intro-card';
    card.href = m.href;
    card.setAttribute('data-market', m.code);
    card.innerHTML =
      '<div class="gt-intro-card-flag">' + m.flag + '</div>' +
      '<div class="gt-intro-card-name">' + m.name + '</div>' +
      '<div class="gt-intro-card-meta">' + m.meta + '</div>';
    card.addEventListener('click', function () {
      try { localStorage.setItem('gt_market', m.code); } catch (e) {}
      try { sessionStorage.setItem('gildtech_intro_played', '1'); } catch (e) {}
    });
    grid.appendChild(card);
  });
  overlay.appendChild(grid);

  document.body.appendChild(overlay);

  function close() {
    overlay.classList.add('gt-leaving');
    setTimeout(function () {
      try { sessionStorage.setItem('gildtech_intro_played', '1'); } catch (e) {}
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, FADE_OUT + 50);
  }

  skipBtn.addEventListener('click', close);
  document.addEventListener('keydown', function onKey(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
  });

  requestAnimationFrame(function () {
    requestAnimationFrame(function () { overlay.classList.add('gt-show'); });
  });
})();
