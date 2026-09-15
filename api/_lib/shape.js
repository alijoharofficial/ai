// Turns a Stripe Invoice object into the flat shape the admin UI renders.
export function shapeInvoice(inv) {
  let items = null;
  try {
    if (inv.metadata && inv.metadata.tech24_items) {
      items = JSON.parse(inv.metadata.tech24_items);
    }
  } catch (e) {
    items = null;
  }
  if (!items) {
    items = (inv.lines && inv.lines.data ? inv.lines.data : []).map((l) => {
      const qty = l.quantity || 1;
      return {
        desc: l.description || 'Item',
        detail: '',
        qty,
        rate: Math.round(((l.amount || 0) / qty)) / 100,
      };
    });
  }

  const meta = inv.metadata || {};
  // Stripe only snapshots customer_name/customer_email onto the invoice once it's
  // finalized. For a still-draft invoice, fall back to the (expanded) Customer object.
  const customerObj = inv.customer && typeof inv.customer === 'object' ? inv.customer : null;

  return {
    id: inv.id,
    invoiceNo: meta.tech24_invoice_no || inv.number || inv.id,
    stripeNumber: inv.number || '',
    clientName: inv.customer_name || (customerObj && customerObj.name) || '',
    clientEmail: inv.customer_email || (customerObj && customerObj.email) || '',
    clientAddress: meta.tech24_client_address || '',
    issueDate: meta.tech24_issue_date || new Date(inv.created * 1000).toISOString().slice(0, 10),
    dueDate: inv.due_date ? new Date(inv.due_date * 1000).toISOString().slice(0, 10) : '',
    currency: inv.currency,
    subtotal: inv.subtotal,
    total: inv.total,
    taxRate: meta.tech24_tax_rate || '0',
    notes: meta.tech24_notes || inv.description || '',
    status: inv.status,
    items,
    hostedInvoiceUrl: inv.hosted_invoice_url,
    invoicePdf: inv.invoice_pdf,
    created: inv.created,
  };
}
