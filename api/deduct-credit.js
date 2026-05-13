import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  const { data, error } = await sb
    .from('credits')
    .select('balance')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'No credits found' });
  }

  if (data.balance <= 0) {
    return res.status(400).json({ error: 'Insufficient credits' });
  }

  const { error: updateError } = await sb
    .from('credits')
    .update({ balance: data.balance - 1, updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  if (updateError) {
    return res.status(500).json({ error: 'Failed to deduct credit' });
  }

  return res.status(200).json({ balance: data.balance - 1 });
}
