# Prystech Webview

A standalone Linux-inspired portfolio desktop built with **HTML, CSS, and vanilla JavaScript**. No framework, package installation, compilation, or backend is required for public desktop apps. This is its own Git repository, separate from the existing portfolio.

## Run

Open `index.html` directly in a modern browser. For an HTTP preview, install Node.js 18+ and run:

```sh
node scripts/serve.cjs
```

The optional static server prints its local URL (starting at `http://127.0.0.1:4173`) and selects another port if occupied. The server is for local preview only. Hosting over HTTPS is required for live authentication and recommended for Clipboard API support.

## Architecture

Classic deferred scripts intentionally support `file://` previews without module CORS issues. Each module extends the `window.Prystech` namespace through a scoped IIFE.

| File | Responsibility |
| --- | --- |
| `index.html` | Accessible desktop shell, system bar, dock, startup and power screens |
| `styles.css`, `brand.css` | Desktop layouts, purple theme, Sequel Sans fonts, responsive panels |
| `js/config.js` | Central public integration configuration and project content |
| `js/core.js` | Safe parser, text escaping, shared virtual filesystem, app catalog |
| `js/windows.js` | Focus, stacking, dragging, resizing, minimize, maximize, persistence |
| `js/apps.js` | Projects, About, Contact, Files, text viewer, browsers, settings, analytics |
| `js/terminal.js` | Command registry, history, completion, interactive password prompt |
| `js/api.js` | JSDoc-typed authentication and analytics adapter, consented event allowlist |
| `js/desktop.js` | Boot, icons, menus, calendar, sound/brightness preferences, URL state |

There is one page. Public app deep links use `?app=terminal`, `portfolio`, `projects`, `about`, `contact`, `site`, `files`, `readme`, or `settings`. Unsupported and private deep links open the guest terminal. Public navigation state is updated on HTTP/HTTPS; file previews can also accept an initial query string.

The main components are the system bar, launcher, dock, desktop icon grid, window shell, terminal, browser shell, file manager, text viewer, settings, notifications, and private analytics view. Windows are created only when opened. Iframes are never loaded before their app is opened. Closing an app disposes its requests, frames, and listeners.

## Terminal

Public commands:

```text
help  ls [-a] [-l] [path]  cd [path]  pwd  cat <path>
whoami  date  clear  history  about  skills  projects  contact
neofetch  theme [purple|midnight|light]
portfolio  portfolio open  site  open prystech  reboot  shutdown
```

There are a few harmless undisclosed commands. No command executes a shell, calls `eval`, or accesses the host filesystem. Quoted and escaped arguments are supported. History is memory-only, limited to 150 public commands, and destroyed when the terminal closes.

- Up/Down: previous/next command; Tab: public command/path completion.
- Ctrl+L: clear output; Ctrl+C: cancel input or an in-flight operation.
- Enter on a desktop icon: open. Double-click with mouse; single tap on touch.
- Focus a window title bar and use arrow keys to move; Shift+arrows resize.
- Alt+F4: close active app; Alt+backtick: cycle windows; Escape: dismiss menus.
- The dock's grid button toggles the desktop. Window controls have accessible names and native tooltips.

The terminal and file manager share this read-only virtual filesystem:

```text
/home/guest/
  about/about.txt
  projects/projects.md
  skills/skills.json
  contact/contact.txt
  portfolio/portfolio.url
  readme.md
```

## Configuration

All runtime URLs and API paths live in `js/config.js`. This is a static application: build-time environment variables are not automatically injected. Use the centralized configuration file, or supply your own deployment-time generator. **Everything in this file is public. Never add credentials or API secrets.**

