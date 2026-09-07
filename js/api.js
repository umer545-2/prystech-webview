(function (P) {
  'use strict';
  /** @typedef {{authenticated: true, user: {displayName: string}, expiresAt: string}} VerifiedSession */
  /** @typedef {{totalVisits:number, uniqueVisitors:number, contactClicks:number, websiteVisits:number, conversionRate:number, conversions:number, daily:Array<{date:string, visits:number}>, weekly:Array<{date:string, visits:number}>, projects:Array<{name:string,count:number}>, links:Array<{name:string,count:number}>, referrers:Array<{name:string,count:number}>, devices:Array<{name:string,count:number}>}} AnalyticsSummary */
  class ApiError extends Error { constructor(message, status = 0) { super(message); this.status = status; } }
  const unavailable = () => new ApiError('Owner sign-in is not connected yet. No credentials were sent.');
  let session = null;
  function base() {
    if (P.config.authMode !== 'live' || !P.config.apiBase) throw unavailable();
    const url = new URL(P.config.apiBase, location.href);
    if (url.protocol !== 'https:') throw new ApiError('Authentication requires an HTTPS backend.');
    return url.href.replace(/\/$/, '');
  }
  async function request(endpoint, { signal, method = 'GET', body, csrf } = {}) {
    const url = base() + endpoint;
    const timeout = new AbortController();
    const abort = () => timeout.abort();
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) timeout.abort();
    const timer = setTimeout(abort, 12000);
    try {
      const response = await fetch(url, { method, credentials: 'include', cache: 'no-store', mode: 'cors', redirect: 'error', signal: timeout.signal, headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}), ...(csrf ? { 'X-CSRF-Token': csrf } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      if (!response.ok) {
        if (response.status === 401) { session = null; document.dispatchEvent(new Event('prystech:logout')); }
        throw new ApiError(response.status === 429 ? 'Too many attempts. Please try again later.' : response.status === 401 ? 'Sign-in required. Your session may have expired.' : 'The request could not be completed. Please try again.', response.status);
      }
      if (response.status === 204) return null;
      return await response.json();
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
  }
  async function csrfToken(signal) { const data = await request(P.config.endpoints.csrf, { signal }); if (typeof data?.token !== 'string' || !data.token) throw new ApiError('Sign-in is temporarily unavailable.'); return data.token; }
  function validateSession(data) {
    if (data?.authenticated !== true || typeof data.user?.displayName !== 'string' || !Number.isFinite(Date.parse(data.expiresAt)) || Date.parse(data.expiresAt) <= Date.now()) throw new ApiError('Sign-in could not be verified.', 401);
    return data;
  }
  P.auth = {
    get configured() { return P.config.authMode === 'live' && Boolean(P.config.apiBase); },
    get current() { if (session && Date.parse(session.expiresAt) <= Date.now()) session = null; return session; },
    /** @returns {Promise<VerifiedSession>} */
    async login(email, password, signal) {
      if (!this.configured) throw unavailable();
      try {
        const csrf = await csrfToken(signal);
        const data = await request(P.config.endpoints.login, { method: 'POST', body: { email, password }, csrf, signal });
        password = ''; session = validateSession(data); return session;
      } catch (error) {
        password = ''; session = null;
        if (error.name === 'AbortError') throw error;
        throw new ApiError(error.status === 429 ? error.message : 'Sign-in failed. Check your credentials or try again later.', error.status);
      }
    },
    async verify(signal) { session = validateSession(await request(P.config.endpoints.session, { signal })); return session; },
    async logout(signal) {
      try { if (this.configured) await request(P.config.endpoints.logout, { method: 'POST', csrf: await csrfToken(signal), signal }); }
      finally { session = null; document.dispatchEvent(new Event('prystech:logout')); }
    },
    /** @returns {Promise<AnalyticsSummary>} */
    async analytics(range = '7d', signal) {
      if (!['7d', '30d', '90d'].includes(range)) throw new ApiError('Invalid date range.');
      await this.verify(signal);
      const data = await request(P.config.endpoints.analytics + '?range=' + range, { signal });
      for (const key of ['totalVisits', 'uniqueVisitors', 'contactClicks', 'websiteVisits', 'conversionRate', 'conversions']) if (typeof data?.[key] !== 'number' || !Number.isFinite(data[key]) || data[key] < 0) throw new ApiError('Analytics returned an invalid response.');
      for (const key of ['daily', 'weekly', 'projects', 'links', 'referrers', 'devices']) {
        if (!Array.isArray(data[key]) || data[key].length > 1000) throw new ApiError('Analytics returned an invalid response.');
        for (const row of data[key]) {
          const trend = key === 'daily' || key === 'weekly';
          if (typeof row?.[trend ? 'date' : 'name'] !== 'string' || !Number.isFinite(row[trend ? 'visits' : 'count']) || row[trend ? 'visits' : 'count'] < 0) throw new ApiError('Analytics returned an invalid response.');
        }
      }
      return data;
    }
  };
  // Explicit development mock: fails closed and never creates a pretend session.
  P.mockAuth = Object.freeze({ login: async () => { throw unavailable(); }, verify: async () => { throw unavailable(); }, analytics: async () => { throw unavailable(); } });
  const events = new Set(['app_open', 'project_open', 'portfolio_open', 'website_open', 'contact_click']);
  P.track = function (event, id = '') {
    if (!events.has(event) || !P.storage.get('analytics-consent', false) || navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true || !P.config.apiBase || !P.auth.configured) return;
    const ids = new Set([...Object.keys(P.apps).filter(key => !P.apps[key].private), ...P.config.projects.map(p => p.id)]);
    if (id && !ids.has(id)) return;
    let url; try { url = base() + P.config.endpoints.events; } catch { return; }
    fetch(url, { method: 'POST', credentials: 'omit', mode: 'cors', keepalive: true, referrerPolicy: 'no-referrer', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event, ...(id ? { id } : {}) }) }).catch(() => {});
  };
})(window.Prystech);
