(function (P) {
  'use strict';
  const { escape: esc, icon } = P;
  const started = Date.now();
  function neofetch() {
    return `<div class="neofetch"><img class="terminal-brand" src="assets/favicon.svg" alt="Prystech symbol" width="120" height="124"><div class="neofetch-info"><div class="neofetch-host">guest<span class="muted">@</span>prystech</div><div class="neofetch-rule">---------------------------</div><dl><dt>OS</dt><dd>Prystech Webview ${P.config.version}</dd><dt>Host</dt><dd>Your favorite browser</dd><dt>Shell</dt><dd>prystech-shell</dd><dt>Focus</dt><dd>Design + Development</dd><dt>Uptime</dt><dd>${Math.floor((Date.now() - started) / 60000)} mins, a fresh perspective</dd><dt>Status</dt><dd><span class="green-text">All systems ready</span></dd></dl><div class="terminal-swatches" aria-hidden="true">${['#30483a','#ef8277','#90b98c','#d7bc82','#94b9ca','#bc9dc8','#95c8b8','#d5ddd4'].map(c => `<span style="background:${c}"></span>`).join('')}</div></div></div>`;
  }
  P.renderTerminal = function (win) {
    let cwd = P.fs.home, history = [], historyIndex = 0, draft = '', mode = null, email = '', busy = false, disposed = false, operation = null, generation = 0;
    win.body.innerHTML = `<div class="terminal-topline"><span class="terminal-tab">${icon('terminal')} guest@prystech: ~</span><span class="session-badge"><span class="status-dot"></span> PUBLIC SESSION</span></div><div class="terminal-scroller"><div class="terminal-output" role="log" aria-label="Terminal output" aria-live="polite"><div class="terminal-initial"><p class="terminal-welcome">Welcome to <strong>Prystech Webview</strong> <span class="muted">1.0.0</span></p><div class="terminal-copyright">A creative mind. An open terminal. Endless possibilities.</div>${neofetch()}<p class="terminal-intro">Make yourself at home. Type <b>help</b> to find your way around.</p><div class="terminal-quicklinks"><button data-command="about"><span>~</span>about</button><button data-command="projects"><span>~/</span>projects</button><button data-command="portfolio"><span>↗</span>portfolio</button><button data-command="contact"><span>@</span>contact</button></div></div></div><form class="terminal-form" autocomplete="off"><label class="prompt" for="terminal-command">guest@prystech<span class="prompt-path">:~</span><span class="prompt-dollar">$</span></label><input class="terminal-input" id="terminal-command" aria-label="Terminal command" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="2000" placeholder=""></form></div>`;
    const scroller = win.body.querySelector('.terminal-scroller'), output = win.body.querySelector('.terminal-output'), form = win.body.querySelector('form'), input = win.body.querySelector('input'), label = win.body.querySelector('label');
    function prompt() {
      if (mode === 'email') label.textContent = 'Email:';
      else if (mode === 'password') label.textContent = 'Password:';
      else label.innerHTML = `guest@prystech<span class="prompt-path">:${esc(cwd === P.fs.home ? '~' : cwd.startsWith(P.fs.home + '/') ? '~' + cwd.slice(P.fs.home.length) : cwd)}</span><span class="prompt-dollar">$</span>`;
      input.type = mode === 'password' ? 'password' : mode === 'email' ? 'email' : 'text';
      input.setAttribute('aria-label', mode === 'password' ? 'Password' : mode === 'email' ? 'Email address' : 'Terminal command');
      input.autocomplete = mode === 'password' ? 'current-password' : 'off';
      input.disabled = busy; input.placeholder = busy ? 'Working...' : '';
      scroller.scrollTop = scroller.scrollHeight;
    }
    function write(text, cls = '') { if (disposed) return; const el = document.createElement('div'); el.className = `terminal-line ${cls}`; el.textContent = text; output.append(el); trim(); scroller.scrollTop = scroller.scrollHeight; }
    function html(markup) { if (disposed) return; const el = document.createElement('div'); el.innerHTML = markup; output.append(el); trim(); P.icons(); scroller.scrollTop = scroller.scrollHeight; }
    function trim() { while (output.children.length > 240) output.firstElementChild.remove(); }
    function echo(command) { html(`<div class="command-echo"><span class="prompt">guest@prystech<span class="prompt-path">:${esc(cwd.replace(P.fs.home, '~'))}</span><span class="prompt-dollar">$</span></span><span>${esc(command)}</span></div>`); }
    function resetSensitive() { mode = null; email = ''; input.value = ''; input.type = 'text'; input.autocomplete = 'off'; }
    function cancel() { generation++; operation?.abort(); operation = null; resetSensitive(); busy = false; write('^C', 'muted'); prompt(); input.focus(); }
    const descriptions = {
      help: 'Available commands', ls: 'List files and folders', cd: 'Change directory', pwd: 'Print current directory', cat: 'Read a text file', whoami: 'Your current session', date: 'Local date and time', clear: 'Clear the terminal', history: 'Commands from this window', about: 'Meet Prystech', skills: 'Our design & development toolkit', projects: 'Browse selected work', contact: 'Get in touch', neofetch: 'A little system information', theme: 'purple | midnight | light', portfolio: 'Open the portfolio', site: 'Visit the Prystech website', open: 'open prystech', reboot: 'Restart the desktop', shutdown: 'End this desktop session'
    };
    async function portfolio(args, signal) {
      const action = args[0] || 'open';
      if (action === 'open') { if (args.length > 1) throw new Error('Usage: portfolio open'); P.wm.open('portfolio'); write('Opening the portfolio...', 'success'); return; }
      if (action === 'login') {
        if (args.length > 2) throw new Error('Use portfolio login [email]. Passwords are requested privately.');
        if (!P.auth.configured) { write('Owner sign-in is not connected yet.\nThe authentication adapter is unconfigured; no credentials were requested or sent.', 'muted'); return; }
        if (args[1] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(args[1])) throw new Error('Enter a valid email address.');
        email = args[1] || ''; mode = email ? 'password' : 'email'; return;
      }
      if (action === 'logout') { await P.auth.logout(signal); write('Signed out. Private windows have been closed.', 'success'); return; }
      if (action === 'status') {
        if (!P.auth.configured) { write('Guest session. Owner authentication is not configured.', 'muted'); return; }
        const verified = await P.auth.verify(signal); write('Signed in as ' + verified.user.displayName + '\nSession expires: ' + new Date(verified.expiresAt).toLocaleString(), 'success'); return;
      }
      if (['stats', 'dashboard', 'conversions'].includes(action)) {
        if (!P.auth.configured) throw new Error('Private analytics are not connected. A server-verified owner session is required.');
        await P.auth.verify(signal); if (signal.aborted) return;
        if (action === 'conversions') { const data = await P.auth.analytics('30d', signal); if (!signal.aborted) write(`Last 30 days\nConversions: ${data.conversions}\nConversion rate: ${data.conversionRate.toFixed(1)}%`, 'success'); }
        else { P.wm.open('analytics'); write('Opening private analytics...', 'success'); }
        return;
      }
      throw new Error('Unknown portfolio action. Try portfolio open.');
    }
    const commands = Object.create(null);
    Object.assign(commands, {
      help() { html(`<dl class="terminal-help">${Object.entries(descriptions).map(([name, description]) => `<dt>${name}</dt><dd>${description}</dd>`).join('')}</dl>`); write('Tab completes. Up/Down recalls. Ctrl+L clears. Ctrl+C cancels.', 'muted'); },
      ls(args) { const paths = args.filter(a => !a.startsWith('-')); const flags = args.filter(a => a.startsWith('-')); if (paths.length > 1 || flags.some(f => !/^-[al]+$/.test(f))) throw new Error('Usage: ls [-a] [-l] [path]'); const entries = P.fs.list(paths[0] || cwd, cwd); if (flags.some(f => f.includes('l'))) write(entries.map(f => `${f.type === 'directory' ? 'dr-xr-xr-x' : '-r--r--r--'}  guest  ${f.type === 'directory' ? '<DIR>' : String(f.content.length).padStart(5)}  ${f.name}`).join('\n')); else html(`<div class="terminal-fs-list">${entries.map(f => `<span${f.type === 'file' ? ' class="muted"' : ''}>${esc(f.name)}${f.type === 'directory' ? '/' : ''}</span>`).join('')}</div>`); },
      cd(args) { if (args.length > 1) throw new Error('Usage: cd [directory]'); const path = P.fs.resolve(args[0] || '~', cwd); const file = P.fs.get(path); if (!file) throw new Error('No such directory: ' + (args[0] || '~')); if (file.type !== 'directory') throw new Error('Not a directory: ' + args[0]); cwd = path; win.body.querySelector('.terminal-tab').innerHTML = icon('terminal') + ' guest@prystech: ' + esc(cwd.replace(P.fs.home, '~')); },
      pwd() { write(cwd); },
      cat(args) { if (args.length !== 1) throw new Error('Usage: cat <file>'); const file = P.fs.get(args[0], cwd); if (!file) throw new Error('No such file: ' + args[0]); if (file.type !== 'file') throw new Error('This is a directory. Try ls.'); write(file.content); },
      whoami() { write('guest\nA curious visitor. Welcome to Prystech.', 'success'); },
      date() { write(new Date().toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'long' })); },
      clear() { output.replaceChildren(); },
      history() { write(history.map((cmd, i) => `${String(i + 1).padStart(3)}  ${cmd}`).join('\n') || 'No commands yet.'); },
      about() { write(P.fs.get('~/about/about.txt').content); P.wm.open('about'); },
      skills() { for (const [category, items] of Object.entries(P.fs.skills)) { write(category.toUpperCase(), 'success'); write(items.join('  /  ')); } },
      projects() { P.wm.open('projects'); write('Opening selected work...', 'success'); },
      contact() { P.wm.open('contact'); write(P.config.contactEmail + '\n' + P.config.websiteUrl, 'success'); },
      neofetch() { html(neofetch()); },
      theme(args) { if (!args.length) { write('Current theme: ' + document.documentElement.dataset.theme + '\nUsage: theme purple | midnight | light'); return; } if (args.length !== 1 || !['purple','midnight','light'].includes(args[0])) throw new Error('Choose purple, midnight, or light.'); P.setTheme(args[0]); write('Theme set to ' + args[0] + '.', 'success'); },
      portfolio,
      site() { P.wm.open('site'); write('Opening prystech.co...', 'success'); },
      open(args) { if (args.length === 1 && (args[0] === 'prystech' || args[0] === 'site')) commands.site(); else if (args.length === 1 && P.apps[args[0]] && !P.apps[args[0]].private) P.wm.open(args[0]); else throw new Error('Usage: open prystech | terminal | portfolio | projects | about | contact | files | readme'); },
      reboot() { P.reboot(); },
      shutdown() { P.shutdown(); },
      echo(args) { write(args.join(' ')); },
      uptime() { const seconds = Math.floor((Date.now() - started) / 1000); write(`up ${Math.floor(seconds / 60)} minutes, ${seconds % 60} seconds. Still curious.`); },
      sudo() { write('With great power comes a backend.\nYou are a guest here, and that is a perfectly good place to be.', 'muted'); },
      coffee() { write('  ( (\n   ) )\n .----.\n |    |]\n `----\'\nOne virtual coffee, on the house.', 'success'); },
      fortune() { const fortunes = ['Make it work. Make it clear. Make it worth coming back to.', 'The best interface is the one that lets the idea through.', 'Somewhere, a side project is becoming someone\'s favorite thing.']; write(fortunes[Math.floor(Math.random()*fortunes.length)], 'success'); },
      hello() { write('Hey, you found the friendly part of the filesystem. Hello back.', 'success'); },
      '42'() { write('The answer is 42. The next question is what we should build.', 'success'); }
    });
    async function submit(raw) {
      if (busy || disposed) return;
      input.value = '';
      if (mode === 'email') { if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim())) { write('Enter a valid email address.', 'error'); prompt(); return; } email = raw.trim(); mode = 'password'; prompt(); return; }
      if (mode === 'password') {
        busy = true; operation = new AbortController(); const ownGeneration = ++generation; prompt();
        try { const result = await P.auth.login(email, raw, operation.signal); raw = ''; if (!disposed && ownGeneration === generation) write('Signed in as ' + result.user.displayName + '. Private portfolio commands are available.', 'success'); }
        catch (error) { if (!disposed && ownGeneration === generation && error.name !== 'AbortError') write(error.message, 'error'); }
        finally { raw = ''; if (ownGeneration === generation) { resetSensitive(); busy = false; prompt(); } }
        if (!disposed && P.wm.active === win.id) input.focus(); return;
      }
      if (!raw.trim()) { prompt(); return; }
      let parsed, parseError;
      try { parsed = P.parseCommand(raw); } catch (error) { parseError = error; }
      // Classify parsed tokens so quoting cannot bypass private-command redaction.
      const sensitive = parsed ? parsed[0]?.toLowerCase() === 'portfolio' && ['login','logout','status','stats','dashboard','conversions'].includes(parsed[1]?.toLowerCase()) : /portfolio/i.test(raw) && /login|logout|status|stats|dashboard|conversions/i.test(raw);
      echo(sensitive ? 'portfolio [private command]' : raw);
      if (parseError) { write(parseError.message, 'error'); prompt(); return; }
      if (!sensitive) { history.push(raw); if (history.length > 150) history.shift(); }
      historyIndex = history.length; draft = ''; const [name, ...args] = parsed;
      if (!Object.hasOwn(commands, name)) { write(`${name}: command not found. Type help to see what's available.`, 'error'); prompt(); return; }
      operation = new AbortController(); const ownGeneration = ++generation; busy = true; prompt();
      try { await commands[name](args, operation.signal); }
      catch (error) { if (!disposed && ownGeneration === generation && error.name !== 'AbortError') write(error.message || 'Something went wrong. Please try again.', 'error'); }
      finally { if (!disposed && ownGeneration === generation) { busy = false; prompt(); P.icons(); if (P.wm.active === win.id) input.focus({ preventScroll: true }); } }
    }
    function complete() {
      if (mode || busy) return;
      const value = input.value; let matches = [], prefix = '', start = value.lastIndexOf(' ') + 1;
      if (!value.includes(' ')) { prefix = value; matches = Object.keys(descriptions).filter(c => c.startsWith(prefix)); start = 0; }
      else if (value.startsWith('portfolio ')) { prefix = value.slice(10); matches = ['open'].filter(c => c.startsWith(prefix)); start = 10; }
      else if (value.startsWith('theme ')) { prefix = value.slice(6); matches = ['purple','midnight','light'].filter(c => c.startsWith(prefix)); start = 6; }
      else if (value.startsWith('open ')) { prefix = value.slice(5); matches = ['prystech', ...Object.keys(P.apps).filter(a => !P.apps[a].private)].filter(c => c.startsWith(prefix)); start = 5; }
      else {
        const head = value.split(/\s/)[0]; if (!['ls','cd','cat'].includes(head)) return;
        prefix = value.slice(start); const slash = prefix.lastIndexOf('/'); const parent = slash >= 0 ? prefix.slice(0,slash+1) : ''; const partial = prefix.slice(slash+1);
        try { matches = P.fs.list(parent || cwd, cwd).filter(f => f.name.startsWith(partial) && (head !== 'cd' || f.type === 'directory')).map(f => parent + f.name + (f.type === 'directory' ? '/' : '')); } catch { return; }
      }
      if (matches.length === 1) input.value = value.slice(0, start) + matches[0] + (matches[0].endsWith('/') ? '' : ' ');
      else if (matches.length > 1) { let common = matches[0]; while (!matches.every(m => m.startsWith(common))) common = common.slice(0,-1); if (common.length > prefix.length) input.value = value.slice(0, start) + common; else write(matches.join('  '), 'muted'); }
      input.setSelectionRange(input.value.length, input.value.length);
    }
    form.addEventListener('submit', e => { e.preventDefault(); submit(input.value); });
    const controlKeys = e => {
      if (P.wm.active !== win.id) return;
      if (e.ctrlKey && e.key.toLowerCase() === 'c') { if (window.getSelection()?.toString() && !mode && !busy) return; e.preventDefault(); cancel(); }
      if (e.ctrlKey && e.key.toLowerCase() === 'l') { e.preventDefault(); output.replaceChildren(); }
    };
    document.addEventListener('keydown', controlKeys);
    input.addEventListener('keydown', e => {
      if (e.key === 'Tab') { if (!mode && !e.shiftKey) { e.preventDefault(); complete(); } }
      if (mode || busy) return;
      if (e.key === 'ArrowUp') { e.preventDefault(); if (historyIndex === history.length) draft = input.value; historyIndex = Math.max(0, historyIndex - 1); input.value = history[historyIndex] || ''; }
      if (e.key === 'ArrowDown') { e.preventDefault(); historyIndex = Math.min(history.length, historyIndex + 1); input.value = historyIndex === history.length ? draft : history[historyIndex]; }
    });
    scroller.addEventListener('click', e => { if (!e.target.closest('button,a') && !window.getSelection()?.toString()) input.focus({ preventScroll: true }); });
    win.body.querySelectorAll('[data-command]').forEach(btn => btn.onclick = () => submit(btn.dataset.command));
    win.runCommand = submit; prompt();
    return () => { disposed = true; generation++; operation?.abort(); document.removeEventListener('keydown', controlKeys); resetSensitive(); history = []; output.replaceChildren(); };
  };
})(window.Prystech);
