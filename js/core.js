(function (P) {
  'use strict';
  P.escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  P.icon = (name, cls = '') => `<i data-lucide="${P.escape(name)}"${cls ? ` class="${P.escape(cls)}"` : ''}></i>`;
  P.icons = () => window.lucide?.createIcons({ attrs: { 'stroke-width': 1.6, 'aria-hidden': 'true' } });
  P.storage = {
    get(key, fallback) { try { return JSON.parse(localStorage.getItem(`prystech:${key}`)) ?? fallback; } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(`prystech:${key}`, JSON.stringify(value)); } catch { /* Storage may be disabled in private browsing. */ } }
  };
  P.parseCommand = function (input) {
    const args = []; let word = '', quote = null, escaped = false, started = false;
    for (const c of input.trim()) {
      if (escaped) { word += c; escaped = false; started = true; }
      else if (c === '\\' && quote !== "'") { escaped = true; started = true; }
      else if (quote) { if (c === quote) quote = null; else word += c; }
      else if (c === '"' || c === "'") { quote = c; started = true; }
      else if (/\s/.test(c)) { if (started) { args.push(word); word = ''; started = false; } }
      else { word += c; started = true; }
    }
    if (quote) throw new Error('Unclosed quote. Finish the quoted argument and try again.');
    if (escaped) throw new Error('Incomplete escape at end of command.');
    if (started) args.push(word);
    return args;
  };
  const about = 'PRYSTECH\nDesign. Develop. Different.\n\nWe are a design and development studio building distinctive brands, thoughtful websites, and useful digital products.\n\nOur work brings strategy, design, and engineering together.\n\nExplore our work at https://prystech.co\nContact: hello@prystech.co';
  const skills = { development: ['HTML', 'CSS', 'JavaScript', 'React', 'WordPress', 'API integration'], design: ['UI/UX design', 'Figma', 'Brand identity', 'Editorial design'], focus: ['Web applications', 'E-commerce', 'Digital experiences'] };
  const readme = '# Prystech Webview\n\nWelcome, guest.\nThis is your little corner of the internet.\n\n## Explore\nOpen an application from the desktop or dock.\nDouble-click desktop icons; on touch, tap once.\n\n## Terminal\nType help to see commands. Try neofetch, projects,\nabout, skills, or portfolio.\n\nArrow keys recall commands. Tab completes them.\nCtrl+L clears the screen. Ctrl+C cancels input.\nAlt+F4 closes the active app. Escape dismisses menus.\n\n## Your session\nTheme and window positions stay on this device.\nPrivate credentials are never saved in browser storage.\nAnalytics are off by default.\n\n## The fine print\nThis is a simulated desktop, not a remote shell.\nNo commands run on your computer.\n\nBuilt with curiosity. Made by Prystech.';
  const files = {
    '/': { type: 'directory' }, '/home': { type: 'directory' }, '/home/guest': { type: 'directory' },
    '/home/guest/about': { type: 'directory' }, '/home/guest/projects': { type: 'directory' }, '/home/guest/skills': { type: 'directory' }, '/home/guest/contact': { type: 'directory' }, '/home/guest/portfolio': { type: 'directory' },
    '/home/guest/about/about.txt': { type: 'file', content: about },
    '/home/guest/skills/skills.json': { type: 'file', content: JSON.stringify(skills, null, 2) },
    '/home/guest/projects/projects.md': { type: 'file', content: '# Selected work\n\n' + P.config.projects.map(p => `## ${p.name}\n${p.detail}\n${p.url}`).join('\n\n') },
    '/home/guest/contact/contact.txt': { type: 'file', content: 'Let\'s build something worthwhile.\n\nEmail: hello@prystech.co\nWebsite: https://prystech.co' },
    '/home/guest/portfolio/portfolio.url': { type: 'file', content: P.config.portfolioUrl, app: 'portfolio' },
    '/home/guest/readme.md': { type: 'file', content: readme }
  };
  P.fs = {
    home: '/home/guest', files, skills,
    resolve(path = '~', cwd = '/home/guest') {
      let expanded = path === '~' ? this.home : path.startsWith('~/') ? this.home + path.slice(1) : path;
      if (!expanded.startsWith('/')) expanded = cwd + '/' + expanded;
      const parts = []; for (const part of expanded.split('/')) { if (part === '..') parts.pop(); else if (part && part !== '.') parts.push(part); }
      return '/' + parts.join('/');
    },
    get(path, cwd) { return files[this.resolve(path, cwd)]; },
    list(path, cwd) {
      const resolved = this.resolve(path, cwd); const node = files[resolved];
      if (!node) throw new Error(`No such file or directory: ${path}`);
      if (node.type !== 'directory') return [{ path: resolved, name: resolved.split('/').pop(), ...node }];
      const prefix = resolved === '/' ? '/' : resolved + '/';
      return Object.entries(files).filter(([key]) => key.startsWith(prefix) && key !== resolved && !key.slice(prefix.length).includes('/')).map(([key, value]) => ({ path: key, name: key.slice(prefix.length), ...value }));
    }
  };
  P.apps = {
    terminal: { name: 'Terminal', icon: 'terminal', color: 'green' },
    portfolio: { name: 'Portfolio', icon: 'panels-top-left', color: 'coral' },
    projects: { name: 'Projects', icon: 'folder-code', color: 'amber' },
    about: { name: 'About', icon: 'user-round', color: 'blue' },
    contact: { name: 'Contact', icon: 'mail', color: 'violet' },
    site: { name: 'Prystech Website', icon: 'globe-2', color: 'mint' },
    files: { name: 'Files', icon: 'folder', color: 'amber' },
    readme: { name: 'README', icon: 'file-text', color: 'gray' },
    settings: { name: 'Settings', icon: 'settings-2', color: 'gray' },
    analytics: { name: 'Private analytics', icon: 'chart-no-axes-combined', color: 'green', private: true }
  };
  P.appIcon = (id, small = false) => `<span class="app-icon ${P.apps[id]?.color || 'gray'} ${small ? 'small' : ''}">${P.icon(P.apps[id]?.icon || 'file-text')}</span>`;
  P.notify = function (title, message = '', icon = 'info') {
    const item = document.createElement('div'); item.className = 'notification';
    item.innerHTML = `${P.icon(icon)}<div><strong>${P.escape(title)}</strong>${message ? `<p>${P.escape(message)}</p>` : ''}</div><button class="icon-button" aria-label="Dismiss notification">${P.icon('x')}</button>`;
    item.querySelector('button').onclick = () => item.remove(); document.getElementById('notifications').append(item); P.icons();
    setTimeout(() => item.remove(), 5500);
  };
})(window.Prystech);
