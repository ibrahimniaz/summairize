import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Use service role key here — webhook runs server-side, bypasses RLS
const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const config = {
  api: {
    bodyParser: false, // Stripe needs raw body to verify signature
  },
};

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    const credits = parseInt(session.metadata?.credits || '0');

    if (!userId || !credits) {
      console.error('Missing metadata:', session.metadata);
      return res.status(400).json({ error: 'Missing metadata' });
    }

    // Upsert credits — add to existing balance
    const { data: existing } = await sb
      .from('credits')
      .select('balance')
      .eq('user_id', userId)
      .single();

    const newBalance = (existing?.balance || 0) + credits;

    const { error } = await sb
      .from('credits')
      .upsert({ user_id: userId, balance: newBalance, updated_at: new Date().toISOString() });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to update credits' });
    }

    console.log(`Added ${credits} credits to user ${userId}. New balance: ${newBalance}`);
  }

  return res.status(200).json({ received: true });
}
