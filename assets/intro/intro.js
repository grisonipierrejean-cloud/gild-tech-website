/*!
 * GILD-TECH cinema intro — 3.5s overlay
 * The chaos → Channelled → Site
 * Plays once per session (sessionStorage)
 * Click anywhere or top-right "Skip" to dismiss
 */
(function () {
  'use strict';

  // ────────────────────────────────────────────────────────────────────────
  // Guards
  // ────────────────────────────────────────────────────────────────────────
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Skip if already played this session
  try {
    if (sessionStorage.getItem('gildtech_intro_played') === '1') return;
  } catch (e) { /* sessionStorage may be blocked, continue */ }

  // Skip if user opted-out of motion (accessibility)
  // We still play but in shortened/static form
  var prefersReducedMotion = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Skip if this is a print/headless/crawler view
  if (navigator.webdriver) return;

  // ────────────────────────────────────────────────────────────────────────
  // Timings (mobile shortened)
  // ────────────────────────────────────────────────────────────────────────
  var isMobile = window.innerWidth < 768;
  var STEP1 = prefersReducedMotion ? 600 : (isMobile ? 900 : 1200);
  var CROSSFADE = prefersReducedMotion ? 200 : 500;
  var STEP2 = prefersReducedMotion ? 600 : (isMobile ? 900 : 1200);
  var FADEOUT = prefersReducedMotion ? 200 : 400;

  // ────────────────────────────────────────────────────────────────────────
  // Inject CSS
  // ────────────────────────────────────────────────────────────────────────
  var css = [
    '#gt-intro-overlay{',
      'position:fixed;inset:0;z-index:99999;',
      'background:#0a0a0a;',
      'display:flex;align-items:center;justify-content:center;',
      'opacity:1;transition:opacity 400ms ease;',
      'cursor:pointer;overflow:hidden;',
    '}',
    '#gt-intro-overlay.gt-fade-out{opacity:0;pointer-events:none;}',
    '.gt-intro-frame{',
      'position:absolute;inset:0;',
      'background-size:cover;background-position:center;',
      'opacity:0;',
      'transition:opacity 500ms ease, transform 1400ms ease;',
      'transform:scale(1.04);',
    '}',
    '.gt-intro-frame.gt-active{opacity:1;transform:scale(1);}',
    '.gt-intro-frame-1{background-image:url("/assets/intro/intro-1-chaos.png");}',
    '.gt-intro-frame-2{background-image:url("/assets/intro/intro-2-canalise.png");}',
    '.gt-intro-vignette{',
      'position:absolute;inset:0;z-index:1;pointer-events:none;',
      'background:radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%);',
    '}',
    '.gt-intro-text{',
      'position:relative;z-index:2;',
      'color:#fff;',
      'font-family:"Helvetica Neue", Helvetica, Arial, sans-serif;',
      'font-size:clamp(2rem, 7vw, 5rem);',
      'font-weight:900;',
      'letter-spacing:-0.02em;',
      'text-align:center;',
      'opacity:0;',
      'transition:opacity 400ms ease, transform 700ms ease;',
      'transform:translateY(24px);',
      'text-shadow:0 4px 30px rgba(0,0,0,0.7);',
      'position:absolute;',
    '}',
    '.gt-intro-text.gt-active{opacity:1;transform:translateY(0);}',
    '.gt-intro-text-2{color:#E91E8C;}',
    '.gt-intro-skip{',
      'position:absolute;top:24px;right:24px;z-index:3;',
      'color:rgba(255,255,255,0.65);',
      'font-family:"Helvetica Neue", Helvetica, Arial, sans-serif;',
      'font-size:12px;font-weight:500;',
      'letter-spacing:0.12em;text-transform:uppercase;',
      'cursor:pointer;',
      'padding:8px 14px;',
      'border:1px solid rgba(255,255,255,0.22);',
      'border-radius:4px;',
      'transition:all 200ms ease;',
      'user-select:none;',
    '}',
    '.gt-intro-skip:hover{color:#fff;border-color:rgba(255,255,255,0.6);background:rgba(255,255,255,0.05);}',
    '@media (max-width: 480px){',
      '.gt-intro-skip{top:16px;right:16px;font-size:11px;padding:6px 10px;}',
    '}',
  ].join('');

  var style = document.createElement('style');
  style.setAttribute('data-gt-intro', '1');
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);

  // ────────────────────────────────────────────────────────────────────────
  // Build DOM
  // ────────────────────────────────────────────────────────────────────────
  function build() {
    var overlay = document.createElement('div');
    overlay.id = 'gt-intro-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Intro animation — click to skip');
    overlay.innerHTML =
      '<div class="gt-intro-frame gt-intro-frame-1"></div>' +
      '<div class="gt-intro-frame gt-intro-frame-2"></div>' +
      '<div class="gt-intro-vignette"></div>' +
      '<div class="gt-intro-text gt-intro-text-1">The chaos.</div>' +
      '<div class="gt-intro-text gt-intro-text-2">Channelled.</div>' +
      '<button class="gt-intro-skip" type="button" aria-label="Skip intro">Skip</button>';
    document.body.appendChild(overlay);

    // Preload images so they render instantly when activated
    var img1 = new Image(); img1.src = '/assets/intro/intro-1-chaos.png';
    var img2 = new Image(); img2.src = '/assets/intro/intro-2-canalise.png';

    var frame1 = overlay.querySelector('.gt-intro-frame-1');
    var frame2 = overlay.querySelector('.gt-intro-frame-2');
    var text1 = overlay.querySelector('.gt-intro-text-1');
    var text2 = overlay.querySelector('.gt-intro-text-2');

    // Lock body scroll during intro
    var prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    var timers = [];
    var finished = false;

    function cleanup() {
      if (finished) return;
      finished = true;
      timers.forEach(function (t) { clearTimeout(t); });
      overlay.classList.add('gt-fade-out');
      setTimeout(function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        document.body.style.overflow = prevOverflow;
      }, FADEOUT);
      try { sessionStorage.setItem('gildtech_intro_played', '1'); } catch (e) {}
    }

    // Click anywhere → skip
    overlay.addEventListener('click', cleanup);
    // Escape key → skip
    var onKey = function (e) { if (e.key === 'Escape') cleanup(); };
    document.addEventListener('keydown', onKey);

    // ── Animation sequence ──
    // 1) Frame 1 + "Le chaos." in
    requestAnimationFrame(function () {
      frame1.classList.add('gt-active');
      text1.classList.add('gt-active');
    });

    // 2) After STEP1, fade out frame 1 + text 1
    timers.push(setTimeout(function () {
      frame1.classList.remove('gt-active');
      text1.classList.remove('gt-active');
    }, STEP1));

    // 3) Mid-crossfade: bring in frame 2 + text 2
    timers.push(setTimeout(function () {
      frame2.classList.add('gt-active');
      text2.classList.add('gt-active');
    }, STEP1 + Math.floor(CROSSFADE / 2)));

    // 4) Final fade out
    timers.push(setTimeout(cleanup, STEP1 + CROSSFADE + STEP2));
  }

  if (document.body) {
    build();
  } else {
    document.addEventListener('DOMContentLoaded', build, { once: true });
  }
})();
