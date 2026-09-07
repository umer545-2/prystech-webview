window.Prystech = {};
window.Prystech.config = Object.freeze({
  version: '1.0.0',
  portfolioUrl: 'https://prystech-portfolio.netlify.app/',
  websiteUrl: 'https://prystech.co/',
  contactEmail: 'hello@prystech.co',
  // Dedicated public gallery, isolated from the authenticated workspace.
  portfolioPublicUrl: 'https://prystech-portfolio.netlify.app/public/',
  portfolioEmbedEnabled: true,
  websiteEmbedEnabled: true,
  embedTimeoutMs: 8500,
  // Same-origin HTTPS backend recommended. No keys or credentials belong here.
  apiBase: '',
  authMode: 'unconfigured',
  endpoints: { csrf: '/auth/csrf', login: '/auth/login', session: '/auth/session', logout: '/auth/logout', analytics: '/analytics/summary', events: '/events' },
  projects: [
    { id: 'capzula', name: 'Capzula', category: 'Development', year: '2025', detail: 'A B2B marketplace built around the way businesses work.', tags: ['React', 'Headless WordPress'], image: 'assets/capzula.webp', url: 'https://prystech.co/portfolio-capzula-details' },
    { id: 'reward', name: 'Reward', category: 'Web design', year: '2025', detail: 'A bold digital experience for a mystery-driven platform.', tags: ['UI/UX', 'WordPress'], image: 'assets/reward.webp', url: 'https://prystech.co/portfolio-rewards-details' },
    { id: 'thistl', name: 'Thistl', category: 'Branding', year: '2026', detail: 'Medical data made clear through considered editorial design.', tags: ['Editorial', 'Data visualization'], image: 'assets/thistl.webp', url: 'https://prystech.co/portfolio-thistl' },
    { id: 'cafenest', name: 'Cafe Nest', category: 'Branding', year: '2025', detail: 'A complete visual identity with a warm, distinctive character.', tags: ['Brand identity', 'Web design'], image: 'assets/cafenest.webp', url: 'https://prystech.co/portfolio-cafenest-details' }
  ]
});
