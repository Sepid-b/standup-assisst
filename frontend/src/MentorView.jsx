import React from 'react';

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

export default function MentorView({ data, onRefresh, T, dark }) {
  const nwgState = getNwgState(data.nwgHours, data.nwgTarget);
  const nwgPct   = Math.min(100, (data.nwgHours / data.nwgTarget) * 100);

  const statusLabels = { inprogress: 'In progress', reviewing: 'Sent for review', done: 'Wrapped up', break: 'On a break', blocked: 'Blocked' };

  return (
    <div>
      {/* Metric row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: '10px', marginBottom: '14px' }}>
        <MetricCard T={T} label="Status" value={
          <><div style={{ width: '7px', height: '7px', borderRadius: '50%', background: PURPLE, flexShrink: 0 }} />{statusLabels[data.status] || 'In progress'}</>
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
            {data.currentProjects.map(p => (
              <div key={p.id} style={{ paddingLeft: '12px', borderLeft: `2px solid rgba(127,119,221,0.4)`, marginBottom: '10px', paddingTop: '4px', paddingBottom: '4px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: T.text, marginBottom: '3px' }}>{p.name}</div>
                {p.note && <div style={{ fontSize: '11px', color: T.muted }}>{p.note}</div>}
              </div>
            ))}
          </Card>

          {/* Worked on this week */}
          <Card T={T} accent={DPURP}>
            <CardLabel color={PURPLE}>Worked on this week</CardLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {data.otherProjects.map(p => (
                <div key={p.id} style={{ padding: '8px 10px', background: T.inner, border: `0.5px solid ${T.border}`, borderRadius: '6px', fontSize: '12px', color: T.text }}>
                  {p.name}
                </div>
              ))}
            </div>
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

          {/* Completed */}
          <Card T={T} accent={GREEN}>
            <CardLabel color={GREEN}>Completed</CardLabel>
            {data.completedTasks.slice(0, 5).map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'rgba(29,158,117,0.2)', border: '0.5px solid rgba(29,158,117,0.5)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: GREEN }} />
                </div>
                <span style={{ fontSize: '11px', color: T.text, flex: 1 }}>{t.name}</span>
                <span style={{ fontSize: '10px', color: T.label, flexShrink: 0 }}>{t.date}</span>
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

          {/* Handover docs */}
          <Card T={T} accent={DPURP}>
            <CardLabel color={PURPLE}>Handover docs</CardLabel>
            {data.handoverDocs.map(doc => {
              const isLink = !doc.fileType || doc.fileType === 'link';
              const badge  = isLink ? '↗' : (doc.fileType || 'FILE').toUpperCase().slice(0, 3);
              return (
                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 10px', border: `0.5px solid ${T.border}`, borderRadius: '6px', background: T.inner, marginBottom: '6px', cursor: 'pointer' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '4px', background: 'rgba(127,119,221,0.15)', border: '0.5px solid rgba(127,119,221,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '9px', color: PURPLE, fontWeight: '600' }}>{badge}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', color: isLink ? PURPLE : T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name}</div>
                    <div style={{ fontSize: '10px', color: T.label }}>{doc.meta}</div>
                  </div>
                  <div style={{ fontSize: '10px', color: T.label, flexShrink: 0 }}>{isLink ? 'Open ↗' : '↓'}</div>
                </div>
              );
            })}
          </Card>
        </div>
      </div>
    </div>
  );
}
