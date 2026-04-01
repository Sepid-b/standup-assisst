import { getData, setData, setCorsHeaders } from './_lib/redis.js';

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const data = await getData();
      const todayLabel = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      const filtered = { ...data, completedTasks: (data.completedTasks || []).filter(t => t.date === todayLabel) };
      return res.status(200).json(filtered);
    }

    if (req.method === 'PUT') {
      const current = await getData();
      const updated = { ...current, ...req.body };
      const saved = await setData(updated);
      return res.status(200).json(saved);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
