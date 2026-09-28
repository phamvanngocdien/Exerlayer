import type { Env } from '../index';

/// Rule-based fraud detection — flags suspicious payment patterns
export async function runFraudCheck(env: Env): Promise<void> {
  if (!env.DB) {
    console.log('[FraudCheck] Skipped — D1 database not bound');
    return;
  }
  console.log('[FraudCheck] Starting fraud checks...');

  const now = Math.floor(Date.now() / 1000);
  const oneHourAgo = now - 3600;

  // Rule 1: Multiple payments to same creator in short time
  const { results: burstPayments } = await env.DB.prepare(
    `SELECT creator_address, COUNT(*) as cnt, SUM(CAST(amount AS REAL)) as total
     FROM invoices
     WHERE status = 'paid' AND paid_at > ?
     GROUP BY creator_address
     HAVING cnt > 3`
  )
    .bind(oneHourAgo)
    .all();

  for (const burst of burstPayments) {
    const existing = await env.DB.prepare(
      `SELECT id FROM alerts
       WHERE type = 'burst_payments' AND resolved = 0
       AND details LIKE ?`
    )
      .bind(`%${burst.creator_address}%`)
      .first();

    if (!existing) {
      await env.DB.prepare(
        `INSERT INTO alerts (type, severity, invoice_id, details)
         VALUES ('burst_payments', 'warning', NULL, ?)`
      )
        .bind(
          JSON.stringify({
            message: `${burst.cnt} payments to ${burst.creator_address} in last hour`,
            creator: burst.creator_address,
            count: burst.cnt,
            totalAmount: (burst.total as number) / 1e6,
          })
        )
        .run();
    }
  }

  // Rule 2: Very large single payments (> $10,000 USDC)
  const largeThreshold = 10_000 * 1e6; // $10K in 6 decimals
  const { results: largeTx } = await env.DB.prepare(
    `SELECT chain_invoice_id, amount, creator_address, paid_by
     FROM invoices
     WHERE status = 'paid'
       AND CAST(amount AS REAL) > ?
       AND paid_at > ?`
  )
    .bind(largeThreshold, oneHourAgo)
    .all();

  for (const tx of largeTx) {
    const existing = await env.DB.prepare(
      `SELECT id FROM alerts
       WHERE type = 'large_payment' AND invoice_id = ? AND resolved = 0`
    )
      .bind(tx.chain_invoice_id as number)
      .first();

    if (!existing) {
      await env.DB.prepare(
        `INSERT INTO alerts (type, severity, invoice_id, details)
         VALUES ('large_payment', 'critical', ?, ?)`
      )
        .bind(
          tx.chain_invoice_id as number,
          JSON.stringify({
            message: `Large payment detected: $${(Number(tx.amount) / 1e6).toFixed(2)} USDC`,
            amount: tx.amount,
            creator: tx.creator_address,
            paidBy: tx.paid_by,
          })
        )
        .run();
    }
  }

  // Rule 3: Payment from unexpected address (payer ≠ expected)
  const { results: mismatches } = await env.DB.prepare(
    `SELECT chain_invoice_id, payer_address, paid_by, amount
     FROM invoices
     WHERE status = 'paid'
       AND payer_address != '0x0000000000000000000000000000000000000000'
       AND paid_by != payer_address
       AND paid_at > ?`
  )
    .bind(oneHourAgo)
    .all();

  for (const m of mismatches) {
    await env.DB.prepare(
      `INSERT INTO alerts (type, severity, invoice_id, details)
       VALUES ('payer_mismatch', 'info', ?, ?)`
    )
      .bind(
        m.chain_invoice_id as number,
        JSON.stringify({
          message: `Invoice #${m.chain_invoice_id} paid by unexpected address`,
          expected: m.payer_address,
          actual: m.paid_by,
          amount: m.amount,
        })
      )
      .run();
  }

  console.log(
    `[FraudCheck] Found ${burstPayments.length} burst, ${largeTx.length} large, ${mismatches.length} mismatches`
  );
}
