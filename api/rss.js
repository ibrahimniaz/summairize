export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'No URL' });
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SummAIrize/1.0)' }
    });
    const text = await response.text();
    res.setHeader('Content-Type', 'application/xml');
    return res.status(200).send(text);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch' });
  }
}
