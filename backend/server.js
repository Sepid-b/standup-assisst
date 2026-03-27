const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, 'data.json');

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tfiidornnjexkxyrkgcq.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmaWlkb3JubmpleGt4eXJrZ2NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzUwMjcsImV4cCI6MjA4OTk1MTAyN30.75QQbQiROHmPmcuaGxhd9ii2PTekTPc6o7fFHfr4ALY';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

app.use(cors());
app.use(express.json());

// ── Initial state ──
const defaultData = {
  status: 'inprogress',
  currentProjects: [],
  otherProjects: [],
  blockers: [],
  completedTasks: [],
  nwgHours: 0,
  nwgTarget: 16,
  handoverDocs: [],
  note: '',
  lastUpdated: new Date().toISOString()
};

// ── Load/save helpers ──
function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}
function saveData(data) {
  data.lastUpdated = new Date().toISOString();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  return data;
}

// ── Routes ──

// GET all data
app.get('/api/status', (req, res) => {
  res.json(loadData());
});

// PUT full status update
app.put('/api/status', (req, res) => {
  const data = loadData();
  const updated = { ...data, ...req.body };
  res.json(saveData(updated));
});

// PATCH current projects
app.put('/api/projects', (req, res) => {
  const data = loadData();
  data.currentProjects = req.body.projects;
  res.json(saveData(data));
});

// POST add blocker
app.post('/api/blockers', (req, res) => {
  const data = loadData();
  const blocker = { id: Date.now().toString(), text: req.body.text };
  data.blockers.push(blocker);
  res.json(saveData(data));
});

// DELETE blocker
app.delete('/api/blockers/:id', (req, res) => {
  const data = loadData();
  data.blockers = data.blockers.filter(b => b.id !== req.params.id);
  res.json(saveData(data));
});

// POST complete a task
app.post('/api/tasks/complete', (req, res) => {
  const data = loadData();
  const task = { id: Date.now().toString(), name: req.body.name, date: 'Just now' };
  data.completedTasks.unshift(task);
  res.json(saveData(data));
});

// PUT NWG hours
app.put('/api/nwg', (req, res) => {
  const data = loadData();
  data.nwgHours = Math.min(data.nwgTarget + 4, req.body.hours);
  res.json(saveData(data));
});

// PUT note
app.put('/api/note', (req, res) => {
  const data = loadData();
  data.note = req.body.note;
  res.json(saveData(data));
});

// POST add handover doc
app.post('/api/docs', (req, res) => {
  const data = loadData();
  const doc = { id: Date.now().toString(), ...req.body };
  data.handoverDocs.push(doc);
  res.json(saveData(data));
});

// DELETE handover doc
app.delete('/api/docs/:id', (req, res) => {
  const data = loadData();
  data.handoverDocs = data.handoverDocs.filter(d => d.id !== req.params.id);
  res.json(saveData(data));
});

app.listen(PORT, () => {
  console.log(`✅ Standup backend running on http://localhost:${PORT}`);
});

// PUT other projects
app.put('/api/other-projects', (req, res) => {
  const data = loadData();
  data.otherProjects = req.body.projects;
  res.json(saveData(data));
});

// DELETE completed task
app.delete('/api/tasks/complete/:id', (req, res) => {
  const data = loadData();
  data.completedTasks = data.completedTasks.filter(function(t) { return t.id !== req.params.id; });
  res.json(saveData(data));
});

// POST add completed task manually
app.post('/api/tasks/manual', (req, res) => {
  const data = loadData();
  const task = { id: Date.now().toString(), name: req.body.name, date: 'Today' };
  data.completedTasks.unshift(task);
  res.json(saveData(data));
});

// ── Supabase History Endpoints ──

// Helper: get week start (Monday) for a date
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

// POST /api/snapshot — save current state to Supabase (upsert by date)
app.post('/api/snapshot', async (req, res) => {
  try {
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
      const { data: updated, error } = await supabase
        .from('standup_snapshots')
        .update({
          status: state.status,
          status_custom: state.statusCustom || null,
          nwg_hours: state.nwgHours,
          nwg_target: state.nwgTarget,
          note: state.note
        })
        .eq('id', existing.id)
        .select()
        .single();

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

    // Completed tasks
    (state.completedTasks || []).forEach(t => {
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

    res.json({ success: true, snapshotId });
  } catch (err) {
    console.error('Snapshot error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/history — return last 30 days of snapshots with items
app.get('/api/history', async (req, res) => {
  try {
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

    // Transform data for frontend
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

    res.json(result);
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ error: err.message });
  }
});
