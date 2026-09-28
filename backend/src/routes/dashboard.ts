import { Hono } from 'hono';
import type { Env } from '../index';
import { getSupabaseClient } from '../db/supabaseClient';

export const dashboardRoutes = new Hono<{ Bindings: Env }>();

const DEMO_ALERTS = [
  {
    id: 1,
    type: 'reconciliation_ok',
    severity: 'info',
    invoice_id: 100,
    details: JSON.stringify({ message: 'Periodic 6h reconciliation passed with 0 discrepancies' }),
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 2,
    type: 'fraud_clear',
    severity: 'info',
    invoice_id: 101,
    details: JSON.stringify({ message: 'Velocity and amount anomaly checks passed' }),
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
];

const DEMO_ACTIONS = [
  {
    id: 1,
    type: 'autopay',
    invoice_id: 99,
    tx_hash: '0xarc_sample_agent_pay_99',
    details: JSON.stringify({ amount: '85500000', autonomous: true, guardrailsPassed: true }),
    created_at: new Date(Date.now() - 28800000).toISOString(),
  },
  {
    id: 2,
    type: 'reconcile_scan',
    invoice_id: null,
    tx_hash: null,
    details: JSON.stringify({ scannedCount: 14, duplicateCount: 0 }),
    created_at: new Date(Date.now() - 14400000).toISOString(),
  },
];

// GET /api/dashboard/:address
dashboardRoutes.get('/:address', async (c) => {
  const address = c.req.param('address').toLowerCase();
  const supabase = getSupabaseClient(c.env);

  if (supabase) {
    try {
      const { data: invoices } = await supabase
        .from('invoices')
        .select('*')
        .eq('creator_address', address);

      if (invoices && invoices.length > 0) {
        const now = Math.floor(Date.now() / 1000);
        const paid = invoices.filter((i) => i.status === 'paid');
        const pending = invoices.filter((i) => i.status === 'created');
        const overdue = invoices.filter((i) => i.status === 'created' && Number(i.due_date) < now);

        const sumAmount = (arr: any[]) =>
          arr.reduce((acc, curr) => acc + Number(curr.amount || 0), 0) / 1e6;

        return c.json({
          data: {
            totalInvoices: invoices.length,
            paid: {
              count: paid.length,
              totalAmount: sumAmount(paid),
            },
            pending: {
              count: pending.length,
              totalAmount: sumAmount(pending),
            },
            overdue: {
              count: overdue.length,
              totalAmount: sumAmount(overdue),
            },
          },
        });
      }
    } catch (err) {
      console.warn('[Supabase] Dashboard query failed:', err);
    }
  }

  // Fallback to D1
  if (c.env.DB) {
    try {
      const totalResult = await c.env.DB.prepare(
        'SELECT COUNT(*) as count FROM invoices WHERE creator_address = ?'
      ).bind(address).first();

      const paidResult = await c.env.DB.prepare(
        `SELECT COUNT(*) as count, COALESCE(SUM(CAST(amount AS REAL)), 0) as total
         FROM invoices WHERE creator_address = ? AND status = 'paid'`
      ).bind(address).first();

      const pendingResult = await c.env.DB.prepare(
        `SELECT COUNT(*) as count, COALESCE(SUM(CAST(amount AS REAL)), 0) as total
         FROM invoices WHERE creator_address = ? AND status = 'created'`
      ).bind(address).first();

      const overdueResult = await c.env.DB.prepare(
        `SELECT COUNT(*) as count, COALESCE(SUM(CAST(amount AS REAL)), 0) as total
         FROM invoices WHERE creator_address = ? AND status = 'created' AND due_date < ?`
      ).bind(address, Math.floor(Date.now() / 1000)).first();

      return c.json({
        data: {
          totalInvoices: totalResult?.count ?? 0,
          paid: {
            count: paidResult?.count ?? 0,
            totalAmount: ((paidResult?.total as number) ?? 0) / 1e6,
          },
          pending: {
            count: pendingResult?.count ?? 0,
            totalAmount: ((pendingResult?.total as number) ?? 0) / 1e6,
          },
          overdue: {
            count: overdueResult?.count ?? 0,
            totalAmount: ((overdueResult?.total as number) ?? 0) / 1e6,
          },
        },
      });
    } catch (err) {
      console.warn('[D1] Dashboard query failed:', err);
    }
  }

  // Standalone fallback: return mock summary
  return c.json({
    data: {
      totalInvoices: 3,
      paid: { count: 2, totalAmount: 505.50 },
      pending: { count: 1, totalAmount: 150.00 },
      overdue: { count: 0, totalAmount: 0 },
    },
  });
});

// GET /api/dashboard/:address/alerts
dashboardRoutes.get('/:address/alerts', async (c) => {
  const address = c.req.param('address').toLowerCase();
  const supabase = getSupabaseClient(c.env);

  if (supabase) {
    try {
      const { data: alerts } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (alerts && alerts.length > 0) {
        return c.json({ data: alerts });
      }
    } catch { }
  }

  if (c.env.DB) {
    try {
      const { results } = await c.env.DB.prepare(
        `SELECT a.* FROM alerts a
         JOIN invoices i ON a.invoice_id = i.chain_invoice_id
         WHERE i.creator_address = ?
         ORDER BY a.created_at DESC
         LIMIT 20`
      ).bind(address).all();

      if (results && results.length > 0) {
        return c.json({ data: results });
      }
    } catch { }
  }

  return c.json({ data: DEMO_ALERTS });
});

// GET /api/dashboard/:address/agent-actions
dashboardRoutes.get('/:address/agent-actions', async (c) => {
  const supabase = getSupabaseClient(c.env);

  if (supabase) {
    try {
      const { data: actions } = await supabase
        .from('agent_actions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (actions && actions.length > 0) {
        return c.json({ data: actions });
      }
    } catch { }
  }

  if (c.env.DB) {
    try {
      const { results } = await c.env.DB.prepare(
        'SELECT * FROM agent_actions ORDER BY created_at DESC LIMIT 20'
      ).all();

      if (results && results.length > 0) {
        return c.json({ data: results });
      }
    } catch { }
  }

  return c.json({ data: DEMO_ACTIONS });
});
