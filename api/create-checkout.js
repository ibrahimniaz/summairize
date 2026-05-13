import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const CREDIT_PACKS = {
  5:   { price: 99,  name: '5 Premium Digests' },
  20:  { price: 299, name: '20 Premium Digests' },
  60:  { price: 699, name: '60 Premium Digests' },
  150: { price: 1499, name: '150 Premium Digests' },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { credits, userId, userEmail } = req.body;

  if (!credits || !userId || !userEmail) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const pack = CREDIT_PACKS[credits];
  if (!pack) {
    return res.status(400).json({ error: 'Invalid credit pack' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: userEmail,
      line_items: [{
        price_data: {
          currency: 'gbp',
          product_data: {
            name: pack.name,
            description: `SummAIrise premium digests — credits never expire`,
          },
          unit_amount: pack.price,
        },
        quantity: 1,
      }],
      metadata: {
        userId,
        credits: String(credits),
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://summairize.vercel.app'}?payment=success&credits=${credits}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://summairize.vercel.app'}?payment=cancelled`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
}
