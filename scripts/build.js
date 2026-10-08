// Minimal bundler. Content scripts can't use ES modules, so: follow the imports from each entry
// (src/content.js, src/background.js), concatenate the files dependencies-first, strip import/export,
// wrap in an IIFE, write dist/.
// Load dist/ via chrome://extensions → "Load unpacked". `node scripts/build.js --zip` also makes a zip.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// The Vrijedi.Ly API the extension talks to: `API_BASE=https://… npm run build`. Local web app by default.
const API_BASE = (process.env.API_BASE || 'http://localhost:3000').replace(/\/+$/, '');
const dist = join(root, 'dist');
const IMPORT_RE = /^import[\s\S]*?from\s+['"]([^'"]+)['"];?\s*$/gm;

/** One script for one entry: its imports dependencies-first, import/export stripped, in an IIFE. */
function bundle(entry) {
  const ordered = [];
  const visiting = new Set();
  (function visit(file) {
    if (ordered.includes(file)) return;
    if (visiting.has(file)) throw new Error(`Circular import: ${relative(root, file)}`);
    visiting.add(file);
    for (const [, spec] of readFileSync(file, 'utf8').matchAll(IMPORT_RE)) visit(resolve(dirname(file), spec));
    visiting.delete(file);
    ordered.push(file);
  })(join(root, entry));

  // Everything ends up in one scope, so two files must never declare the same top-level name.
  const owner = new Map();
  for (const file of ordered) {
    for (const [, name] of readFileSync(file, 'utf8').matchAll(/^(?:export\s+)?(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)/gm)) {
      if (owner.has(name)) throw new Error(`"${name}" is declared in both ${owner.get(name)} and ${relative(root, file)} — rename one.`);
      owner.set(name, relative(root, file));
    }
  }

  const body = ordered
    .map((file) => {
      const src = readFileSync(file, 'utf8')
        .replace(IMPORT_RE, '')
        .replace(/^export\s+(?=(async\s+)?function|const|let|class)/gm, '');
      return `// ---- ${relative(root, file)} ----\n${src}`;
    })
    .join('\n');
  const code = `(() => {\n'use strict';\n${body}\n})();\n`.replaceAll("'__API_BASE__'", JSON.stringify(API_BASE));
  return { code, files: ordered.length };
}

// content.js runs on listing pages (both windows); background.js collects market prices every 2 days.
const ENTRIES = { 'content.js': 'src/content.js', 'background.js': 'src/background.js' };
const built = Object.fromEntries(Object.entries(ENTRIES).map(([out, entry]) => [out, bundle(entry)]));

rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, 'icons'), { recursive: true });
for (const [out, { code }] of Object.entries(built)) writeFileSync(join(dist, out), code);
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
manifest.host_permissions = [...manifest.host_permissions, `${new URL(API_BASE).origin}/*`];
writeFileSync(join(dist, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
for (const s of [16, 32, 48, 128]) copyFileSync(join(root, `icons/icon${s}.png`), join(dist, `icons/icon${s}.png`));
console.log(`built dist/ for ${API_BASE}: ${Object.entries(built).map(([out, b]) => `${out} (${b.files} files)`).join(', ')}`);

if (process.argv.includes('--zip')) {
  const { version } = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
  const zipName = `shaker-extension-v${version}.zip`;
  rmSync(join(root, zipName), { force: true });
  execFileSync('zip', ['-rq', join(root, zipName), '.'], { cwd: dist });
  console.log(`zipped ${zipName}`);
}