| Setting | Default | Meaning |
| --- | --- | --- |
| `portfolioUrl` | Existing Netlify portfolio URL | External portfolio destination |
| `websiteUrl` | `https://prystech.co/` | Public studio website |
| `portfolioPublicUrl` | `https://prystech-portfolio.netlify.app/public/` | Dedicated public gallery |
| `portfolioEmbedEnabled` | `true` | Embed the isolated public gallery |
| `websiteEmbedEnabled` | `true` | Permit the public website iframe |
| `authMode` | `unconfigured` | Set to `live` when real endpoints are ready |
| `apiBase` | Empty | Prefer a same-origin HTTPS backend such as `/api` |
| `endpoints` | Documented paths | CSRF, login, session, logout, analytics, public events |

Browser apps provide local start/back/forward navigation, reload, an external link, and standard window controls. Their navigation history covers destinations opened by this shell; arbitrary cross-origin page history cannot be inspected by the parent.

## Required Existing Portfolio Changes

The **separate existing portfolio repository** now includes `/public/`, a static curated gallery with work already published on prystech.co. It has no Firebase SDK, private-data requests, signup, or management controls. The existing private React workspace and server-side authorization rules are unchanged. Owner authentication and analytics still require the backend endpoints below.

1. The public route is an isolated static document. Existing editing APIs continue to enforce server-side authorization.
2. The public route permits `https://prystech-webview.netlify.app` and named local preview origins in its `frame-ancestors` policy. Update this and its ready-message allowlist if the Webview domain changes.
3. `portfolioPublicUrl` points to `/public/` and embedding is enabled. External portfolio links also target the public gallery.
4. Implement the HTTPS authentication and analytics contract below, including server-side permissions, expiration, rate limiting, CSRF checks, and generic authentication errors.
5. Add the deployed API origin to `connect-src` in `netlify.toml` only if using a cross-origin backend. Add any changed embed origins to `frame-src`. Keep origin allowlists exact.

### Embedding and Ready Message

Website iframes use `sandbox="allow-scripts allow-same-origin"` and `no-referrer`. The public portfolio additionally permits popups for its external project links, and sends an origin-only referrer to address its ready message. Both deny camera, microphone, geolocation, payments, and top navigation. Do not serve an embedded document from the same origin as this shell with these sandbox flags.

An 8.5-second timeout provides a fallback if no load arrives. **Browsers do not reliably expose cross-origin CSP/X-Frame-Options rejection to JavaScript, and an iframe `load` event does not prove success.** An unverified loaded iframe retains a “Page not displaying?” fallback control. A verified public embedded route can remove that notice with:

```js
// In the existing public portfolio, with the exact deployed Webview origin:
window.parent.postMessage(
  { type: 'prystech:public-ready', mode: 'public' },
  'https://YOUR-WEBVIEW.netlify.app'
);
```

The receiver checks both the **exact origin** and `event.source === iframe.contentWindow`, and recognizes only this message shape. It does not accept remote commands or HTML. The message is a rendering signal; server authorization remains mandatory.

## Authentication Contract

Private terminal commands:

```text
portfolio login [email]
portfolio status
portfolio stats
portfolio dashboard
portfolio conversions
portfolio logout
```

The default adapter is explicitly **unconfigured**. `mockAuth` is a failing development stub; it never grants a fake authenticated session or fabricated analytics. No password is requested until an HTTPS backend is configured.

Live mode expects:

| Method and path | Contract |
| --- | --- |
| `GET /auth/csrf` | `{ "token": "session-bound-csrf-token" }` |
| `POST /auth/login` | JSON `{email,password}`, `X-CSRF-Token`; set secure cookie and return verified session |
| `GET /auth/session` | Reverify cookie and return verified session; 401 when absent/expired |
| `POST /auth/logout` | `X-CSRF-Token`; revoke session and clear cookie; 204 or JSON |
| `GET /analytics/summary?range=7d` | Server-authorized summary, supporting `7d`, `30d`, `90d` |
| `POST /events` | Optional anonymous public events, validated and rate-limited server-side |

A verified session response is:

```json
{ "authenticated": true, "user": { "displayName": "Owner" }, "expiresAt": "2030-01-01T00:10:00Z" }
```

