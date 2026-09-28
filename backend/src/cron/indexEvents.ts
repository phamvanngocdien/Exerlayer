import { createPublicClient, http, parseAbiItem, type Log } from 'viem';
import type { Env } from '../index';
import { getSupabaseClient } from '../db/supabaseClient';

const INVOICE_EVENTS = [
  parseAbiItem(
    'event InvoiceCreated(uint256 indexed id, address indexed creator, address payer, uint256 amount, uint256 dueDate)'
  ),
  parseAbiItem(
    'event InvoicePaid(uint256 indexed id, address indexed paidBy, uint256 amount, uint256 timestamp)'
  ),
  parseAbiItem('event InvoiceCancelled(uint256 indexed id)'),
];

export async function indexEvents(env: Env): Promise<void> {
  if (!env.INVOICE_CONTRACT) return;

  const client = createPublicClient({
    transport: http(env.ARC_RPC_URL),
  });

  const supabase = getSupabaseClient(env);
  let lastBlock = 0;

  if (supabase) {
    const { data } = await supabase.from('indexer_state').select('last_block').eq('id', 1).single();
    if (data) lastBlock = Number(data.last_block);
  } else if (env.DB) {
    const state = await env.DB.prepare(
      'SELECT last_block FROM indexer_state WHERE id = 1'
    ).first<{ last_block: number }>();
    lastBlock = state?.last_block ?? 0;
  }

  const fromBlock = BigInt(lastBlock + 1);

  let latestBlock: bigint;
  try {
    latestBlock = await client.getBlockNumber();
  } catch (err) {
    console.error('[Indexer] Failed to get block number:', err);
    return;
  }

  if (fromBlock > latestBlock) return;

  const toBlock =
    latestBlock - fromBlock > 2000n ? fromBlock + 2000n : latestBlock;

  try {
    const logs = await client.getLogs({
      address: env.INVOICE_CONTRACT as `0x${string}`,
      events: INVOICE_EVENTS,
      fromBlock,
      toBlock,
    });

    for (const log of logs) {
      await processLog(env, log);
    }

    if (supabase) {
      await supabase.from('indexer_state').upsert({ id: 1, last_block: Number(toBlock) });
    }
    if (env.DB) {
      await env.DB.prepare(
        'UPDATE indexer_state SET last_block = ? WHERE id = 1'
      )
        .bind(Number(toBlock))
        .run();
    }

    if (logs.length > 0) {
      console.log(
        `[Indexer] Processed ${logs.length} events (blocks ${fromBlock}-${toBlock})`
      );
    }
  } catch (err) {
    console.error('[Indexer] Error fetching logs:', err);
  }
}

async function processLog(env: Env, log: Log): Promise<void> {
  const eventName = (log as any).eventName as string;
  const args = (log as any).args as Record<string, any>;
  const supabase = getSupabaseClient(env);

  // Store raw event in D1
  if (env.DB) {
    await env.DB.prepare(
      `INSERT OR IGNORE INTO events (event_name, tx_hash, block_number, log_index, data)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(
        eventName,
        log.transactionHash ?? '',
        Number(log.blockNumber ?? 0),
        Number(log.logIndex ?? 0),
        JSON.stringify(args, (_k, v) =>
          typeof v === 'bigint' ? v.toString() : v
        )
      )
      .run();
  }

  // Store raw event in Supabase Cloud DB
  if (supabase) {
    await supabase.from('events').upsert(
      {
        event_name: eventName,
        tx_hash: log.transactionHash ?? '',
        block_number: Number(log.blockNumber ?? 0),
        log_index: Number(log.logIndex ?? 0),
        data: args,
      },
      { onConflict: 'tx_hash,log_index' }
    );
  }

  // Process by event type
  switch (eventName) {
    case 'InvoiceCreated':
      if (env.DB) {
        await env.DB.prepare(
          `INSERT OR IGNORE INTO invoices
           (chain_invoice_id, creator_address, payer_address, amount, due_date, status, tx_hash, block_number)
           VALUES (?, ?, ?, ?, ?, 'created', ?, ?)`
        )
          .bind(
            Number(args.id),
            (args.creator as string).toLowerCase(),
            (args.payer as string).toLowerCase(),
            args.amount.toString(),
            Number(args.dueDate),
            log.transactionHash ?? '',
            Number(log.blockNumber ?? 0)
          )
          .run();
      }
      if (supabase) {
        await supabase.from('invoices').upsert(
          {
            chain_invoice_id: Number(args.id),
            creator_address: (args.creator as string).toLowerCase(),
            payer_address: (args.payer as string).toLowerCase(),
            amount: args.amount.toString(),
            due_date: Number(args.dueDate),
            status: 'created',
            tx_hash: log.transactionHash ?? '',
            block_number: Number(log.blockNumber ?? 0),
          },
          { onConflict: 'chain_invoice_id' }
        );
      }
      break;

    case 'InvoicePaid':
      if (env.DB) {
        await env.DB.prepare(
          `UPDATE invoices SET status = 'paid', paid_by = ?, paid_at = ?, tx_hash = ?
           WHERE chain_invoice_id = ?`
        )
          .bind(
            (args.paidBy as string).toLowerCase(),
            Number(args.timestamp),
            log.transactionHash ?? '',
            Number(args.id)
          )
          .run();
      }
      if (supabase) {
        await supabase.from('invoices').update({
          status: 'paid',
          paid_by: (args.paidBy as string).toLowerCase(),
          paid_at: Number(args.timestamp),
          tx_hash: log.transactionHash ?? '',
        }).eq('chain_invoice_id', Number(args.id));
      }
      break;

    case 'InvoiceCancelled':
      if (env.DB) {
        await env.DB.prepare(
          `UPDATE invoices SET status = 'cancelled' WHERE chain_invoice_id = ?`
        )
          .bind(Number(args.id))
          .run();
      }
      if (supabase) {
        await supabase.from('invoices').update({
          status: 'cancelled',
        }).eq('chain_invoice_id', Number(args.id));
      }
      break;
  }
}
