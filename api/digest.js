// SummAIrise digest API v3 — with server-side free tier enforcement
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const body = req.body;
    const isPremium = body.isPremium === true;
    const userEmail = body.userEmail || '';

    // Admin emails always get premium
    const adminEmails = ['ibrahimniaz@hotmail.com', 'ibrahim@summairise.com'];
    const isAdmin = adminEmails.includes(userEmail);
    const effectivePremium = isPremium || isAdmin;

    // Build the actual request to Claude
    // Strip isPremium and userEmail from body before forwarding
    const { isPremium: _, userEmail: __, ...claudeBody } = body;

    // Enforce free tier model — even if client tries to use Sonnet
    if (!effectivePremium) {
      claudeBody.model = 'claude-haiku-4-5-20251001';
    } else {
      claudeBody.model = 'claude-sonnet-4-6';
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(claudeBody)
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to reach Anthropic API' });
  }
}
