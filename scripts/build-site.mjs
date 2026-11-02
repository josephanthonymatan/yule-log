// Builds the public site into site/: one self-contained page, its assets and the service worker.
import { createHash } from 'node:crypto';
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const out = resolve(root, 'site');
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

let html = await readFile(resolve(root, 'index.html'), 'utf8');
const css = await readFile(resolve(root, 'src/app.css'), 'utf8');
html = html.replace('<link rel="stylesheet" href="src/app.css">', () => `<style>\n${css}</style>`);
for (const [tag, src] of [...html.matchAll(/<script src="([^"]+)"><\/script>/g)]) {
  const js = await readFile(resolve(root, src), 'utf8');
  html = html.replace(tag, () => `<script>\n${js.replaceAll('</script', '<\\/script')}</script>`);
}
await writeFile(resolve(out, 'index.html'), html);
await cp(resolve(root, 'assets'), resolve(out, 'assets'), { recursive: true });

const walk = async (dir) => (await Promise.all((await readdir(dir, { withFileTypes: true })).map((e) => {
  const p = join(dir, e.name);
  return e.isDirectory() ? walk(p) : [p];
}))).flat();
const assets = (await walk(resolve(out, 'assets'))).map((p) => `/${relative(out, p)}`).filter((p) => !p.endsWith('.txt') && !p.endsWith('/og.png')).sort();
const files = ['/', ...assets];

// A new version means a new cache, which is how returning visitors get it
const hash = createHash('sha256').update(html);
for (const f of assets) hash.update(await readFile(join(out, f)));
const version = hash.digest('hex').slice(0, 12);
const sw = (await readFile(resolve(root, 'src/sw.js'), 'utf8')).replace('__VERSION__', version).replace('__FILES__', JSON.stringify(files));
await writeFile(resolve(out, 'sw.js'), sw);
console.log(`Built site/ version ${version}: page ${(html.length / 1024).toFixed(0)} KB, ${files.length} cached files`);
