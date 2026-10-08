// Minimal bundler. Content scripts can't use ES modules, so: follow the imports from src/content.js,
// concatenate the files dependencies-first, strip import/export, wrap in an IIFE, write dist/.
// Load dist/ via chrome://extensions → "Load unpacked". `node scripts/build.js --zip` also makes a zip.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const IMPORT_RE = /^import[\s\S]*?from\s+['"]([^'"]+)['"];?\s*$/gm;

// Dependencies-first order, starting from the entry file.
const ordered = [];
const visiting = new Set();
(function visit(file) {
  if (ordered.includes(file)) return;
  if (visiting.has(file)) throw new Error(`Circular import: ${relative(root, file)}`);
  visiting.add(file);
  for (const [, spec] of readFileSync(file, 'utf8').matchAll(IMPORT_RE)) visit(resolve(dirname(file), spec));
  visiting.delete(file);
  ordered.push(file);
})(join(root, 'src/content.js'));

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

rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, 'icons'), { recursive: true });
writeFileSync(join(dist, 'content.js'), `(() => {\n'use strict';\n${body}\n})();\n`);
copyFileSync(join(root, 'manifest.json'), join(dist, 'manifest.json'));
for (const s of [16, 32, 48, 128]) copyFileSync(join(root, `icons/icon${s}.png`), join(dist, `icons/icon${s}.png`));
console.log(`built dist/ from ${ordered.length} files`);

if (process.argv.includes('--zip')) {
  const { version } = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
  const zipName = `shaker-extension-v${version}.zip`;
  rmSync(join(root, zipName), { force: true });
  execFileSync('zip', ['-rq', join(root, zipName), '.'], { cwd: dist });
  console.log(`zipped ${zipName}`);
}
