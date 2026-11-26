import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Jede Build bekommt eine eigene Version: landet in der App, in sw.js und in version.json.
// Damit ersetzt sie das alte Hochzählen von ?v=N per Hand.
const BUILD = new Date().toISOString().replace(/\D/g, '').slice(0, 12);

function swVersion() {
  let files = [];
  return {
    name: 'nightshelf-sw-version',
    apply: 'build',
    writeBundle(_, bundle) { files = Object.keys(bundle).filter(f => f.startsWith('assets/')); },
    closeBundle() {
      const sw = resolve('dist/sw.js');
      writeFileSync(sw, readFileSync(sw, 'utf8').replace("'__BUILD__'", JSON.stringify(BUILD)).replace('self.__ASSETS__', JSON.stringify(files)));
      writeFileSync(resolve('dist/version.json'), JSON.stringify({ v: BUILD }));
    },
  };
}

export default defineConfig({
  base: '/nightshelf/',
  plugins: [react(), tailwindcss(), swVersion()],
  define: { __BUILD__: JSON.stringify(BUILD) },
  server: { port: 8765 },
  preview: { port: 8765 },
});
