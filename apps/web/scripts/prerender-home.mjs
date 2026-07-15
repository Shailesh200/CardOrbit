#!/usr/bin/env node
/** Injects SSR homepage HTML into dist/index.html after client + server builds. */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(webRoot, 'dist');
const templatePath = join(distDir, 'index.html');
const serverEntry = join(distDir, 'server', 'entry-server.js');

const { renderHome } = await import(serverEntry);
const template = readFileSync(templatePath, 'utf8');
const appHtml = renderHome();

const replaced = template.replace(
  '<div id="root"></div>',
  `<div id="root" data-prerendered="true">${appHtml}</div>`,
);

if (replaced === template) {
  throw new Error('Could not find empty <div id="root"></div> in dist/index.html');
}

writeFileSync(templatePath, replaced);
console.log('→ Prerendered homepage into dist/index.html');
