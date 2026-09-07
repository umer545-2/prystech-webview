(function (P) {
  'use strict';
  const publicApps = ['terminal','portfolio','projects','about','contact','site','files','readme'];
  const $ = selector => document.querySelector(selector);
  let bootTimer = null, bootSkip = null;
  P.setTheme = function (theme) { if (!['purple','midnight','light'].includes(theme)) theme = 'purple'; document.documentElement.dataset.theme = theme; P.storage.set('theme', theme); };
  P.setTheme(P.storage.get('theme', 'purple'));
  document.documentElement.classList.toggle('reduce-motion', P.storage.get('reduced-motion', false));
  document.documentElement.style.setProperty('--wallpaper-opacity', P.storage.get('wallpaper', true) ? '1' : '0');
  function appButton(id, location) {
    return location === 'desktop' ? `<button class="desktop-shortcut" data-app="${id}" aria-label="Open ${P.apps[id].name}" title="${P.apps[id].name}">${P.appIcon(id)}<span class="shortcut-label">${P.apps[id].name}</span></button>` : `<button class="dock-button" data-app="${id}" data-tooltip="${P.apps[id].name}" aria-label="${P.apps[id].name}" aria-pressed="false">${P.appIcon(id)}</button>`;
  }
  $('#desktop-icons').innerHTML = publicApps.map(id => appButton(id, 'desktop')).join('');
  $('#dock').innerHTML = ['terminal','files','portfolio','projects','about','contact','site'].map(id => appButton(id, 'dock')).join('') + `<span class="dock-divider"></span><button class="dock-button show-desktop" data-tooltip="Show desktop" aria-label="Show desktop">${P.icon('layout-grid')}</button>`;
  $('#dock').querySelectorAll('[data-app]').forEach(btn => btn.onclick = () => { hideMenus(); P.wm.toggle(btn.dataset.app); });
  $('.show-desktop').onclick = () => { hideMenus(); P.wm.showDesktop(); };
  const iconPositions = P.storage.get('icon-positions', {});
  document.querySelectorAll('.desktop-shortcut').forEach(btn => {
    const saved = iconPositions[btn.dataset.app];
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y) && !matchMedia('(max-width:700px)').matches) { btn.style.transform = `translate(${saved.x}px,${saved.y}px)`; btn.dataset.dx = saved.x; btn.dataset.dy = saved.y; }
    let moved = false;
    btn.addEventListener('click', e => { if (moved) return; document.querySelectorAll('.desktop-shortcut').forEach(b => b.classList.toggle('selected', b === btn)); if (e.detail === 0 || e.pointerType === 'touch' || matchMedia('(max-width:700px)').matches) P.wm.open(btn.dataset.app); });
    btn.addEventListener('dblclick', () => { if (!moved) P.wm.open(btn.dataset.app); });
    btn.addEventListener('pointerdown', e => {
      moved = false;
      if (e.button !== 0 || e.pointerType === 'touch' || matchMedia('(max-width:700px)').matches) return;
      const startX = e.clientX, startY = e.clientY, dx = Number(btn.dataset.dx) || 0, dy = Number(btn.dataset.dy) || 0; const rect = btn.getBoundingClientRect(); const area = $('#workspace').getBoundingClientRect(); btn.setPointerCapture(e.pointerId);
      const move = event => {
        const x = event.clientX - startX, y = event.clientY - startY; if (Math.abs(x) + Math.abs(y) > 5) moved = true; if (!moved) return;
        const nextX = dx + Math.max(area.left - rect.left + 5, Math.min(x, area.right - rect.right - 5)); const nextY = dy + Math.max(area.top - rect.top + 5, Math.min(y, area.bottom - rect.bottom - 100));
        btn.dataset.dx = nextX; btn.dataset.dy = nextY; btn.style.transform = `translate(${nextX}px,${nextY}px)`;
      };
      const end = () => { btn.removeEventListener('pointermove', move); btn.removeEventListener('pointerup', end); btn.removeEventListener('pointercancel', end); if (moved) { const positions = P.storage.get('icon-positions', {}); positions[btn.dataset.app] = { x: Number(btn.dataset.dx), y: Number(btn.dataset.dy) }; P.storage.set('icon-positions', positions); setTimeout(() => { moved = false; }, 250); } };
      btn.addEventListener('pointermove', move); btn.addEventListener('pointerup', end); btn.addEventListener('pointercancel', end);
    });
  });
  function constrainIcons() {
    if (matchMedia('(max-width:700px)').matches) { document.querySelectorAll('.desktop-shortcut').forEach(b => { b.style.transform = ''; b.dataset.dx = '0'; b.dataset.dy = '0'; }); return; }
    const area = $('#workspace').getBoundingClientRect();
    document.querySelectorAll('.desktop-shortcut').forEach(btn => { const r = btn.getBoundingClientRect(); if (r.right > area.right || r.bottom > area.bottom - 95 || r.left < 0 || r.top < 40) { btn.style.transform = ''; btn.dataset.dx = '0'; btn.dataset.dy = '0'; } });
  }
  window.addEventListener('resize', constrainIcons); constrainIcons();
  function hideMenus() { for (const id of ['launcher','quick-settings','calendar']) $('#' + id).hidden = true; $('#launcher-toggle').setAttribute('aria-expanded', 'false'); $('#system-toggle').setAttribute('aria-expanded', 'false'); }
  function toggleMenu(id, button) { const visible = $('#' + id).hidden; hideMenus(); $('#' + id).hidden = !visible; button?.setAttribute('aria-expanded', String(visible)); if (visible) $('#' + id).querySelector('input,button')?.focus(); }
  $('#launcher').innerHTML = `<div class="launcher-search">${P.icon('search')}<input aria-label="Search applications" placeholder="Find an application..." autocomplete="off"></div><div class="launcher-heading">YOUR WORKSPACE</div><div class="launcher-grid">${publicApps.concat('settings').map(id => `<button class="launcher-app" data-app="${id}">${P.appIcon(id, true)}<span>${P.apps[id].name}</span></button>`).join('')}</div><div class="launcher-footer"><span>${P.icon('circle-user-round')}guest@prystech</span><div><button class="icon-button launcher-settings" title="Settings" aria-label="Settings">${P.icon('settings-2')}</button><button class="icon-button launcher-reboot" title="Restart" aria-label="Restart">${P.icon('rotate-cw')}</button><button class="icon-button launcher-power" title="Power off" aria-label="Power off">${P.icon('power')}</button></div></div>`;
  $('#launcher-toggle').onclick = () => toggleMenu('launcher', $('#launcher-toggle'));
  $('#launcher').querySelector('input').oninput = e => { $('#launcher').querySelectorAll('[data-app]').forEach(btn => { btn.hidden = !P.apps[btn.dataset.app].name.toLowerCase().includes(e.target.value.toLowerCase()); }); };
  $('#launcher').querySelectorAll('[data-app]').forEach(btn => btn.onclick = () => { hideMenus(); P.wm.open(btn.dataset.app); });
  $('.launcher-settings').onclick = () => { hideMenus(); P.wm.open('settings'); };
  $('.launcher-reboot').onclick = () => P.reboot(); $('.launcher-power').onclick = () => P.shutdown();
  $('#quick-settings').innerHTML = `<div class="quick-title"><span>System</span><span class="quick-status">Guest session</span></div><div class="quick-row">${P.icon('wifi')}<label id="quick-network">Connected</label><span class="status-dot"></span></div><div class="quick-row">${P.icon('volume-2')}<input id="sound-level" type="range" min="0" max="100" value="${P.storage.get('volume', 0)}" aria-label="Desktop sound volume"><output id="sound-value">${P.storage.get('volume', 0)}%</output></div><div class="quick-row">${P.icon('sun')}<input id="brightness-level" type="range" min="30" max="100" value="${P.storage.get('brightness', 100)}" aria-label="Wallpaper brightness"><output id="brightness-value">${P.storage.get('brightness', 100)}%</output></div><div class="quick-row">${P.icon('battery-full')}<label>Virtual desktop</label><span class="muted" style="font-size:11px">100%</span></div><button class="secondary-button all-settings">${P.icon('settings-2')}All settings</button>`;
  $('#system-toggle').onclick = () => toggleMenu('quick-settings', $('#system-toggle'));
  $('.all-settings').onclick = () => { hideMenus(); P.wm.open('settings'); };
  let audioContext;
  function sound(value) {
    if (!value) return;
    try { audioContext ||= new (window.AudioContext || window.webkitAudioContext)(); audioContext.resume(); const osc = audioContext.createOscillator(), gain = audioContext.createGain(); osc.type = 'sine'; osc.frequency.value = 560; gain.gain.setValueAtTime(value / 100 * .09, audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + .15); osc.connect(gain); gain.connect(audioContext.destination); osc.start(); osc.stop(audioContext.currentTime + .16); } catch { /* Audio is optional and may be unavailable. */ }
  }
  function updateVolume(value) { $('#sound-value').textContent = value + '%'; P.storage.set('volume', Number(value)); const old = $('#volume-icon'); old.outerHTML = `<i id="volume-icon" data-lucide="${Number(value) ? 'volume-2' : 'volume-x'}"></i>`; P.icons(); }
  $('#sound-level').oninput = e => updateVolume(e.target.value); $('#sound-level').onchange = e => sound(Number(e.target.value)); updateVolume(P.storage.get('volume', 0));
  function brightness(value) { $('.wallpaper').style.filter = `brightness(${Number(value) / 100})`; $('#brightness-value').textContent = value + '%'; P.storage.set('brightness', Number(value)); }
  $('#brightness-level').oninput = e => brightness(e.target.value); brightness(P.storage.get('brightness', 100));
  function connection() { $('#connection-label').textContent = navigator.onLine ? 'connected' : 'offline'; $('#quick-network').textContent = navigator.onLine ? 'Connected' : 'Offline'; $('#network-icon').outerHTML = `<i id="network-icon" data-lucide="${navigator.onLine ? 'wifi' : 'wifi-off'}"></i>`; P.icons(); }
  window.addEventListener('online', () => { connection(); P.notify('Back online', 'Your connection has been restored.', 'wifi'); }); window.addEventListener('offline', () => { connection(); P.notify('You are offline', 'Local apps are still available.', 'wifi-off'); }); connection();
  function tick() { const date = new Date(); $('#system-clock').textContent = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + '  ' + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); $('#system-clock').dateTime = date.toISOString(); $('#clock-button').title = date.toLocaleDateString(undefined, { dateStyle: 'full' }); }
  tick(); setInterval(tick, 1000 * 15);
  let calendarDate = new Date();
  function calendar() {
    const now = new Date(), y = calendarDate.getFullYear(), m = calendarDate.getMonth(); const first = new Date(y,m,1).getDay(), days = new Date(y,m+1,0).getDate();
    $('#calendar').innerHTML = `<div class="calendar-title"><button class="icon-button calendar-prev" aria-label="Previous month">${P.icon('chevron-left')}</button><strong>${calendarDate.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</strong><button class="icon-button calendar-next" aria-label="Next month">${P.icon('chevron-right')}</button></div><div class="calendar-grid">${['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => `<span class="weekday">${d}</span>`).join('')}${'<span></span>'.repeat(first)}${Array.from({length:days},(_,i) => `<span class="${now.getDate() === i+1 && now.getMonth() === m && now.getFullYear() === y ? 'today' : ''}">${i+1}</span>`).join('')}</div><div class="calendar-foot">${Intl.DateTimeFormat().resolvedOptions().timeZone.replaceAll('_',' ')}</div>`;
    $('.calendar-prev').onclick = () => { calendarDate = new Date(y,m-1,1); calendar(); }; $('.calendar-next').onclick = () => { calendarDate = new Date(y,m+1,1); calendar(); }; P.icons();
  }
  $('#clock-button').onclick = () => { calendar(); toggleMenu('calendar', $('#clock-button')); };
  document.addEventListener('pointerdown', e => { if (!e.target.closest('.popover,#launcher-toggle,#system-toggle,#clock-button')) hideMenus(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { hideMenus(); if (P.wm.active) P.wm.windows.get(P.wm.active)?.el.focus(); } });
  function openInitial() {
    let app; try { app = new URL(location.href).searchParams.get('app'); } catch { app = null; }
    P.wm.open(publicApps.includes(app) || app === 'settings' ? app : 'terminal');
  }
  function boot(force = false) {
    clearInterval(bootTimer); hideMenus(); $('#shutdown-screen').hidden = true;
    let completed = false; try { completed = sessionStorage.getItem('prystech:booted') === '1'; } catch { /* A session without storage simply boots again. */ }
    if (!force && completed) { $('#boot').hidden = true; $('#desktop').inert = false; openInitial(); return; }
    const screen = $('#boot'); screen.hidden = false; screen.classList.remove('leaving'); $('#desktop').inert = true; screen.focus(); $('#boot-lines').replaceChildren(); $('#boot-progress').style.width = '0%';
    const lines = [['SYS','Initializing Prystech Systems...'],['SYS','Mounting /home/guest filesystem'],['UI','Loading interface and local fonts'],['NET','Checking network connection'],['AUTH','Starting a read-only guest session'],['UI','Preparing desktop environment'],['SYS','Welcome home, guest.']];
    const start = performance.now(); let count = 0, done = false;
    const finish = () => {
      if (done) return; done = true; clearInterval(bootTimer); document.removeEventListener('keydown', skip, true); $('#skip-boot').onclick = null; try { sessionStorage.setItem('prystech:booted','1'); } catch {}
      $('#boot-progress').style.width = '100%'; $('#boot-lines').querySelectorAll('.boot-line>span:first-child').forEach(el => el.textContent = '[ OK ]'); screen.classList.add('leaving'); $('#desktop').inert = false; if (!P.wm.windows.size) openInitial();
      setTimeout(() => { screen.hidden = true; P.wm.windows.get(P.wm.active)?.el.querySelector('input')?.focus({preventScroll:true}); }, 300);
    };
    const skip = e => { e.preventDefault(); e.stopPropagation(); finish(); }; bootSkip = finish;
    document.addEventListener('keydown', skip, true); $('#skip-boot').onclick = finish;
    const reduced = matchMedia('(prefers-reduced-motion:reduce)').matches || P.storage.get('reduced-motion', false);
    bootTimer = setInterval(() => {
      const elapsed = performance.now() - start; const target = reduced ? lines.length : Math.min(lines.length, Math.floor(elapsed / 370) + 1);
      while (count < target) { $('#boot-lines').querySelectorAll('.boot-line>span:first-child').forEach(el => el.textContent = '[ OK ]'); const [tag,text] = lines[count++]; const el = document.createElement('div'); el.className = 'boot-line'; el.innerHTML = `<span>[ RUN ]</span><span class="boot-subsystem">${tag}</span><span>${P.escape(text)}</span>`; $('#boot-lines').append(el); }
      $('#boot-progress').style.width = Math.min(100, elapsed / 29) + '%'; $('#boot-uptime').textContent = (elapsed / 1000).toFixed(1) + 's';
      if (reduced || elapsed >= 2900) finish();
    }, 80);
  }
  async function endPrivateSession() { if (P.auth.current) { try { await P.auth.logout(); } catch { P.notify('Local session cleared', 'The server could not confirm logout. Close the owner session on the portfolio if needed.', 'lock-keyhole'); } } }
  P.reboot = async function () { hideMenus(); await endPrivateSession(); for (const id of [...P.wm.windows.keys()]) P.wm.close(id); boot(true); };
  P.shutdown = async function () { hideMenus(); await endPrivateSession(); for (const id of [...P.wm.windows.keys()]) P.wm.close(id); $('#desktop').inert = true; $('#shutdown-screen').hidden = false; $('#power-on').focus(); };
  $('#power-on').onclick = () => boot(true);
  window.addEventListener('popstate', () => { const app = new URL(location.href).searchParams.get('app'); if (publicApps.includes(app)) P.wm.open(app); });
  window.addEventListener('error', e => { if (e.filename && e.filename.includes('/js/')) P.notify('An app encountered a problem', 'Reopen the application to try again.', 'circle-alert'); });
  P.icons(); boot();
})(window.Prystech);
