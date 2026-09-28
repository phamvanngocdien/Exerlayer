import type { Env } from '../index';

/// Rule-based reconciliation — detects duplicates and anomalies
export async function runReconcile(env: Env): Promise<void> {
  if (!env.DB) {
    console.log('[Reconcile] Skipped — D1 database not bound');
    return;
  }
  console.log('[Reconcile] Starting reconciliation...');

  // Rule 1: Duplicate invoices
  // Same creator + payer + amount + dueDate
  const { results: dupes } = await env.DB.prepare(
    `SELECT a.chain_invoice_id as id1, b.chain_invoice_id as id2,
            a.amount, a.creator_address, a.payer_address
     FROM invoices a
     JOIN invoices b
       ON a.creator_address = b.creator_address
       AND a.payer_address = b.payer_address
       AND a.amount = b.amount
       AND a.due_date = b.due_date
       AND a.id < b.id
     WHERE a.status = 'created' AND b.status = 'created'`
  ).all();

  for (const dupe of dupes) {
    // Check if alert already exists
    const existing = await env.DB.prepare(
      `SELECT id FROM alerts
       WHERE type = 'duplicate' AND invoice_id = ? AND resolved = 0`
    )
      .bind(dupe.id1 as number)
      .first();

    if (!existing) {
      await env.DB.prepare(
        `INSERT INTO alerts (type, severity, invoice_id, details)
         VALUES ('duplicate', 'warning', ?, ?)`
      )
        .bind(
          dupe.id1 as number,
          JSON.stringify({
            message: `Possible duplicate: Invoice #${dupe.id1} and #${dupe.id2}`,
            matchedWith: dupe.id2,
            amount: dupe.amount,
            creator: dupe.creator_address,
          })
        )
        .run();
    }
  }

  // Rule 2: Anomalous amounts (> 3x average for that creator)
  const { results: anomalies } = await env.DB.prepare(
    `SELECT i.chain_invoice_id, i.amount, i.creator_address, a.avg_amt
     FROM invoices i
     JOIN (
       SELECT creator_address, AVG(CAST(amount AS REAL)) as avg_amt
       FROM invoices
       GROUP BY creator_address
       HAVING COUNT(*) >= 3
     ) a ON i.creator_address = a.creator_address
     WHERE CAST(i.amount AS REAL) > a.avg_amt * 3
       AND i.status = 'created'`
  ).all();

  for (const anomaly of anomalies) {
    const existing = await env.DB.prepare(
      `SELECT id FROM alerts
       WHERE type = 'anomaly' AND invoice_id = ? AND resolved = 0`
    )
      .bind(anomaly.chain_invoice_id as number)
      .first();

    if (!existing) {
      await env.DB.prepare(
        `INSERT INTO alerts (type, severity, invoice_id, details)
         VALUES ('anomaly', 'warning', ?, ?)`
      )
        .bind(
          anomaly.chain_invoice_id as number,
          JSON.stringify({
            message: `Invoice #${anomaly.chain_invoice_id} amount is 3x+ above average`,
            amount: anomaly.amount,
            averageAmount: anomaly.avg_amt,
            creator: anomaly.creator_address,
          })
        )
        .run();
    }
  }

  // Rule 3: Rapid fire (> 5 invoices in 10 minutes from same creator)
  const tenMinutesAgo = Math.floor(Date.now() / 1000) - 600;
  const { results: rapid } = await env.DB.prepare(
    `SELECT creator_address, COUNT(*) as cnt
     FROM invoices
     WHERE created_at > ?
     GROUP BY creator_address
     HAVING cnt > 5`
  )
    .bind(tenMinutesAgo)
    .all();

  for (const r of rapid) {
    await env.DB.prepare(
      `INSERT INTO alerts (type, severity, invoice_id, details)
       VALUES ('rapid_fire', 'critical', NULL, ?)`
    )
      .bind(
        JSON.stringify({
          message: `${r.cnt} invoices from ${r.creator_address} in last 10 minutes`,
          creator: r.creator_address,
          count: r.cnt,
        })
      )
      .run();
  }

  console.log(
    `[Reconcile] Found ${dupes.length} duplicates, ${anomalies.length} anomalies, ${rapid.length} rapid-fire`
  );
}
