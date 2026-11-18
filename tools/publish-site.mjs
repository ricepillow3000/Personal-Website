// Copies the built site (dist/) to the repo root, where GitHub Pages serves it from the main branch.
// Run after `vite build` (npm run site). Removes the old root build first so stale hashed files never linger.
import { cpSync, rmSync, existsSync, readdirSync, writeFileSync } from 'node:fs';

if (!existsSync('dist/index.html')) throw new Error('dist/index.html missing: run `vite build` first');
for (const f of ['index.html', 'assets', 'favicon.svg', 'robots.txt']) rmSync(f, { recursive: true, force: true });
for (const f of readdirSync('dist')) cpSync(`dist/${f}`, f, { recursive: true });
writeFileSync('.nojekyll', ''); // serve files exactly as they are (no Jekyll processing)
console.log('site published to repo root:', readdirSync('dist').join(', '));
