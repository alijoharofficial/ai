import crypto from 'crypto';

const ALLOWED_ORIGIN = 'https://www.tech24.cc';

export function cors(req, res) {
  const origin = req.headers['origin'];
  // Allow the production domain plus any Vercel preview URL for this project,
  // since the admin UI itself is only ever loaded from one of those.
  if (origin === ALLOWED_ORIGIN || (origin && /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
}

// Best-effort in-memory brute-force throttle. Resets on cold start and is not
// shared across concurrent serverless instances, so it is a deterrent, not a
// guarantee -- real protection should come from a WAF / Vercel Attack
// Challenge Mode in front of these endpoints.
const attempts = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_ATTEMPTS = 20;

function isRateLimited(req) {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now - rec.start > WINDOW_MS) {
    attempts.set(ip, { start: now, count: 1 });
    return false;
  }
  rec.count += 1;
  return rec.count > MAX_ATTEMPTS;
}

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    // Still run a comparison of equal length so failure timing doesn't leak length.
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

// Returns true if the request is authorized. Writes the error response itself
// and returns false otherwise, so callers can just `if (!checkAdmin(req,res)) return;`
export function checkAdmin(req, res) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    res.status(500).json({ error: 'ADMIN_PASSWORD is not configured on the server.' });
    return false;
  }
  if (isRateLimited(req)) {
    res.status(429).json({ error: 'Too many attempts. Please wait a minute and try again.' });
    return false;
  }
  const key = req.headers['x-admin-key'];
  if (!key || !timingSafeEqual(key, expected)) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}
