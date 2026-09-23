import { getStripe } from './_lib/stripe.js';
import { cors, checkAdmin } from './_lib/auth.js';

const ALLOWED_CURRENCIES = ['USD', 'GBP', 'EUR', 'AED', 'PKR', 'MYR'];
const ALLOWED_INTERVALS = ['day', 'week', 'month', 'year'];

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!checkAdmin(req, res)) return;

  try {
    const stripe = getStripe();

    if (req.method === 'GET') {
      const prices = await stripe.prices.list({ active: true, limit: 100, expand: ['data.product'] });
      const services = prices.data
        .filter((p) => p.product && !p.product.deleted && p.product.active !== false)
        .map((p) => ({
          priceId: p.id,
          productId: p.product.id,
          name: p.product.name,
          description: p.product.description || '',
          unitAmount: p.unit_amount,
          currency: p.currency,
          recurring: p.recurring ? p.recurring.interval : null,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      return res.status(200).json({ services });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const action = body.action || 'create';

      if (action === 'archive') {
        const { productId } = body;
        if (!productId) return res.status(400).json({ error: 'productId is required' });
        await stripe.products.update(productId, { active: false });
        return res.status(200).json({ ok: true });
      }

      // action === 'create'
      const { name, description, amount, currency, interval } = body;
      if (!name || !amount || !currency) {
        return res.status(400).json({ error: 'name, amount and currency are required' });
      }
      const nameStr = String(name).trim().slice(0, 200);
      if (!nameStr) return res.status(400).json({ error: 'name is required' });
      const cur = String(currency).toUpperCase();
      if (!ALLOWED_CURRENCIES.includes(cur)) {
        return res.status(400).json({ error: 'Unsupported currency' });
      }
      const amountNum = Number(amount);
      if (!Number.isFinite(amountNum) || amountNum <= 0 || amountNum > 1000000) {
        return res.status(400).json({ error: 'amount must be a positive number' });
      }
      if (interval && !ALLOWED_INTERVALS.includes(interval)) {
        return res.status(400).json({ error: 'Unsupported billing interval' });
      }
      const product = await stripe.products.create({
        name: nameStr,
        description: description ? String(description).trim().slice(0, 500) : undefined,
      });
      const priceParams = {
        product: product.id,
        unit_amount: Math.round(amountNum * 100),
        currency: cur.toLowerCase(),
      };
      if (interval) priceParams.recurring = { interval };
      const price = await stripe.prices.create(priceParams);

      return res.status(200).json({
        productId: product.id,
        priceId: price.id,
        name: product.name,
        description: product.description || '',
        unitAmount: price.unit_amount,
        currency: price.currency,
        recurring: price.recurring ? price.recurring.interval : null,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
