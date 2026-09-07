(function (P) {
  'use strict';
  const windows = new Map(); let z = 10, active = null;
  const desktop = () => document.getElementById('workspace');
  const mobile = () => matchMedia('(max-width:700px)').matches;
  function bounds() { return { width: desktop().clientWidth, height: desktop().clientHeight - 102 }; }
  function constrain(rect) {
    const b = bounds(); const width = Math.max(280, Math.min(Number(rect.width) || 740, b.width - 24)); const height = Math.max(220, Math.min(Number(rect.height) || 530, b.height - 20));
    return { width, height, x: Math.max(12, Math.min(Number(rect.x) || 12, b.width - width - 12)), y: Math.max(10, Math.min(Number(rect.y) || 10, b.height - height)) };
  }
  function geometry(win) { const r = win.rect; Object.assign(win.el.style, { left: r.x + 'px', top: r.y + 'px', width: r.width + 'px', height: r.height + 'px' }); }
  function save() {
    const previous = P.storage.get('windows', {});
    for (const [id, win] of windows) if (!P.apps[win.app]?.private && win.app !== 'editor') previous[id] = { ...win.rect, maximized: win.maximized };
    P.storage.set('windows', previous);
  }
  function sync() {
    for (const win of windows.values()) win.el.inert = mobile() && (active !== win.id || win.minimized);
    document.querySelectorAll('.dock-button[data-app]').forEach(btn => { const w = windows.get(btn.dataset.app); btn.classList.toggle('running', Boolean(w)); btn.classList.toggle('active', Boolean(w && active === w.id && !w.minimized)); btn.setAttribute('aria-pressed', String(Boolean(w && active === w.id && !w.minimized))); });
    document.getElementById('active-app-label').textContent = active ? windows.get(active)?.title || 'Desktop' : 'Desktop';
  }
  function updateUrl(app) {
    if (!app || !P.apps[app] || P.apps[app].private || location.protocol === 'file:') return;
    try { const url = new URL(location.href); url.searchParams.set('app', app); history.replaceState({}, '', url); } catch { /* Local file preview may not support history. */ }
  }
  function focus(id, focusInput = false) {
    const win = windows.get(id); if (!win) return;
    active = id; win.minimized = false; win.el.classList.remove('minimized'); win.el.style.zIndex = ++z;
    for (const other of windows.values()) other.el.classList.toggle('focused', other === win);
    sync(); updateUrl(win.app);
    if (focusInput) (win.el.querySelector('input:not(:disabled)') || win.el).focus({ preventScroll: true });
  }
  function nextFocus() { const next = [...windows.values()].filter(w => !w.minimized).sort((a, b) => Number(b.el.style.zIndex) - Number(a.el.style.zIndex))[0]; active = null; if (next) focus(next.id); else sync(); }
  function close(id) {
    const win = windows.get(id); if (!win) return; save(); win.cleanup?.(); win.el.remove(); windows.delete(id); if (active === id) nextFocus(); sync();
    if (!windows.size && location.protocol !== 'file:') { const url = new URL(location.href); url.searchParams.delete('app'); history.replaceState({}, '', url); }
  }
  function minimize(id) { const win = windows.get(id); if (!win) return; win.minimized = true; win.el.classList.add('minimized'); nextFocus(); sync(); }
  function maximize(id) {
    const win = windows.get(id); if (!win || mobile()) return;
    win.maximized = !win.maximized; win.el.classList.toggle('maximized', win.maximized);
    const button = win.el.querySelector('.maximize'); button.innerHTML = P.icon(win.maximized ? 'copy' : 'square'); button.setAttribute('aria-label', win.maximized ? 'Restore window' : 'Maximize window'); button.title = win.maximized ? 'Restore' : 'Maximize';
    focus(id); save(); P.icons();
  }
  function wirePointer(win, target, mode) {
    target.addEventListener('pointerdown', event => {
      if (mobile() || win.maximized || event.button !== 0 || event.target.closest('button')) return;
      event.preventDefault(); focus(win.id); const start = { ...win.rect, px: event.clientX, py: event.clientY }; target.setPointerCapture(event.pointerId); document.body.classList.add('is-dragging');
      const move = e => {
        const dx = e.clientX - start.px, dy = e.clientY - start.py; const b = bounds();
        if (mode === 'move') win.rect = constrain({ ...start, x: start.x + dx, y: start.y + dy });
        else win.rect = { ...start, width: mode.includes('e') ? Math.max(340, Math.min(start.width + dx, b.width - start.x - 12)) : start.width, height: mode.includes('s') ? Math.max(250, Math.min(start.height + dy, b.height - start.y)) : start.height };
        geometry(win);
      };
      const end = () => { target.removeEventListener('pointermove', move); target.removeEventListener('pointerup', end); target.removeEventListener('pointercancel', end); document.body.classList.remove('is-dragging'); save(); };
      target.addEventListener('pointermove', move); target.addEventListener('pointerup', end); target.addEventListener('pointercancel', end);
    });
  }
  function open(app, options = {}) {
    if (app === 'analytics' && !P.auth.current) { P.notify('Private workspace', 'Sign in through the terminal to continue.', 'lock-keyhole'); return null; }
    const id = options.id || app;
    if (windows.has(id)) { focus(id, true); return windows.get(id); }
    if (!P.apps[app] && app !== 'editor') return null;
    const title = options.title || P.apps[app]?.name || 'Text viewer'; const b = bounds();
    const terminal = app === 'terminal'; const baseWidth = terminal ? 770 : app === 'portfolio' || app === 'site' ? 890 : app === 'projects' || app === 'analytics' ? 800 : 670;
    const initial = { x: b.width > 1200 ? 223 + windows.size * 27 : 113 + windows.size * 22, y: b.height > 650 ? 83 + windows.size * 20 : 35 + windows.size * 18, width: baseWidth, height: terminal ? 553 : 575 };
    const saved = P.storage.get('windows', {})[id]; const rect = constrain(saved || initial);
    const el = document.createElement('section'); el.className = `window ${terminal ? 'terminal-window' : ''}`; el.dataset.app = app; el.setAttribute('role', 'region'); el.setAttribute('aria-label', title); el.tabIndex = -1;
    el.innerHTML = `<header class="window-titlebar" tabindex="0" aria-label="${P.escape(title)} window position"><div class="window-title">${P.icon(P.apps[app]?.icon || 'file-text')}<span>${P.escape(title)}</span></div>${terminal ? '<span class="window-titlebar-center">guest@prystech: ~</span>' : ''}<div class="window-actions"><button class="window-control minimize" aria-label="Minimize window" title="Minimize">${P.icon('minus')}</button><button class="window-control maximize" aria-label="Maximize window" title="Maximize">${P.icon('square')}</button><button class="window-control close" aria-label="Close window" title="Close">${P.icon('x')}</button></div></header><div class="window-content"></div><footer class="window-status"><span><span class="status-dot"></span>${terminal ? 'bash' : 'Prystech Webview'}</span><span>${terminal ? 'UTF-8 &nbsp; / &nbsp; guest session' : 'Ready'}</span></footer><div class="resize-handle resize-e"></div><div class="resize-handle resize-s"></div><div class="resize-handle resize-se"></div>`;
    const win = { id, app, title, el, body: el.querySelector('.window-content'), rect, initial, minimized: false, maximized: false, cleanup: null };
    windows.set(id, win); document.getElementById('windows').append(el); geometry(win);
    el.addEventListener('pointerdown', () => focus(id));
    el.addEventListener('focusin', () => { if (active !== id) focus(id); });
    el.querySelector('.close').onclick = () => close(id); el.querySelector('.minimize').onclick = () => minimize(id); el.querySelector('.maximize').onclick = () => maximize(id);
    const titlebar = el.querySelector('.window-titlebar'); titlebar.addEventListener('dblclick', e => { if (!e.target.closest('button')) maximize(id); }); wirePointer(win, titlebar, 'move');
    titlebar.addEventListener('keydown', e => {
      if (e.target !== titlebar || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) || win.maximized || mobile()) return;
      e.preventDefault(); const amount = 15; const dx = e.key === 'ArrowLeft' ? -amount : e.key === 'ArrowRight' ? amount : 0; const dy = e.key === 'ArrowUp' ? -amount : e.key === 'ArrowDown' ? amount : 0;
      win.rect = constrain(e.shiftKey ? { ...win.rect, width: win.rect.width + dx, height: win.rect.height + dy } : { ...win.rect, x: win.rect.x + dx, y: win.rect.y + dy }); geometry(win); save();
    });
    for (const mode of ['e', 's', 'se']) wirePointer(win, el.querySelector('.resize-' + mode), mode);
    try { win.cleanup = P.renderApp(app, win, options) || null; }
    catch { win.body.innerHTML = `<div class="window-error">${P.icon('circle-alert')}<h3>This application could not open.</h3><p class="muted">Close the window and try again.</p></div>`; }
    if (saved?.maximized && !mobile()) maximize(id);
    focus(id, true); P.icons(); if (!P.apps[app]?.private && app !== 'editor') P.track('app_open', app); return win;
  }
  window.addEventListener('resize', () => { for (const win of windows.values()) { win.rect = constrain(win.rect); geometry(win); } sync(); });
  document.addEventListener('keydown', e => {
    if (e.altKey && e.key === 'F4' && active) { e.preventDefault(); close(active); }
    if (e.altKey && e.key === '`' && windows.size) { e.preventDefault(); const ids = [...windows.keys()]; focus(ids[(ids.indexOf(active) + 1) % ids.length], true); }
  });
  document.addEventListener('prystech:logout', () => { for (const win of [...windows.values()]) if (P.apps[win.app]?.private) close(win.id); });
  P.wm = { open, close, focus, minimize, maximize, windows, save, get active() { return active; },
    resetLayout() {
      P.storage.set('windows', {});
      for (const win of windows.values()) {
        win.rect = constrain(win.initial); win.maximized = false; win.el.classList.remove('maximized'); geometry(win);
        const control = win.el.querySelector('.maximize'); control.innerHTML = P.icon('square'); control.setAttribute('aria-label','Maximize window'); control.title = 'Maximize';
      }
      save(); P.icons();
    },
    toggle(app) { const win = windows.get(app); if (win && !win.minimized && active === app) minimize(app); else open(app); },
    showDesktop() { const visible = [...windows.values()].filter(w => !w.minimized); if (visible.length) visible.forEach(w => minimize(w.id)); else [...windows.values()].forEach(w => focus(w.id)); }
  };
})(window.Prystech);
