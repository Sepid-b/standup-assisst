import React, { useState } from 'react';
import { updateProjects, addBlocker, removeBlocker, completeTask, updateNwg, updateNote } from './api';

const PURPLE = '#7F77DD';
const RED    = '#E24B4A';
const GREEN  = '#1D9E75';
const DPURP  = '#534AB7';

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

function Chip({ label, color, borderColor, bg, onClick }) {
  return (
    <span onClick={onClick} style={{ fontSize: '10px', padding: '3px 9px', border: `0.5px solid ${borderColor}`, color, borderRadius: '20px', background: bg, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>{label}</span>
  );
}

function ActionBtn({ label, color, borderColor, onClick }) {
  return (
    <button onClick={onClick} style={{ fontSize: '10px', padding: '2px 8px', border: `0.5px solid ${borderColor}`, color, borderRadius: '4px', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>{label}</button>
  );
}

function AddBtn({ T, label, color, onClick }) {
  return (
    <span onClick={onClick} style={{ fontSize: '10px', padding: '2px 9px', border: `0.5px solid rgba(127,119,221,0.4)`, color: color || PURPLE, borderRadius: '20px', cursor: 'pointer', background: 'rgba(127,119,221,0.1)' }}>{label}</span>
  );
}

function MetricCard({ T, label, value }) {
  return (
    <div style={{ background: T.inner, borderRadius: '8px', padding: '12px 14px', border: `0.5px solid ${T.border}` }}>
      <div style={{ fontSize: '10px', color: T.label, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: typeof value === 'string' ? '13px' : '20px', fontWeight: '500', color: T.text, lineHeight: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>{value}</div>
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

const BLOCKER_PRESETS = ['Waiting for review','Need access / credentials',"Need Maria's input",'Stuck on a bug','Waiting on a meeting'];
const NOTE_PRESETS    = [
  { label: 'Ready for review', text: 'Ready for your review!' },
  { label: 'Demo ready!',      text: 'Demo is ready — want to try it?' },
  { label: 'Can we sync?',     text: 'Can we sync this week?' },
  { label: 'Need your input',  text: 'Need your input on something' },
];

export default function MyView({ data, onRefresh, T, dark }) {
  const [projects, setProjects]   = useState(data.currentProjects);
  const [blockers, setBlockers]   = useState(data.blockers);
  const [nwgHours, setNwgHours]   = useState(data.nwgHours);
  const [note, setNote]           = useState(data.note);
  const [otherProjects, setOther] = useState(data.otherProjects);
  const [completed, setCompleted] = useState(data.completedTasks);

  // UI state
  const [showAddProj, setShowAddProj]         = useState(false);
  const [newProjName, setNewProjName]         = useState('');
  const [newProjNote, setNewProjNote]         = useState('');
  const [editProjId, setEditProjId]           = useState(null);
  const [showCustomNwg, setShowCustomNwg]     = useState(false);
  const [customNwg, setCustomNwg]             = useState('');
  const [editTarget, setEditTarget]           = useState(false);
  const [customTarget, setCustomTarget]       = useState('');
  const [showBlockerInput, setShowBlockerInput] = useState(false);
  const [customBlocker, setCustomBlocker]     = useState('');
  const [editBlockerId, setEditBlockerId]     = useState(null);
  const [editBlockerText, setEditBlockerText] = useState('');
  const [showAddOther, setShowAddOther]       = useState(false);
  const [newOtherName, setNewOtherName]       = useState('');
  const [editOtherId, setEditOtherId]         = useState(null);
  const [editOtherName, setEditOtherName]     = useState('');
  const [showAddDoc, setShowAddDoc]           = useState(false);
  const [newDocName, setNewDocName]           = useState('');
  const [newDocMeta, setNewDocMeta]           = useState('');
  const [newDocType, setNewDocType]           = useState('link');
  const [showAddCompleted, setShowAddCompleted] = useState(false);
  const [newCompletedName, setNewCompletedName] = useState('');
  const [toasts, setToasts]                   = useState({});

  const nwgState = getNwgState(nwgHours, data.nwgTarget);
  const nwgPct   = Math.min(100, (nwgHours / data.nwgTarget) * 100);

  const statusLabels = { inprogress: 'In progress', reviewing: 'Sent for review', done: 'Wrapped up', break: 'On a break', blocked: 'Blocked' };

  function toast(key) {
    setToasts(t => ({ ...t, [key]: true }));
    setTimeout(() => setToasts(t => ({ ...t, [key]: false })), 2000);
  }

  // Projects
  async function saveProjects(list) { setProjects(list); await updateProjects(list); onRefresh(); }
  function removeProj(id) { saveProjects(projects.filter(p => p.id !== id)); }
  function addProj() {
    if (!newProjName.trim()) return;
    saveProjects([...projects, { id: Date.now().toString(), name: newProjName.trim(), note: newProjNote.trim() }]);
    setNewProjName(''); setNewProjNote(''); setShowAddProj(false);
  }
  async function saveProjEdit(id) {
    const list = projects.map(p => p.id === id ? { ...p, name: editOtherName || p.name } : p);
    setEditProjId(null); await saveProjects(list);
  }

  // NWG
  async function addNwg(h) {
    const next = Math.min(data.nwgTarget + 4, nwgHours + h);
    setNwgHours(next); await updateNwg(next); onRefresh(); toast('nwg');
  }
  async function resetNwg() { setNwgHours(0); await updateNwg(0); onRefresh(); }

  // Blockers
  async function handleAddBlocker(text) { const u = await addBlocker(text); setBlockers(u.blockers); onRefresh(); }
  async function handleRemoveBlocker(id) { const u = await removeBlocker(id); setBlockers(u.blockers); onRefresh(); }

  // Note
  async function saveNoteHandler() { await updateNote(note); onRefresh(); toast('note'); }

  // Other projects (client-side only for now)
  function removeOther(id) { setOther(o => o.filter(p => p.id !== id)); }
  function addOther() {
    if (!newOtherName.trim()) return;
    setOther(o => [...o, { id: Date.now().toString(), name: newOtherName.trim(), color: PURPLE }]);
    setNewOtherName(''); setShowAddOther(false);
  }
  function saveOtherEdit(id) {
    setOther(o => o.map(p => p.id === id ? { ...p, name: editOtherName } : p));
    setEditOtherId(null);
  }

  // Completed
  function removeCompleted(id) { setCompleted(c => c.filter(t => t.id !== id)); }
  function addCompleted() {
    if (!newCompletedName.trim()) return;
    setCompleted(c => [{ id: Date.now().toString(), name: newCompletedName.trim(), date: 'Today' }, ...c]);
    setNewCompletedName(''); setShowAddCompleted(false);
  }

  const inputStyle = (accent) => ({
    width: '100%', boxSizing: 'border-box', fontSize: '11px', padding: '6px 10px',
    background: T.inner, border: `0.5px solid ${accent || T.border}`, borderRadius: '6px',
    color: T.text, fontFamily: 'inherit', outline: 'none',
  });

  return (
    <div>
      {/* Metric row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: '10px', marginBottom: '14px' }}>
        <MetricCard T={T} label="Status" value={
          <><div style={{ width: '7px', height: '7px', borderRadius: '50%', background: PURPLE, flexShrink: 0 }} />{statusLabels[data.status] || 'In progress'}</>
        } />
        <MetricCard T={T} label="NWG hours" value={<>{nwgHours % 1 === 0 ? nwgHours : nwgHours.toFixed(1)}<span style={{ fontSize: '11px', color: T.label, fontWeight: 400 }}>/{data.nwgTarget}h</span></>} />
        <MetricCard T={T} label="Active projects" value={projects.length} />
        <MetricCard T={T} label="Blockers" value={blockers.length} />
      </div>

      {/* 2-col grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) 0.5px minmax(0,1fr)' }}>

        {/* LEFT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '18px' }}>

          {/* Working on */}
          <Card T={T} accent={PURPLE}>
            <CardHeader color={PURPLE} label="Working on" action={<AddBtn T={T} label="+ Add project" onClick={() => setShowAddProj(v => !v)} />} />
            {projects.map(p => (
              <div key={p.id} style={{ border: `0.5px solid ${T.border}`, borderRadius: '6px', padding: '10px 12px', marginBottom: '8px', background: T.inner }}>
                {editProjId === p.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <input defaultValue={p.name} onChange={e => setEditOtherName(e.target.value)} style={inputStyle()} />
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => saveProjEdit(p.id)} style={{ fontSize: '10px', padding: '3px 10px', background: PURPLE, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit' }}>Save</button>
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
                      <ActionBtn label="Edit" color={T.muted} borderColor={T.border} onClick={() => { setEditProjId(p.id); setEditOtherName(p.name); }} />
                      <ActionBtn label="✕" color={RED} borderColor="rgba(226,75,74,0.3)" onClick={() => removeProj(p.id)} />
                    </div>
                  </div>
                )}
              </div>
            ))}
            {showAddProj && (
              <div style={{ border: `0.5px solid ${T.border}`, borderRadius: '6px', padding: '10px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <input placeholder="Project name..." value={newProjName} onChange={e => setNewProjName(e.target.value)} style={inputStyle()} />
                <input placeholder="What are you working on? (optional)" value={newProjNote} onChange={e => setNewProjNote(e.target.value)} style={inputStyle()} />
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={addProj} style={{ fontSize: '10px', padding: '4px 12px', background: PURPLE, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit' }}>Add</button>
                  <button onClick={() => setShowAddProj(false)} style={{ fontSize: '10px', padding: '4px 12px', border: `0.5px solid ${T.border}`, color: T.muted, borderRadius: '4px', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                </div>
              </div>
            )}
          </Card>

          {/* NWG hours */}
          <Card T={T} accent={PURPLE}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontSize: '10px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.08em', color: PURPLE }}>NWG hours · {data.nwgTarget}h target</div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', padding: '2px 8px', background: 'rgba(127,119,221,0.2)', color: dark ? '#a0a0d8' : DPURP, borderRadius: '20px', border: '0.5px solid rgba(127,119,221,0.4)' }}>{nwgState.label}</span>
                <ActionBtn label="Edit target" color={T.muted} borderColor={T.border} onClick={() => setEditTarget(v => !v)} />
              </div>
            </div>
            {editTarget && (
              <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', alignItems: 'center' }}>
                <input type="number" placeholder="New target (h)" value={customTarget} onChange={e => setCustomTarget(e.target.value)} style={{ ...inputStyle(), width: '100px' }} />
                <button onClick={() => { const v = parseFloat(customTarget); if (!isNaN(v) && v > 0) { data.nwgTarget = v; setEditTarget(false); } }} style={{ fontSize: '10px', padding: '4px 10px', background: PURPLE, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit' }}>Set</button>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '22px', fontWeight: '500', color: T.text }}>{nwgHours % 1 === 0 ? nwgHours : nwgHours.toFixed(1)}</span>
              <span style={{ fontSize: '11px', color: T.muted }}>/ {data.nwgTarget}h this week</span>
            </div>
            <div style={{ height: '6px', background: T.inner, borderRadius: '3px', overflow: 'hidden', marginBottom: '10px' }}>
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
                <input type="number" step="0.5" min="0.5" placeholder="e.g. 1.5" value={customNwg} onChange={e => setCustomNwg(e.target.value)} style={{ ...inputStyle(), width: '80px' }} />
                <span style={{ fontSize: '11px', color: T.muted }}>h</span>
                <button onClick={() => { const v = parseFloat(customNwg); if (!isNaN(v) && v > 0) { addNwg(v); setCustomNwg(''); setShowCustomNwg(false); } }} style={{ fontSize: '10px', padding: '4px 10px', background: PURPLE, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit' }}>Add</button>
              </div>
            )}
            {toasts.nwg && <div style={{ fontSize: '11px', color: GREEN, marginTop: '8px' }}>✓ Time logged!</div>}
          </Card>

          {/* Other projects */}
          <Card T={T} accent={DPURP}>
            <CardHeader color={PURPLE} label="Other projects" action={<AddBtn T={T} label="+ Add" onClick={() => setShowAddOther(v => !v)} />} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {otherProjects.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: T.inner, border: `0.5px solid ${T.border}`, borderRadius: '6px' }}>
                  {editOtherId === p.id ? (
                    <div style={{ display: 'flex', gap: '6px', flex: 1 }}>
                      <input defaultValue={p.name} onChange={e => setEditOtherName(e.target.value)} style={{ ...inputStyle(), flex: 1 }} />
                      <button onClick={() => saveOtherEdit(p.id)} style={{ fontSize: '10px', padding: '2px 8px', background: PURPLE, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit' }}>Save</button>
                      <button onClick={() => setEditOtherId(null)} style={{ fontSize: '10px', padding: '2px 8px', border: `0.5px solid ${T.border}`, color: T.muted, borderRadius: '4px', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
                    </div>
                  ) : (
                    <>
                      <span style={{ fontSize: '12px', color: T.text }}>{p.name}</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <ActionBtn label="Edit" color={T.muted} borderColor={T.border} onClick={() => { setEditOtherId(p.id); setEditOtherName(p.name); }} />
                        <ActionBtn label="✕" color={RED} borderColor="rgba(226,75,74,0.3)" onClick={() => removeOther(p.id)} />
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            {showAddOther && (
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                <input placeholder="Project name..." value={newOtherName} onChange={e => setNewOtherName(e.target.value)} style={{ ...inputStyle(), flex: 1 }} />
                <button onClick={addOther} style={{ fontSize: '10px', padding: '4px 10px', background: PURPLE, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit' }}>Add</button>
                <button onClick={() => setShowAddOther(false)} style={{ fontSize: '10px', padding: '4px 10px', border: `0.5px solid ${T.border}`, color: T.muted, borderRadius: '4px', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
              </div>
            )}
          </Card>

          {/* Completed */}
          <Card T={T} accent={GREEN}>
            <CardHeader color={GREEN} label="Completed" action={<span onClick={() => setShowAddCompleted(v => !v)} style={{ fontSize: '10px', padding: '2px 9px', border: '0.5px solid rgba(29,158,117,0.4)', color: GREEN, borderRadius: '20px', cursor: 'pointer', background: 'rgba(29,158,117,0.08)' }}>+ Add manually</span>} />
            {showAddCompleted && (
              <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                <input placeholder="Task name..." value={newCompletedName} onChange={e => setNewCompletedName(e.target.value)} style={{ ...inputStyle(), flex: 1 }} />
                <button onClick={addCompleted} style={{ fontSize: '10px', padding: '4px 10px', background: GREEN, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit' }}>Add</button>
                <button onClick={() => setShowAddCompleted(false)} style={{ fontSize: '10px', padding: '4px 10px', border: `0.5px solid ${T.border}`, color: T.muted, borderRadius: '4px', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
              </div>
            )}
            {completed.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'rgba(29,158,117,0.2)', border: '0.5px solid rgba(29,158,117,0.5)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: GREEN }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: T.text }}>{t.name}</div>
                    <div style={{ fontSize: '10px', color: T.label }}>{t.date}</div>
                  </div>
                </div>
                <ActionBtn label="✕" color={RED} borderColor="rgba(226,75,74,0.3)" onClick={() => removeCompleted(t.id)} />
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
            <CardHeader color={RED} label="Blockers" action={<span onClick={() => setShowBlockerInput(v => !v)} style={{ fontSize: '10px', padding: '2px 9px', border: '0.5px solid rgba(226,75,74,0.4)', color: RED, borderRadius: '20px', cursor: 'pointer', background: 'rgba(226,75,74,0.08)' }}>+ Add blocker</span>} />
            {blockers.map(b => (
              <div key={b.id} style={{ background: 'rgba(226,75,74,0.1)', border: '0.5px solid rgba(226,75,74,0.3)', borderRadius: '6px', padding: '10px 12px', marginBottom: '8px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                {editBlockerId === b.id ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <textarea value={editBlockerText} onChange={e => setEditBlockerText(e.target.value)} rows={2} style={{ ...inputStyle('rgba(226,75,74,0.3)'), resize: 'none' }} />
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={async () => { await removeBlocker(b.id); const u = await addBlocker(editBlockerText); setBlockers(u.blockers); setEditBlockerId(null); onRefresh(); }} style={{ fontSize: '10px', padding: '3px 10px', background: PURPLE, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit' }}>Save</button>
                      <button onClick={() => setEditBlockerId(null)} style={{ fontSize: '10px', padding: '3px 10px', border: `0.5px solid ${T.border}`, color: T.muted, borderRadius: '4px', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: '12px', color: T.text, lineHeight: '1.5', flex: 1 }}>{b.text}</div>
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      <ActionBtn label="Edit" color={T.muted} borderColor={T.border} onClick={() => { setEditBlockerId(b.id); setEditBlockerText(b.text); }} />
                      <ActionBtn label="✕" color={RED} borderColor="rgba(226,75,74,0.3)" onClick={() => handleRemoveBlocker(b.id)} />
                    </div>
                  </>
                )}
              </div>
            ))}
            <div style={{ fontSize: '10px', color: T.label, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '7px' }}>Quick add</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: showBlockerInput ? '10px' : 0 }}>
              {BLOCKER_PRESETS.map(p => (
                <Chip key={p} label={p} color={T.text} borderColor="rgba(226,75,74,0.35)" bg="rgba(226,75,74,0.08)" onClick={() => handleAddBlocker(p)} />
              ))}
            </div>
            {showBlockerInput && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <textarea placeholder="Describe the blocker..." value={customBlocker} onChange={e => setCustomBlocker(e.target.value)} rows={2} style={{ ...inputStyle('rgba(226,75,74,0.3)'), resize: 'none' }} />
                <button onClick={() => { if (customBlocker.trim()) { handleAddBlocker(customBlocker.trim()); setCustomBlocker(''); setShowBlockerInput(false); } }} style={{ fontSize: '10px', padding: '5px 14px', background: RED, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit', alignSelf: 'flex-start' }}>Add</button>
              </div>
            )}
          </Card>

          {/* Note to Maria */}
          <Card T={T} accent={PURPLE}>
            <CardHeader color={PURPLE} label="Note to Maria" action={<ActionBtn label="Clear" color={T.muted} borderColor={T.border} onClick={() => setNote('')} />} />
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={4}
              style={{ ...inputStyle('rgba(127,119,221,0.3)'), resize: 'none', lineHeight: '1.6', marginBottom: '10px', background: 'rgba(127,119,221,0.08)' }}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '12px' }}>
              {NOTE_PRESETS.map(n => (
                <Chip key={n.label} label={n.label} color={T.text} borderColor="rgba(127,119,221,0.4)" bg="rgba(127,119,221,0.1)" onClick={() => setNote(n.text)} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={saveNoteHandler} style={{ fontSize: '11px', padding: '7px 16px', background: PURPLE, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '500' }}>Save note</button>
              <button onClick={() => setNote(data.note)} style={{ fontSize: '11px', padding: '7px 16px', border: `0.5px solid ${T.border}`, color: T.muted, borderRadius: '6px', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Discard</button>
              {toasts.note && <span style={{ fontSize: '11px', color: GREEN, alignSelf: 'center' }}>✓ Saved!</span>}
            </div>
          </Card>

          {/* Handover docs */}
          <Card T={T} accent={DPURP}>
            <CardHeader color={PURPLE} label="Handover docs" action={
              <div style={{ display: 'flex', gap: '5px' }}>
                <AddBtn T={T} label="+ Add link" onClick={() => { setShowAddDoc(v => !v); setNewDocType('link'); }} />
                <AddBtn T={T} label="+ Upload file" onClick={() => { setShowAddDoc(v => !v); setNewDocType('file'); }} />
              </div>
            } />
            {showAddDoc && (
              <div style={{ border: `0.5px solid ${T.border}`, borderRadius: '6px', padding: '10px', marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <input placeholder={newDocType === 'link' ? 'Name (e.g. Architecture Overview)' : 'File name'} value={newDocName} onChange={e => setNewDocName(e.target.value)} style={inputStyle()} />
                <input placeholder={newDocType === 'link' ? 'Source (e.g. Notion · link)' : 'Type & size (e.g. PDF · 1.2 MB)'} value={newDocMeta} onChange={e => setNewDocMeta(e.target.value)} style={inputStyle()} />
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => { if (newDocName.trim()) { /* addDoc call here */ setShowAddDoc(false); setNewDocName(''); setNewDocMeta(''); } }} style={{ fontSize: '10px', padding: '4px 12px', background: PURPLE, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit' }}>Add</button>
                  <button onClick={() => setShowAddDoc(false)} style={{ fontSize: '10px', padding: '4px 12px', border: `0.5px solid ${T.border}`, color: T.muted, borderRadius: '4px', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                </div>
              </div>
            )}
            {data.handoverDocs.map(doc => {
              const isLink = !doc.fileType || doc.fileType === 'link';
              const badge  = isLink ? '↗' : (doc.fileType || 'FILE').toUpperCase().slice(0, 3);
              return (
                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 10px', border: `0.5px solid ${T.border}`, borderRadius: '6px', background: T.inner, marginBottom: '6px' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '4px', background: 'rgba(127,119,221,0.15)', border: '0.5px solid rgba(127,119,221,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '9px', color: PURPLE, fontWeight: '600' }}>{badge}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', color: isLink ? PURPLE : T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name}</div>
                    <div style={{ fontSize: '10px', color: T.label }}>{doc.meta}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    <ActionBtn label="Edit" color={T.muted} borderColor={T.border} onClick={() => {}} />
                    <ActionBtn label="✕" color={RED} borderColor="rgba(226,75,74,0.3)" onClick={() => {}} />
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      </div>
    </div>
  );
}
