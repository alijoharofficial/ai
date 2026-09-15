import { getStripe } from './_lib/stripe.js';
import { cors, checkAdmin } from './_lib/auth.js';

// Success/cancel destinations after a client pays via a generated Payment Link.
const SUCCESS_URL = 'https://www.tech24.cc/index.html?invoice=paid';

// Turns a Stripe Payment Link object into the flat shape the admin UI renders.
// All the invoice-specific fields (client info, dates, itemized lines, totals)
// live in the link's own metadata, since Payment Links don't carry them natively.
function shapeLink(pl) {
  const meta = pl.metadata || {};
  let items = [];
  try {
    if (meta.tech24_items) items = JSON.parse(meta.tech24_items);
  } catch (e) {
    items = [];
  }
  return {
    id: pl.id,
    invoiceNo: meta.tech24_invoice_no || pl.id,
    clientName: meta.tech24_client_name || '',
    clientEmail: meta.tech24_client_email || '',
    clientAddress: meta.tech24_client_address || '',
    issueDate: meta.tech24_issue_date || new Date().toISOString().slice(0, 10),
    dueDate: meta.tech24_due_date || '',
    currency: pl.currency,
    subtotal: Number(meta.tech24_subtotal || 0),
    total: Number(meta.tech24_total || 0),
    taxRate: meta.tech24_tax_rate || '0',
    notes: meta.tech24_notes || '',
    status: pl.active ? 'active' : 'void',
    items,
    hostedInvoiceUrl: pl.active ? pl.url : '',
  };
}

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!checkAdmin(req, res)) return;

  try {
    const stripe = getStripe();

    if (req.method === 'GET') {
      const { id } = req.query || {};
      if (id) {
        const pl = await stripe.paymentLinks.retrieve(id);
        return res.status(200).json({ invoice: shapeLink(pl) });
      }
      // Payment Links come back newest-first already; they have no `created`
      // timestamp field to sort by (unlike most Stripe resources).
      const list = await stripe.paymentLinks.list({ limit: 50 });
      const invoices = list.data
        .filter((pl) => pl.metadata && pl.metadata.tech24_invoice_no !== undefined)
        .map(shapeLink);
      return res.status(200).json({ invoices });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const action = body.action || 'create';

      if (action === 'void') {
        const { id } = body;
        if (!id) return res.status(400).json({ error: 'id is required' });
        const pl = await stripe.paymentLinks.update(id, { active: false });
        return res.status(200).json({ invoice: shapeLink(pl) });
      }

      if (action === 'delete') {
        const { id } = body;
        if (!id) return res.status(400).json({ error: 'id is required' });
        // Stripe has no endpoint to truly delete a Payment Link, only to
        // deactivate one. Deactivating it and clearing the metadata key our
        // list filter relies on removes it from the admin permanently while
        // leaving an inert, untracked object behind in the Stripe account
        // (the closest equivalent Stripe's API actually allows).
        await stripe.paymentLinks.update(id, {
          active: false,
          metadata: { tech24_invoice_no: '' },
        });
        return res.status(200).json({ ok: true });
      }

      if (action === 'create' || action === 'update') {
        const {
          id, invoiceNo, clientName, clientEmail, clientAddress,
          issueDate, dueDate, currency, taxRate, notes, items,
        } = body;

        if (!clientName) return res.status(400).json({ error: 'clientName is required' });
        if (!Array.isArray(items) || items.length === 0) {
          return res.status(400).json({ error: 'At least one line item is required' });
        }
        if (!currency) return res.status(400).json({ error: 'currency is required' });

        const cur = String(currency).toLowerCase();

        // Editing an invoice means retiring the old link and minting a fresh one:
        // Payment Links can't have their line items changed after creation.
        if (action === 'update' && id) {
          try {
            await stripe.paymentLinks.update(id, { active: false });
          } catch (e) {
            // non-fatal: proceed to create the replacement link regardless
          }
        }

        const subtotalMinor = items.reduce(
          (s, it) => s + Math.round((Number(it.rate) || 0) * 100) * Math.max(1, Number(it.qty) || 1),
          0
        );
        const taxPct = Number(taxRate) || 0;
        const taxMinor = taxPct > 0 ? Math.round(subtotalMinor * (taxPct / 100)) : 0;
        const totalMinor = subtotalMinor + taxMinor;

        const lineItems = [];
        for (const it of items) {
          const qty = Math.max(1, Number(it.qty) || 1);
          const rate = Math.max(0, Number(it.rate) || 0);
          const desc = it.detail ? `${it.desc || 'Item'}: ${it.detail}` : (it.desc || 'Item');
          const price = await stripe.prices.create({
            currency: cur,
            unit_amount: Math.round(rate * 100),
            product_data: { name: desc },
          });
          lineItems.push({ price: price.id, quantity: qty });
        }
        if (taxMinor > 0) {
          const taxPrice = await stripe.prices.create({
            currency: cur,
            unit_amount: taxMinor,
            product_data: { name: `Tax (${taxPct}%)` },
          });
          lineItems.push({ price: taxPrice.id, quantity: 1 });
        }

        const issue = issueDate || new Date().toISOString().slice(0, 10);
        const due = dueDate || issue;

        const metadata = {
          tech24_invoice_no: invoiceNo || '',
          tech24_issue_date: issue,
          tech24_due_date: due,
          tech24_client_name: clientName,
          tech24_client_email: clientEmail || '',
          tech24_client_address: (clientAddress || '').slice(0, 400),
          tech24_notes: (notes || '').slice(0, 400),
          tech24_tax_rate: String(taxPct),
          tech24_subtotal: String(subtotalMinor),
          tech24_total: String(totalMinor),
        };
        const itemsJson = JSON.stringify(
          items.map((it) => ({ desc: it.desc, detail: it.detail, qty: it.qty, rate: it.rate }))
        );
        if (itemsJson.length <= 480) {
          metadata.tech24_items = itemsJson;
        }

        const paymentLink = await stripe.paymentLinks.create({
          line_items: lineItems,
          phone_number_collection: { enabled: true },
          billing_address_collection: 'required',
          custom_fields: [
            {
              key: 'full_name',
              label: { type: 'custom', custom: 'Full Name' },
              type: 'text',
              optional: false,
            },
            {
              key: 'business_name',
              label: { type: 'custom', custom: 'Business / Company Name' },
              type: 'text',
              optional: true,
            },
          ],
          metadata,
          after_completion: { type: 'redirect', redirect: { url: SUCCESS_URL } },
        });

        return res.status(200).json({ invoice: shapeLink(paymentLink) });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
