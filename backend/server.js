const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());

// ── Initial state ──
', project: 'NWG', badge: 'nwg', meta: 'Notion · Updated yesterday', url: '#' }
  ],
  note: 'Animations nearly done — demo ready by Friday. Would love 5 mins of your time to test on your phone!',
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
