import { getData, setData, setCorsHeaders } from './_lib/redis.js';

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const data = await getData();

    if (req.method === 'POST') {
      const blocker = { id: Date.now().toString(), text: req.body.text };
      data.blockers.push(blocker);
      const saved = await setData(data);
      return res.status(200).json(saved);
    }

    if (req.method === 'DELETE') {
      const id = req.query.id;
      data.blockers = data.blockers.filter(b => b.id !== id);
      const saved = await setData(data);
      return res.status(200).json(saved);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
