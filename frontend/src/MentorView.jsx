import React, { useState } from 'react';
import { askAI } from './api';

const PURPLE = '#7F77DD';
const RED    = '#E24B4A';
const GREEN  = '#1D9E75';
const DPURP  = '#534AB7';

function Card({ T, accent, children, style }) {
  return (
    <div style={{ background: T.card, borderRadius: '8px', border: `0.5px solid ${T.border}`, borderTop: `2px solid ${accent}`, padding: '14px 16px', ...style }}>
      {children}
    </div>
  );
}

function CardLabel({ color, children }) {
  return (
    <div style={{ fontSize: '10px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.08em', color, marginBottom: '12px' }}>
      {children}
    </div>
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

function fmtDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  // Already a readable label like "2 Apr" — reformat to "Apr 2"
  const parts = date.trim().split(' ');
  if (parts.length === 2 && !isNaN(parseInt(parts[0]))) return `${parts[1]} ${parts[0]}`;
  return date;
}

export default function MentorView({ data, onRefresh, T, dark }) {
  const nwgState = getNwgState(data.nwgHours, data.nwgTarget);
  const nwgPct   = Math.min(100, (data.nwgHours / data.nwgTarget) * 100);

  // AI Chat state
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  const handleAskAI = async () => {
    if (!chatQuestion.trim() || chatLoading) return;
    const question = chatQuestion.trim();
    setChatQuestion('');
    setChatMessages(prev => [...prev, { role: 'user', text: question }]);
    setChatLoading(true);
    try {
      const res = await askAI(question);
      setChatMessages(prev => [...prev, { role: 'assistant', text: res.answer }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', text: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const statusLabels = { inprogress: 'In progress', reviewing: 'Sent for review', done: 'Wrapped up', break: 'On a break', blocked: 'Blocked', custom: data.statusCustom || 'Custom' };
  const statusDot = { inprogress: '#7F77DD', reviewing: '#BA7517', done: '#1D9E75', break: '#8080a0', blocked: '#E24B4A', custom: '#7F77DD' };

  return (
    <div>
      {/* Metric row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: '10px', marginBottom: '14px' }}>
        <MetricCard T={T} label="Status" value={
          <><div style={{ width: '7px', height: '7px', borderRadius: '50%', background: statusDot[data.status] || PURPLE, flexShrink: 0 }} />{statusLabels[data.status] || 'In progress'}</>
        } />
        <MetricCard T={T} label="NWG hours" value={<>{data.nwgHours % 1 === 0 ? data.nwgHours : data.nwgHours.toFixed(1)}<span style={{ fontSize: '11px', color: T.label, fontWeight: 400 }}>/{data.nwgTarget}h</span></>} />
        <MetricCard T={T} label="Active projects" value={data.currentProjects.length} />
        <MetricCard T={T} label="Blockers" value={data.blockers.length} />
      </div>

      {/* 2-col grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) 0.5px minmax(0,1fr)', gap: '0' }}>

        {/* LEFT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '18px' }}>

          {/* Working on today */}
          <Card T={T} accent={PURPLE}>
            <CardLabel color={PURPLE}>Working on today</CardLabel>
            {data.currentProjects.length === 0 ? (
              <div style={{ fontSize: '11px', color: T.muted, padding: '8px 0' }}>No active projects right now.</div>
            ) : (
              data.currentProjects.map(p => (
                <div key={p.id} style={{ paddingLeft: '12px', borderLeft: `2px solid rgba(127,119,221,0.4)`, marginBottom: '10px', paddingTop: '4px', paddingBottom: '4px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: T.text, marginBottom: '3px' }}>{p.name}</div>
                  {p.note && <div style={{ fontSize: '11px', color: T.muted }}>{p.note}</div>}
                </div>
              ))
            )}
          </Card>

          {/* NWG hours */}
          <Card T={T} accent={PURPLE}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <CardLabel color={PURPLE} >NWG hours · {data.nwgTarget}h target</CardLabel>
              <span style={{ fontSize: '10px', padding: '2px 8px', background: 'rgba(127,119,221,0.2)', color: dark ? '#a0a0d8' : DPURP, borderRadius: '20px', border: '0.5px solid rgba(127,119,221,0.4)', marginTop: '-8px' }}>{nwgState.label}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '28px', fontWeight: '500', color: T.text }}>{data.nwgHours % 1 === 0 ? data.nwgHours : data.nwgHours.toFixed(1)}</span>
              <span style={{ fontSize: '12px', color: T.muted }}>/ {data.nwgTarget}h this week</span>
            </div>
            <div style={{ height: '8px', background: T.inner, borderRadius: '4px', overflow: 'hidden', marginBottom: '6px' }}>
              <div style={{ height: '100%', width: `${nwgPct}%`, background: PURPLE, borderRadius: '4px', transition: 'width 0.5s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: T.label }}>
              <span>0h</span><span>4h</span><span>8h</span><span>12h</span><span>16h</span>
            </div>
          </Card>

          {/* Completed this week */}
          <Card T={T} accent={GREEN}>
            <CardLabel color={GREEN}>Completed this week</CardLabel>
            {(data.completedTasks || []).length === 0 ? (
              <div style={{ fontSize: '11px', color: T.muted, padding: '4px 0' }}>No tasks completed this week.</div>
            ) : (
              (data.completedTasks || []).map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: GREEN, flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', color: T.text }}>{t.name}</span>
                  </div>
                  <span style={{ fontSize: '10px', color: T.muted }}>{fmtDate(t.date)}</span>
                </div>
              ))
            )}
          </Card>

        </div>

        {/* Divider */}
        <div style={{ background: T.border }} />

        {/* RIGHT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '18px' }}>

          {/* Blockers */}
          <Card T={T} accent={RED}>
            <CardLabel color={RED}>Blockers</CardLabel>
            {data.blockers.length === 0 ? (
              <div style={{ fontSize: '12px', color: GREEN, fontWeight: '500', padding: '8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: GREEN }} />
                No blockers right now
              </div>
            ) : (
              data.blockers.map(b => (
                <div key={b.id} style={{ background: 'rgba(226,75,74,0.1)', border: '0.5px solid rgba(226,75,74,0.3)', borderRadius: '6px', padding: '10px 12px', marginBottom: '8px' }}>
                  <div style={{ fontSize: '12px', color: T.text, lineHeight: '1.5' }}>{b.text}</div>
                </div>
              ))
            )}
          </Card>

          {/* Note from Sepideh */}
          {data.note && (
            <Card T={T} accent={PURPLE}>
              <CardLabel color={PURPLE}>Note from Sepideh</CardLabel>
              <div style={{ background: 'rgba(127,119,221,0.1)', border: '0.5px solid rgba(127,119,221,0.3)', borderRadius: '6px', padding: '14px 16px' }}>
                <div style={{ fontSize: '13px', color: T.text, lineHeight: '1.7', fontStyle: 'italic' }}>"{data.note}"</div>
              </div>
              {data.lastUpdated && (
                <div style={{ fontSize: '10px', color: T.label, marginTop: '8px', textAlign: 'right' }}>
                  Sent {new Date(data.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </Card>
          )}

          {/* Handover docs */}
          <Card T={T} accent={DPURP}>
            <CardLabel color={PURPLE}>Handover docs</CardLabel>
            {data.handoverDocs.length === 0 ? (
              <div style={{ fontSize: '11px', color: T.muted, padding: '4px 0' }}>No handover docs yet.</div>
            ) : (
              data.handoverDocs.map(doc => {
                const isLink = !doc.fileType || doc.fileType === 'link';
                const badge  = isLink ? '↗' : (doc.fileType || 'FILE').toUpperCase().slice(0, 3);
                const hasValidUrl = doc.url && doc.url !== '#' && doc.url.trim() !== '';
                const handleOpenDoc = () => {
                  if (hasValidUrl) window.open(doc.url, '_blank');
                };
                return (
                  <div key={doc.id} onClick={handleOpenDoc} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 10px', border: `0.5px solid ${T.border}`, borderRadius: '6px', background: T.inner, marginBottom: '6px', cursor: hasValidUrl ? 'pointer' : 'default' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '4px', background: 'rgba(127,119,221,0.15)', border: '0.5px solid rgba(127,119,221,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '9px', color: PURPLE, fontWeight: '600' }}>{badge}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', color: isLink ? PURPLE : T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name}</div>
                      <div style={{ fontSize: '10px', color: T.label }}>{doc.meta}</div>
                    </div>
                    <div onClick={handleOpenDoc} style={{ fontSize: '10px', color: hasValidUrl ? PURPLE : T.label, flexShrink: 0, cursor: hasValidUrl ? 'pointer' : 'default' }}>{isLink ? 'Open ↗' : '↓'}</div>
                  </div>
                );
              })
            )}
          </Card>
        </div>
      </div>

      {/* AI Assistant Chat */}
      <Card T={T} accent={PURPLE} style={{ marginTop: '16px' }}>
        <CardLabel color={PURPLE}>Ask AI Assistant</CardLabel>
        <div style={{ fontSize: '11px', color: T.muted, marginBottom: '12px' }}>
          Ask questions about Sepideh's progress, NWG hours, completed tasks, or blockers.
        </div>

        {/* Chat messages */}
        {chatMessages.length > 0 && (
          <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {chatMessages.map((msg, i) => (
              <div key={i} style={{
                padding: '10px 12px',
                borderRadius: '8px',
                background: msg.role === 'user' ? 'rgba(127,119,221,0.15)' : T.inner,
                border: `0.5px solid ${msg.role === 'user' ? 'rgba(127,119,221,0.3)' : T.border}`,
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%'
              }}>
                <div style={{ fontSize: '9px', color: T.label, marginBottom: '4px', textTransform: 'uppercase' }}>
                  {msg.role === 'user' ? 'You' : 'AI Assistant'}
                </div>
                <div style={{ fontSize: '12px', color: T.text, lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{msg.text}</div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ padding: '10px 12px', borderRadius: '8px', background: T.inner, border: `0.5px solid ${T.border}`, alignSelf: 'flex-start' }}>
                <div style={{ fontSize: '12px', color: T.muted }}>Thinking...</div>
              </div>
            )}
          </div>
        )}

        {/* Input */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={chatQuestion}
            onChange={e => setChatQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAskAI()}
            placeholder="e.g. How many NWG hours this week?"
            style={{
              flex: 1,
              padding: '10px 12px',
              fontSize: '12px',
              borderRadius: '6px',
              border: `1px solid ${T.border}`,
              background: T.inner,
              color: T.text,
              outline: 'none'
            }}
          />
          <button
            onClick={handleAskAI}
            disabled={chatLoading || !chatQuestion.trim()}
            style={{
              padding: '10px 16px',
              fontSize: '12px',
              fontWeight: '500',
              borderRadius: '6px',
              border: 'none',
              background: chatLoading || !chatQuestion.trim() ? T.muted : PURPLE,
              color: '#fff',
              cursor: chatLoading || !chatQuestion.trim() ? 'not-allowed' : 'pointer'
            }}
          >
            {chatLoading ? '...' : 'Ask'}
          </button>
        </div>
      </Card>
    </div>
  );
}
