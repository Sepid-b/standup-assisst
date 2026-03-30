require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3001;

// Supabase configuration
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

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

// ── Load/save helpers using Supabase ──
async function loadData() {
  const { data, error } = await supabase
    .from('standup_state')
    .select('state')
    .eq('id', 1)
    .single();

  if (error || !data) {
    // No state exists yet, seed with default and return it
    console.log('No existing state found, seeding default data...');
    await saveData(defaultData);
    return { ...defaultData };
  }

  return data.state;
}

async function saveData(state) {
  state.lastUpdated = new Date().toISOString();

  const { error } = await supabase
    .from('standup_state')
    .upsert({ id: 1, state: state, updated_at: new Date().toISOString() });

  if (error) {
    console.error('Error saving state:', error);
    throw error;
  }

  return state;
}

// ── Routes ──

// GET all data
app.get('/api/status', async (req, res) => {
  try {
    const data = await loadData();
    res.json(data);
  } catch (err) {
    console.error('GET /api/status error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT full status update
app.put('/api/status', async (req, res) => {
  try {
    const data = await loadData();
    const updated = { ...data, ...req.body };
    res.json(await saveData(updated));
  } catch (err) {
    console.error('PUT /api/status error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT current projects
app.put('/api/projects', async (req, res) => {
  try {
    const data = await loadData();
    data.currentProjects = req.body.projects;
    res.json(await saveData(data));
  } catch (err) {
    console.error('PUT /api/projects error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST add blocker
app.post('/api/blockers', async (req, res) => {
  try {
    const data = await loadData();
    const blocker = { id: Date.now().toString(), text: req.body.text };
    data.blockers.push(blocker);
    res.json(await saveData(data));
  } catch (err) {
    console.error('POST /api/blockers error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE blocker
app.delete('/api/blockers/:id', async (req, res) => {
  try {
    const data = await loadData();
    data.blockers = data.blockers.filter(b => b.id !== req.params.id);
    res.json(await saveData(data));
  } catch (err) {
    console.error('DELETE /api/blockers error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST complete a task
app.post('/api/tasks/complete', async (req, res) => {
  try {
    const data = await loadData();
    const task = { id: Date.now().toString(), name: req.body.name, date: 'Just now' };
    data.completedTasks.unshift(task);
    res.json(await saveData(data));
  } catch (err) {
    console.error('POST /api/tasks/complete error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT NWG hours
app.put('/api/nwg', async (req, res) => {
  try {
    const data = await loadData();
    data.nwgHours = Math.min(data.nwgTarget + 4, req.body.hours);
    res.json(await saveData(data));
  } catch (err) {
    console.error('PUT /api/nwg error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT note
app.put('/api/note', async (req, res) => {
  try {
    const data = await loadData();
    data.note = req.body.note;
    res.json(await saveData(data));
  } catch (err) {
    console.error('PUT /api/note error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST add handover doc
app.post('/api/docs', async (req, res) => {
  try {
    const data = await loadData();
    const doc = { id: Date.now().toString(), ...req.body };
    data.handoverDocs.push(doc);
    res.json(await saveData(data));
  } catch (err) {
    console.error('POST /api/docs error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE handover doc
app.delete('/api/docs/:id', async (req, res) => {
  try {
    const data = await loadData();
    data.handoverDocs = data.handoverDocs.filter(d => d.id !== req.params.id);
    res.json(await saveData(data));
  } catch (err) {
    console.error('DELETE /api/docs error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT other projects
app.put('/api/other-projects', async (req, res) => {
  try {
    const data = await loadData();
    data.otherProjects = req.body.projects;
    res.json(await saveData(data));
  } catch (err) {
    console.error('PUT /api/other-projects error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE completed task
app.delete('/api/tasks/complete/:id', async (req, res) => {
  try {
    const data = await loadData();
    data.completedTasks = data.completedTasks.filter(t => t.id !== req.params.id);
    res.json(await saveData(data));
  } catch (err) {
    console.error('DELETE /api/tasks/complete error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST add completed task manually
app.post('/api/tasks/manual', async (req, res) => {
  try {
    const data = await loadData();
    const task = { id: Date.now().toString(), name: req.body.name, date: 'Today' };
    data.completedTasks.unshift(task);
    res.json(await saveData(data));
  } catch (err) {
    console.error('POST /api/tasks/manual error:', err);
    res.status(500).json({ error: err.message });
  }
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

// ── AI Chat Endpoint ──
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.post('/api/chat', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Fetch current state
    const { data: stateData } = await supabase
      .from('standup_state')
      .select('state')
      .eq('id', 1)
      .single();

    // Fetch history (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoff = thirtyDaysAgo.toISOString().split('T')[0];

    const { data: snapshots } = await supabase
      .from('standup_snapshots')
      .select(`
        id, date, week_start, status, status_custom, nwg_hours, nwg_target, note, created_at,
        standup_items (id, type, name, item_note, meta, item_date)
      `)
      .gte('date', cutoff)
      .order('date', { ascending: false });

    // Prepare context for Claude
    const currentState = stateData?.state || {};
    const historyData = (snapshots || []).map(s => ({
      date: s.date,
      weekStart: s.week_start,
      status: s.status,
      nwgHours: s.nwg_hours,
      nwgTarget: s.nwg_target,
      note: s.note,
      currentProjects: s.standup_items?.filter(i => i.type === 'current_project').map(i => i.name) || [],
      completedTasks: s.standup_items?.filter(i => i.type === 'completed_task').map(i => i.name) || [],
      blockers: s.standup_items?.filter(i => i.type === 'blocker').map(i => i.name) || []
    }));

    const systemPrompt = `You are a helpful AI assistant for Sepideh's standup app. You help Maria (Sepideh's mentor) understand Sepideh's work progress, NWG hours, completed tasks, and blockers.

Answer questions based on the data provided. Be concise, friendly, and helpful. If you don't have enough data to answer, say so.

Today's date is: ${new Date().toISOString().split('T')[0]}

Current State:
${JSON.stringify(currentState, null, 2)}

History (last 30 days):
${JSON.stringify(historyData, null, 2)}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: question }]
    });

    const answer = message.content[0]?.text || 'Sorry, I could not generate a response.';
    res.json({ answer });

  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Standup backend running on http://localhost:${PORT}`);
});
