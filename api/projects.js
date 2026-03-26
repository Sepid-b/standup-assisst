import { getData, setData, setCorsHeaders } from './_lib/redis.js';

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'PUT') {
      const data = await getData();
      data.currentProjects = req.body.projects;
      const saved = await setData(data);
      return res.status(200).json(saved);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
