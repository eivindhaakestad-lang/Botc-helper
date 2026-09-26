// Lager én selvstendig HTML-fil (all JS, CSS og fonter innebygd) for forhåndsvisning.
// Selve appen på Cloudflare bruker filene i public/ direkte – dette trengs ikke for drift.
// Bruk: node tools/build-preview.mjs  →  dist/botc-helper.html (+ dist/preview-body.html)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');
const entry = join(pub, 'js/app/main.js');

const modules = new Map(); // abs path -> { code, deps }
const order = [];
const visiting = new Set();

function load(file) {
  if (modules.has(file)) return;
  if (visiting.has(file)) throw new Error('Sirkulær import: ' + relative(pub, file));
  visiting.add(file);
  let src = readFileSync(file, 'utf8');
  const deps = [];
  src = src.replace(/import\s*\{([\s\S]*?)\}\s*from\s*'([^']+)';?/g, (_, names, spec) => {
    const dep = resolve(dirname(file), spec);
    deps.push(dep);
    const binds = names.split(',').map((x) => x.trim()).filter(Boolean).map((x) => x.replace(/\s+as\s+/, ': ')).join(', ');
    return `const { ${binds} } = __m[${JSON.stringify(relative(pub, dep))}];`;
  });
  const exported = [];
  src = src.replace(/^export\s+(async\s+function|function|const|let|class)\s+([A-Za-z0-9_$]+)/gm, (_, kw, name) => { exported.push([name, name]); return `${kw} ${name}`; });
  src = src.replace(/^export\s*\{([^}]*)\};?/gm, (_, list) => {
    list.split(',').map((x) => x.trim()).filter(Boolean).forEach((x) => {
      const [local, as] = x.split(/\s+as\s+/);
      exported.push([local.trim(), (as || local).trim()]);
    });
    return '';
  });
  if (/^\s*(import|export)\s/m.test(src)) throw new Error('Ukjent import/export-form i ' + relative(pub, file));
  for (const d of deps) load(d);
  visiting.delete(file);
  modules.set(file, { src, exported });
  order.push(file);
}

load(entry);

let bundle = 'const __m = {};\n';
for (const file of order) {
  const { src, exported } = modules.get(file);
  const name = relative(pub, file);
  bundle += `// ——— ${name} ———\n__m[${JSON.stringify(name)}] = (() => {\n${src}\nreturn { ${exported.map(([l, a]) => (l === a ? l : `${a}: ${l}`)).join(', ')} };\n})();\n`;
}

let css = readFileSync(join(pub, 'app.css'), 'utf8');
css = css.replace(/url\('fonts\/([^']+)'\)/g, (_, f) => `url(data:font/woff;base64,${readFileSync(join(pub, 'fonts', f)).toString('base64')})`);

const head = `<title>Botc Helper</title>
<meta name="description" content="Storyteller-assistent for Blood on the Clocktower i klasserommet.">
<style>
${css}
</style>`;
const body = `<div id="app"><p class="boot">Botc Helper …</p></div>
<script type="module">
${bundle.replace(/<\/script/gi, '<\\/script')}
</script>`;

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/preview-body.html'), head + '\n' + body + '\n');
writeFileSync(join(root, 'dist/botc-helper.html'), `<!doctype html>\n<html lang="no">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${head}\n</head>\n<body>\n${body}\n</body>\n</html>\n`);
console.log(`${order.length} moduler, ${(Buffer.byteLength(bundle) / 1024).toFixed(0)} kB JS`);
