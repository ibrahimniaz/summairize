import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  const { data, error } = await sb
    .from('credits')
    .select('balance')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = row not found, that's fine (means 0 credits)
    return res.status(500).json({ error: 'Failed to fetch credits' });
  }

  return res.status(200).json({ balance: data?.balance || 0 });
}
