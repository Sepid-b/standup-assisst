import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getStatus, updateStatus, saveSnapshot } from './api';
import MentorView from './MentorView';
import MyView from './MyView';
import HistoryView from './HistoryView';

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

const STATUS_OPTIONS = [
  { value: 'inprogress', label: 'Back to it' },
  { value: 'reviewing',  label: 'Sent for review' },
  { value: 'done',       label: 'Wrapped up' },
  { value: 'break',      label: 'Break' },
  { value: 'blocked',    label: 'Blocked' },
  { value: 'custom',     label: 'Custom...' },
];

export { STATUS_OPTIONS };

export default function App() {
  const [view, setView]           = useState('mentor');
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [dark, setDark]           = useState(true);
  const [showCustomStatus, setShowCustomStatus] = useState(false);
  const [customStatusText, setCustomStatusText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const lastSnapshotRef = useRef(null);

  const T = dark ? {
    page: '#16161e', card: '#1e1e2e', inner: '#16161e',
    border: '#2a2a3a', text: 'white', muted: '#8080a0', label: '#6060a0',
  } : {
    page: '#f5f5f8', card: 'white', inner: '#f9f9fc',
    border: '#e0dff0', text: '#1a1a2e', muted: '#9090b0', label: '#9090b0',
  };

  // Auto-save snapshot when data changes (fire and forget)
  useEffect(() => {
    if (!data) return;
    const dataStr = JSON.stringify(data);
    if (lastSnapshotRef.current !== dataStr) {
      lastSnapshotRef.current = dataStr;
      saveSnapshot(data).catch(() => {}); // Fire and forget
    }
  }, [data]);

  const refresh = useCallback(() => {
    getStatus().then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const manualRefresh = useCallback(() => {
    setRefreshing(true);
    getStatus()
      .then(d => { setData(d); })
      .catch(() => {})
      .finally(() => setTimeout(() => setRefreshing(false), 500));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { const t = setInterval(refresh, 15000); return () => clearInterval(t); }, [refresh]);

  async function handleStatusChange(val) {
    if (val === 'custom') {
      setShowCustomStatus(true);
      return;
    }
    setShowCustomStatus(false);
    await updateStatus({ status: val, statusCustom: '' });
    refresh();
  }

  async function saveCustomStatus() {
    if (!customStatusText.trim()) return;
    await updateStatus({ status: 'custom', statusCustom: customStatusText.trim() });
    setShowCustomStatus(false);
    refresh();
  }

  const currentStatus = data ? data.status : 'inprogress';

  return (
    <div style={{ minHeight: '100vh', background: T.page, fontFamily: "'Segoe UI', -apple-system, sans-serif" }}>
      {/* Header */}
      <div style={{ background: T.card, borderBottom: `0.5px solid ${T.border}`, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#7F77DD', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'white', fontWeight: '500', flexShrink: 0 }}>S</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '500', color: T.text }}>Sepideh's standup</div>
            <div style={{ fontSize: '11px', color: T.label }}>{getWeekLabel()}{data ? ' · ' + formatUpdated(data.lastUpdated) : ''}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {view === 'mine' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ position: 'relative' }}>
                <select
                  value={currentStatus}
                  onChange={e => handleStatusChange(e.target.value)}
                  style={{ fontSize: '11px', padding: '5px 28px 5px 12px', background: 'rgba(127,119,221,0.18)', color: dark ? 'white' : '#534AB7', borderRadius: '20px', border: '0.5px solid rgba(127,119,221,0.45)', fontFamily: 'inherit', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', outline: 'none', fontWeight: '500' }}
                >
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value} style={{ background: '#1e1e2e', color: 'white' }}>{o.label}</option>)}
                </select>
                <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: dark ? 'white' : '#534AB7', fontSize: '9px' }}>▾</div>
              </div>
              {showCustomStatus && (
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <input
                    autoFocus
                    placeholder="Type status..."
                    value={customStatusText}
                    onChange={e => setCustomStatusText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveCustomStatus()}
                    style={{ fontSize: '11px', padding: '4px 10px', background: 'rgba(127,119,221,0.18)', color: dark ? 'white' : '#534AB7', border: '0.5px solid rgba(127,119,221,0.45)', borderRadius: '20px', outline: 'none', width: '140px', fontFamily: 'inherit' }}
                  />
                  <button onClick={saveCustomStatus} style={{ fontSize: '10px', padding: '4px 10px', background: '#7F77DD', color: 'white', border: 'none', borderRadius: '20px', cursor: 'pointer', fontFamily: 'inherit' }}>Set</button>
                </div>
              )}
            </div>
          )}

          <div style={{ width: '0.5px', height: '20px', background: T.border }} />

          <span onClick={() => setView('mentor')} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', border: `0.5px solid ${view === 'mentor' ? 'rgba(127,119,221,0.5)' : T.border}`, background: view === 'mentor' ? 'rgba(127,119,221,0.2)' : 'transparent', color: view === 'mentor' ? (dark ? 'white' : '#534AB7') : T.label, cursor: 'pointer', fontWeight: view === 'mentor' ? '500' : '400' }}>
            Maria's view
          </span>
          <span onClick={() => setView('mine')} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', border: `0.5px solid ${view === 'mine' ? 'rgba(127,119,221,0.5)' : T.border}`, background: view === 'mine' ? 'rgba(127,119,221,0.2)' : 'transparent', color: view === 'mine' ? (dark ? 'white' : '#534AB7') : T.label, cursor: 'pointer', fontWeight: view === 'mine' ? '500' : '400' }}>
            My view
          </span>
          <span onClick={() => setView('history')} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', border: `0.5px solid ${view === 'history' ? 'rgba(127,119,221,0.5)' : T.border}`, background: view === 'history' ? 'rgba(127,119,221,0.2)' : 'transparent', color: view === 'history' ? (dark ? 'white' : '#534AB7') : T.label, cursor: 'pointer', fontWeight: view === 'history' ? '500' : '400' }}>
            History
          </span>

          <div style={{ width: '0.5px', height: '20px', background: T.border }} />

          <button
            onClick={manualRefresh}
            disabled={refreshing}
            style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '20px', border: `0.5px solid ${T.border}`, background: refreshing ? 'rgba(127,119,221,0.15)' : 'transparent', color: refreshing ? '#7F77DD' : T.muted, cursor: refreshing ? 'default' : 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
          >
            {refreshing ? '↻ Refreshing...' : '↻ Refresh'}
          </button>
          <button onClick={() => setDark(d => !d)} style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '20px', border: `0.5px solid ${T.border}`, background: 'transparent', color: T.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
            {dark ? '☀ Light' : '☾ Dark'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '16px 20px' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: T.muted, fontSize: '13px' }}>Loading...</div>
        ) : view === 'history' ? (
          <HistoryView T={T} dark={dark} currentData={data} />
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
