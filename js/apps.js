(function (P) {
  'use strict';
  const { escape: esc, icon } = P;
  function button(text, app, cls = 'secondary-button') { return `<button class="${cls}" data-open="${app}">${icon(P.apps[app].icon)}${text}</button>`; }
  function bindOpen(root) { root.querySelectorAll('[data-open]').forEach(btn => btn.onclick = () => P.wm.open(btn.dataset.open)); }
  function about(win) {
    win.body.innerHTML = `<article class="app-page"><div class="app-eyebrow">${icon('user-round')} ABOUT / PRYSTECH</div><div class="about-heading"><span class="brand-mark">p<span>_</span></span><div><h2>Considered design.<br>Purposeful code.</h2></div></div><p class="about-copy">We're Prystech, a design and development studio creating distinctive brands, thoughtful websites, and useful digital products.</p><p class="about-copy">From the first sketch to the final deployment, we bring design and engineering together to make things that work beautifully.</p><div class="about-services"><div class="about-service">Design & identity<small>Brand systems, interfaces, digital experiences</small></div><div class="about-service">Development & beyond<small>Websites, applications, e-commerce</small></div></div><div class="section-label">Our toolkit</div><div class="skill-list">${['JavaScript', 'React', 'WordPress', 'Figma', 'UI/UX', 'Brand identity'].map(s => `<span class="skill-chip">${icon('code-2')}${s}</span>`).join('')}</div><div class="button-row" style="margin-top:29px">${button('Selected work', 'projects', 'primary-button')}${button('Get in touch', 'contact')}</div></article>`;
    win.body.querySelector('.brand-mark').outerHTML = '<img class="about-mark" src="assets/favicon.svg" alt="Prystech symbol" width="65" height="68">';
    bindOpen(win.body);
  }
  function projects(win) {
    win.body.innerHTML = `<section class="app-page"><div class="app-eyebrow">${icon('folder-code')} WORK / SELECTED PROJECTS</div><div class="app-header"><div><h2>A few things we've made.</h2><p>Good ideas, brought to life.</p></div><span class="count">04</span></div><nav class="project-filters" aria-label="Project categories">${['All projects', 'Development', 'Web design', 'Branding'].map((s, i) => `<button class="${i === 0 ? 'active' : ''}" data-filter="${s}" aria-pressed="${i === 0}">${s}</button>`).join('')}</nav><div class="project-grid"></div><div class="project-footer"><span>Selected work from Prystech</span><button class="text-link" data-open="site">All work ${icon('arrow-up-right')}</button></div></section>`;
    function render(category) {
      const selected = P.config.projects.filter(p => category === 'All projects' || p.category === category);
      win.body.querySelector('.project-grid').innerHTML = selected.map(p => `<article class="project-card"><a class="project-image" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer" data-project="${p.id}" aria-label="View ${esc(p.name)} project"><img src="${esc(p.image)}" alt="${esc(p.name)} design and development project" loading="lazy" width="600" height="350"></a><div class="project-card-body"><div class="project-card-title"><h3><a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer" data-project="${p.id}">${esc(p.name)}</a></h3>${icon('arrow-up-right')}</div><p>${esc(p.detail)}</p><div class="project-tags">${p.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div></div></article>`).join('');
      win.body.querySelectorAll('[data-project]').forEach(a => a.addEventListener('click', () => P.track('project_open', a.dataset.project)));
      P.icons();
    }
    win.body.querySelectorAll('[data-filter]').forEach(btn => btn.onclick = () => { win.body.querySelectorAll('[data-filter]').forEach(b => { b.classList.toggle('active', b === btn); b.setAttribute('aria-pressed', String(b === btn)); }); render(btn.dataset.filter); });
    render('All projects'); bindOpen(win.body);
  }
  function contact(win) {
    win.body.innerHTML = `<article class="app-page contact-page"><div class="contact-symbol">${icon('mail')}</div><div class="app-eyebrow">CONTACT / SAY HELLO</div><h2>Something in mind?<br>Let's make it happen.</h2><p>A new project, an interesting idea, or just a hello.<br>Our inbox is open.</p><div class="contact-address"><a href="mailto:${esc(P.config.contactEmail)}">${esc(P.config.contactEmail)}</a><button class="icon-button copy-email" title="Copy email address" aria-label="Copy email address">${icon('copy')}</button></div><div class="button-row"><a class="primary-button email-link" href="mailto:${esc(P.config.contactEmail)}">${icon('send')}Write an email</a>${button('Visit Prystech', 'site')}</div><div class="contact-footnote">${icon('globe-2')} &nbsp; Good work has no borders.</div></article>`;
    win.body.querySelectorAll('a[href^="mailto:"]').forEach(a => a.onclick = () => P.track('contact_click', 'contact'));
    win.body.querySelector('.copy-email').onclick = async () => { try { await navigator.clipboard.writeText(P.config.contactEmail); P.notify('Email copied', P.config.contactEmail, 'check'); } catch { P.notify('Copy unavailable', P.config.contactEmail, 'mail'); } };
    bindOpen(win.body);
  }
  P.openFile = function (path) {
    const resolved = P.fs.resolve(path); const file = P.fs.get(resolved);
    if (!file || file.type !== 'file') return;
    if (file.app) return P.wm.open(file.app);
    return P.wm.open('editor', { id: 'file:' + resolved, title: resolved.split('/').pop(), path: resolved });
  };
  function editor(win, path) {
    const file = P.fs.get(path); if (!file || file.type !== 'file') throw new Error('File not found');
    win.body.innerHTML = `<div class="editor-layout"><div class="editor-tab">${icon('file-text')}<span>${esc(path.split('/').pop())}</span><span>READ ONLY</span></div><div class="editor-content" tabindex="0" aria-label="File contents">${file.content.split('\n').map((line, i) => `<div class="editor-line"><span class="line-number" aria-hidden="true">${i + 1}</span><span class="line-text ${line.startsWith('#') ? 'heading' : ''}">${esc(line) || ' '}</span></div>`).join('')}</div></div>`;
    win.el.querySelector('.window-status').innerHTML = `<span>${esc(path.replace(P.fs.home, '~'))}</span><span>UTF-8 &nbsp; / &nbsp; ${file.content.split('\n').length} lines</span>`;
  }
  function files(win, options) {
    let cwd = P.fs.resolve(options.path || '~'); if (P.fs.get(cwd)?.type !== 'directory') cwd = P.fs.home;
    const history = [cwd]; let index = 0;
    win.body.innerHTML = `<div class="files-layout"><div class="file-toolbar"><button class="icon-button file-back" title="Back" aria-label="Back">${icon('arrow-left')}</button><button class="icon-button file-forward" title="Forward" aria-label="Forward">${icon('arrow-right')}</button><button class="icon-button file-up" title="Parent folder" aria-label="Parent folder">${icon('arrow-up')}</button><div class="path-bar"></div><button class="icon-button file-home" title="Home folder" aria-label="Home folder">${icon('house')}</button></div><aside class="file-sidebar"><div class="sidebar-label">PLACES</div>${[['~','Home','house'],['~/projects','Projects','folder-code'],['~/about','About','user-round'],['~/skills','Skills','code-2'],['~/contact','Contact','mail'],['~/portfolio','Portfolio','panels-top-left']].map(([path, name, ico]) => `<button data-path="${path}">${icon(ico)}${name}</button>`).join('')}</aside><section class="file-main"><div class="file-breadcrumb"></div><div class="file-items"></div></section></div>`;
    function render() {
      win.body.querySelector('.path-bar').textContent = cwd;
      win.body.querySelector('.file-breadcrumb').textContent = cwd === P.fs.home ? 'Home' : cwd.split('/').filter(Boolean).join(' / ');
      win.body.querySelector('.file-back').disabled = index === 0; win.body.querySelector('.file-forward').disabled = index === history.length - 1; win.body.querySelector('.file-up').disabled = cwd === '/';
      win.body.querySelectorAll('[data-path]').forEach(btn => btn.classList.toggle('active', P.fs.resolve(btn.dataset.path) === cwd));
      const items = P.fs.list(cwd);
      win.body.querySelector('.file-items').innerHTML = items.map(item => `<button class="file-item ${item.type}" data-file="${esc(item.path)}" title="Open ${esc(item.name)}">${icon(item.type === 'directory' ? 'folder' : 'file-text')}<span>${esc(item.name)}</span></button>`).join('');
      win.body.querySelectorAll('[data-file]').forEach(btn => btn.onclick = () => { const file = P.fs.get(btn.dataset.file); if (file.type === 'directory') navigate(btn.dataset.file); else P.openFile(btn.dataset.file); });
      win.el.querySelector('.window-status').innerHTML = `<span>${items.length} items</span><span>Read-only filesystem</span>`; P.icons();
    }
    function navigate(path) { cwd = P.fs.resolve(path); history.splice(index + 1); history.push(cwd); index++; render(); }
    win.body.querySelector('.file-back').onclick = () => { if (index > 0) { cwd = history[--index]; render(); } };
    win.body.querySelector('.file-forward').onclick = () => { if (index < history.length - 1) { cwd = history[++index]; render(); } };
    win.body.querySelector('.file-up').onclick = () => navigate(P.fs.resolve('..', cwd)); win.body.querySelector('.file-home').onclick = () => navigate('~');
    win.body.querySelectorAll('[data-path]').forEach(btn => btn.onclick = () => navigate(btn.dataset.path)); render();
  }
  function browser(win, app) {
    const isPortfolio = app === 'portfolio'; const externalUrl = isPortfolio ? (P.config.portfolioPublicUrl || P.config.portfolioUrl) : P.config.websiteUrl;
    const embedUrl = isPortfolio ? P.config.portfolioPublicUrl : P.config.websiteUrl;
    const enabled = isPortfolio ? P.config.portfolioEmbedEnabled && Boolean(embedUrl) : P.config.websiteEmbedEnabled;
    const name = isPortfolio ? 'Portfolio' : 'Prystech';
    const pages = ['start']; let index = 0, timer = null, frame = null, disposed = false, verified = false;
    win.body.innerHTML = `<div class="browser-layout"><nav class="browser-toolbar" aria-label="Browser navigation"><button class="icon-button browser-back" title="Back" aria-label="Back">${icon('arrow-left')}</button><button class="icon-button browser-forward" title="Forward" aria-label="Forward">${icon('arrow-right')}</button><button class="icon-button browser-refresh" title="Reload" aria-label="Reload">${icon('rotate-cw')}</button><div class="browser-address">${icon('lock-keyhole')}<span></span></div><a class="icon-button browser-external" href="${esc(externalUrl)}" target="_blank" rel="noopener noreferrer" title="Open in new tab" aria-label="Open ${name} in new tab">${icon('arrow-up-right')}</a></nav><div class="browser-body"></div></div>`;
    const body = win.body.querySelector('.browser-body');
    function navigation() {
      win.body.querySelector('.browser-back').disabled = index === 0; win.body.querySelector('.browser-forward').disabled = index === pages.length - 1;
      win.body.querySelector('.browser-address span').textContent = pages[index] === 'start' ? new URL(externalUrl).hostname : pages[index].replace(/^https:\/\//, '');
    }
    function landing(failed = false) {
      clearTimeout(timer); frame?.remove(); frame = null;
      body.innerHTML = `<div class="browser-state"><div class="state-icon">${icon(failed ? 'unplug' : isPortfolio ? 'panels-top-left' : 'globe-2')}</div><div class="app-eyebrow">${isPortfolio ? 'PRYSTECH / PORTFOLIO' : 'PRYSTECH / ON THE WEB'}</div><h2>${failed ? 'A little better in its own tab.' : isPortfolio ? 'Step inside our portfolio.' : 'Design. Develop. Different.'}</h2><p>${failed ? 'This page could not be displayed here. You can still explore the full website in a new tab.' : isPortfolio ? 'Explore the full collection of our work in the portfolio. The public desktop preview is not connected yet.' : 'Explore the Prystech studio, our services, and the work behind them.'}</p><div class="button-row">${enabled ? `<button class="secondary-button load-site">${icon('rotate-cw')}${failed ? 'Try again' : 'Open here'}</button>` : ''}<a class="primary-button" href="${esc(externalUrl)}" target="_blank" rel="noopener noreferrer">Open ${name}${icon('arrow-up-right')}</a></div><span class="site-domain">${esc(new URL(externalUrl).hostname)}</span></div>`;
      body.querySelector('.load-site')?.addEventListener('click', () => navigate(embedUrl));
      body.querySelector('a').onclick = track; P.icons();
    }
    function track() { P.track(isPortfolio ? 'portfolio_open' : 'website_open', app); }
    function load(url) {
      clearTimeout(timer); frame?.remove(); frame = null; verified = false;
      if (url === 'start' || !enabled) { landing(); navigation(); return; }
      if (!navigator.onLine) { landing(true); navigation(); return; }
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' || parsed.origin === location.origin || parsed.origin !== new URL(embedUrl).origin) { landing(true); return; }
      body.innerHTML = `<div class="browser-state loading-state"><div class="spinner"></div><p style="margin:20px 0 0">Connecting to ${esc(parsed.hostname)}...</p></div>`;
      frame = document.createElement('iframe'); frame.title = `${name} public website`; frame.referrerPolicy = isPortfolio ? 'origin' : 'no-referrer'; frame.setAttribute('sandbox', 'allow-scripts allow-same-origin' + (isPortfolio ? ' allow-popups' : '')); frame.setAttribute('allow', "camera 'none'; microphone 'none'; geolocation 'none'; payment 'none'");
      // Cross-origin load events do not prove embedding succeeded. Keep an explicit escape hatch.
      frame.addEventListener('load', event => {
        if (disposed || !frame || event.currentTarget !== frame) return;
        clearTimeout(timer); body.querySelector('.loading-state')?.remove();
        if (!verified && !body.querySelector('.browser-load-badge')) {
          const badge = document.createElement('div'); badge.className = 'browser-load-badge'; badge.innerHTML = `<span>Page not displaying?</span><button>Open another way ${icon('arrow-up-right')}</button>`; badge.querySelector('button').onclick = () => landing(true); body.append(badge); P.icons();
        }
      });
      frame.addEventListener('error', () => landing(true)); frame.src = url; body.prepend(frame);
      timer = setTimeout(() => { if (!disposed) landing(true); }, P.config.embedTimeoutMs); navigation(); track();
    }
    function navigate(url) { if (pages[index] !== url) { pages.splice(index + 1); pages.push(url); index++; } load(url); }
    function message(event) {
      if (!frame || event.source !== frame.contentWindow || event.origin !== new URL(embedUrl).origin || event.data?.type !== 'prystech:public-ready' || event.data?.mode !== 'public') return;
      verified = true;
      clearTimeout(timer); body.querySelector('.loading-state')?.remove(); body.querySelector('.browser-load-badge')?.remove();
    }
    window.addEventListener('message', message);
    win.body.querySelector('.browser-back').onclick = () => { if (index) { index--; load(pages[index]); } };
    win.body.querySelector('.browser-forward').onclick = () => { if (index < pages.length - 1) { index++; load(pages[index]); } };
    win.body.querySelector('.browser-refresh').onclick = () => load(pages[index]); win.body.querySelector('.browser-external').onclick = track;
    if (enabled) navigate(embedUrl); else { landing(); navigation(); }
    win.el.querySelector('.window-status').innerHTML = `<span>${icon('shield-check')} Public browsing</span><span>External content</span>`;
    return () => { disposed = true; clearTimeout(timer); frame?.remove(); window.removeEventListener('message', message); };
  }
  function settings(win) {
    win.body.innerHTML = `<section class="app-page"><div class="app-eyebrow">${icon('settings-2')} DESKTOP / PREFERENCES</div><div class="app-header"><div><h2>Make yourself at home.</h2><p>Preferences stay on this device.</p></div></div><div class="settings-section"><h3>Appearance</h3><div class="theme-options">${[['purple','Amethyst'],['midnight','Midnight'],['light','Daylight']].map(([id,name]) => `<button class="theme-option" data-theme="${id}" aria-pressed="false"><span class="theme-preview ${id}"></span>${name}</button>`).join('')}</div></div><div class="settings-section"><h3>Desktop</h3><div class="setting-row"><label for="motion-setting">Reduced motion<small>Keep transitions and animations still.</small></label><input id="motion-setting" class="switch" type="checkbox" ${P.storage.get('reduced-motion', false) ? 'checked' : ''}></div><div class="setting-row"><label for="wallpaper-setting">Desktop wallpaper</label><input id="wallpaper-setting" class="switch" type="checkbox" ${P.storage.get('wallpaper', true) ? 'checked' : ''}></div><button class="secondary-button reset-layout">${icon('layout-grid')}Reset desktop layout</button></div><div class="settings-section"><h3>Privacy</h3><div class="setting-row"><label for="analytics-setting">Anonymous interaction analytics<small>Share public app and project opens. Terminal input and sign-in details are never collected. Off by default.</small></label><input id="analytics-setting" class="switch" type="checkbox" ${P.storage.get('analytics-consent', false) ? 'checked' : ''}></div><p class="muted" style="font-size:10px;margin:0">${navigator.globalPrivacyControl || navigator.doNotTrack === '1' ? 'Your browser privacy preference disables analytics.' : !P.auth.configured ? 'No analytics endpoint is currently connected.' : 'Only allowlisted public interactions are shared.'}</p></div><div class="settings-section"><h3>Prystech Webview</h3><p class="muted" style="font:11px var(--mono);margin:0">Version ${P.config.version} / Vanilla HTML, CSS & JavaScript</p></div></section>`;
    function syncTheme() { win.body.querySelectorAll('[data-theme]').forEach(btn => { const selected = btn.dataset.theme === document.documentElement.dataset.theme; btn.classList.toggle('active', selected); btn.setAttribute('aria-pressed', String(selected)); }); }
    win.body.querySelectorAll('[data-theme]').forEach(btn => btn.onclick = () => { P.setTheme(btn.dataset.theme); syncTheme(); }); syncTheme();
    win.body.querySelector('#motion-setting').onchange = e => { P.storage.set('reduced-motion', e.target.checked); document.documentElement.classList.toggle('reduce-motion', e.target.checked); };
    win.body.querySelector('#wallpaper-setting').onchange = e => { P.storage.set('wallpaper', e.target.checked); document.documentElement.style.setProperty('--wallpaper-opacity', e.target.checked ? '1' : '0'); };
    win.body.querySelector('#analytics-setting').onchange = e => { P.storage.set('analytics-consent', e.target.checked); P.notify(e.target.checked ? 'Privacy preference saved' : 'Analytics disabled', e.target.checked ? 'Only public interactions may be shared when an endpoint is connected.' : 'No interaction events will be sent.', 'shield-check'); };
    win.body.querySelector('.reset-layout').onclick = () => { P.storage.set('icon-positions', {}); P.wm.resetLayout(); document.querySelectorAll('.desktop-shortcut').forEach(el => { el.style.transform = ''; el.dataset.dx = '0'; el.dataset.dy = '0'; }); P.notify('Layout reset', 'Icons and windows are back in their default positions.', 'layout-grid'); };
  }
  function analytics(win) {
    let controller = null, disposed = false;
    win.body.innerHTML = `<section class="app-page"><div class="app-eyebrow">${icon('lock-keyhole')} OWNER / PRIVATE ANALYTICS</div><div class="app-header"><div><h2>Portfolio activity</h2><p>Server-verified session</p></div><div class="analytics-controls"><select aria-label="Analytics date range"><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option></select><button class="icon-button analytics-reload" aria-label="Refresh analytics" title="Refresh analytics">${icon('rotate-cw')}</button></div></div><div class="analytics-data"></div></section>`;
    const container = win.body.querySelector('.analytics-data');
    const table = (title, rows) => `<section class="chart-section"><h3>${title}</h3>${rows.length ? `<table class="data-table"><thead><tr><th scope="col">Name</th><th scope="col">Count</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r.name)}</td><td>${r.count.toLocaleString()}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">No activity in this date range.</p>'}</section>`;
    const chart = (title, rows) => { const max = Math.max(1, ...rows.map(r => r.visits)); return `<section class="chart-section"><h3>${title}</h3>${rows.length ? `<div class="trend-chart" role="img" aria-label="${title}: ${esc(rows.map(r => r.date + ', ' + r.visits + ' visits').join('; '))}">${rows.map(r => `<div class="trend-bar" style="height:${Math.max(1, r.visits / max * 100)}%" title="${esc(r.date)}: ${r.visits} visits"></div>`).join('')}</div><details><summary class="muted">View data</summary>${table('Visits', rows.map(r => ({ name: r.date, count: r.visits })))}</details>` : '<p class="muted">No visits recorded yet.</p>'}</section>`; };
    async function load() {
      controller?.abort(); controller = new AbortController(); const signal = controller.signal;
      container.innerHTML = '<div class="empty-state"><div class="spinner"></div><span>Fetching portfolio activity...</span></div>';
      try {
        const data = await P.auth.analytics(win.body.querySelector('select').value, signal); if (disposed || signal.aborted) return;
        container.innerHTML = `<div class="metric-grid">${[['Total visits',data.totalVisits],['Unique visitors',data.uniqueVisitors],['Contact clicks',data.contactClicks],['Prystech visits',data.websiteVisits],['Conversion rate',data.conversionRate.toFixed(1)+'%'],['Conversions',data.conversions]].map(([label,value]) => `<div class="metric"><span>${label}</span><strong>${typeof value === 'number' ? value.toLocaleString() : value}</strong></div>`).join('')}</div>${chart('Daily visits',data.daily)}${chart('Weekly visits',data.weekly)}${table('Most-opened projects',data.projects)}${table('Links & calls to action',data.links)}${table('Referrer sources',data.referrers)}${table('Device breakdown',data.devices)}`;
      } catch (error) { if (disposed || signal.aborted) return; container.innerHTML = `<div class="empty-state">${icon(error.status === 401 ? 'lock-keyhole' : 'cloud-off')}<strong>${error.status === 401 ? 'Session expired' : 'Activity is unavailable'}</strong><span>${esc(error.message)}</span><button class="secondary-button retry-analytics">Try again</button></div>`; container.querySelector('button').onclick = load; }
      P.icons();
    }
    win.body.querySelector('select').onchange = load; win.body.querySelector('.analytics-reload').onclick = load; load();
    return () => { disposed = true; controller?.abort(); container.replaceChildren(); };
  }
  P.renderApp = function (app, win, options) {
    switch (app) {
      case 'terminal': return P.renderTerminal(win);
      case 'about': return about(win);
      case 'projects': return projects(win);
      case 'contact': return contact(win);
      case 'files': return files(win, options);
      case 'readme': return editor(win, '/home/guest/readme.md');
      case 'editor': return editor(win, options.path);
      case 'portfolio': case 'site': return browser(win, app);
      case 'settings': return settings(win);
      case 'analytics': return analytics(win);
    }
  };
})(window.Prystech);
