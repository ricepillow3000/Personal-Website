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

export default defineConfig({
  base: '/',
  plugins: [outputAsIndex],
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
