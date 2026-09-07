const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
function context(overrides = {}) {
  const context = vm.createContext({ window: {}, localStorage: { getItem: () => null, setItem: () => {} }, URL, Date, AbortController, setTimeout, clearTimeout, navigator: {}, location: { href: 'https://desktop.example/' }, document: { dispatchEvent: () => {} }, Event, ...overrides });
  for (const file of ['config','core','api']) vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/'+file+'.js'),'utf8'),context);
  return context;
}
test('parser preserves quoted arguments, empty arguments and escaped whitespace', () => {
  const { parseCommand } = context().window.Prystech;
  assert.deepEqual(Array.from(parseCommand('echo "hello world" \'second phrase\' ""')), ['echo','hello world','second phrase','']);
  assert.deepEqual(Array.from(parseCommand('cat hello\\ world.txt')), ['cat','hello world.txt']);
  assert.throws(() => parseCommand('echo "unfinished'), /Unclosed quote/);
  assert.throws(() => parseCommand('echo unfinished\\'), /Incomplete escape/);
});
test('shell metacharacters are plain text, never executable expressions', () => {
  const P = context().window.Prystech;
  assert.deepEqual(Array.from(P.parseCommand('echo "$(fetch)" "<script>"')), ['echo','$(fetch)','<script>']);
  assert.equal(P.escape('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
});
test('virtual filesystem normalizes home, parents, absolute paths and root traversal', () => {
  const { fs: vfs } = context().window.Prystech;
  assert.equal(vfs.resolve('~/projects/../about'), '/home/guest/about');
  assert.equal(vfs.resolve('../../../../..'), '/');
  assert.equal(vfs.resolve('../skills','/home/guest/projects'), '/home/guest/skills');
  assert.equal(vfs.get('~/about/about.txt').type,'file');
  assert.ok(vfs.list('~').some(item => item.name === 'readme.md'));
  assert.throws(() => vfs.list('~/missing'), /No such/);
  assert.equal(vfs.list('~/about').length,1);
});
test('unconfigured authentication and mock adapter fail closed without network requests', async () => {
  let requests = 0; const P = context({ fetch: () => { requests++; } }).window.Prystech;
  await assert.rejects(P.auth.login('owner@example.test','test-value'), /not connected/);
  await assert.rejects(P.mockAuth.login(), /not connected/);
  assert.equal(P.auth.current,null); assert.equal(requests,0);
});
test('private analytics rechecks the server session, not client-side state', async () => {
  const requests = [];
  const P = context({ fetch: async url => { requests.push(url); return {ok:false,status:401}; } }).window.Prystech;
  P.config = {...P.config,authMode:'live',apiBase:'https://desktop.example/api'};
  await assert.rejects(P.auth.analytics('30d'), /Sign-in required/);
  assert.equal(requests.length,1); assert.ok(requests[0].endsWith('/auth/session')); assert.equal(P.auth.current,null);
});
test('live login requires HTTPS and rejects unverified responses', async () => {
  let requests = 0; const P = context({ fetch: async () => { requests++; return {ok:true,status:200,json:async()=>({token:'csrf-test',authenticated:false})}; } }).window.Prystech;
  P.config = {...P.config,authMode:'live',apiBase:'http://desktop.example/api'};
  await assert.rejects(P.auth.verify(), /HTTPS/); assert.equal(requests,0);
  P.config = {...P.config,apiBase:'https://desktop.example/api'};
  await assert.rejects(P.auth.login('owner@example.test','test-value'), /Sign-in failed/); assert.equal(P.auth.current,null);
});
test('analytics only sends consented public allowlisted event data', async () => {
  const requests = []; const P = context({ fetch: async (...args) => { requests.push(args); return {ok:true}; } }).window.Prystech;
  P.config = {...P.config,authMode:'live',apiBase:'https://desktop.example/api'};
  P.track('project_open','capzula'); assert.equal(requests.length,0);
  P.storage.get = () => true;
  P.track('portfolio login owner@example.test','terminal'); P.track('app_open','owner@example.test'); P.track('app_open','analytics');
  assert.equal(requests.length,0);
  P.track('project_open','capzula');
  assert.equal(requests.length,1); assert.deepEqual(JSON.parse(requests[0][1].body),{event:'project_open',id:'capzula'}); assert.equal(requests[0][1].credentials,'omit');
});
