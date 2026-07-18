#!/usr/bin/env node
/**
 * Prerender public SEO routes into static HTML files after client + SSR builds.
 * Writes dist/index.html plus dist/{privacy,terms,cookies}/index.html so Vercel
 * serves crawlable HTML (and correct meta) without executing the SPA.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(webRoot, 'dist');
const templatePath = join(distDir, 'index.html');
const serverEntry = join(distDir, 'server', 'entry-server.js');

const {
  renderRoute,
  PRERENDER_PATHS,
  buildSitemapXml,
  injectSeoIntoHtml,
  seoForPath,
} = await import(serverEntry);

const template = readFileSync(templatePath, 'utf8');

function outFileForPath(routePath) {
  if (routePath === '/') return join(distDir, 'index.html');
  const segment = routePath.replace(/^\//, '');
  return join(distDir, segment, 'index.html');
}

for (const routePath of PRERENDER_PATHS) {
  const seo = seoForPath(routePath);
  const appHtml = renderRoute(routePath);
  let html = template.replace(
    '<div id="root"></div>',
    `<div id="root" data-prerendered="true">${appHtml}</div>`,
  );
  if (!html.includes('data-prerendered="true"')) {
    throw new Error(`Could not inject prerender root for ${routePath}`);
  }
  html = injectSeoIntoHtml(html, seo);

  const outFile = outFileForPath(routePath);
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, html);
  console.log(`→ Prerendered ${routePath} → ${outFile.replace(`${distDir}/`, 'dist/')}`);
}

writeFileSync(join(distDir, 'sitemap.xml'), buildSitemapXml());
console.log('→ Wrote dist/sitemap.xml');
