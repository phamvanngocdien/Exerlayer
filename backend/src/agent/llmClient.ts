import type { Env } from '../index';

/// LLM client — uses Workers AI (free, 10K neurons/day) for natural language tasks
/// Falls back to raw template strings if AI binding unavailable

export async function generateText(
  env: Env,
  prompt: string
): Promise<string> {
  // Try Workers AI first (free, same platform)
  if (env.AI) {
    try {
      const response = await env.AI.run(
        '@cf/meta/llama-3.1-8b-instruct' as any,
        {
          messages: [
            {
              role: 'system',
              content:
                'You are a financial assistant for Exerlayer, an on-chain invoice platform. Be concise and professional.',
            },
            { role: 'user', content: prompt },
          ],
          max_tokens: 256,
        }
      );

      return (response as any).response || '';
    } catch (err) {
      console.error('[LLM] Workers AI error, falling back:', err);
    }
  }

  // Fallback: template-based response
  return generateFallbackText(prompt);
}

/// Generate reminder text for an invoice
export async function generateReminderText(
  env: Env,
  invoice: {
    id: number;
    amount: string;
    dueDate: number;
    creator: string;
    payer: string;
  }
): Promise<string> {
  const daysLeft = Math.ceil(
    (invoice.dueDate - Date.now() / 1000) / 86400
  );
  const amountFormatted = (Number(invoice.amount) / 1e6).toFixed(2);

  const prompt = `Write a brief, professional payment reminder for:
- Invoice #${invoice.id}
- Amount: $${amountFormatted} USDC
- Due in ${daysLeft} day(s)
- From: ${invoice.creator.slice(0, 10)}...
Keep it under 50 words.`;

  return generateText(env, prompt);
}

/// Generate anomaly analysis text
export async function generateAnomalyAnalysis(
  env: Env,
  details: {
    invoiceId: number;
    amount: string;
    average: number;
    type: string;
  }
): Promise<string> {
  const prompt = `Analyze this potential invoice anomaly:
- Invoice #${details.invoiceId}
- Amount: $${(Number(details.amount) / 1e6).toFixed(2)} USDC
- Creator's average: $${(details.average / 1e6).toFixed(2)} USDC
- Type: ${details.type}
Provide a 1-sentence risk assessment.`;

  return generateText(env, prompt);
}

function generateFallbackText(prompt: string): string {
  if (prompt.includes('reminder')) {
    return 'Payment reminder: Your invoice is approaching its due date. Please ensure timely payment to avoid any late fees.';
  }
  if (prompt.includes('anomaly') || prompt.includes('risk')) {
    return 'This transaction has been flagged for review due to unusual patterns. Manual verification recommended.';
  }
  return 'Please review the flagged item and take appropriate action.';
}
