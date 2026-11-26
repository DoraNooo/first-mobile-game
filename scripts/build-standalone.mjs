import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT_FILE = process.argv[2] || path.join(ROOT, 'dist', 'charlie-standalone.html');

const MODULES = [
  { id: './scales.js', file: 'src/scales.js' },
  { id: './story.js', file: 'src/story.js' },
  { id: './audio.js', file: 'src/audio.js' },
  { id: './blob.js', file: 'src/blob.js' },
  { id: './particles.js', file: 'src/particles.js' },
  { id: './skins/microSkins.js', file: 'src/skins/microSkins.js' },
  { id: './skins/macroSkins.js', file: 'src/skins/macroSkins.js' },
  { id: './skins/cosmicSkins.js', file: 'src/skins/cosmicSkins.js' },
  { id: './entities.js', file: 'src/entities.js' },
  { id: './game.js', file: 'src/game.js' },
];

function transformModule(code, modId) {
  const exportedNames = new Set();

  // Rewrite `import { a, b as c } from './foo.js';` -> `const { a, b: c } = __req('./foo.js');`
  let out = code.replace(
    /^\s*import\s*\{([\s\S]*?)\}\s*from\s*['"]([^'"]+)['"];?\s*$/gm,
    (_, specifiers, target) => {
      const resolved = resolveModId(modId, target);
      const destruct = specifiers
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => s.replace(/\s+as\s+/, ': '))
        .join(', ');
      return `const { ${destruct} } = __req(${JSON.stringify(resolved)});`;
    }
  );

  // Collect and strip `export const|let|var|function|class NAME`
  out = out.replace(
    /^(\s*)export\s+(const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm,
    (_, indent, kw, name) => {
      exportedNames.add(name);
      return `${indent}${kw} ${name}`;
    }
  );

  // Handle `export { a, b };`
  out = out.replace(/^\s*export\s*\{([^}]+)\};?\s*$/gm, (_, list) => {
    list
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((s) => exportedNames.add(s));
    return '';
  });

  const exportObj = Array.from(exportedNames).join(', ');
  return `  __mods[${JSON.stringify(modId)}] = function(__req) {\n${out}\n    return { ${exportObj} };\n  };`;
}

function resolveModId(fromId, target) {
  const fromDir = path.posix.dirname(fromId);
  const joined = path.posix.normalize(path.posix.join(fromDir, target));
  return joined.startsWith('.') ? joined : `./${joined}`;
}

const moduleDefs = MODULES.map(({ id, file }) => {
  const raw = fs.readFileSync(path.join(ROOT, file), 'utf8');
  return transformModule(raw, id);
}).join('\n\n');

const bundleJs = `(() => {
  const __mods = Object.create(null);
  const __cache = Object.create(null);
  function __req(id) {
    if (__cache[id]) return __cache[id];
    const fn = __mods[id];
    if (!fn) throw new Error('Missing bundled module: ' + id);
    const exp = fn(__req);
    __cache[id] = exp;
    return exp;
  }

${moduleDefs}

  __req('./game.js');
})();`;

// Validate bundled JS syntax before writing!
new Function(bundleJs);

let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');

// Strip external links blocked by CSP in standalone preview
html = html
  .replace(/<link rel="manifest"[^>]*>\s*/g, '')
  .replace(/<link rel="preconnect"[^>]*>\s*/g, '')
  .replace(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>\s*/g, '')
  .replace(
    /<link rel="stylesheet" href="\.\/style\.css" \/>/,
    `<style>\n${css}\n  </style>`
  )
  .replace(
    /<script type="module" src="\.\/src\/game\.js"><\/script>/,
    `<script>\n${bundleJs}\n  </script>`
  );

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, html, 'utf8');
console.log('STANDALONE_BUNDLE_OK', { out: OUT_FILE, jsBytes: bundleJs.length, htmlBytes: html.length });
