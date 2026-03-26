import React, { useState, useEffect, useCallback } from 'react';
import { getStatus } from './api';
import MentorView from './MentorView';
import MyView from './MyView';

function getWeekLabel() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(now); mon.setDate(diff);
  const fri = new Date(mon); fri.setDate(mon.getDate() + 4);
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(mon)} – ${fmt(fri)}, ${fri.getFullYear()}`;
}

function formatUpdated(iso) {
  if (!iso) return '';
  return 'Updated ' + new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function App() {
  const [view, setView]     = useState('mentor');
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [dark, setDark]     = useState(true);

  const T = dark ? {
    page:       '#16161e',
    card:       '#1e1e2e',
    inner:      '#16161e',
    border:     '#2a2a3a',
    text:       'white',
    muted:      '#8080a0',
    label:      '#6060a0',
    headerBg:   '#1e1e2e',
  } : {
    page:       '#f5f5f8',
    card:       'white',
    inner:      '#f9f9fc',
    border:     '#e0dff0',
    text:       '#1a1a2e',
    muted:      '#9090b0',
    label:      '#9090b0',
    headerBg:   'white',
  };

  const refresh = useCallback(() => {
    getStatus().then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { const t = setInterval(refresh, 15000); return () => clearInterval(t); }, [refresh]);

  const headerStyle = {
    background: T.headerBg,
    borderBottom: `0.5px solid ${T.border}`,
    padding: '14px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '10px',
    flexShrink: 0,
  };

  return (
    <div style={{ minHeight: '100vh', background: T.page, fontFamily: "'Segoe UI', -apple-system, sans-serif" }}>

      {/* Header */}
      <div style={headerStyle}>
        {/* Left: avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#7F77DD', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'white', fontWeight: '500', flexShrink: 0 }}>S</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '500', color: T.text }}>Sepideh's standup</div>
            <div style={{ fontSize: '11px', color: T.label }}>{getWeekLabel()} {data ? '· ' + formatUpdated(data.lastUpdated) : ''}</div>
          </div>
        </div>

        {/* Right: controls — only show status + view toggle in My view; only name in Maria's view */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {view === 'mine' && (
            <div style={{ position: 'relative' }}>
              <select
                value={data ? data.status : 'inprogress'}
                onChange={async (e) => {
                  if (!data) return;
                  const { updateStatus } = await import('./api');
                  await updateStatus({ status: e.target.value });
                  refresh();
                }}
                style={{ fontSize: '11px', padding: '5px 28px 5px 12px', background: 'rgba(127,119,221,0.18)', color: dark ? 'white' : '#534AB7', borderRadius: '20px', border: '0.5px solid rgba(127,119,221,0.45)', fontFamily: 'inherit', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', outline: 'none', fontWeight: '500' }}
              >
                <option value="inprogress">Back to it</option>
                <option value="reviewing">Sent for review</option>
                <option value="done">Wrapped up</option>
                <option value="break">Break</option>
                <option value="blocked">Blocked</option>
              </select>
              <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: dark ? 'white' : '#534AB7', fontSize: '9px' }}>▾</div>
            </div>
          )}

          <div style={{ width: '0.5px', height: '20px', background: T.border }} />

          <span
            onClick={() => setView('mentor')}
            style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', border: `0.5px solid ${view === 'mentor' ? 'rgba(127,119,221,0.5)' : T.border}`, background: view === 'mentor' ? 'rgba(127,119,221,0.2)' : 'transparent', color: view === 'mentor' ? (dark ? 'white' : '#534AB7') : T.label, cursor: 'pointer', fontWeight: view === 'mentor' ? '500' : '400' }}
          >
            Maria's view
          </span>
          <span
            onClick={() => setView('mine')}
            style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', border: `0.5px solid ${view === 'mine' ? 'rgba(127,119,221,0.5)' : T.border}`, background: view === 'mine' ? 'rgba(127,119,221,0.2)' : 'transparent', color: view === 'mine' ? (dark ? 'white' : '#534AB7') : T.label, cursor: 'pointer', fontWeight: view === 'mine' ? '500' : '400' }}
          >
            My view
          </span>

          <div style={{ width: '0.5px', height: '20px', background: T.border }} />

          {/* Dark/light toggle */}
          <button
            onClick={() => setDark(d => !d)}
            style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '20px', border: `0.5px solid ${T.border}`, background: 'transparent', color: T.muted, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {dark ? '☀ Light' : '☾ Dark'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '16px 20px' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: T.muted, fontSize: '13px' }}>Loading...</div>
        ) : data ? (
          view === 'mentor'
            ? <MentorView data={data} onRefresh={refresh} T={T} dark={dark} />
            : <MyView data={data} onRefresh={refresh} T={T} dark={dark} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: T.muted, fontSize: '13px' }}>Could not load data. Is the backend running?</div>
        )}
      </div>
    </div>
  );
}
