/**
 * translator.js — Swappable translation provider.
 *
 * Uses the Anthropic Claude API. The API key MUST come from
 * the environment variable TRANSLATION_API_KEY — never hardcoded.
 *
 * Replace this module to swap to a different provider without
 * touching translate-posts.js.
 */

'use strict';

const https = require('https');

const API_KEY = process.env.TRANSLATION_API_KEY;
const MODEL   = 'claude-haiku-4-5'; // cost-efficient for translation

if (!API_KEY) {
  throw new Error('TRANSLATION_API_KEY environment variable is not set. Set it as a GitHub Actions secret or local env var.');
}

/**
 * Translate a single string to the target language.
 * @param {string} text    - Source text (English)
 * @param {string} toLang  - BCP-47 code, e.g. 'zh', 'ar'
 * @param {string} toLangName - Human-readable name, e.g. 'Simplified Chinese'
 * @param {string[]} glossary - Terms that must not be translated
 * @returns {Promise<string>} Translated text
 */
async function translate(text, toLang, toLangName, glossary = []) {
  const glossaryNote = glossary.length > 0
    ? `\nDo NOT translate these terms (keep them exactly as-is): ${glossary.join(', ')}`
    : '';

  const prompt = `Translate the following text from English to ${toLangName} (language code: ${toLang}).
Return ONLY the translated text with no explanation, no quotes, no preamble.
Preserve all HTML tags, markdown formatting, and special characters exactly as they appear.${glossaryNote}

Text to translate:
${text}`;

  const body = JSON.stringify({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }]
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': API_KEY,
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`API error ${res.statusCode}: ${data}`));
        }
        try {
          const parsed = JSON.parse(data);
          const translated = parsed.content?.[0]?.text?.trim();
          if (!translated) return reject(new Error('Empty response from API'));
          resolve(translated);
        } catch (e) {
          reject(new Error(`JSON parse error: ${e.message}\nResponse: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * Translate multiple fields of a post in one API call for efficiency.
 * @param {Object} fields  - { title, summary, content }
 * @param {string} toLang  - BCP-47 code
 * @param {string} toLangName
 * @param {string[]} glossary
 * @returns {Promise<{title, summary, content}>}
 */
async function translatePost(fields, toLang, toLangName, glossary = []) {
  const glossaryNote = glossary.length > 0
    ? `\nDo NOT translate these terms (keep them exactly as-is): ${glossary.join(', ')}`
    : '';

  const prompt = `Translate the following blog post fields from English to ${toLangName} (code: ${toLang}).
Return a JSON object with keys: title, summary, content.
Preserve all HTML tags, markdown formatting, line breaks, and special characters.
Do not add explanations or commentary.${glossaryNote}

Input JSON:
${JSON.stringify({ title: fields.title, summary: fields.summary, content: fields.content })}

Output (JSON only):`;

  const body = JSON.stringify({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }]
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': API_KEY,
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`API error ${res.statusCode}: ${data}`));
        }
        try {
          const parsed   = JSON.parse(data);
          const rawText  = parsed.content?.[0]?.text?.trim() || '';
          // Strip markdown code fences if present
          const jsonText = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
          const result   = JSON.parse(jsonText);
          if (!result.title || !result.summary || !result.content) {
            return reject(new Error(`Incomplete translation fields: ${rawText}`));
          }
          resolve(result);
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

module.exports = { translate, translatePost };
