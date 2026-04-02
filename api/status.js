import { getData, setData, setCorsHeaders } from './_lib/redis.js';
import { getSupabase } from './_lib/supabase.js';

// Resolve legacy 'Today'/'Just now' task dates using ID timestamp then Supabase snapshot lookup
async function resolveLegacyDates(data) {
  const tasks = data.completedTasks || [];
  let fixedAny = false;

  // Step 1: Try ID-based timestamp conversion
  let resolved = tasks.map(t => {
    if ((t.date === 'Today' || t.date === 'Just now' || !t.date) && t.id) {
      const ts = parseInt(t.id, 10);
      if (!isNaN(ts) && ts > 1_000_000_000_000) {
        fixedAny = true;
        return { ...t, date: new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) };
      }
    }
    return t;
  });

  // Step 2: For tasks still with legacy dates, look up in Supabase snapshots
  const stillLegacy = resolved.filter(t => !t.date || t.date === 'Today' || t.date === 'Just now');
  if (stillLegacy.length > 0) {
    try {
      const supabase = getSupabase();
      const names = [...new Set(stillLegacy.map(t => t.name))];
      const { data: snapshots } = await supabase
        .from('standup_snapshots')
        .select('date, standup_items(name, type)')
        .order('date', { ascending: true });

      const dateMap = {};
      (snapshots || []).forEach(snap => {
        (snap.standup_items || [])
          .filter(i => i.type === 'completed_task' && names.includes(i.name))
          .forEach(i => {
            if (!dateMap[i.name]) {
              dateMap[i.name] = new Date(snap.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
            }
          });
      });

      resolved = resolved.map(t => {
        if ((!t.date || t.date === 'Today' || t.date === 'Just now') && dateMap[t.name]) {
          fixedAny = true;
          return { ...t, date: dateMap[t.name] };
        }
        return t;
      });
    } catch (e) {
      console.error('Date backfill error:', e.message);
    }
  }

  return { data: { ...data, completedTasks: resolved }, changed: fixedAny };
}

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const data = await getData();
      const { data: fixed, changed } = await resolveLegacyDates(data);
      if (changed) await setData(fixed); // persist so next GET is fast
      return res.status(200).json(fixed);
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
