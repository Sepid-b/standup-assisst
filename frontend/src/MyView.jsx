import React, { useState, useEffect, useRef } from 'react';
import {
  updateProjects, addBlocker, removeBlocker,
  updateNwg, updateNote, addDoc, removeDoc,
  addTaskManually, removeCompletedTask
} from './api';

const PURPLE = '#7F77DD';
const RED    = '#E24B4A';
const GREEN  = '#1D9E75';
const DPURP  = '#534AB7';

function formatTaskDate(date) {
  if (!date) return '';
  // Date is now stored as a readable label e.g. "1 Apr" — return as-is
  return date;
}

function Card({ T, accent, children }) {
  return (
    <div style={{ background: T.card, borderRadius: '8px', border: `0.5px solid ${T.border}`, borderTop: `2px solid ${accent}`, padding: '14px 16px' }}>
      {children}
    </div>
  );
}

function CardHeader({ color, label, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
      <div style={{ fontSize: '10px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.08em', color }}>{label}</div>
      {action}
    </div>
  );
}

function AddBtn({ label, color, onClick }) {
  return (
    <span onClick={onClick} style={{ fontSize: '10px', padding: '2px 9px', border: `0.5px solid rgba(127,119,221,0.4)`, color: color || PURPLE, borderRadius: '20px', cursor: 'pointer', background: 'rgba(127,119,221,0.1)', userSelect: 'none' }}>{label}</span>
  );
}

