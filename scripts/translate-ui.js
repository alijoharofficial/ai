#!/usr/bin/env node
/**
 * translate-ui.js — Fills missing UI translation keys using the Claude API.
 *
 * Compares each language's JSON against en.json and translates missing keys.
 * Run once after adding new keys to en.json.
 *
 * Usage: TRANSLATION_API_KEY=... node scripts/translate-ui.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '..');
const I18N   = path.join(ROOT, 'i18n');
const config = JSON.parse(fs.readFileSync(path.join(I18N, 'config.json'), 'utf8'));
const glossary = JSON.parse(fs.readFileSync(path.join(I18N, 'glossary.json'), 'utf8'));

const { translate } = require('./lib/translator');

const en       = JSON.parse(fs.readFileSync(path.join(I18N, 'en.json'), 'utf8'));
const LANGS    = config.languages.filter(l => l.code !== 'en');
const NEVER_TR = glossary.never_translate || [];

async function run() {
  for (const lang of LANGS) {
    const file = path.join(I18N, `${lang.code}.json`);
    const existing = fs.existsSync(file)
      ? JSON.parse(fs.readFileSync(file, 'utf8'))
      : { lang: lang.code };

    const missing = Object.keys(en).filter(k => !existing[k] && k !== 'lang');
    if (!missing.length) {
      console.log(`${lang.code}: all keys present ✓`);
      continue;
    }

    console.log(`${lang.code}: translating ${missing.length} missing keys…`);
    for (const key of missing) {
      try {
        const translated = await translate(en[key], lang.code, lang.name, NEVER_TR);
        existing[key] = translated;
        process.stdout.write(`  ✓ ${key}\n`);
      } catch (e) {
        console.error(`  ✗ ${key}: ${e.message}`);
      }
    }

    fs.writeFileSync(file, JSON.stringify(existing, null, 2), 'utf8');
    console.log(`  Saved ${lang.code}.json`);
  }
  console.log('\nDone!');
}

run().catch(e => { console.error(e); process.exit(1); });
