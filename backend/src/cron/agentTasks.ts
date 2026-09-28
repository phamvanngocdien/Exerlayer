import type { Env } from '../index';
import { getSupabaseClient } from '../db/supabaseClient';
import { runReconcile } from '../agent/reconcile';
import { runFraudCheck } from '../agent/fraudCheck';
import { runAutopay } from '../agent/autopay';

/// Orchestrator for all agent tasks — runs daily at 9 AM via cron trigger
export async function runAgentTasks(env: Env): Promise<void> {
  console.log('[Agent] Starting daily agent tasks...');

  const now = Math.floor(Date.now() / 1000);
  const supabase = getSupabaseClient(env);

  // 1. Mark overdue invoices
  if (supabase) {
    try {
      await supabase
        .from('invoices')
        .update({ status: 'overdue' })
        .eq('status', 'created')
        .lt('due_date', now);
    } catch (err) {
      console.warn('[Agent] Supabase overdue update failed:', err);
    }
  }
  if (env.DB) {
    try {
      const overdueResult = await env.DB.prepare(
        `UPDATE invoices SET status = 'overdue'
         WHERE status = 'created' AND due_date < ?`
      )
        .bind(now)
        .run();
      console.log(`[Agent] Marked ${overdueResult.meta.changes} invoices as overdue`);
    } catch { }
  }

  // 2. Create reminder alerts for invoices due within 3 days
  const threeDaysFromNow = now + 3 * 24 * 60 * 60;
  let upcomingInvoices: any[] = [];

  if (supabase) {
    try {
      const { data } = await supabase
        .from('invoices')
        .select('*')
        .eq('status', 'created')
        .gte('due_date', now)
        .lte('due_date', threeDaysFromNow);
      upcomingInvoices = data || [];
    } catch { }
  }
  if (upcomingInvoices.length === 0 && env.DB) {
    try {
      const { results } = await env.DB.prepare(
        `SELECT * FROM invoices
         WHERE status = 'created' AND due_date BETWEEN ? AND ?`
      )
        .bind(now, threeDaysFromNow)
        .all();
      upcomingInvoices = results || [];
    } catch { }
  }

  for (const inv of upcomingInvoices) {
    const daysLeft = Math.ceil(
      ((inv.due_date as number) - now) / 86400
    );

    if (supabase) {
      try {
        await supabase.from('alerts').insert({
          type: 'reminder',
          severity: 'warning',
          invoice_id: inv.chain_invoice_id,
          details: {
            message: `Invoice #${inv.chain_invoice_id} due in ${daysLeft} day(s)`,
            amount: inv.amount,
            payer: inv.payer_address,
            dueDate: inv.due_date,
          },
        });
      } catch { }
    }
    if (env.DB) {
      try {
        await env.DB.prepare(
          `INSERT INTO alerts (type, severity, invoice_id, details)
           VALUES ('reminder', 'warning', ?, ?)`
        )
          .bind(
            inv.chain_invoice_id as number,
            JSON.stringify({
              message: `Invoice #${inv.chain_invoice_id} due in ${daysLeft} day(s)`,
              amount: inv.amount,
              payer: inv.payer_address,
              dueDate: inv.due_date,
            })
          )
          .run();
      } catch { }
    }
  }
  console.log(`[Agent] Processed ${upcomingInvoices.length} reminder alerts`);

  // 3. Reconcile — detect duplicates/anomalies
  await runReconcile(env);

  // 4. Fraud check — flag suspicious patterns
  await runFraudCheck(env);

  // 5. Autopay — autonomous payment (Agentic Economy!)
  await runAutopay(env);

  console.log('[Agent] Daily agent tasks completed');
}