function ABtn({ label, color, border, onClick }) {
  return (
    <button onClick={onClick} style={{ fontSize: '10px', padding: '2px 8px', border: `0.5px solid ${border}`, color, borderRadius: '4px', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>{label}</button>
  );
}

function MetricCard({ T, label, value }) {
  return (
    <div style={{ background: T.inner, borderRadius: '8px', padding: '12px 14px', border: `0.5px solid ${T.border}` }}>
      <div style={{ fontSize: '10px', color: T.label, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: '20px', fontWeight: '500', color: T.text, lineHeight: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>{value}</div>
    </div>
  );
}

function getNwgState(hours, target) {
  const rem = target - hours;
  if (hours >= target) return { label: 'Complete' };
  if (rem <= 3) return { label: `${rem.toFixed(1)}h to go` };
  if (rem > 9)  return { label: `Behind — ${rem.toFixed(1)}h left` };
  return { label: `${rem.toFixed(1)}h to go` };
}

const BLOCKER_PRESETS = ['Waiting for review', 'Need access / credentials', "Need Maria's input", 'Stuck on a bug', 'Waiting on a meeting'];
const NOTE_PRESETS = [
  { label: 'Ready for review', text: 'Ready for your review!' },
  { label: 'Demo ready!',      text: 'Demo is ready — want to try it?' },
  { label: 'Can we sync?',     text: 'Can we sync this week?' },
  { label: 'Need your input',  text: 'Need your input on something' },
];

const STATUS_LABELS = { inprogress: 'In progress', reviewing: 'Sent for review', done: 'Wrapped up', break: 'On a break', blocked: 'Blocked' };

export default function MyView({ data, onRefresh, T, dark }) {
  // Always sync from fresh data prop
  const [projects, setProjects]   = useState(data.currentProjects);
  const [blockers, setBlockers]   = useState(data.blockers);
  const [nwgHours, setNwgHours]   = useState(data.nwgHours);
  const [note, setNote]           = useState(data.note);
  const [completed, setCompleted] = useState(data.completedTasks);
  const [handoverDocs, setDocs]   = useState(data.handoverDocs);

  // Sync state when data prop changes (view switch / refresh)
  useEffect(() => { setProjects(data.currentProjects); }, [data.currentProjects]);
  useEffect(() => { setBlockers(data.blockers); }, [data.blockers]);
  useEffect(() => { setNwgHours(data.nwgHours); }, [data.nwgHours]);
  useEffect(() => { setNote(data.note); }, [data.note]);
  useEffect(() => { setCompleted(data.completedTasks); }, [data.completedTasks]);
  useEffect(() => { setDocs(data.handoverDocs); }, [data.handoverDocs]);

  // UI state
  const [showAddProj, setShowAddProj]       = useState(false);
  const [newProjName, setNewProjName]       = useState('');
  const [newProjNote, setNewProjNote]       = useState('');
  const [editProjId, setEditProjId]         = useState(null);
  const [editProjName, setEditProjName]     = useState('');
  const [editProjNote, setEditProjNote]     = useState('');
  const [showCustomNwg, setShowCustomNwg]   = useState(false);
  const [customNwg, setCustomNwg]           = useState('');
  const [editTarget, setEditTarget]         = useState(false);
  const [customTarget, setCustomTarget]     = useState('');
  const [showBlockerInput, setShowBlockerInput] = useState(false);
  const [customBlocker, setCustomBlocker]   = useState('');
  const [editBlockerId, setEditBlockerId]   = useState(null);
  const [editBlockerText, setEditBlockerText] = useState('');
  const [showAddDoc, setShowAddDoc]         = useState(false);
  const [newDocName, setNewDocName]         = useState('');
  const [newDocMeta, setNewDocMeta]         = useState('');
  const [newDocType, setNewDocType]         = useState('link');
  const [newDocUrl, setNewDocUrl]           = useState('');
  const [showAddCompleted, setShowAddCompleted] = useState(false);
  const [newCompletedName, setNewCompletedName] = useState('');
  const [toasts, setToasts]                 = useState({});
  const fileInputRef                        = useRef(null);

  const nwgState = getNwgState(nwgHours, data.nwgTarget);
  const nwgPct   = Math.min(100, (nwgHours / data.nwgTarget) * 100);

  function toast(key) {
    setToasts(t => ({ ...t, [key]: true }));
    setTimeout(() => setToasts(t => ({ ...t, [key]: false })), 2000);
  }

  const inp = (accent) => ({
    width: '100%', boxSizing: 'border-box', fontSize: '11px', padding: '6px 10px',
    background: T.inner, border: `0.5px solid ${accent || T.border}`, borderRadius: '6px',
    color: T.text, fontFamily: 'inherit', outline: 'none',
  });

  // ── Projects ──
  async function saveProjects(list) {
    setProjects(list);
    await updateProjects(list);
    onRefresh();
  }
  function removeProj(id) { saveProjects(projects.filter(p => p.id !== id)); }
  function addProj() {
    if (!newProjName.trim()) return;
    saveProjects([...projects, { id: Date.now().toString(), name: newProjName.trim(), note: newProjNote.trim() }]);
    setNewProjName(''); setNewProjNote(''); setShowAddProj(false);
  }
  function saveEditProj(id) {
    saveProjects(projects.map(p => p.id === id ? { ...p, name: editProjName, note: editProjNote } : p));
    setEditProjId(null);
  }
  async function markProjDone(proj) {
    // Add to completed tasks
    const updated = await addTaskManually(proj.name);
    setCompleted(updated.completedTasks);
    // Remove from current projects
    saveProjects(projects.filter(p => p.id !== proj.id));
    toast('done');
  }

  // ── NWG ──
  async function addNwg(h) {
    const next = Math.min(data.nwgTarget + 4, nwgHours + h);
    setNwgHours(next); await updateNwg(next); onRefresh(); toast('nwg');
  }
  async function resetNwg() { setNwgHours(0); await updateNwg(0); onRefresh(); }


  // ── Completed ──
  async function handleAddCompleted() {
    if (!newCompletedName.trim()) return;
    const updated = await addTaskManually(newCompletedName.trim());
    setCompleted(updated.completedTasks);
    setNewCompletedName(''); setShowAddCompleted(false);
    onRefresh();
  }
  async function handleRemoveCompleted(id) {
    const updated = await removeCompletedTask(id);
    setCompleted(updated.completedTasks);
    onRefresh();
  }

  // ── Blockers ──
  async function handleAddBlocker(text) {
    const u = await addBlocker(text); setBlockers(u.blockers); onRefresh();
  }
  async function handleRemoveBlocker(id) {
    const u = await removeBlocker(id); setBlockers(u.blockers); onRefresh();
  }
  async function handleSaveBlockerEdit(id, text) {
    await handleRemoveBlocker(id);
    await handleAddBlocker(text);
    setEditBlockerId(null);
  }

  // ── Note ──
  async function saveNoteHandler() {
    await updateNote(note);
    onRefresh();
    toast('note');
  }

  // ── Docs ──
  async function handleAddDoc() {
    if (!newDocName.trim()) return;
    const doc = { name: newDocName.trim(), meta: newDocMeta.trim(), fileType: newDocType, url: newDocUrl.trim() || '#' };
    const updated = await addDoc(doc);
    setDocs(updated.handoverDocs);
    setNewDocName(''); setNewDocMeta(''); setNewDocUrl(''); setShowAddDoc(false);
    onRefresh();
  }
  async function handleRemoveDoc(id) {
    const updated = await removeDoc(id);
    setDocs(updated.handoverDocs);
    onRefresh();
  }
  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toUpperCase().slice(0, 3);
    setNewDocName(file.name);
    setNewDocMeta(`${ext} · ${(file.size / 1024).toFixed(0)} KB · uploaded today`);
    setNewDocType(ext.toLowerCase() === 'pdf' ? 'pdf' : ext.toLowerCase() === 'fig' ? 'fig' : 'file');
    setShowAddDoc(true);
  }

  const statusLabel = STATUS_LABELS[data.status] || data.statusCustom || 'In progress';

  return (
    <div>
      {/* Metric row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: '10px', marginBottom: '14px' }}>
        <MetricCard T={T} label="Status" value={<><div style={{ width: '7px', height: '7px', borderRadius: '50%', background: PURPLE, flexShrink: 0 }} /><span style={{ fontSize: '13px' }}>{statusLabel}</span></>} />
        <MetricCard T={T} label="NWG hours" value={<>{nwgHours % 1 === 0 ? nwgHours : nwgHours.toFixed(1)}<span style={{ fontSize: '11px', color: T.label, fontWeight: 400 }}>/{data.nwgTarget}h</span></>} />
        <MetricCard T={T} label="Active projects" value={<span style={{ fontSize: '20px' }}>{projects.length}</span>} />
        <MetricCard T={T} label="Blockers" value={<span style={{ fontSize: '20px' }}>{blockers.length}</span>} />
      </div>

      {/* 2-col */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) 0.5px minmax(0,1fr)' }}>

        {/* LEFT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '18px' }}>

          {/* Working on */}
          <Card T={T} accent={PURPLE}>
            <CardHeader color={PURPLE} label="Working on" action={<AddBtn label="+ Add project" onClick={() => setShowAddProj(v => !v)} />} />
            {projects.length === 0 && !showAddProj && (
              <div style={{ fontSize: '11px', color: T.muted, padding: '8px 0' }}>No active projects — add one to get started.</div>
            )}
            {projects.map(p => (
              <div key={p.id} style={{ border: `0.5px solid ${T.border}`, borderRadius: '6px', padding: '10px 12px', marginBottom: '8px', background: T.inner }}>
                {editProjId === p.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <input value={editProjName} onChange={e => setEditProjName(e.target.value)} style={inp()} />
                    <input value={editProjNote} onChange={e => setEditProjNote(e.target.value)} placeholder="Note (optional)" style={inp()} />
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => saveEditProj(p.id)} style={{ fontSize: '10px', padding: '3px 10px', background: PURPLE, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit' }}>Save</button>
                      <button onClick={() => setEditProjId(null)} style={{ fontSize: '10px', padding: '3px 10px', border: `0.5px solid ${T.border}`, color: T.muted, borderRadius: '4px', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: '500', color: T.text, marginBottom: p.note ? '3px' : 0 }}>{p.name}</div>
                      {p.note && <div style={{ fontSize: '11px', color: T.muted }}>{p.note}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      <ABtn label="✓" color={GREEN} border="rgba(29,158,117,0.4)" onClick={() => markProjDone(p)} />
                      <ABtn label="Edit" color={T.muted} border={T.border} onClick={() => { setEditProjId(p.id); setEditProjName(p.name); setEditProjNote(p.note || ''); }} />
                      <ABtn label="✕" color={RED} border="rgba(226,75,74,0.3)" onClick={() => removeProj(p.id)} />
                    </div>
                  </div>
                )}
              </div>
            ))}
            {showAddProj && (
              <div style={{ border: `0.5px solid ${T.border}`, borderRadius: '6px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <input placeholder="Project name..." value={newProjName} onChange={e => setNewProjName(e.target.value)} style={inp()} />
                <input placeholder="What are you working on? (optional)" value={newProjNote} onChange={e => setNewProjNote(e.target.value)} style={inp()} />
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={addProj} style={{ fontSize: '10px', padding: '4px 12px', background: PURPLE, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit' }}>Add</button>
                  <button onClick={() => setShowAddProj(false)} style={{ fontSize: '10px', padding: '4px 12px', border: `0.5px solid ${T.border}`, color: T.muted, borderRadius: '4px', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                </div>
              </div>
            )}
            {toasts.done && <div style={{ fontSize: '11px', color: GREEN, marginTop: '8px' }}>✓ Moved to completed!</div>}
            {(() => {
              const todayLabel = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
              const todayTasks = completed.filter(t => t.date === todayLabel || t.date === 'Today');
              if (todayTasks.length === 0) return null;
              return (
                <>
                  <div style={{ height: '0.5px', background: T.border, margin: '10px 0' }} />
                  <div style={{ fontSize: '9px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.08em', color: GREEN, marginBottom: '8px' }}>Done today</div>
                  {todayTasks.map(t => (
                    <div key={t.id} style={{ border: `0.5px solid ${T.border}`, borderRadius: '6px', padding: '10px 12px', marginBottom: '8px', background: T.inner, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: GREEN, flexShrink: 0 }} />
                      <span style={{ fontSize: '12px', color: T.text }}>{t.name}</span>
                    </div>
                  ))}
                </>
              );
            })()}
          </Card>

          {/* NWG hours */}
          <Card T={T} accent={PURPLE}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontSize: '10px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.08em', color: PURPLE }}>NWG hours · {data.nwgTarget}h target</div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', padding: '2px 8px', background: 'rgba(127,119,221,0.2)', color: dark ? '#a0a0d8' : DPURP, borderRadius: '20px', border: '0.5px solid rgba(127,119,221,0.4)' }}>{nwgState.label}</span>
                <ABtn label="Edit target" color={T.muted} border={T.border} onClick={() => setEditTarget(v => !v)} />
              </div>
            </div>
            {editTarget && (
              <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', alignItems: 'center' }}>
                <input type="number" placeholder="New target (h)" value={customTarget} onChange={e => setCustomTarget(e.target.value)} style={{ ...inp(), width: '110px' }} />
                <button onClick={() => { const v = parseFloat(customTarget); if (!isNaN(v) && v > 0) { data.nwgTarget = v; setEditTarget(false); setCustomTarget(''); } }} style={{ fontSize: '10px', padding: '4px 10px', background: PURPLE, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit' }}>Set</button>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '22px', fontWeight: '500', color: T.text }}>{nwgHours % 1 === 0 ? nwgHours : nwgHours.toFixed(1)}</span>
              <span style={{ fontSize: '11px', color: T.muted }}>/ {data.nwgTarget}h this week</span>
            </div>
            <div style={{ height: '6px', background: T.inner, borderRadius: '3px', overflow: 'hidden', marginBottom: '10px', border: `0.5px solid ${T.border}` }}>
              <div style={{ height: '100%', width: `${nwgPct}%`, background: PURPLE, borderRadius: '3px', transition: 'width 0.5s ease' }} />
            </div>
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: T.label, marginRight: '2px' }}>+ Log:</span>
              {[0.5, 1, 1.5, 2].map(h => (
                <button key={h} onClick={() => addNwg(h)} style={{ fontSize: '10px', padding: '3px 8px', border: `0.5px solid ${T.border}`, color: T.text, borderRadius: '4px', background: 'rgba(127,119,221,0.1)', cursor: 'pointer', fontFamily: 'inherit' }}>{h < 1 ? '+30m' : `+${h}h`}</button>
              ))}
              <button onClick={() => setShowCustomNwg(v => !v)} style={{ fontSize: '10px', padding: '3px 8px', border: `0.5px solid ${T.border}`, color: T.muted, borderRadius: '4px', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Custom</button>
              <button onClick={resetNwg} style={{ fontSize: '10px', padding: '3px 8px', border: '0.5px solid rgba(226,75,74,0.3)', color: RED, borderRadius: '4px', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', marginLeft: 'auto' }}>Reset</button>
            </div>
            {showCustomNwg && (
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px', alignItems: 'center' }}>
                <input type="number" step="0.5" min="0.5" placeholder="e.g. 1.5" value={customNwg} onChange={e => setCustomNwg(e.target.value)} style={{ ...inp(), width: '80px' }} />
                <span style={{ fontSize: '11px', color: T.muted }}>h</span>
                <button onClick={() => { const v = parseFloat(customNwg); if (!isNaN(v) && v > 0) { addNwg(v); setCustomNwg(''); setShowCustomNwg(false); } }} style={{ fontSize: '10px', padding: '4px 10px', background: PURPLE, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit' }}>Add</button>
              </div>
            )}
            {toasts.nwg && <div style={{ fontSize: '11px', color: GREEN, marginTop: '8px' }}>✓ Time logged!</div>}
          </Card>

          {/* Completed */}
          <Card T={T} accent={GREEN}>
            <CardHeader color={GREEN} label="Completed this week" action={
              <span onClick={() => setShowAddCompleted(v => !v)} style={{ fontSize: '10px', padding: '2px 9px', border: '0.5px solid rgba(29,158,117,0.4)', color: GREEN, borderRadius: '20px', cursor: 'pointer', background: 'rgba(29,158,117,0.08)', userSelect: 'none' }}>+ Add manually</span>
            } />
            {showAddCompleted && (
              <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                <input placeholder="Task name..." value={newCompletedName} onChange={e => setNewCompletedName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCompleted()} style={{ ...inp(), flex: 1 }} />
                <button onClick={handleAddCompleted} style={{ fontSize: '10px', padding: '4px 10px', background: GREEN, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit' }}>Add</button>
                <button onClick={() => setShowAddCompleted(false)} style={{ fontSize: '10px', padding: '4px 10px', border: `0.5px solid ${T.border}`, color: T.muted, borderRadius: '4px', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
              </div>
            )}
            {completed.length === 0 && !showAddCompleted && (
              <div style={{ fontSize: '11px', color: T.muted, padding: '8px 0' }}>Nothing completed yet — check items off above or add manually.</div>
            )}
            {completed.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'rgba(29,158,117,0.2)', border: '0.5px solid rgba(29,158,117,0.5)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: GREEN }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: T.text }}>{t.name}</div>
                    <div style={{ fontSize: '10px', color: T.label }}>{formatTaskDate(t.date)}</div>
                  </div>
                </div>
                <ABtn label="✕" color={RED} border="rgba(226,75,74,0.3)" onClick={() => handleRemoveCompleted(t.id)} />
              </div>
            ))}
          </Card>
        </div>

        {/* Divider */}
        <div style={{ background: T.border }} />

        {/* RIGHT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '18px' }}>

          {/* Blockers */}
          <Card T={T} accent={RED}>
            <CardHeader color={RED} label="Blockers" action={
              <span onClick={() => setShowBlockerInput(v => !v)} style={{ fontSize: '10px', padding: '2px 9px', border: '0.5px solid rgba(226,75,74,0.4)', color: RED, borderRadius: '20px', cursor: 'pointer', background: 'rgba(226,75,74,0.08)', userSelect: 'none' }}>+ Add blocker</span>
            } />
            {blockers.map(b => (
              <div key={b.id} style={{ background: 'rgba(226,75,74,0.1)', border: '0.5px solid rgba(226,75,74,0.3)', borderRadius: '6px', padding: '10px 12px', marginBottom: '8px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                {editBlockerId === b.id ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <textarea value={editBlockerText} onChange={e => setEditBlockerText(e.target.value)} rows={2} style={{ ...inp('rgba(226,75,74,0.3)'), resize: 'none' }} />
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => handleSaveBlockerEdit(b.id, editBlockerText)} style={{ fontSize: '10px', padding: '3px 10px', background: PURPLE, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit' }}>Save</button>
                      <button onClick={() => setEditBlockerId(null)} style={{ fontSize: '10px', padding: '3px 10px', border: `0.5px solid ${T.border}`, color: T.muted, borderRadius: '4px', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: '12px', color: T.text, lineHeight: '1.5', flex: 1 }}>{b.text}</div>
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      <ABtn label="Edit" color={T.muted} border={T.border} onClick={() => { setEditBlockerId(b.id); setEditBlockerText(b.text); }} />
                      <ABtn label="✕" color={RED} border="rgba(226,75,74,0.3)" onClick={() => handleRemoveBlocker(b.id)} />
                    </div>
                  </>
                )}
              </div>
            ))}
            {blockers.length === 0 && (
              <div style={{ fontSize: '12px', color: GREEN, fontWeight: '500', padding: '4px 0 8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: GREEN }} /> No blockers right now
              </div>
            )}
            <div style={{ fontSize: '10px', color: T.label, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '7px' }}>Quick add</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: showBlockerInput ? '10px' : 0 }}>
              {BLOCKER_PRESETS.map(p => (
                <span key={p} onClick={() => handleAddBlocker(p)} style={{ fontSize: '10px', padding: '3px 9px', border: '0.5px solid rgba(226,75,74,0.35)', color: T.text, borderRadius: '20px', background: 'rgba(226,75,74,0.08)', cursor: 'pointer', userSelect: 'none' }}>{p}</span>
              ))}
            </div>
            {showBlockerInput && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <textarea placeholder="Describe the blocker..." value={customBlocker} onChange={e => setCustomBlocker(e.target.value)} rows={2} style={{ ...inp('rgba(226,75,74,0.3)'), resize: 'none' }} />
                <button onClick={() => { if (customBlocker.trim()) { handleAddBlocker(customBlocker.trim()); setCustomBlocker(''); setShowBlockerInput(false); } }} style={{ fontSize: '10px', padding: '5px 14px', background: RED, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit', alignSelf: 'flex-start' }}>Add</button>
              </div>
            )}
          </Card>

          {/* Note to Maria */}
          <Card T={T} accent={PURPLE}>
            <CardHeader color={PURPLE} label="Note to Maria" action={<ABtn label="Clear" color={T.muted} border={T.border} onClick={() => setNote('')} />} />
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={4}
              style={{ ...inp('rgba(127,119,221,0.3)'), resize: 'none', lineHeight: '1.6', marginBottom: '10px', background: 'rgba(127,119,221,0.08)' }}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '12px' }}>
              {NOTE_PRESETS.map(n => (
                <span key={n.label} onClick={() => setNote(n.text)} style={{ fontSize: '10px', padding: '3px 9px', border: '0.5px solid rgba(127,119,221,0.4)', color: T.text, borderRadius: '20px', background: 'rgba(127,119,221,0.1)', cursor: 'pointer', userSelect: 'none' }}>{n.label}</span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button onClick={saveNoteHandler} style={{ fontSize: '11px', padding: '7px 16px', background: PURPLE, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '500' }}>Save note</button>
              <button onClick={async () => { setNote(''); await updateNote(''); onRefresh(); }} style={{ fontSize: '11px', padding: '7px 16px', border: `0.5px solid ${T.border}`, color: T.muted, borderRadius: '6px', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Discard</button>
              {toasts.note && <span style={{ fontSize: '11px', color: GREEN }}>✓ Saved!</span>}
            </div>
          </Card>

          {/* Handover docs */}
          <Card T={T} accent={DPURP}>
            <CardHeader color={PURPLE} label="Handover docs" action={
              <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                <AddBtn label="+ Add link" onClick={() => { setNewDocType('link'); setShowAddDoc(v => !v); }} />
                <span
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  style={{ fontSize: '10px', padding: '2px 9px', border: '0.5px solid rgba(127,119,221,0.4)', color: PURPLE, borderRadius: '20px', cursor: 'pointer', background: 'rgba(127,119,221,0.1)', userSelect: 'none' }}
                >
                  + Upload file
                </span>
                <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileSelect} />
              </div>
            } />
            {showAddDoc && (
              <div style={{ border: `0.5px solid ${T.border}`, borderRadius: '6px', padding: '10px', marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <input placeholder={newDocType === 'link' ? 'Name (e.g. Architecture Overview)' : 'File name'} value={newDocName} onChange={e => setNewDocName(e.target.value)} style={inp()} />
                {newDocType === 'link' && <input placeholder="URL (e.g. https://notion.so/...)" value={newDocUrl} onChange={e => setNewDocUrl(e.target.value)} style={inp()} />}
                <input placeholder={newDocType === 'link' ? 'Source (e.g. Notion · link)' : 'Details (e.g. PDF · 1.2 MB)'} value={newDocMeta} onChange={e => setNewDocMeta(e.target.value)} style={inp()} />
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={handleAddDoc} style={{ fontSize: '10px', padding: '4px 12px', background: PURPLE, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit' }}>Add</button>
                  <button onClick={() => { setShowAddDoc(false); setNewDocName(''); setNewDocMeta(''); setNewDocUrl(''); }} style={{ fontSize: '10px', padding: '4px 12px', border: `0.5px solid ${T.border}`, color: T.muted, borderRadius: '4px', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                </div>
              </div>
            )}
            {handoverDocs.map(doc => {
              const isLink = !doc.fileType || doc.fileType === 'link';
              const badge  = isLink ? '↗' : (doc.fileType || 'FILE').toUpperCase().slice(0, 3);
              const hasValidUrl = doc.url && doc.url !== '#' && doc.url.trim() !== '';
              const handleOpenDoc = () => {
                if (hasValidUrl) window.open(doc.url, '_blank');
              };
              return (
                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 10px', border: `0.5px solid ${T.border}`, borderRadius: '6px', background: T.inner, marginBottom: '6px' }}>
                  <div onClick={handleOpenDoc} style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0, cursor: hasValidUrl ? 'pointer' : 'default' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '4px', background: 'rgba(127,119,221,0.15)', border: '0.5px solid rgba(127,119,221,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '9px', color: PURPLE, fontWeight: '600' }}>{badge}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', color: isLink ? PURPLE : T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name}</div>
                      <div style={{ fontSize: '10px', color: T.label }}>{doc.meta}</div>
                    </div>
                  </div>
                  <ABtn label="✕" color={RED} border="rgba(226,75,74,0.3)" onClick={() => handleRemoveDoc(doc.id)} />
                </div>
              );
            })}
            {handoverDocs.length === 0 && !showAddDoc && (
              <div style={{ fontSize: '11px', color: T.muted, padding: '4px 0' }}>No docs yet — add a link or upload a file.</div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
