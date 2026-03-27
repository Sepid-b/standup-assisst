import { getSupabase } from './_lib/supabase.js';
import { setCorsHeaders } from './_lib/redis.js';

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const supabase = getSupabase();

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const cutoff = thirtyDaysAgo.toISOString().split('T')[0];

      const { data: snapshots, error } = await supabase
        .from('standup_snapshots')
        .select(`
          id,
          date,
          week_start,
          status,
          status_custom,
          nwg_hours,
          nwg_target,
          note,
          created_at,
          standup_items (
            id,
            type,
            name,
            item_note,
            meta,
            item_date
          )
        `)
        .gte('date', cutoff)
        .order('date', { ascending: false });

      if (error) throw error;

      const result = snapshots.map(s => ({
        id: s.id,
        date: s.date,
        weekStart: s.week_start,
        status: s.status,
        statusCustom: s.status_custom,
        nwgHours: s.nwg_hours,
        nwgTarget: s.nwg_target,
        note: s.note,
        createdAt: s.created_at,
        currentProjects: s.standup_items.filter(i => i.type === 'current_project').map(i => ({ name: i.name, note: i.item_note })),
        otherProjects: s.standup_items.filter(i => i.type === 'other_project').map(i => ({ name: i.name })),
        completedTasks: s.standup_items.filter(i => i.type === 'completed_task').map(i => ({ name: i.name, date: i.item_date })),
        blockers: s.standup_items.filter(i => i.type === 'blocker').map(i => ({ text: i.name })),
        handoverDocs: s.standup_items.filter(i => i.type === 'handover_doc').map(i => ({ name: i.name, meta: i.meta, url: i.item_note }))
      }));

      return res.status(200).json(result);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('History error:', error);
    return res.status(500).json({ error: error.message });
  }
}
