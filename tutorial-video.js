/* Fullscreen AI video tutorial. Isolated hook: Teach.open + a Watch tutorial menu. */
(() => {
  'use strict';
  const SKIP_S = 60;
  const LS = 'sobot-video-taught';
  const EN = 'tutorial/sobot-tutorial.mp4';
  const HI = 'tutorial/sobot-tutorial-hi.mp4';

  function lang() { return (window.Chi && Chi.lang) || 'en'; }
  function srcFor() { return lang() === 'hi' ? HI : EN; }
  function taught() { try { return localStorage.getItem(LS) === '1'; } catch (e) { return false; } }
  function markTaught() {
    try { localStorage.setItem(LS, '1'); localStorage.setItem('sobot-taught', '1'); } catch (e) {}
  }

  let root = null, video = null, skipBtn = null, tickT = null, fallback = null, opening = false;

  function open(force, fb) {
    if (opening) return;
    if (!force && taught()) return;
    fallback = typeof fb === 'function' ? fb : null;
    show(!!force);
  }

  function show(isReplay) {
    close(false);
    opening = true;
    const el = document.createElement('div');
    el.id = 'tutvid';
    el.className = 'tutvid on';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Sobot tutorial');
    el.innerHTML = '<video id="tutvid-v" playsinline webkit-playsinline preload="auto"></video>'
      + '<div class="tutvid-bar"><button type="button" class="tutvid-skip" id="tutvid-skip" disabled>Skip in 1:00</button></div>';
    document.body.appendChild(el);
    root = el;
    video = el.querySelector('#tutvid-v');
    skipBtn = el.querySelector('#tutvid-skip');
    video.src = srcFor();
    video.addEventListener('ended', () => close(true));
    video.addEventListener('error', onError);
    skipBtn.addEventListener('click', () => { if (!skipBtn.disabled) close(true); });
    tickT = setInterval(tick, 150);
    tick();
    const tryPlay = () => video.play().catch(() => addPlay());
    if (video.readyState >= 2) tryPlay();
    else video.addEventListener('canplay', tryPlay, { once: true });
    opening = false;
  }

  function addPlay() {
    if (!root || root.querySelector('.tutvid-play')) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tutvid-play';
    b.setAttribute('aria-label', 'Play tutorial');
    b.addEventListener('click', () => { b.remove(); video.play().catch(() => {}); });
    root.appendChild(b);
  }

  function tick() {
    if (!skipBtn || !video) return;
    const elapsed = isFinite(video.currentTime) ? video.currentTime : 0;
    const left = Math.max(0, Math.ceil(SKIP_S - elapsed));
    if (left <= 0) {
      skipBtn.disabled = false;
      skipBtn.textContent = 'Skip';
    } else {
      skipBtn.disabled = true;
      const mm = String(Math.floor(left / 60));
      const ss = String(left % 60).padStart(2, '0');
      skipBtn.textContent = 'Skip in ' + mm + ':' + ss;
    }
  }

  function onError() {
    const fb = fallback;
    close(false);
    if (fb) fb();
  }

  function close(mark) {
    if (tickT) { clearInterval(tickT); tickT = null; }
    if (video) {
      try { video.pause(); video.removeAttribute('src'); video.load(); } catch (e) {}
    }
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = video = skipBtn = null;
    if (mark) markTaught();
  }

  function injectMarkMenu() {
    const mark = document.querySelector('#app .mark');
    if (!mark || mark.dataset.tutBound === '1') return;
    mark.dataset.tutBound = '1';
    mark.setAttribute('role', 'button');
    mark.setAttribute('tabindex', '0');
    mark.title = 'Menu';
    const toggle = (e) => { e.preventDefault(); e.stopPropagation(); toggleMenu(); };
    mark.addEventListener('click', toggle);
    mark.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') toggle(e); });
  }

  function toggleMenu() {
    const old = document.getElementById('tutmenu');
    if (old) { old.remove(); return; }
    const m = document.createElement('div');
    m.id = 'tutmenu';
    m.className = 'tutmenu';
    m.innerHTML = '<button type="button" id="tutmenu-watch">Watch tutorial</button>';
    document.body.appendChild(m);
    m.querySelector('#tutmenu-watch').addEventListener('click', () => { m.remove(); open(true); });
    setTimeout(() => {
      const hide = (ev) => {
        if (m.parentNode && !m.contains(ev.target) && !ev.target.closest('.mark')) m.remove();
        document.removeEventListener('click', hide);
      };
      document.addEventListener('click', hide);
    }, 0);
  }

  function injectThemeReplay() {
    const view = document.getElementById('view');
    if (!view || view.querySelector('#tut-replay')) return;
    if (!view.querySelector('[data-chi9^="theme"]')) return;
    const host = view.querySelector('.p') || view;
    const wrap = document.createElement('div');
    wrap.id = 'tut-replay';
    wrap.className = 'tut-replay';
    wrap.innerHTML = '<button type="button" class="act" id="tut-replay-btn">Watch tutorial</button>';
    host.appendChild(wrap);
    wrap.querySelector('#tut-replay-btn').addEventListener('click', () => open(true));
  }

  function boot() {
    injectMarkMenu();
    injectThemeReplay();
  }
  const obs = new MutationObserver(boot);
  if (document.body) obs.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  document.addEventListener('DOMContentLoaded', boot);
  setInterval(boot, 1500);

  window.TutorialVideo = Object.freeze({ open, close, replay: () => open(true) });
})();
