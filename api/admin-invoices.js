import { getStripe } from './_lib/stripe.js';
import { cors, checkAdmin } from './_lib/auth.js';
import { shapeInvoice } from './_lib/shape.js';

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!checkAdmin(req, res)) return;

  try {
    const stripe = getStripe();

    if (req.method === 'GET') {
      const { id } = req.query || {};
      if (id) {
        const inv = await stripe.invoices.retrieve(id, { expand: ['lines.data'] });
        return res.status(200).json({ invoice: shapeInvoice(inv) });
      }
      const list = await stripe.invoices.list({ limit: 50 });
      const invoices = list.data.map((inv) => ({
        id: inv.id,
        invoiceNo: (inv.metadata && inv.metadata.tech24_invoice_no) || inv.number || inv.id,
        clientName: inv.customer_name || '',
        clientEmail: inv.customer_email || '',
        status: inv.status,
        total: inv.total,
        currency: inv.currency,
        created: inv.created,
        dueDate: inv.due_date,
        hostedInvoiceUrl: inv.hosted_invoice_url,
        invoicePdf: inv.invoice_pdf,
      }));
      return res.status(200).json({ invoices });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const action = body.action || 'create';

      if (action === 'void') {
        const { id } = body;
        if (!id) return res.status(400).json({ error: 'id is required' });
        const inv = await stripe.invoices.voidInvoice(id);
        return res.status(200).json({ invoice: shapeInvoice(inv) });
      }

      if (action === 'send') {
        const { id } = body;
        if (!id) return res.status(400).json({ error: 'id is required' });
        const inv = await stripe.invoices.sendInvoice(id);
        return res.status(200).json({ invoice: shapeInvoice(inv) });
      }

      // action === 'create'
      const {
        invoiceNo, clientName, clientEmail, clientAddress,
        issueDate, dueDate, currency, taxRate, notes, items,
      } = body;

      if (!clientName) return res.status(400).json({ error: 'clientName is required' });
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'At least one line item is required' });
      }
      if (!currency) return res.status(400).json({ error: 'currency is required' });

      const cur = String(currency).toLowerCase();

      let customer;
      if (clientEmail) {
        const existing = await stripe.customers.list({ email: clientEmail, limit: 1 });
        if (existing.data.length) {
          customer = existing.data[0];
          if (customer.name !== clientName) {
            customer = await stripe.customers.update(customer.id, { name: clientName });
          }
        } else {
          customer = await stripe.customers.create({ name: clientName, email: clientEmail });
        }
      } else {
        customer = await stripe.customers.create({ name: clientName });
      }

      const issue = issueDate || new Date().toISOString().slice(0, 10);
      const due = dueDate || issue;
      const daysUntilDue = Math.max(
        0,
        Math.round((new Date(due + 'T00:00:00') - new Date(issue + 'T00:00:00')) / 86400000)
      );

      const invoice = await stripe.invoices.create({
        customer: customer.id,
        currency: cur,
        collection_method: 'send_invoice',
        days_until_due: daysUntilDue,
        description: notes || undefined,
        auto_advance: false,
        metadata: {
          tech24_invoice_no: invoiceNo || '',
          tech24_issue_date: issue,
          tech24_client_address: (clientAddress || '').slice(0, 490),
          tech24_notes: (notes || '').slice(0, 490),
          tech24_tax_rate: String(taxRate || 0),
        },
      });

      for (const it of items) {
        const qty = Math.max(1, Number(it.qty) || 1);
        const rate = Math.max(0, Number(it.rate) || 0);
        const desc = it.detail ? `${it.desc || 'Item'}: ${it.detail}` : (it.desc || 'Item');
        await stripe.invoiceItems.create({
          customer: customer.id,
          invoice: invoice.id,
          price_data: {
            currency: cur,
            unit_amount: Math.round(rate * 100),
            product_data: { name: desc },
          },
          quantity: qty,
          description: desc,
        });
      }

      const taxPct = Number(taxRate) || 0;
      if (taxPct > 0) {
        const subtotalMinor = items.reduce(
          (s, it) => s + Math.round((Number(it.rate) || 0) * 100) * Math.max(1, Number(it.qty) || 1),
          0
        );
        const taxMinor = Math.round(subtotalMinor * (taxPct / 100));
        if (taxMinor > 0) {
          await stripe.invoiceItems.create({
            customer: customer.id,
            invoice: invoice.id,
            price_data: {
              currency: cur,
              unit_amount: taxMinor,
              product_data: { name: `Tax (${taxPct}%)` },
            },
            quantity: 1,
            description: `Tax (${taxPct}%)`,
          });
        }
      }

      try {
        const itemsJson = JSON.stringify(
          items.map((it) => ({ desc: it.desc, detail: it.detail, qty: it.qty, rate: it.rate }))
        );
        if (itemsJson.length <= 490) {
          await stripe.invoices.update(invoice.id, {
            metadata: { ...invoice.metadata, tech24_items: itemsJson },
          });
        }
      } catch (e) {
        // non-fatal: rich line-item rendering falls back to Stripe's own line descriptions
      }

      const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
      return res.status(200).json({ invoice: shapeInvoice(finalized) });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
