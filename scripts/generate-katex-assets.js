#!/usr/bin/env node
/* eslint-env node */
/**
 * Generates src/katex-assets.ts by inlining KaTeX CSS (with woff2 fonts as
 * base64 data URIs), KaTeX JS, and auto-render JS.  Run once after updating
 * the katex package version, then commit the result.
 *
 * Usage: node scripts/generate-katex-assets.js
 */

const fs = require('fs');
const path = require('path');

const KATEX_DIST = path.join(__dirname, '../node_modules/katex/dist');
const OUT_FILE = path.join(__dirname, '../src/katex-assets.ts');

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function readBase64(filePath) {
  return fs.readFileSync(filePath).toString('base64');
}

function embedFontsInCss(css) {
  return css.replace(
    /url\(fonts\/(KaTeX_[^)]+\.woff2)\)/g,
    (_match, filename) => {
      const fontPath = path.join(KATEX_DIST, 'fonts', filename);
      if (!fs.existsSync(fontPath)) {
        console.warn(`Warning: font not found: ${fontPath}`);
        return _match;
      }
      const b64 = readBase64(fontPath);
      return `url(data:font/woff2;base64,${b64})`;
    }
  );
}

function escapeForTemplateLiteral(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
}

console.log('Reading KaTeX assets...');

const rawCss = readText(path.join(KATEX_DIST, 'katex.min.css'));
const katexJs = readText(path.join(KATEX_DIST, 'katex.min.js'));
const autoRenderJs = readText(
  path.join(KATEX_DIST, 'contrib', 'auto-render.min.js')
);

console.log('Embedding fonts into CSS...');
const cssWithFonts = embedFontsInCss(rawCss);

console.log('Writing src/katex-assets.ts...');

const output = `// AUTO-GENERATED — do not edit by hand.
// Regenerate with: node scripts/generate-katex-assets.js
// KaTeX version: ${require('../node_modules/katex/package.json').version}

export const KATEX_CSS = \`${escapeForTemplateLiteral(cssWithFonts)}\`;

export const KATEX_JS = \`${escapeForTemplateLiteral(katexJs)}\`;

export const KATEX_AUTO_RENDER_JS = \`${escapeForTemplateLiteral(autoRenderJs)}\`;
`;

fs.writeFileSync(OUT_FILE, output, 'utf8');

const sizeKb = Math.round(Buffer.byteLength(output, 'utf8') / 1024);
console.log(`Done. src/katex-assets.ts written (${sizeKb} KB).`);
