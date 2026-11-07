// Sperling – Build mit Vite. Ausgabe in dist/ (statisch, z. B. GitHub Pages).
// Das Plugin „sperling-sw“ übersetzt src/sw.ts und trägt alle gebauten Dateien in die Offline-Liste ein.
import { defineConfig, transformWithOxc, type Plugin } from 'vite';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

function dateien(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? dateien(p) : [p]; });
}

function serviceWorker(): Plugin {
  let outDir = 'dist';
  return {
    name: 'sperling-sw',
    apply: 'build',
    configResolved(c) { outDir = resolve(c.root, c.build.outDir); },
    async closeBundle() {
      // Demo-Seite und Quellkarten nicht offline vorhalten
      const shell = dateien(outDir).map((p) => relative(outDir, p).split('\\').join('/'))
        .filter((p) => p !== 'sw.js' && p !== 'sperling-demo.html' && !p.endsWith('LICENSE') && !p.endsWith('.map') && !p.startsWith('docs/'))
        .sort();
      const quelle = readFileSync(resolve('src/sw.ts'), 'utf8');
      const { code } = await transformWithOxc(quelle, 'sw.ts', { lang: 'ts' });
      const fertig = code
        .replace(/^export \{\};?\s*$/m, '')
        .replace('...__SHELL__', `...${JSON.stringify(shell)}`)
        .replaceAll('__VERSION__', JSON.stringify(pkg.version));
      writeFileSync(join(outDir, 'sw.js'), fertig);
    },
  };
}

export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: {
    outDir: 'dist',
    assetsDir: 'build',
    target: 'es2022',
    rollupOptions: { input: { index: resolve('index.html'), demo: resolve('sperling-demo.html') } },
  },
  plugins: [serviceWorker()],
});
