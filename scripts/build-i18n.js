#!/usr/bin/env node
/**
 * build-i18n.js — Generates per-language static HTML pages.
 *
 * For each language (zh, hi, es, ar, fr, bn):
 *   reads blogs.html / post.html / index.html from root
 *   substitutes data-i18n="key" element text with translations
 *   adds <html lang="XX" dir="ltr|rtl">
 *   adds hreflang + canonical <link> tags
 *   injects per-language Google Font if needed
 *   writes to /{lang}/{file}.html
 *
 * English (en) stays at root — not regenerated.
 * Run: node scripts/build-i18n.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT    = path.resolve(__dirname, '..');
const I18N    = path.join(ROOT, 'i18n');
const config  = JSON.parse(fs.readFileSync(path.join(I18N, 'config.json'), 'utf8'));

const SOURCE_PAGES = config.pages; // ['index','blogs','post']
const LANGUAGES    = config.languages.filter(l => l.code !== 'en');
const ALL_LANGS    = config.languages;
const SITE_BASE    = 'https://alijohar.work';

// Load all translation files
const translations = {};
for (const lang of ALL_LANGS) {
  const file = path.join(I18N, `${lang.code}.json`);
  if (fs.existsSync(file)) {
    translations[lang.code] = JSON.parse(fs.readFileSync(file, 'utf8'));
  }
}

/** Replace data-i18n attribute values in HTML string */
function applyTranslations(html, t) {
  // Process tag by tag so the closing tag regex is specific to the element type,
  // preventing </em> or other nested tags from being matched as the closer.
  const TAGS = ['h1','h2','h3','p','div','span','a','button','li','dt','dd'];
  for (const tag of TAGS) {
    const re = new RegExp(
      `(<${tag}(?:\\s[^>]*)? data-i18n="([^"]+)"(?:[^>]*)>)([\\s\\S]*?)(<\\/${tag}>)`,
      'gi'
    );
    html = html.replace(re, (match, openTag, key, _old, closeTag) => {
      const val = t[key];
      return val !== undefined ? openTag + val + closeTag : match;
    });
  }
  return html;
}

/** Add/replace <html lang="XX" dir="YY"> */
function setHtmlLang(html, lang, dir) {
  return html
    .replace(/<html([^>]*)>/i, `<html lang="${lang}" dir="${dir}">`);
}

/** Inject font link for non-Latin scripts after </title> */
function injectFont(html, fontUrl) {
  if (!fontUrl) return html;
  const tag = `<link href="${fontUrl}" rel="stylesheet">`;
  return html.replace(/(<\/title>)/i, `$1\n${tag}`);
}

/** Add hreflang + canonical SEO tags before </head> */
function injectHreflang(html, currentLang, page) {
  const canonical = currentLang === 'en'
    ? `${SITE_BASE}/${page === 'index' ? '' : page}`
    : `${SITE_BASE}/${currentLang}/${page === 'index' ? '' : page}`;

  const hreflangTags = ALL_LANGS.map(l => {
    const href = l.code === 'en'
      ? `${SITE_BASE}/${page === 'index' ? '' : page}`
      : `${SITE_BASE}/${l.code}/${page === 'index' ? '' : page}`;
    return `<link rel="alternate" hreflang="${l.code}" href="${href}">`;
  }).join('\n');

  const xDefaultHref = `${SITE_BASE}/${page === 'index' ? '' : page}`;
  const xDefault = `<link rel="alternate" hreflang="x-default" href="${xDefaultHref}">`;
  const canonTag  = `<link rel="canonical" href="${canonical}">`;

  const tags = `\n${hreflangTags}\n${xDefault}\n${canonTag}`;
  return html.replace(/<\/head>/i, `${tags}\n</head>`);
}