Use a short-lived `Secure; HttpOnly; SameSite=Lax` cookie for a same-origin deployment. Host the shell and API on the same site, or use a same-origin proxy, because browsers can block third-party cookies. A cross-site deployment needs a carefully configured `SameSite=None; Secure` cookie, exact credentialed CORS, and CSRF protection. The backend must validate request origins and the CSRF token for all state-changing auth requests. Apply account/IP rate limiting, invalidate expired sessions, return generic errors, and enforce owner permission on **every** private endpoint.

The frontend clears native password input before awaiting a request, never echoes it, omits complete private commands from history, stores no auth tokens in localStorage, aborts canceled requests, and clears private UI on logout/401. The unavoidable transient JavaScript strings exist only while making the request; JavaScript cannot guarantee zeroization. Never add analytics/logging middleware that captures request bodies or terminal inputs.

### Analytics Response

```json
{
  "totalVisits": 0, "uniqueVisitors": 0, "contactClicks": 0,
  "websiteVisits": 0, "conversionRate": 0, "conversions": 0,
  "daily": [], "weekly": [],
  "projects": [], "links": [], "referrers": [], "devices": []
}
```

Daily/weekly rows use `{date: string, visits: number}`. Ranked rows use `{name: string, count: number}`. `conversionRate` is a percentage, not a fraction. All numbers must be finite and nonnegative. Private responses should use `Cache-Control: no-store`. The analytics view never includes sample totals and rechecks the server session on every range change/refresh. It includes summary metrics, daily/weekly bars with accessible data tables, popular projects, links/CTAs, referrers, devices, and empty/error states.

Analytics are off by default. Consent can be changed in Settings. `Do Not Track` and Global Privacy Control override consent. Only `app_open`, `project_open`, `portfolio_open`, `website_open`, and `contact_click` events with allowlisted IDs are sent, without credentials or URL/referrer query strings. No email addresses, passwords, authentication commands, terminal input, or private app names are sent. Backend analytics must define retention, aggregation, anonymization, and consent handling appropriate to deployment. A static frontend cannot enforce the backend's data policy.

## Netlify

1. Push this separate repository to your own Git host and import it into Netlify, or upload this directory as a static site.
2. Publish directory: `.`. Build command: `node scripts/check.cjs` (validates assets and JavaScript, no compilation).
3. `netlify.toml` supplies security headers, asset caching, and restricted access to test/helper paths. No SPA rewrite is necessary because routes are query parameters.
4. Verify real embed permissions and backend contracts on the deployed HTTPS origin before enabling integrations.

Source repository: https://github.com/umer545-2/prystech-webview . Intended production origin: https://prystech-webview.netlify.app . Verify the public iframe on that HTTPS origin after deployment; file previews cannot verify HTTP response headers.

## Validation

```sh
node scripts/check.cjs
node --test tests/core.test.cjs
```

Browser checks are in `tests/browser.cjs`. Install Playwright in your preferred development environment and install its Chromium browser. Then run `node tests/browser.cjs`. `PLAYWRIGHT_MODULE` can point to an existing package and `BROWSER_CHANNEL=msedge` can use Microsoft Edge. No test dependencies ship to visitors.

The browser suite covers startup timing and repeat visits, assets, terminal quoting/history/completion, shared files, private command redaction, authenticated UI using an intercepted test backend, window controls/bounds, draggable icons, project filters, theme persistence, safe portfolio fallback, iframe sandboxing, reboot, reduced motion, and 1440/768/390/360px layouts. Screenshots and test summaries are written to the ignored `test-results/` folder. Test-backend responses exist only in the test harness.

## Assets and Content

The custom graphite wallpaper was generated and recolored to violet with the built-in image generator, then optimized to local WebP. The UI uses the supplied Prystech logo and the same Sequel Sans fonts as prystech.co; the terminal uses JetBrains Mono. Project imagery and facts come from public Prystech pages. See `assets/SOURCES.md` for sources, image prompts, and bundled library/font licenses.
