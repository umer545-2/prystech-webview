const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
for (const filename of fs.readdirSync(path.join(root, 'js'))) {
  if (filename.endsWith('.js')) new vm.Script(fs.readFileSync(path.join(root, 'js', filename), 'utf8'), { filename });
}
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const referenced = [...html.matchAll(/(?:src|href)="((?:assets|js)\/[^"#?]+|(?:styles|brand)\.css)"/g)].map(m => m[1]);
const required = [...referenced, 'assets/wallpaper.webp', 'assets/inter.woff2', 'assets/jetbrains.woff2', 'assets/sequel-roman.otf', 'assets/sequel-medium.otf', 'assets/capzula.webp', 'assets/reward.webp', 'assets/thistl.webp', 'assets/cafenest.webp'];
for (const asset of required) if (!fs.existsSync(path.join(root, asset)) || fs.statSync(path.join(root, asset)).size === 0) throw new Error('Missing asset: ' + asset);
console.log('All application scripts parse. All required local assets are present.');