/** Fix relative asset / internal links for pages in a subdirectory */
function fixRelativePaths(html, lang) {
  // Prepend '../' to relative hrefs/srcs that point to root files
  // (theme.css, data/, api/, fonts — anything not already absolute or absolute-path)
  // Keep post.html?slug=... and index.html links intact but fix them to point to /
  html = html
    // href="blogs.html" → href="/blogs" (clean URL)
    .replace(/href="blogs\.html"/g, `href="/${lang}/blogs"`)
    // href="index.html" or href="/" → href="/${lang}/" ... actually keep / pointing to English root
    // For lang pages, "Back to Portfolio" should go to /{lang}/ not /
    // href="post.html?slug=..." → href="/${lang}/post?slug=..."
    .replace(/href="post\.html(\?[^"]*)"/g, `href="/${lang}/post$1"`)
    // Fix theme.css link
    .replace(/href="theme\.css"/g, 'href="/theme.css"')
    // Fix data/posts.json fetch path — these are in inline JS, handled separately
    ;
  return html;
}

/** Fix data/posts.json fetch and localStorage key in generated lang pages */
function fixPostsDataPath(html) {
  // The fetch uses relative path 'data/posts.json?t=...' — in a subdir, this breaks
  // Fix to use absolute path
  return html
    .replace(/fetch\('data\/posts\.json/g, "fetch('/data/posts.json")
    .replace(/fetch\("data\/posts\.json/g, 'fetch("/data/posts.json');
}

function buildLangPage(page, langObj) {
  const srcFile = path.join(ROOT, `${page}.html`);
  if (!fs.existsSync(srcFile)) {
    console.warn(`  ⚠ Source not found: ${page}.html`);
    return;
  }

  let html = fs.readFileSync(srcFile, 'utf8');
  const t  = translations[langObj.code] || {};

  // 1. Set lang + dir attributes
  html = setHtmlLang(html, langObj.code, langObj.dir);

  // 2. Apply translations
  html = applyTranslations(html, t);

  // 3. Inject per-language font
  if (config.fonts[langObj.code]) {
    html = injectFont(html, config.fonts[langObj.code]);
  }

  // 4. Add body font class for CSS targeting
  if (config.fonts[langObj.code]) {
    html = html.replace(/<body([^>]*)>/i, `<body$1 class="font-${langObj.code}">`);
  }

  // 5. Add hreflang + canonical
  html = injectHreflang(html, langObj.code, page);

  // 6. Fix relative paths
  html = fixRelativePaths(html, langObj.code);

  // 7. Fix data fetch paths (now in subdir)
  html = fixPostsDataPath(html);

  // 8. Write output
  const outDir = path.join(ROOT, langObj.code);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${page}.html`);
  fs.writeFileSync(outFile, html, 'utf8');
  console.log(`  ✓ ${langObj.code}/${page}.html`);
}

// Also update English pages with hreflang tags (in-place)
function updateEnglishHreflang(page) {
  const srcFile = path.join(ROOT, `${page}.html`);
  if (!fs.existsSync(srcFile)) return;
  let html = fs.readFileSync(srcFile, 'utf8');

  // Only add if not already present
  if (html.includes('hreflang="en"')) return;

  html = injectHreflang(html, 'en', page);
  fs.writeFileSync(srcFile, html, 'utf8');
  console.log(`  ✓ updated hreflang in ${page}.html (en)`);
}

// ── Main ──
console.log('🌐 Building i18n pages…\n');

for (const page of SOURCE_PAGES) {
  console.log(`Page: ${page}`);
  // Update English source with hreflang
  updateEnglishHreflang(page);
  // Generate each non-English language
  for (const lang of LANGUAGES) {
    buildLangPage(page, lang);
  }
}

// ── Generate per-language sitemaps ──
console.log('\n📄 Updating sitemap…');
const today = new Date().toISOString().slice(0, 10);
let sitemapEntries = `
  <url>
    <loc>https://alijohar.work/</loc>
    <lastmod>${today}</lastmod>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://alijohar.work/blogs</loc>
    <lastmod>${today}</lastmod>
    <priority>0.8</priority>
  </url>`;

for (const lang of LANGUAGES) {
  sitemapEntries += `
  <url>
    <loc>https://alijohar.work/${lang.code}/</loc>
    <lastmod>${today}</lastmod>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://alijohar.work/${lang.code}/blogs</loc>
    <lastmod>${today}</lastmod>
    <priority>0.7</priority>
  </url>`;
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries}
</urlset>
`;

fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap, 'utf8');
console.log('  ✓ sitemap.xml updated');

console.log('\n✅ i18n build complete!');
