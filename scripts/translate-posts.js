#!/usr/bin/env node
/**
 * translate-posts.js — Auto-translates blog posts into all configured languages.
 *
 * Reads data/posts.json, finds posts that need translation, calls the
 * translation API, and writes the results back to data/posts.json.
 *
 * Called by .github/workflows/translate.yml whenever posts.json changes.
 *
 * SECURITY: The TRANSLATION_API_KEY must NEVER appear in HTML/JS/browser.
 * It is read only from process.env here, supplied as a GitHub Actions secret.
 *
 * Skip logic:
 *   - Drafts are skipped (status !== 'published')
 *   - Posts with manuallyEdited[lang]=true are skipped
 *   - Posts whose sourceHash matches the current content hash are skipped
 *   - Translations with status 'done' for a lang are skipped unless source changed
 */

'use strict';

const fs       = require('fs');
const path     = require('path');
const crypto   = require('crypto');

const ROOT       = path.resolve(__dirname, '..');
const POSTS_FILE = path.join(ROOT, 'data', 'posts.json');
const I18N       = path.join(ROOT, 'i18n');
const config     = JSON.parse(fs.readFileSync(path.join(I18N, 'config.json'), 'utf8'));
const glossary   = JSON.parse(fs.readFileSync(path.join(I18N, 'glossary.json'), 'utf8'));

const { translatePost } = require('./lib/translator');

const LANGUAGES = config.languages.filter(l => l.code !== 'en');
const NEVER_TRANSLATE = glossary.never_translate || [];
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

function hash(str) {
  return crypto.createHash('sha256').update(str || '').digest('hex').slice(0, 16);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry(fn, retries = MAX_RETRIES, delay = RETRY_DELAY_MS) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries) throw err;
      console.warn(`  ⚠ Attempt ${i+1} failed: ${err.message}. Retrying in ${delay}ms…`);
      await sleep(delay * (i + 1));
    }
  }
}

async function run() {
  if (!fs.existsSync(POSTS_FILE)) {
    console.log('No posts.json found. Nothing to translate.');
    process.exit(0);
  }

  // Backup before modifying
  const backupDir = path.join(ROOT, 'data', 'backup');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const today      = new Date().toISOString().slice(0, 10);
  const backupFile = path.join(backupDir, `posts-${today}.json`);
  if (!fs.existsSync(backupFile)) {
    fs.copyFileSync(POSTS_FILE, backupFile);
    console.log(`📦 Backed up to data/backup/posts-${today}.json`);
  }

  const posts = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'));
  let changed  = false;

  for (const post of posts) {
    // Skip drafts
    if (post.status !== 'published') {
      console.log(`⏭  Skipping draft: ${post.title}`);
      continue;
    }

    // Compute hash of English source content
    const srcHash = hash(post.title + '|||' + post.summary + '|||' + post.content);

    // Ensure translations object exists
    if (!post.translations) post.translations = {};

    // Check if source changed since last translation run
    const sourceHashChanged = post.sourceHash !== srcHash;

    for (const lang of LANGUAGES) {
      const existing = post.translations[lang.code];

      // Skip if manually edited
      if (existing?.manuallyEdited) {
        console.log(`  ⏭  ${lang.code}: manually edited, skipping`);
        continue;
      }

      // Skip if already translated and source hasn't changed
      if (existing?.status === 'done' && !sourceHashChanged) {
        continue;
      }

      console.log(`\n🌐 Translating "${post.title}" → ${lang.name} (${lang.code})…`);

      try {
        const result = await withRetry(() =>
          translatePost(
            { title: post.title, summary: post.summary, content: post.content },
            lang.code,
            lang.name,
            NEVER_TRANSLATE
          )
        );

        post.translations[lang.code] = {
          title:   result.title,
          summary: result.summary,
          content: result.content,
          status:  'done',
          translatedAt: new Date().toISOString(),
          manuallyEdited: false
        };

        console.log(`  ✓ ${lang.code}: done`);
        changed = true;

      } catch (err) {
        console.error(`  ✗ ${lang.code}: FAILED — ${err.message}`);
        post.translations[lang.code] = {
          ...(existing || {}),
          status:  'failed',
          error:   err.message,
          translatedAt: new Date().toISOString()
        };
        changed = true;
      }

      // Throttle to avoid rate limits
      await sleep(500);
    }

    // Update source hash
    if (sourceHashChanged) {
      post.sourceHash = srcHash;
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2), 'utf8');
    console.log('\n✅ posts.json updated with translations.');
  } else {
    console.log('\n✅ No translations needed. All posts up to date.');
  }
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
