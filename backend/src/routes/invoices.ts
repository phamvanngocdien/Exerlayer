import { Hono } from 'hono';
import type { Env } from '../index';
import { getSupabaseClient } from '../db/supabaseClient';

export const invoiceRoutes = new Hono<{ Bindings: Env }>();

const DEMO_INVOICES = [
  {
    id: 101,
    chain_invoice_id: 101,
    creator_address: '0x1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d',
    payer_address: '0x0000000000000000000000000000000000000000',
    amount: '150000000',
    due_date: Math.floor(Date.now() / 1000) + 7 * 86400,
    description: 'Q3 Cloud Infrastructure & Autonomous Agent Hosting Services',
    metadata_hash: '0x0000000000000000000000000000000000000000000000000000000000000000',
    status: 'created',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    paid_at: null,
    paid_by: null,
    tx_hash: null,
  },
  {
    id: 100,
    chain_invoice_id: 100,
    creator_address: '0x1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d',
    payer_address: '0x8a9b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d',
    amount: '420000000',
    due_date: Math.floor(Date.now() / 1000) - 2 * 86400,
    description: 'Arc L1 Integration & Smart Contract Audit & Fuzz Testing',
    metadata_hash: '0x0000000000000000000000000000000000000000000000000000000000000000',
    status: 'paid',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    paid_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    paid_by: '0x8a9b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d',
    tx_hash: '0xarc_tx_sample_100',
  },
];

// GET /api/invoices?creator=0x...&payer=0x...&status=created
invoiceRoutes.get('/', async (c) => {
  const creator = c.req.query('creator');
  const payer = c.req.query('payer');
  const status = c.req.query('status');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');

  const supabase = getSupabaseClient(c.env);

  if (supabase) {
    try {
      let query = supabase.from('invoices').select('*');

      if (creator) {
        query = query.eq('creator_address', creator.toLowerCase());
      }
      if (payer) {
        query = query.eq('payer_address', payer.toLowerCase());
      }
      if (status) {
        query = query.eq('status', status);
      }

      query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

      const { data: results, error } = await query;

      if (!error && results && results.length > 0) {
        return c.json({
          data: results,
          pagination: { limit, offset, hasMore: results.length === limit },
        });
      }
    } catch (err) {
      console.warn('[Supabase] Failed query, falling back to D1 / demo:', err);
    }
  }

  // Fallback to D1
  if (c.env.DB) {
    try {
      let query = 'SELECT * FROM invoices WHERE 1=1';
      const params: (string | number)[] = [];

      if (creator) {
        query += ' AND creator_address = ?';
        params.push(creator.toLowerCase());
      }
      if (payer) {
        query += ' AND payer_address = ?';
        params.push(payer.toLowerCase());
      }
      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const { results } = await c.env.DB.prepare(query).bind(...params).all();

      if (results && results.length > 0) {
        return c.json({
          data: results,
          pagination: { limit, offset, hasMore: results.length === limit },
        });
      }
    } catch (err) {
      console.warn('[D1] Query error, falling back:', err);
    }
  }

  // Standalone fallback: return demo data matching filters
  let filtered = DEMO_INVOICES;
  if (status) {
    filtered = filtered.filter((i) => i.status === status);
  }

  return c.json({
    data: filtered,
    pagination: { limit, offset, hasMore: false },
  });
});

// GET /api/invoices/:id
invoiceRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const supabase = getSupabaseClient(c.env);

  if (supabase) {
    try {
      const { data: result } = await supabase
        .from('invoices')
        .select('*')
        .eq('chain_invoice_id', parseInt(id))
        .single();

      if (result) {
        return c.json({ data: result });
      }
    } catch (err) {
      console.warn('[Supabase] Single invoice query failed:', err);
    }
  }

  if (c.env.DB) {
    try {
      const result = await c.env.DB.prepare(
        'SELECT * FROM invoices WHERE chain_invoice_id = ?'
      )
        .bind(parseInt(id))
        .first();

      if (result) {
        return c.json({ data: result });
      }
    } catch (err) {
      console.warn('[D1] Invoice query error:', err);
    }
  }

  // Demo fallback
  const demo = DEMO_INVOICES.find((i) => i.chain_invoice_id.toString() === id);
  if (demo) {
    return c.json({ data: demo });
  }

  return c.json({ error: 'Invoice not found' }, 404);
});

// GET /api/invoices/:id/events
invoiceRoutes.get('/:id/events', async (c) => {
  const id = c.req.param('id');
  const supabase = getSupabaseClient(c.env);

  if (supabase) {
    try {
      const { data: results } = await supabase
        .from('events')
        .select('*')
        .order('block_number', { ascending: false });

      if (results) {
        const filtered = results.filter((row: any) =>
          JSON.stringify(row.data).includes(`"id":${id}`)
        );
        return c.json({ data: filtered });
      }
    } catch { }
  }

  if (c.env.DB) {
    try {
      const { results } = await c.env.DB.prepare(
        `SELECT * FROM events WHERE data LIKE ? ORDER BY block_number DESC`
      )
        .bind(`%"id":${id}%`)
        .all();

      return c.json({ data: results });
    } catch { }
  }

  return c.json({ data: [] });
});

// GET /api/invoices/:id/alerts
invoiceRoutes.get('/:id/alerts', async (c) => {
  const id = c.req.param('id');
  const supabase = getSupabaseClient(c.env);

  if (supabase) {
    try {
      const { data: results } = await supabase
        .from('alerts')
        .select('*')
        .eq('invoice_id', parseInt(id))
        .order('created_at', { ascending: false });

      if (results) {
        return c.json({ data: results });
      }
    } catch { }
  }

  if (c.env.DB) {
    try {
      const { results } = await c.env.DB.prepare(
        'SELECT * FROM alerts WHERE invoice_id = ? ORDER BY created_at DESC'
      )
        .bind(parseInt(id))
        .all();

      return c.json({ data: results });
    } catch { }
  }

  return c.json({ data: [] });
});
