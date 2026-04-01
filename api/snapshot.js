import { getSupabase, getWeekStart } from './_lib/supabase.js';
import { setCorsHeaders } from './_lib/redis.js';

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'POST') {
      const supabase = getSupabase();
      const state = req.body;
      const today = new Date().toISOString().split('T')[0];
      const weekStart = getWeekStart(new Date());

      // Check if snapshot exists for today
      const { data: existing } = await supabase
        .from('standup_snapshots')
        .select('id')
        .eq('date', today)
        .single();

      let snapshotId;

      if (existing) {
        // Update existing snapshot
        const { error } = await supabase
          .from('standup_snapshots')
          .update({
            status: state.status,
            status_custom: state.statusCustom || null,
            nwg_hours: state.nwgHours,
            nwg_target: state.nwgTarget,
            note: state.note
          })
          .eq('id', existing.id);

        if (error) throw error;
        snapshotId = existing.id;

        // Delete old items for this snapshot
        await supabase.from('standup_items').delete().eq('snapshot_id', snapshotId);
      } else {
        // Create new snapshot
        const { data: created, error } = await supabase
          .from('standup_snapshots')
          .insert({
            date: today,
            week_start: weekStart,
            status: state.status,
            status_custom: state.statusCustom || null,
            nwg_hours: state.nwgHours,
            nwg_target: state.nwgTarget,
            note: state.note
          })
          .select()
          .single();

        if (error) throw error;
        snapshotId = created.id;
      }

      // Insert all items
      const items = [];

      // Current projects
      (state.currentProjects || []).forEach(p => {
        items.push({ snapshot_id: snapshotId, type: 'current_project', name: p.name, item_note: p.note || null });
      });

      // Other projects
      (state.otherProjects || []).forEach(p => {
        items.push({ snapshot_id: snapshotId, type: 'other_project', name: p.name });
      });

      // Completed tasks — only include tasks from today
      const todayTasks = (state.completedTasks || []).filter(t => {
        if (!t.date) return false;
        // Legacy string labels (before ISO dates were stored) — treat as today
        if (t.date === 'Just now' || t.date === 'Today') return true;
        // ISO date strings — check if they match today
        return t.date.startsWith(today);
      });
      todayTasks.forEach(t => {
        items.push({ snapshot_id: snapshotId, type: 'completed_task', name: t.name, item_date: t.date });
      });

      // Blockers
      (state.blockers || []).forEach(b => {
        items.push({ snapshot_id: snapshotId, type: 'blocker', name: b.text });
      });

      // Handover docs
      (state.handoverDocs || []).forEach(d => {
        items.push({ snapshot_id: snapshotId, type: 'handover_doc', name: d.name, meta: d.meta, item_note: d.url });
      });

      if (items.length > 0) {
        const { error: itemsError } = await supabase.from('standup_items').insert(items);
        if (itemsError) throw itemsError;
      }

      return res.status(200).json({ success: true, snapshotId });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Snapshot error:', error);
    return res.status(500).json({ error: error.message });
  }
}
