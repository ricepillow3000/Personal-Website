import { defineConfig } from 'vite';
import { resolve } from 'node:path';

/* The source page is app.html. The repo root holds the BUILT site (index.html + assets/),
   because GitHub Pages publishes this repo's main branch as-is. The build still writes dist/index.html. */
const outputAsIndex = {
  name: 'output-as-index',
  enforce: 'post',
  generateBundle(_, bundle) {
    const page = bundle['app.html'];
    if (!page) return;
    page.fileName = 'index.html';
    delete bundle['app.html'];
    bundle['index.html'] = page;
  },
};

/* Each chapter page is its own file (src/scenes/sections.js). On a deep link (#/missions...) the browser
   would only learn it needs that file after the main code had downloaded and run: one extra round trip on
   a slow phone. This writes a small map into the page that starts the address's chapter (and the files it
   imports, other than the main code) downloading alongside the main code (Nov 21, the code split). */
const chapterPreload = {
  name: 'chapter-preload',
  transformIndexHtml: {
    order: 'post',
    handler(html, ctx) {
      if (!ctx.bundle) return html; // (dev server: nothing is bundled)
      const chunks = Object.values(ctx.bundle).filter((c) => c.type === 'chunk');
      const entry = chunks.find((c) => c.isEntry);
      const map = {};
      for (const c of chunks) {
        const m = c.facadeModuleId?.match(/src\/scenes\/chapters\/([\w-]+)\.js$/);
        if (!m || m[1] === 'common') continue;
        map[m[1]] = [c.fileName, ...c.imports.filter((f) => f !== entry?.fileName)].map((f) => `/${f}`);
      }
      if (!Object.keys(map).length) return html;
      const js = `(function(){var m=${JSON.stringify(map)},f=m[location.hash.replace(/^#\\/?/,'')];if(f)f.forEach(function(h){var l=document.createElement('link');l.rel='modulepreload';l.href=h;document.head.appendChild(l)})})()`;
      return { html, tags: [{ tag: 'script', children: js, injectTo: 'head' }] };
    },
  },
};

export default defineConfig({
  base: '/',
  plugins: [outputAsIndex, chapterPreload],
  server: { open: '/app.html' },
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'app.html')
      }
    }
  }
});
