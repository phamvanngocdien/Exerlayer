import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { invoiceRoutes } from './routes/invoices';
import { dashboardRoutes } from './routes/dashboard';
import { indexEvents } from './cron/indexEvents';
import { runAgentTasks } from './cron/agentTasks';
import { runReconcile } from './agent/reconcile';

export type Env = {
  DB?: D1Database;
  AI?: any;
  ARC_RPC_URL: string;
  INVOICE_CONTRACT: string;
  ROUTER_CONTRACT: string;
  CIRCLE_API_KEY: string;
  AGENT_PRIVATE_KEY?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};

const app = new Hono<{ Bindings: Env }>();

// ─── Middleware ─────────────────────────────────────────────────
app.use(
  '/api/*',
  cors({
    origin: ['https://exerlayer.vercel.app', 'http://localhost:3000'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Routes ────────────────────────────────────────────────────
app.route('/api/invoices', invoiceRoutes);
app.route('/api/dashboard', dashboardRoutes);

app.get('/api/health', (c) =>
  c.json({
    status: 'ok',
    service: 'exerlayer-api',
    timestamp: new Date().toISOString(),
  })
);

app.get('/', (c) =>
  c.json({
    name: 'Exerlayer API',
    version: '1.0.0',
    docs: '/api/health',
  })
);

// ─── Export ────────────────────────────────────────────────────
export default {
  fetch: app.fetch,

  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ) {
    switch (controller.cron) {
      case '*/1 * * * *':
        // Every minute: poll on-chain events
        ctx.waitUntil(indexEvents(env));
        break;

      case '0 9 * * *':
        // Daily at 9 AM: reminders + autopay + overdue check
        ctx.waitUntil(runAgentTasks(env));
        break;

      case '0 */6 * * *':
        // Every 6 hours: deep reconciliation + fraud check
        ctx.waitUntil(runReconcile(env));
        break;
    }
  },
};
