/* ============================================================
   SITE MANGO — main.js
   Vanilla JS: native scroll + scroll-linked effects, cursor,
   orbital gallery, magnetic/tilt physics, reveals,
   Google Sheets form.
   ============================================================ */
(() => {
  'use strict';

  const DEG = Math.PI / 180;
  const TILT = 25; // orbit tilt in degrees
  const finePointer = window.matchMedia('(pointer:fine)').matches;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

  /* ---------------- utilities ---------------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const onScroll = () => window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;

  /* ============================================================
     SCROLL STATE  (native — reliable everywhere)
     Smooth-feeling motion is achieved with scroll-linked
     effects and CSS `scroll-behavior`, not a fragile fixed layer.
     ============================================================ */
  let scrollY = onScroll();
  let lastScrollY = scrollY;
  let scrollDelta = 0;

  window.addEventListener('scroll', () => {
    scrollY = onScroll();
    scrollDelta = scrollY - lastScrollY;
    lastScrollY = scrollY;
  }, { passive: true });

  /* ============================================================
     CINEMATIC LOADER — a 5s luxury title sequence.
     The wordmark is CONSTRUCTED from geometric line fragments:
       idle → a 1px line cuts the darkness → the line scatters into
       blueprint fragments → fragments assemble into SITE MANGO →
       fine-tuning (guides slide away) → camera passes through.
     Runs once per session.
     ============================================================ */
  const preloader = $('#preloader');

  /* geometric alphabet: each glyph = line segments [x1,y1,x2,y2] */
  const GLYPH = {
    S:[[6,26,42,26],[42,26,42,52],[42,52,6,52],[6,52,6,78],[6,78,42,78]],
    I:[[8,20,36,20],[22,20,22,96],[8,96,36,96]],
    T:[[6,22,46,22],[26,22,26,96]],
    E:[[40,22,6,22],[6,22,6,96],[6,96,40,96],[6,58,32,58]],
    M:[[6,20,6,96],[6,20,26,50],[26,50,46,96],[46,96,46,20]],
    A:[[6,96,26,20],[26,20,46,96],[14,70,38,70]],
    N:[[6,20,6,96],[6,20,46,96],[46,96,46,20]],
    G:[[40,20,6,20],[6,20,6,96],[6,96,40,96],[40,96,40,58],[40,58,24,58]],
    O:[[6,20,40,20],[40,20,40,96],[40,96,6,96],[6,96,6,20]]
  };
  const ADV = { S:50, I:48, T:56, E:50, M:54, A:54, N:54, G:54, O:48 };

  function buildSegments() {
    const build = $('#ldBuild');
    if (!build) return [];
    const segs = [];
    let ox = 10;
    'SITE'.split('').forEach((ch) => { segs.push(...GLYPH[ch].map((s) => ({ x1: s[0] + ox, y1: s[1], x2: s[2] + ox, y2: s[3] }))); ox += ADV[ch]; });
    ox += 60; // inter-word gap
    'MANGO'.split('').forEach((ch) => { segs.push(...GLYPH[ch].map((s) => ({ x1: s[0] + ox, y1: s[1], x2: s[2] + ox, y2: s[3] }))); ox += ADV[ch]; });
    const W = build.clientWidth || 900;
    const scale = (W * 0.94) / ox;
    const oy = 100 - 58 * scale;
    const cx0 = (W - ox * scale) / 2;
    return segs.map((s, i) => {
      const el = document.createElement('span');
      el.className = 'ld-seg';
      const len = Math.hypot((s.x2 - s.x1) * scale, (s.y2 - s.y1) * scale);
      const ang = Math.atan2(s.y2 - s.y1, s.x2 - s.x1) * 180 / Math.PI;
      const px = (s.x1 + s.x2) / 2 * scale + cx0;
      const py = (s.y1 + s.y2) / 2 * scale + oy;
      el.style.width = Math.max(len, 1) + 'px';
      const fin = 'translate(' + (px - len / 2).toFixed(1) + 'px,' + py.toFixed(1) + 'px) rotate(' + ang.toFixed(2) + 'deg)';
      // scattered blueprint position (structured, not random)
      const col = (i % 9) - 4, row = Math.floor(i / 9) - 1;
      const sx = px + col * 70 + (i % 3) * 12;
      const sy = py + row * 60 + ((i * 7) % 5) * 8;
      const sc = 'translate(' + (sx - len / 2).toFixed(1) + 'px,' + sy.toFixed(1) + 'px) rotate(' + (ang + (i % 2 ? -24 : 22)).toFixed(2) + 'deg)';
      el._final = fin; el._scatter = sc;
      el.style.transform = sc; el.style.opacity = '0.55';
      build.appendChild(el);
      return el;
    });
  }

  function runPreloader() {
    if (!preloader) return;
    document.body.classList.add('preloading');
    if (reduced) { preloader.remove(); document.body.classList.remove('preloading'); return; }
    const el = preloader;
    if (el._plStarted) return;
    el._plStarted = true;

    const segs = buildSegments();
    const phases = ['ph-cut', 'ph-frag', 'ph-build', 'ph-fine', 'ph-pass'];
    const T = { cut: 0.8, frag: 1.8, build: 2.8, fine: 3.8, pass: 4.8, end: 5.05 };
    const t0 = performance.now();
    let lastPhase = -1, running = true;

    function finish() {
      document.body.classList.remove('preloading');
      el.classList.add('done');
      setTimeout(() => { if (el.parentNode) el.remove(); }, 1000);
    }

    function frame(now) {
      if (!running) return;
      const t = (now - t0) / 1000;
      /* phase */
      const ph = t >= T.pass ? 'ph-pass' : t >= T.fine ? 'ph-fine' : t >= T.build ? 'ph-build' : t >= T.frag ? 'ph-frag' : t >= T.cut ? 'ph-cut' : '';
      if (ph !== lastPhase) {
        phases.forEach((p) => el.classList.remove(p));
        if (ph) el.classList.add(ph);
        lastPhase = ph;
        if (ph === 'ph-build') {
          segs.forEach((s) => { s.style.transition = 'transform 1.15s cubic-bezier(.16,1.1,.3,1), opacity .8s ease'; s.style.transform = s._final; s.style.opacity = '1'; });
        }
      }
      if (t >= T.end) { finish(); running = false; return; }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ============================================================
     THEME SWITCH  (light / dark)  — persisted in localStorage.
     The sun/moon switch is checked = night (dark theme).
     ============================================================ */
  const themeSwitch = $('.theme-switch__checkbox');
  const rootEl = document.documentElement;
  function applyTheme(saved) {
    const theme = saved || 'dark';
    rootEl.setAttribute('data-theme', theme);
    if (themeSwitch) themeSwitch.checked = (theme === 'dark');
  }
  applyTheme((() => { try { return localStorage.getItem('sitemango-theme'); } catch (e) { return null; } })() || 'dark');
  if (themeSwitch) {
    themeSwitch.addEventListener('change', () => {
      const next = themeSwitch.checked ? 'dark' : 'light';
      rootEl.setAttribute('data-theme', next);
      try { localStorage.setItem('sitemango-theme', next); } catch (e) {}
    });
  }

  /* ============================================================
     CURSOR  — dot + ring + morphing label
     ============================================================ */
  const cursorEl = $('#cursor');
  const cursorDot = $('.cursor-dot', cursorEl);
  const cursorTrail = $('.cursor-trail', cursorEl);
  const cursorRing = $('.cursor-ring', cursorEl);
  const cursorLabel = $('#cursorLabel');
  const WORDLIST = ['BUILD','EXPLORE','SCROLL','VIEW','CREATE','OPEN','HELLO','DESIGN','MOVE','CLICK'];
  const CONTEXT = { label: null, hover: false };

  let mx = -100, my = -100;      // exact pointer
  let rx = -100, ry = -100;      // smoothed ring
  let tx = -100, ty = -100;      // trailing dot
  let labelWord = 0;

  if (finePointer && !reduced) {
    document.body.classList.add('cursor-on');
    document.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });

    // contextual labels
    document.addEventListener('mouseover', (e) => {
      const t = e.target.closest('[data-cursor]');
      if (t) { CONTEXT.label = t.getAttribute('data-cursor'); cursorEl.classList.add('is-label'); }
      const h = e.target.closest('a, button, .btn, .process-item, .service, [data-cursor]');
      cursorEl.classList.toggle('is-hover', !!h);
    });
    document.addEventListener('mouseout', (e) => {
      const t = e.target.closest('[data-cursor]');
      if (t) { CONTEXT.label = null; cursorEl.classList.remove('is-label'); }
      const h = e.target.closest('a, button, .btn, .process-item, .service, [data-cursor]');
      if (!h) cursorEl.classList.remove('is-hover');
    });

    setInterval(() => {
      if (!CONTEXT.label) { labelWord = (labelWord + 1) % WORDLIST.length; cursorLabel.textContent = WORDLIST[labelWord]; }
    }, 2600);

    (function cursorLoop() {
      if (CONTEXT.label) cursorLabel.textContent = CONTEXT.label;
      cursorDot.style.transform = `translate3d(${mx}px,${my}px,0)`;
      rx = lerp(rx, mx, 0.2); ry = lerp(ry, my, 0.2);
      cursorRing.style.transform = `translate3d(${rx}px,${ry}px,0)`;
      tx = lerp(tx, mx, 0.10); ty = lerp(ty, my, 0.10); // liquid trail lags more
      if (cursorTrail) cursorTrail.style.transform = `translate3d(${tx}px,${ty}px,0)`;
      requestAnimationFrame(cursorLoop);
    })();

    // click shockwave — ring bursts outward on press
    document.addEventListener('pointerdown', () => cursorEl.classList.add('is-click'));
    document.addEventListener('pointerup', () => cursorEl.classList.remove('is-click'));
    document.addEventListener('pointerleave', () => cursorEl.classList.remove('is-click'));
  }

  /* ============================================================
     TECH KEYWORDS  (random monospace chips rising near cursor)
     ============================================================ */
  const techEl = $('#techKeywords');
  if (techEl && finePointer && !reduced) {
    const TECH = ['RENDER','NODE.JS','WEBGL','AI.CORE','V8','TS','REACT','OPTIMIZE','GPU','KERNEL','CI/CD','D3','WASM','SSG','CDN','API','GRAPHQL','LATENCY','FPS','PIXEL'];
    const UNITS = ['ms','hz','fps','kb','req/s','cores','%','v','rpm'];
    let lastSpawn = 0;
    setInterval(() => {
      const now = performance.now();
      if (now - lastSpawn < 320) return; // throttle
      lastSpawn = now;
      // spawn a burst of 1-2 chips
      const count = Math.random() < 0.4 ? 2 : 1;
      for (let k = 0; k < count; k++) {
        const chip = document.createElement('span');
        chip.className = 'tech-keyword';
        const word = TECH[(Math.random() * TECH.length) | 0];
        const unit = UNITS[(Math.random() * UNITS.length) | 0];
        const val = (Math.random() * 100).toFixed(Math.random() < 0.5 ? 0 : 1);
        chip.innerHTML = word + ' <span>' + val + unit + '</span>';
        // spawn near current pointer, with random offset
        const ox = (Math.random() * 140 - 70);
        const oy = (Math.random() * 60 - 20);
        const x = clamp(mx + ox, 24, window.innerWidth - 24);
        const y = clamp(my + oy, 40, window.innerHeight - 40);
        chip.style.left = x + 'px';
        chip.style.top = y + 'px';
        techEl.appendChild(chip);
        requestAnimationFrame(() => chip.classList.add('rise'));
        setTimeout(() => { if (chip.parentNode) chip.remove(); }, 1500);
      }
    }, 1900);
  }

  /* ============================================================
     PROGRESS + NAV SHRINK + HERO PARALLAX / 3D TILT + VELOCITY
     Cached doc height (avoids reading scrollHeight each frame).
     Writes are skipped when nothing changed.
     ============================================================ */
  const progressBar = $('#progress span');
  const nav = $('#nav');
  const heroTitle = $('#top .hero-title');
  const statusFill = $('#statusFill');
  const statusReadout = $('#statusReadout');
  let docH = document.documentElement.scrollHeight;
  let lastP = -1, lastScrolled = null, lastHeroT = null;
  let velSm = 0, lastVel = -1;

  // normalized cursor for hero 3D tilt
  let nx = 0, ny = 0, heroTiltX = 0, heroTiltY = 0;

  function measureDoc() {
    docH = document.documentElement.scrollHeight;
    lastP = -1; lastScrolled = null; lastHeroT = null;
  }

  function updateChrome() {
    const vh = window.innerHeight;
    const denom = docH - vh;
    const p = denom > 0 ? clamp(scrollY / denom, 0, 1) : 0;
    if (p !== lastP) {
      progressBar.style.width = (p * 100) + '%';
      lastP = p;
    }
    const scrolled = scrollY > 30;
    if (scrolled !== lastScrolled) {
      nav.classList.toggle('scrolled', scrolled);
      lastScrolled = scrolled;
    }
    // scroll velocity meter
    velSm = lerp(velSm, clamp(Math.abs(scrollDelta), 0, 60), 0.18);
    const vv = Math.round(velSm);
    if (vv !== lastVel) {
      if (statusFill) statusFill.style.width = clamp(velSm / 45, 0, 1) * 100 + '%';
      if (statusReadout) statusReadout.textContent = String(vv).padStart(2, '0');
      lastVel = vv;
    }
    // hero: combine scroll parallax + mouse 3D tilt (desktop)
    if (heroTitle && !reduced) {
      heroTiltX = lerp(heroTiltX, nx, 0.12);
      heroTiltY = lerp(heroTiltY, ny, 0.12);
      const t = `translate3d(${(heroTiltX * 14).toFixed(2)}px,${(scrollY * 0.14).toFixed(2)}px,0) rotateX(${(-heroTiltY * 6).toFixed(2)}deg) rotateY(${(heroTiltX * 8).toFixed(2)}deg)`;
      if (t !== lastHeroT) { heroTitle.style.transform = t; lastHeroT = t; }
    }
  }

  /* ============================================================
     SPOTLIGHT + GRID REVEAL + HERO TILT  (mouse-driven)
     ============================================================ */
  const spotlight = $('.bg-spotlight');
  const gridReveal = $('.bg-gridreveal');
  if (finePointer) {
    document.addEventListener('mousemove', (e) => {
      spotlight.style.setProperty('--mx', e.clientX + 'px');
      spotlight.style.setProperty('--my', e.clientY + 'px');
      gridReveal.style.setProperty('--gx', e.clientX + 'px');
      gridReveal.style.setProperty('--gy', e.clientY + 'px');
      nx = (e.clientX / window.innerWidth - 0.5) * 2;
      ny = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  /* ============================================================
     HERO CLOCK
     ============================================================ */
  const clock = $('#heroClock');
  function tickClock() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    if (clock) clock.textContent = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }
  tickClock(); setInterval(tickClock, 1000);

  /* ============================================================
     TYPEWRITER  (hero — WE BUILD ____)
     ============================================================ */
  const typeEl = $('#typewriter');
  if (typeEl) {
    const words = (() => { try { return JSON.parse(typeEl.dataset.words || '[]'); } catch (e) { return []; } })();
    if (words.length) {
      let w = 0, char = 0, deleting = false;
      (function type() {
        const word = words[w];
        typeEl.textContent = word.slice(0, char);
        let delay = deleting ? 45 : 80;
        if (!deleting && char === word.length) { delay = 2000; deleting = true; }
        else if (deleting && char === 0) { deleting = false; w = (w + 1) % words.length; delay = 350; }
        else char += deleting ? -1 : 1;
        setTimeout(type, delay);
      })();
    }
  }

  /* ============================================================
     ANIMATED COUNTERS  (0 → target on reveal)
     ============================================================ */
  function animateCount(el) {
    const target = parseInt(el.dataset.count, 10) || 0;
    const pad = parseInt(el.dataset.pad, 10) || 0;
    const dur = 1600;
    const start = performance.now();
    function step(now) {
      const t = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 4); // easeOutQuart
      const val = Math.round(target * eased);
      el.textContent = String(val).padStart(pad, '0');
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = String(target).padStart(pad, '0');
    }
    requestAnimationFrame(step);
  }
  const counterObserver = ('IntersectionObserver' in window)
    ? new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            animateCount(en.target);
            counterObserver.unobserve(en.target);
          }
        });
      }, { threshold: 0.6 })
    : null;
  $$('[data-count]').forEach((el) => { if (counterObserver) counterObserver.observe(el); else animateCount(el); });

  /* ============================================================
     REVEALS  — IntersectionObserver + scroll fallback
     ============================================================ */
  const revealEls = $$('[data-reveal]');
  const revealObserver = ('IntersectionObserver' in window)
    ? new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            const i = Array.prototype.indexOf.call(en.target.parentNode.children, en.target);
            en.target.style.transitionDelay = (clamp(i, 0, 6) * 90) + 'ms';
            en.target.classList.add('in');
            revealObserver.unobserve(en.target);
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' })
    : null;

  if (revealObserver) revealEls.forEach((el) => revealObserver.observe(el));

  // Fallback: if IO is unavailable or an element slipped through, reveal
  // anything that is already at/above the fold on scroll (belt & suspenders).
  function revealFallback() {
    const vh = window.innerHeight;
    revealEls.forEach((el) => {
      if (el.classList.contains('in')) return;
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.9) el.classList.add('in');
    });
  }
  window.addEventListener('scroll', revealFallback, { passive: true });
  window.addEventListener('load', revealFallback);

  /* ============================================================
     HEADING REVEAL  (clean, reliable word-by-word stagger)
     Each .section-title word is wrapped so the text stays intact
     while animating in — never garbled, always correct.
     ============================================================ */
  const titleEls = $$('.section-title');
  if (titleEls.length && !reduced) {
    function wrapWords(el) {
      // remember em styling: wrap each text node's words, keep <em>
      const walker = document.createTreeWalker(el, 4 /* SHOW_TEXT */);
      const tns = [];
      let n;
      while ((n = walker.nextNode())) tns.push(n);
      tns.forEach((tn) => {
        const frag = document.createDocumentFragment();
        tn.textContent.split(/(\s+)/).forEach((token) => {
          if (!token) return;
          if (/^\s+$/.test(token)) { frag.appendChild(document.createTextNode(token)); return; }
          const w = document.createElement('span');
          w.className = 'title-word';
          w.textContent = token;
          frag.appendChild(w);
        });
        tn.replaceWith(frag);
      });
    }
    titleEls.forEach((el) => { el.classList.add('titles-split'); wrapWords(el); });
    // stagger index for the reveal
    titleEls.forEach((el) => {
      $$('.title-word', el).forEach((w, i) => w.style.setProperty('--wi', i));
    });
  }

  /* ============================================================
     MAGNETIC ELEMENTS
     ============================================================ */
  $$('.btn, .to-top, .orbit-detail .close, .nav-burger').forEach((el) => {
    const strength = 0.32;
    el.addEventListener('mousemove', (e) => {
      if (!finePointer || reduced) return;
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) * strength;
      const dy = (e.clientY - (r.top + r.height / 2)) * strength;
      el.style.transform = `translate3d(${dx}px,${dy}px,0)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transition = 'transform .6s cubic-bezier(.34,1.56,.64,1)';
      el.style.transform = 'translate3d(0,0,0)';
      setTimeout(() => { el.style.transition = ''; }, 600);
    });
  });

  /* ============================================================
     RIPPLE  (tactile tap feedback on glass buttons)
     ============================================================ */
  $$('.btn').forEach((btn) => {
    btn.addEventListener('pointerdown', (e) => {
      if (reduced) return;
      const r = btn.getBoundingClientRect();
      const d = Math.max(r.width, r.height);
      const rip = document.createElement('span');
      rip.className = 'ripple';
      rip.style.width = rip.style.height = d + 'px';
      rip.style.left = (e.clientX - r.left - d / 2) + 'px';
      rip.style.top = (e.clientY - r.top - d / 2) + 'px';
      btn.appendChild(rip);
      setTimeout(() => { if (rip.parentNode) rip.remove(); }, 750);
    });
  });

  /* ============================================================
     SERVICE CARD TILT  (mouse) + finger-follow light (touch)
     ============================================================ */
  $$('.service').forEach((card) => {
    const track = (x, y) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', clamp((x - r.left) / r.width * 100, 0, 100) + '%');
      card.style.setProperty('--my', clamp((y - r.top) / r.height * 100, 0, 100) + '%');
    };
    card.addEventListener('mousemove', (e) => { if (finePointer) track(e.clientX, e.clientY); });
    // glass reflection follows the finger while dragging
    card.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      if (t) { track(t.clientX, t.clientY); card.classList.add('interacting'); }
    }, { passive: true });
    card.addEventListener('touchend', () => card.classList.remove('interacting'), { passive: true });
    card.addEventListener('touchcancel', () => card.classList.remove('interacting'), { passive: true });
  });

  /* ============================================================
     NAVIGATION / MOBILE MENU / ANCHOR SCROLL
     ============================================================ */
  const burger = $('#navBurger');
  const menu = $('#menu');
  function setMenu(open) {
    menu.classList.toggle('open', open);
    burger.classList.toggle('open', open);
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
  }
  burger.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  $$('#menu a').forEach((a, i) => {
    a.style.setProperty('--i', i);
    a.addEventListener('click', () => setMenu(false));
  });

  function scrollToY(y, behavior = 'smooth') {
    try { window.scrollTo({ top: Math.max(0, y), behavior: reduced ? 'auto' : behavior }); }
    catch (e) { window.scrollTo(0, Math.max(0, y)); }
  }
  function goTo(selector, offset = 0) {
    const el = $(selector);
    if (!el) return;
    const y = onScroll() + el.getBoundingClientRect().top - offset;
    scrollToY(y);
  }

  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      e.preventDefault();
      if (href === '#top') { scrollToY(0); return; }
      goTo(href);
    });
  });

  /* ============================================================
     PROJECT DATA
     ============================================================ */
  const MKS = ['mk1','mk2','mk3','mk4','mk5','mk6'];
  const GH = 'https://kartik111111111111111.github.io';
  const PROJECTS = [
    { name:'Aurelius', category:'Luxury Watches', year:'2026', url: GH + '/aurelius/',
      desc:'A quiet exhibition of sapphire, steel, leather, and patience — a private presentation experience for a Swiss watch house, with a material study and an heirloom configurator.',
      highlights:['Configurator','Material study','Editorial gallery','Private presentation'],
      tags:['Luxury Watches','Editorial','Configurator'] },
    { name:'North Studio', category:'Creative Agency', year:'2026', url: GH + '/northstudio/',
      desc:'A living creative workspace where ideas become systems — a typography-led studio site with a mouse-driven grid, process chapters, and an archive of work.',
      highlights:['Mouse-driven grid','Process chapters','Work archive','Studio team'],
      tags:['Creative Agency','Typography','Motion'] },
    { name:'Casa Forma', category:'Architecture & Interiors', year:'2025', url: GH + '/casaforma/',
      desc:'A practice of patience — architecture and interiors for a life lived slowly. Photography, whitespace, and light moving the way the client had not yet imagined.',
      highlights:['Room stories','Material palette','Light studies','Commission'],
      tags:['Architecture','Editorial','Light'] },
    { name:'Ember Coffee', category:'Café & Roastery', year:'2025', url: GH + '/coffee/',
      desc:'Wood-fired since 2019 — a small-batch roastery told through first-crack rituals, traceable beans, and a twelve-seat tasting counter.',
      highlights:['Roastery story','Signature drinks','Traceable collection','Reservations'],
      tags:['Café','Storytelling','Roastery'] },
    { name:'Drift Motors', category:'Automotive', year:'2026', url: GH + '/driftmotors/',
      desc:'A sculpture revealed through light — a flagship electric vehicle shown as a system boot, with material studies and a press-and-hold configurator.',
      highlights:['System boot','Material studies','Performance','Configurator'],
      tags:['Automotive','Cinematic','Configurator'] }
  ].map((p, i) => ({ ...p, mk: MKS[i % MKS.length] }));

  /* ============================================================
     ORBITAL GALLERY
     ============================================================ */
  const stage = $('.orbit-stage');
  const tiltEl = $('.orbit-tilt');
  const track = $('#orbitTrack');
  const hint = $('#orbitHint');
  const N = PROJECTS.length;
  const STEP = 360 / N;

  const orbit = {
    angle: 0, vel: 0, auto: 3.4,
    drag: false, lastX: 0, lastT: 0, moved: 0,
    focusTarget: null, focusedIndex: -1,
    R: 0, mx: 0, my: 0
  };

  const items = PROJECTS.map((p, i) => {
    const el = document.createElement('div');
    el.className = 'orbit-item';
    el.innerHTML = `
      <div class="orbit-card">
        <div class="browser ${p.mk}">
          <div class="browser-bar">
            <div class="browser-dots"><i></i><i></i><i></i></div>
            <div class="browser-url">${p.url}</div>
            <div style="width:22px"></div>
          </div>
          <div class="browser-body">
            <div class="mini">
              <div class="mini-top"><span>${p.category}</span><span>${p.year}</span></div>
              <div class="mini-word">${p.name}</div>
              <div class="mini-bars"><i></i><i></i><i></i></div>
            </div>
            <span class="mini-num">${String(i + 1).padStart(2, '0')}</span>
          </div>
        </div>
        <div class="orbit-meta"><span>${p.category}</span><b>${p.year}</b><span>LIVE</span></div>
        <a class="orbit-visit" href="${p.url}" target="_blank" rel="noopener" data-cursor="VISIT">
          <span>OPEN SAMPLE</span><span class="orbit-visit-arrow">↗</span>
        </a>
      </div>`;
    const card = $('.orbit-card', el);
    const browser = $('.browser', el);
    el.addEventListener('mouseenter', () => { if (finePointer) hint.textContent = 'CLICK TO FOCUS'; });
    el.addEventListener('mouseleave', () => { if (finePointer) hint.textContent = 'DRAG TO STEER · SCROLL TO SPEED'; });
    track.appendChild(el);
    return { p, el, card, browser, i, base: i * STEP, lastBlur: -1 };
  });

  function resizeOrbit() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const small = vw < 768;
    const w = Math.min(vw * (small ? 0.5 : 0.62), vh * (small ? 0.5 : 0.55), small ? 330 : 700);
    orbit.R = Math.max(small ? 150 : 230, w);
  }
  resizeOrbit();

  // Touch-specific affordances
  if (isTouch) {
    if (hint) hint.textContent = 'SWIPE TO ROTATE · TAP TO FOCUS';
    // tactile press on project cards
    items.forEach((it) => {
      const press = () => it.browser.classList.add('pressed');
      const release = () => it.browser.classList.remove('pressed');
      it.el.addEventListener('touchstart', press, { passive: true });
      it.el.addEventListener('touchend', release, { passive: true });
      it.el.addEventListener('touchcancel', release, { passive: true });
    });
  }

  /* pointer interaction */
  stage.addEventListener('pointerdown', (e) => {
    orbit.drag = true; orbit.lastX = e.clientX; orbit.lastT = performance.now(); orbit.moved = 0;
    try { stage.setPointerCapture(e.pointerId); } catch (err) {}
  });
  stage.addEventListener('pointermove', (e) => {
    if (!orbit.drag) return;
    const dx = e.clientX - orbit.lastX;
    const dt = (performance.now() - orbit.lastT) / 1000 || 0.016;
    orbit.moved += Math.abs(dx);
    orbit.angle += dx * 0.16;
    if (dt > 0) orbit.vel = clamp(dx / dt * 2.4, -26, 26);
    orbit.lastX = e.clientX; orbit.lastT = performance.now();
    orbit.focusTarget = null;
  });
  stage.addEventListener('pointerup', (e) => {
    orbit.drag = false;
    if (orbit.moved < 8) {
      const st = stage.getBoundingClientRect();
      const px = e.clientX - st.left - st.width / 2;
      const py = e.clientY - st.top - st.height / 2;
      let best = 0, bd = Infinity;
      items.forEach((it) => {
        const rad = ((orbit.angle + it.base) * DEG);
        const sx = Math.sin(rad) * orbit.R;
        const sy = -Math.sin(TILT * DEG) * (Math.cos(rad) * orbit.R);
        const d = (sx - px) ** 2 + (sy - py) ** 2;
        if (d < bd) { bd = d; best = it.i; }
      });
      // Desktop: tap opens directly. Touch: first tap focuses, tap again opens.
      if (isTouch) {
        if (orbit.focusedIndex === best) { openDetail(best); }
        else { alignItem(best); }
      } else {
        alignItem(best); openDetail(best);
      }
    }
  });

  function alignItem(i) {
    const eff = orbit.angle + items[i].base;
    const targetEff = Math.round(eff / 360) * 360;
    orbit.focusTarget = targetEff - items[i].base;
    orbit.focusedIndex = i;
  }

  // Scrolling feeds momentum into the orbit (as well as drag + auto drift).
  window.addEventListener('scroll', () => {
    orbit.vel = clamp(orbit.vel + clamp(scrollDelta, -6, 6) * 3, -30, 30);
  }, { passive: true });

  /* hover bend — only tracked while the pointer is over the stage,
     and only applied a short while after movement (perf: no work idle) */
  let bendActive = false;
  let bendT = 0;
  stage.addEventListener('mouseenter', () => { bendActive = true; });
  stage.addEventListener('mouseleave', () => { bendActive = false; });
  stage.addEventListener('mousemove', (e) => {
    const st = stage.getBoundingClientRect();
    orbit.mx = e.clientX - st.left - st.width / 2;
    orbit.my = e.clientY - st.top - st.height / 2;
    bendT = performance.now();
  });

  function applyBend() {
    if (!bendActive) return;
    // only while the cursor has recently moved
    if (performance.now() - bendT > 240) return;
    const thresh = orbit.R * 0.62;
    items.forEach((it) => {
      const rad = ((orbit.angle + it.base) * DEG);
      const sx = Math.sin(rad) * orbit.R;
      const sy = -Math.sin(TILT * DEG) * (Math.cos(rad) * orbit.R);
      const d = Math.hypot(sx - orbit.mx, sy - orbit.my);
      if (d < thresh) {
        const k = (1 - d / thresh);
        it.el.classList.add('bent');
        it.browser.style.transition = 'transform .3s cubic-bezier(.34,1.56,.64,1)';
        it.browser.style.transform = `rotateY(${(sx - orbit.mx) * k * 0.03}deg) rotateX(${-(sy - orbit.my) * k * 0.03}deg) scale(1.02)`;
      } else {
        if (it.el.classList.contains('bent')) {
          it.el.classList.remove('bent');
          it.browser.style.transition = 'transform .5s cubic-bezier(.16,1,.3,1)';
          it.browser.style.transform = '';
        }
      }
    });
  }

  function orbitLoop(dt) {
    if (orbit.focusTarget != null) {
      const diff = ((orbit.focusTarget - orbit.angle + 540) % 360) - 180;
      orbit.angle += diff * clamp(dt * 6, 0, 0.2);
      orbit.vel = lerp(orbit.vel, 0, dt * 3);
      if (Math.abs(diff) < 0.4) orbit.focusTarget = null;
    } else {
      orbit.angle += (orbit.auto + orbit.vel) * dt;
      orbit.vel = lerp(orbit.vel, 0, dt * 1.8);
    }

    // hefty-but-minimal motion blur driven by angular speed.
    // Quantized + cached so the filter is only written when it changes.
    const speed = Math.abs(orbit.vel) + (orbit.drag ? 8 : 0);
    const blur = reduced ? 0 : clamp(speed * 0.36, 0, 11);

    items.forEach((it) => {
      const effDeg = orbit.angle + it.base;
      const rad = effDeg * DEG;
      const x = Math.sin(rad) * orbit.R;
      const z = Math.cos(rad) * orbit.R;
      const cosv = Math.cos(rad);
      const scale = 0.72 + 0.34 * (0.5 + 0.5 * cosv);
      const opacity = 0.42 + 0.58 * (0.5 + 0.5 * cosv);
      // depth-aware blur: faster-moving side cards blur more
      const side = 1 - Math.abs(cosv); // 0 front, ~1 sides
      const itemBlur = Math.round(blur * (0.25 + 0.75 * side));
      if (itemBlur !== it.lastBlur) {
        it.lastBlur = itemBlur;
        it.el.style.filter = itemBlur > 0 ? `blur(${itemBlur}px)` : '';
      }
      it.el.style.transform = `translate(-50%,-50%) translate3d(${x}px,0,${z}px) scale(${scale})`;
      it.el.style.zIndex = Math.round(z) + 100;
      it.el.style.opacity = opacity;
      it.card.style.transform = `rotateY(${(-effDeg).toFixed(2)}deg)`;
      // highlight the focused project (only toggle when changed)
      const act = orbit.focusedIndex === it.i;
      if (act !== it.active) { it.el.classList.toggle('active', act); it.active = act; }
    });

    if (finePointer && !reduced) applyBend();
  }

  /* ============================================================
     PROJECT DETAIL PANEL
     ============================================================ */
  const detail = document.createElement('div');
  detail.className = 'orbit-detail';
  const detailBackdrop = document.createElement('div');
  detailBackdrop.className = 'detail-backdrop';
  document.body.appendChild(detailBackdrop);
  document.body.appendChild(detail);

  function openDetail(i) {
    const p = PROJECTS[i];
    detail.innerHTML = `
      <button class="close" aria-label="Close" data-cursor="CLOSE">✕</button>
      <div class="detail-index">0${i + 1}</div>
      <div class="big">${p.name}</div>
      <div class="role">${p.category}</div>
      <p class="desc">${p.desc}</p>
      <a class="detail-preview" href="${p.url}" target="_blank" rel="noopener" data-cursor="VISIT" aria-label="Open ${p.name}">
        <span class="detail-preview-bar">
          <span class="detail-preview-dot"></span><span class="detail-preview-url">${p.url.replace('https://','')}</span>
          <span class="detail-preview-open">OPEN ↗</span>
        </span>
        <span class="detail-preview-frame">
          <span class="detail-preview-title">${p.name}</span>
          <span class="detail-preview-cta">VISIT THE LIVE SITE <span>↗</span></span>
        </span>
      </a>
      <div class="detail-hl">
        ${p.highlights.map((h, k) => `<span>0${k + 1} — ${h}</span>`).join('')}
      </div>
      <div class="detail-meta">
        <span>Year — ${p.year}</span>
        <span>Tags — ${p.tags.join(' · ')}</span>
      </div>`;
    detail.classList.add('open');
    detailBackdrop.classList.add('show');
    const close = $('.close', detail);
    close.addEventListener('click', (e) => { e.stopPropagation(); closeDetail(); });
  }
  function closeDetail() {
    detail.classList.remove('open');
    detailBackdrop.classList.remove('show');
    orbit.focusedIndex = -1;
  }
  detail.addEventListener('click', (e) => { if (e.target === detail) closeDetail(); });
  detailBackdrop.addEventListener('click', closeDetail);

  /* ============================================================
     PARALLAX DEPTH  — process numbers + orbit tilt respond to scroll
     (adds the 3D parallax sense described in the immersion guide)
     ============================================================ */
  const pxNums = $$('.process-item .process-num').map((el) => ({ el, top: 0, last: null, speed: 0.30 }));
  const pxIdxs = $$('.section-index').map((el) => ({ el, top: 0, last: null, speed: 0.14 }));
  const pxGuides = $('.orbit-guidelines');
  const orbitTiltEl = $('.orbit-tilt');
  let workTop = 0, workH = 0, lastOrbitTilt = null, lastGuideT = null;

  function measureParallax() {
    pxNums.forEach((o) => { o.top = o.el.getBoundingClientRect().top + onScroll(); });
    pxIdxs.forEach((o) => { o.top = o.el.getBoundingClientRect().top + onScroll(); });
    const workEl = $('#work');
    if (workEl) { const r = workEl.getBoundingClientRect(); workTop = r.top + onScroll(); workH = r.height; }
  }
  function updateParallax() {
    if (reduced) return;
    const mid = scrollY + window.innerHeight * 0.5;
    // big ghost process numbers drift past at a different rate
    pxNums.forEach((o) => {
      const ty = clamp((o.top - mid) * o.speed, -90, 90);
      const s = 'translate3d(0,' + ty.toFixed(1) + 'px,0)';
      if (s !== o.last) { o.el.style.transform = s; o.last = s; }
    });
    // section-index labels drift more subtly for layered depth
    pxIdxs.forEach((o) => {
      const ty = clamp((o.top - mid) * o.speed, -24, 24);
      const s = 'translate3d(' + (ty * 0.4).toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0)';
      if (s !== o.last) { o.el.style.transform = s; o.last = s; }
    });
    // orbit tilts with scroll for added 3D depth
    if (orbitTiltEl && orbitVisible) {
      const oMid = workTop + workH / 2;
      const adj = clamp((oMid - mid) * 0.0022, -5, 5);
      const t = 'rotateX(' + (TILT + adj).toFixed(2) + 'deg)';
      if (t !== lastOrbitTilt) { orbitTiltEl.style.transform = t; lastOrbitTilt = t; }
    }
    // orbit guide-lines drift slowly opposite to scroll
    if (pxGuides) {
      const g = clamp((workTop - mid) * 0.06, -40, 40);
      const s = 'translate3d(0,' + g.toFixed(1) + 'px,0)';
      if (s !== lastGuideT) { pxGuides.style.transform = s; lastGuideT = s; }
    }
  }

  /* ============================================================
     MAIN rAF LOOP  (orbit + chrome)
     Pauses the orbit when scrolled far out of view (perf/battery).
     ============================================================ */
  let orbitVisible = true;
  const orbitSection = $('#work');
  if ('IntersectionObserver' in window && orbitSection) {
    new IntersectionObserver((en) => {
      en.forEach((e) => { orbitVisible = e.isIntersecting; });
    }, { rootMargin: '25% 0px' }).observe(orbitSection);
  }

  let last = performance.now();
  let running = true;
  document.addEventListener('visibilitychange', () => { running = !document.hidden; });
  function loop(now) {
    if (running) {
      const dt = clamp((now - last) / 1000, 0, 0.05);
      last = now;
      updateChrome();
      updateParallax();
      if (orbitVisible) orbitLoop(dt); else orbit.angle += orbit.auto * dt;
    }
    requestAnimationFrame(loop);
  }

  /* ============================================================
     GOOGLE SHEETS FORM
     ============================================================ */
  const form = $('#contactForm');
  const formStatus = $('#formStatus');

  // ⬇ Replace with your Apps Script Web App URL (see GOOGLE_SHEETS.md)
  const SHEETS_URL = '';

  function validate() {
    let ok = true;
    $$('.field', form).forEach((f) => f.classList.remove('error'));
    const name = $('#name'), email = $('#email'), budget = $('#budget'), message = $('#message');
    if (!name.value.trim()) { fieldError(name, true); ok = false; }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
    if (!email.value.trim() || !emailOk) { fieldError(email, true); ok = false; }
    const budgetVal = Number(budget.value);
    if (!budget.value.trim() || isNaN(budgetVal) || budgetVal < 0) { fieldError(budget, true); ok = false; }
    if (message.value.trim().length < 3) { fieldError(message, true); ok = false; }
    return ok;
  }
  function fieldError(input, isErr) {
    const f = input.closest('.field');
    f.classList.toggle('error', isErr);
    if (isErr) input.focus();
  }
  ['name','email','budget','message'].forEach((id) => {
    $('#' + id).addEventListener('input', () => { $('#' + id).closest('.field').classList.remove('error'); });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) { formStatus.textContent = 'Please complete the highlighted fields.'; formStatus.className = 'form-status err'; return; }

    const payload = {
      name: $('#name').value.trim(),
      email: $('#email').value.trim(),
      budget: $('#budget').value,
      message: $('#message').value.trim(),
      submittedAt: new Date().toISOString()
    };

    const submitBtn = $('.btn--submit', form);
    const original = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="btn-text">Sending…</span>';
    submitBtn.disabled = true;
    formStatus.className = 'form-status';
    formStatus.textContent = '';

    try {
      if (!SHEETS_URL) {
        await new Promise((r) => setTimeout(r, 900));
        console.log('[Site Mango] Form payload (backend not configured):', payload);
        formStatus.textContent = 'Backend not configured — payload logged to console.';
        formStatus.className = 'form-status err';
      } else {
        await fetch(SHEETS_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });
        formStatus.textContent = 'Received. We’ll be in touch within one working day.';
        formStatus.className = 'form-status ok';
        form.reset();
      }
    } catch (err) {
      formStatus.textContent = 'Something went wrong sending your message. Please try again.';
      formStatus.className = 'form-status err';
      console.error(err);
    } finally {
      submitBtn.innerHTML = original;
      submitBtn.disabled = false;
    }
  });

  /* ============================================================
     SCROLL-SPY SECTION MAP
     ============================================================ */
  const sitemap = $('#sitemap');
  const sections = $$('section[id]');
  if (sitemap && sections.length && 'IntersectionObserver' in window) {
    const spy = new IntersectionObserver((en) => {
      en.forEach((e) => {
        const link = sitemap.querySelector(`[data-sec="${e.target.id}"]`);
        if (link) link.classList.toggle('active', e.isIntersecting);
      });
    }, { rootMargin: '-40% 0px -50% 0px' });
    sections.forEach((s) => spy.observe(s));
  }

  /* ============================================================
     COMMAND PALETTE  (Ctrl/Cmd + K)
     ============================================================ */
  const palette = $('#palette');
  const paletteInput = $('#paletteInput');
  const paletteList = $('#paletteList');
  let palOpen = false, palIndex = 0, palItems = [];

  function paletteItems() {
    const secs = [
      { label: 'Top', hint: 'goto', go: () => scrollToY(0) },
      { label: 'Work', hint: 'goto', go: () => goTo('#work') },
      { label: 'Process', hint: 'goto', go: () => goTo('#process') },
      { label: 'Services', hint: 'goto', go: () => goTo('#services') },
      { label: 'About', hint: 'goto', go: () => goTo('#about') },
      { label: 'Contact', hint: 'goto', go: () => goTo('#contact') }
    ].map((s) => ({ ...s, search: s.label.toLowerCase() }));
    const projs = PROJECTS.map((p, i) => ({
      label: p.name, hint: 'project', search: p.name.toLowerCase() + ' ' + p.category.toLowerCase(),
      go: () => { scrollToY(Math.max(0, (onScroll() + $('#work').getBoundingClientRect().top))); setTimeout(() => { alignItem(i); openDetail(i); }, 500); }
    }));
    return [
      ...secs,
      { label: 'Back to top', hint: 'action', search: 'top back scroll', go: () => scrollToY(0) },
      { label: 'Copy email', hint: 'action', search: 'email contact mail hello', go: () => { try { navigator.clipboard.writeText('hello@sitemango.studio'); } catch (e) {} toast('Email copied'); } }
    ].concat(projs);
  }

  function renderPalette(query) {
    const q = (query || '').trim().toLowerCase();
    const items = q ? paletteItems().filter((i) => i.search.includes(q)) : paletteItems();
    palItems = items;
    palIndex = 0;
    paletteList.innerHTML = items.map((it, i) =>
      `<li class="palette-item${i === 0 ? ' active' : ''}" data-i="${i}" data-cursor="OPEN">
         <span class="p-label">${it.label}<small>${it.category || ''}</small></span>
         <span class="p-hint">${it.hint}<span class="p-arrow">→</span></span>
       </li>`).join('') || '<li class="palette-item"><span class="p-label" style="color:var(--text-3)">No results</span></li>';
    const lis = $$('.palette-item', paletteList);
    lis.forEach((li) => li.addEventListener('mouseenter', () => { palIndex = +li.dataset.i; setPalActive(); }));
    lis.forEach((li) => li.addEventListener('click', () => { runPalette(+li.dataset.i); }));
  }
  function setPalActive() {
    $$('.palette-item', paletteList).forEach((li, i) => li.classList.toggle('active', i === palIndex));
    const act = $('.palette-item.active', paletteList);
    if (act) act.scrollIntoView({ block: 'nearest' });
  }
  function runPalette(i) {
    const it = palItems[i];
    if (it && it.go) { closePalette(); it.go(); }
  }
  function openPalette() {
    palOpen = true; palette.classList.add('open'); palette.setAttribute('aria-hidden', 'false');
    renderPalette('');
    setTimeout(() => paletteInput.focus(), 60);
  }
  function closePalette() {
    palOpen = false; palette.classList.remove('open'); palette.setAttribute('aria-hidden', 'true');
    paletteInput.value = '';
  }
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); palOpen ? closePalette() : openPalette(); return; }
    if (!palOpen) return;
    if (e.key === 'Escape') { closePalette(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); palIndex = (palIndex + 1) % palItems.length; setPalActive(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); palIndex = (palIndex - 1 + palItems.length) % palItems.length; setPalActive(); }
    else if (e.key === 'Enter') { e.preventDefault(); runPalette(palIndex); }
  });
  if (palette) palette.addEventListener('pointerdown', (e) => { if (e.target === palette) closePalette(); });
  if (paletteInput) paletteInput.addEventListener('input', () => renderPalette(paletteInput.value));

  // Numeric keyboard shortcuts jump to sections (1-6)
  document.addEventListener('keydown', (e) => {
    if (palOpen) return;
    if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
    if (e.altKey || e.metaKey || e.ctrlKey) return;
    const map = { '1': '#top', '2': '#work', '3': '#process', '4': '#services', '5': '#about', '6': '#contact' };
    if (map[e.key]) goTo(map[e.key]);
  });

  /* minimal toast for feedback (e.g. "Email copied") */
  let toastEl = null;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; document.body.appendChild(toastEl); }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => toastEl.classList.remove('show'), 1800);
  }

  /* open a URL in a new tab directly within the user-gesture handler */
  function openExternal(url) {
    window.open(url, '_blank');
  }

  /* ============================================================
     RANDOM WORK  — spins the orbit + opens a random sample in a new tab
     ============================================================ */
  const randomBtn = $('#randomWork');
  if (randomBtn) {
    randomBtn.addEventListener('click', (e) => {
      if (!PROJECTS.length) return;
      const ri = (Math.random() * PROJECTS.length) | 0;
      // dramatic spin: throw the orbit fast (heavy motion blur) and
      // spring-align the chosen card to the front
      orbit.focusTarget = null;
      orbit.vel = (Math.random() < 0.5 ? -1 : 1) * (36 + Math.random() * 28);
      alignItem(ri);
      // open the random sample in a new tab (within this user gesture)
      openExternal(PROJECTS[ri].url);
      if (typeof toast === 'function') toast('Opening ' + PROJECTS[ri].name);
    });
  }

  /* ============================================================
     INIT
     ============================================================ */
  function init() {
    measureDoc();
    measureParallax();
    updateChrome();
    resizeOrbit();
    runPreloader();
    requestAnimationFrame(loop);
  }

  window.addEventListener('load', init);
  let rT;
  window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(() => { measureDoc(); measureParallax(); resizeOrbit(); }, 200); });

  $('#toTop').addEventListener('click', () => { scrollToY(0); });

  if (document.readyState !== 'loading') init();
})();
