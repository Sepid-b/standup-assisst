import React, { useState, useEffect } from 'react';
import { getHistory } from './api';

const PURPLE = '#7F77DD';
const RED = '#E24B4A';
const GREEN = '#1D9E75';
const DPURP = '#534AB7';
const GRAY = '#6060a0';

const STATUS_LABELS = {
  inprogress: 'In progress',
  reviewing: 'Sent for review',
  done: 'Wrapped up',
  break: 'On a break',
  blocked: 'Blocked',
  custom: 'Custom'
};

const STATUS_COLORS = {
  inprogress: PURPLE,
  reviewing: '#BA7517',
  done: GREEN,
  break: '#8080a0',
  blocked: RED,
  custom: PURPLE
};

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

// ── Helper Functions ──

function getWeekMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getMonthStart(date) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekRange(monday) {
  const fri = new Date(monday);
  fri.setDate(monday.getDate() + 4);
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(monday)} – ${fmt(fri)}`;
}

function formatMonthYear(date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function formatDayFull(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function formatDayShort(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isToday(dateStr) {
  const today = new Date().toISOString().split('T')[0];
  return dateStr === today;
}

function getDayOfWeek(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay();
  return day === 0 ? 6 : day - 1; // Mon=0, Tue=1, ..., Fri=4, Sat=5, Sun=6
}

// ── Components ──

function MetricCard({ T, label, value, suffix }) {
  return (
    <div style={{ background: T.card, borderRadius: '8px', padding: '14px 16px', border: `0.5px solid ${T.border}` }}>
      <div style={{ fontSize: '10px', color: T.label, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>{label}</div>
      <div style={{ fontSize: '24px', fontWeight: '500', color: T.text, display: 'flex', alignItems: 'baseline', gap: '4px' }}>
        {value}
        {suffix && <span style={{ fontSize: '12px', color: T.muted, fontWeight: '400' }}>{suffix}</span>}
      </div>
    </div>
  );
}

function PillButton({ label, active, onClick, T, dark }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: '11px',
        padding: '6px 14px',
        borderRadius: '20px',
        border: `0.5px solid ${active ? 'rgba(127,119,221,0.5)' : T.border}`,
        background: active ? 'rgba(127,119,221,0.25)' : 'transparent',
        color: active ? (dark ? 'white' : DPURP) : T.muted,
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontWeight: active ? '500' : '400',
        transition: 'all 0.15s'
      }}
    >
      {label}
    </button>
  );
}

function NavButton({ label, onClick, T }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: '11px',
        padding: '4px 10px',
        background: 'transparent',
        border: `0.5px solid ${T.border}`,
        borderRadius: '4px',
        color: T.muted,
        cursor: 'pointer',
        fontFamily: 'inherit'
      }}
    >
      {label}
    </button>
  );
}

export default function HistoryView({ T, dark }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('daily'); // daily, weekly, monthly
  const [currentWeek, setCurrentWeek] = useState(getWeekMonday(new Date()));
  const [currentMonth, setCurrentMonth] = useState(getMonthStart(new Date()));
  const [expandedDays, setExpandedDays] = useState({});

  useEffect(() => {
    getHistory()
      .then(data => {
        setHistory(data || []);
        setLoading(false);
        // Expand today by default
        const today = new Date().toISOString().split('T')[0];
        setExpandedDays({ [today]: true });
      })
      .catch(() => setLoading(false));
  }, []);

  // ── Data Processing ──

  // Group by week
  const weekMap = {};
  history.forEach(snap => {
    const monday = getWeekMonday(snap.date);
    const weekKey = monday.toISOString().split('T')[0];
    if (!weekMap[weekKey]) {
      weekMap[weekKey] = { monday, snapshots: [], dayMap: {} };
    }
    weekMap[weekKey].snapshots.push(snap);
    weekMap[weekKey].dayMap[snap.date] = snap;
  });

  // Group by month
  const monthMap = {};
  history.forEach(snap => {
    const monthStart = getMonthStart(snap.date);
    const monthKey = monthStart.toISOString().split('T')[0];
    if (!monthMap[monthKey]) {
      monthMap[monthKey] = { monthStart, snapshots: [], weeks: {} };
    }
    monthMap[monthKey].snapshots.push(snap);
    const weekKey = getWeekMonday(snap.date).toISOString().split('T')[0];
    if (!monthMap[monthKey].weeks[weekKey]) {
      monthMap[monthKey].weeks[weekKey] = [];
    }
    monthMap[monthKey].weeks[weekKey].push(snap);
  });

  // Current week data
  const weekKey = currentWeek.toISOString().split('T')[0];
  const currentWeekData = weekMap[weekKey] || { monday: currentWeek, snapshots: [], dayMap: {} };

  // Current month data
  const monthKey = currentMonth.toISOString().split('T')[0];
  const currentMonthData = monthMap[monthKey] || { monthStart: currentMonth, snapshots: [], weeks: {} };

  // Calculate week stats
  const weekStats = {
    nwgHours: Math.max(0, ...currentWeekData.snapshots.map(s => s.nwgHours || 0), 0),
    nwgTarget: currentWeekData.snapshots[0]?.nwgTarget || 16,
    tasksCompleted: currentWeekData.snapshots.reduce((sum, s) => sum + (s.completedTasks?.length || 0), 0),
    blockersRaised: currentWeekData.snapshots.reduce((sum, s) => sum + (s.blockers?.length || 0), 0),
    activeDays: currentWeekData.snapshots.length
  };

  // Build daily NWG data for bar chart (Mon-Fri)
  const dailyNwg = [0, 0, 0, 0, 0];
  currentWeekData.snapshots.forEach(snap => {
    const dayIdx = getDayOfWeek(snap.date);
    if (dayIdx >= 0 && dayIdx < 5) {
      dailyNwg[dayIdx] = snap.nwgHours || 0;
    }
  });
  const maxNwg = Math.max(...dailyNwg, 4);

  // Generate week days for daily view
  const weekDays = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(currentWeek);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    weekDays.push({
      date: dateStr,
      dayName: DAY_NAMES[i],
      snap: currentWeekData.dayMap[dateStr] || null
    });
  }
  weekDays.reverse(); // Newest first

  // Navigation handlers
  const prevWeek = () => {
    const d = new Date(currentWeek);
    d.setDate(d.getDate() - 7);
    setCurrentWeek(d);
  };
  const nextWeek = () => {
    const d = new Date(currentWeek);
    d.setDate(d.getDate() + 7);
    setCurrentWeek(d);
  };
  const prevMonth = () => {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() - 1);
    setCurrentMonth(d);
  };
  const nextMonth = () => {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() + 1);
    setCurrentMonth(d);
  };

  const toggleDay = (date) => {
    setExpandedDays(prev => ({ ...prev, [date]: !prev[date] }));
  };

  // Get border color for day row
  const getDayBorderColor = (snap) => {
    if (!snap) return GRAY;
    if (snap.blockers && snap.blockers.length > 0) return RED;
    return PURPLE;
  };

  // ── Loading & Empty States ──

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: T.muted, fontSize: '13px' }}>
        Loading history...
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: T.muted, fontSize: '13px', gap: '8px' }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>📋</div>
        <div>No history yet — your standups will appear here once you start saving them</div>
      </div>
    );
  }

  // ── Weekly Mode: Get 4 weeks for display ──
  const getWeeksForMonth = () => {
    const weeks = [];
    const d = new Date(currentMonth);
    d.setDate(1);
    const firstMonday = getWeekMonday(d);
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(firstMonday);
      weekStart.setDate(weekStart.getDate() + i * 7);
      const wKey = weekStart.toISOString().split('T')[0];
      const wData = weekMap[wKey] || { monday: weekStart, snapshots: [] };
      const nwg = Math.max(0, ...wData.snapshots.map(s => s.nwgHours || 0), 0);
      const target = wData.snapshots[0]?.nwgTarget || 16;
      const tasks = wData.snapshots.reduce((sum, s) => sum + (s.completedTasks?.length || 0), 0);
      const blockers = wData.snapshots.reduce((sum, s) => sum + (s.blockers?.length || 0), 0);
      weeks.push({ weekStart, nwg, target, tasks, blockers, snapshots: wData.snapshots });
    }
    return weeks;
  };

  // ── Monthly Mode: Calculate stats ──
  const getMonthStats = () => {
    const snaps = currentMonthData.snapshots;
    const totalNwg = Math.max(0, ...snaps.map(s => s.nwgHours || 0), 0);
    const totalTasks = snaps.reduce((sum, s) => sum + (s.completedTasks?.length || 0), 0);
    const totalBlockers = snaps.reduce((sum, s) => sum + (s.blockers?.length || 0), 0);
    const target = (snaps[0]?.nwgTarget || 16) * 4;

    // All completed tasks
    const allTasks = [];
    snaps.forEach(s => {
      (s.completedTasks || []).forEach(t => {
        allTasks.push({ ...t, date: s.date });
      });
    });

    // All blockers
    const allBlockers = [];
    snaps.forEach(s => {
      (s.blockers || []).forEach(b => {
        allBlockers.push({ ...b, date: s.date });
      });
    });

    // All projects
    const projectDays = {};
    snaps.forEach(s => {
      (s.currentProjects || []).forEach(p => {
        if (!projectDays[p.name]) projectDays[p.name] = 0;
        projectDays[p.name]++;
      });
    });
    const projects = Object.entries(projectDays).map(([name, days]) => ({ name, days })).sort((a, b) => b.days - a.days);

    // Weekly NWG for chart
    const weeklyNwg = Object.entries(currentMonthData.weeks).map(([wKey, wSnaps]) => {
      const nwg = Math.max(0, ...wSnaps.map(s => s.nwgHours || 0), 0);
      const target = wSnaps[0]?.nwgTarget || 16;
      return { weekKey: wKey, nwg, target };
    }).sort((a, b) => a.weekKey.localeCompare(b.weekKey));

    return { totalNwg, totalTasks, totalBlockers, target, allTasks, allBlockers, projects, weeklyNwg };
  };

  // ── Render ──

  return (
    <div>
      {/* Mode selector and navigation row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <PillButton label="Daily" active={mode === 'daily'} onClick={() => setMode('daily')} T={T} dark={dark} />
          <PillButton label="Weekly" active={mode === 'weekly'} onClick={() => setMode('weekly')} T={T} dark={dark} />
          <PillButton label="Monthly" active={mode === 'monthly'} onClick={() => setMode('monthly')} T={T} dark={dark} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <NavButton label="← Prev" onClick={mode === 'monthly' ? prevMonth : prevWeek} T={T} />
          <span style={{ fontSize: '12px', color: T.text, fontWeight: '500', minWidth: '140px', textAlign: 'center' }}>
            {mode === 'monthly' ? formatMonthYear(currentMonth) : formatWeekRange(currentWeek)}
          </span>
          <NavButton label="Next →" onClick={mode === 'monthly' ? nextMonth : nextWeek} T={T} />
        </div>
      </div>

      {/* ══════════════ DAILY MODE ══════════════ */}
      {mode === 'daily' && (
        <>
          {/* Metric cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
            <MetricCard T={T} label="NWG This Week" value={weekStats.nwgHours} suffix={`/${weekStats.nwgTarget}h`} />
            <MetricCard T={T} label="Tasks Completed" value={weekStats.tasksCompleted} />
            <MetricCard T={T} label="Blockers Raised" value={weekStats.blockersRaised} />
            <MetricCard T={T} label="Active Days" value={weekStats.activeDays} />
          </div>

          {/* NWG Bar Chart */}
          <div style={{ background: T.card, borderRadius: '8px', padding: '16px', border: `0.5px solid ${T.border}`, marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '10px', color: T.label, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                NWG Hours — Week of {formatDayShort(currentWeek.toISOString())}
              </div>
              <div style={{ fontSize: '10px', color: T.muted, padding: '2px 8px', background: T.inner, borderRadius: '10px', border: `0.5px solid ${T.border}` }}>
                {weekStats.nwgTarget - weekStats.nwgHours > 0 ? `${(weekStats.nwgTarget - weekStats.nwgHours).toFixed(1)}h to go` : 'Complete'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', height: '120px' }}>
              {dailyNwg.map((hours, idx) => (
                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{ fontSize: '10px', color: hours > 0 ? T.text : T.muted, marginBottom: '4px' }}>
                    {hours > 0 ? `${hours}h` : '—'}
                  </div>
                  <div style={{
                    width: '100%',
                    height: `${Math.max(4, (hours / maxNwg) * 100)}%`,
                    background: hours > 0 ? PURPLE : T.inner,
                    borderRadius: '4px 4px 0 0',
                    border: hours > 0 ? 'none' : `0.5px solid ${T.border}`,
                    minHeight: '8px'
                  }} />
                  <div style={{ fontSize: '10px', color: T.muted, marginTop: '6px' }}>{DAY_NAMES[idx]}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Daily Timeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {weekDays.map(({ date, dayName, snap }) => {
              const isExpanded = expandedDays[date];
              const isTodayDate = isToday(date);
              const borderColor = getDayBorderColor(snap);
              const statusLabel = snap ? (STATUS_LABELS[snap.status] || snap.statusCustom || 'In progress') : null;
              const statusColor = snap ? (STATUS_COLORS[snap.status] || PURPLE) : GRAY;

              return (
                <div key={date}>
                  {/* Day header row */}
                  <div
                    onClick={() => snap && toggleDay(date)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      background: T.card,
                      border: `0.5px solid ${T.border}`,
                      borderLeft: `3px solid ${borderColor}`,
                      borderRadius: isExpanded ? '6px 6px 0 0' : '6px',
                      cursor: snap ? 'pointer' : 'default',
                      opacity: snap ? 1 : 0.5
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '500', color: T.text }}>{formatDayFull(date)}</span>
                      {isTodayDate && (
                        <span style={{ fontSize: '9px', padding: '2px 8px', background: T.inner, color: T.muted, borderRadius: '10px', border: `0.5px solid ${T.border}` }}>Today</span>
                      )}
                      {snap && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: statusColor }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusColor }} />
                          {statusLabel}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {snap ? (
                        <>
                          <span style={{ fontSize: '11px', color: PURPLE }}>{snap.nwgHours || 0}h NWG</span>
                          <span style={{ fontSize: '11px', color: GREEN }}>{snap.completedTasks?.length || 0} done</span>
                          {snap.blockers?.length > 0 && (
                            <span style={{ fontSize: '11px', color: RED }}>{snap.blockers.length} blocker{snap.blockers.length > 1 ? 's' : ''}</span>
                          )}
                          <span style={{ fontSize: '11px', color: T.muted }}>{isExpanded ? '▲' : '▼'}</span>
                        </>
                      ) : (
                        <span style={{ fontSize: '11px', color: T.muted, fontStyle: 'italic' }}>No standup recorded</span>
                      )}
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && snap && (() => {
                    const seenProjects = new Set();
                    const uniqueProjects = (snap.currentProjects || []).filter(p => {
                      if (seenProjects.has(p.name)) return false;
                      seenProjects.add(p.name); return true;
                    });
                    const seenTasks = new Set();
                    const uniqueTasks = (snap.completedTasks || []).filter(t => {
                      if (seenTasks.has(t.name)) return false;
                      seenTasks.add(t.name); return true;
                    });
                    const seenBlockers = new Set();
                    const uniqueBlockers = (snap.blockers || []).filter(b => {
                      if (seenBlockers.has(b.text)) return false;
                      seenBlockers.add(b.text); return true;
                    });
                    const docs = snap.handoverDocs || [];
                    return (
                      <div style={{
                        padding: '16px',
                        background: T.card,
                        border: `0.5px solid ${T.border}`,
                        borderTop: 'none',
                        borderLeft: `3px solid ${borderColor}`,
                        borderRadius: '0 0 6px 6px',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr',
                        gap: '20px'
                      }}>
                        {/* Working On */}
                        <div>
                          <div style={{ fontSize: '10px', color: PURPLE, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Working On</div>
                          {uniqueProjects.length === 0 ? (
                            <div style={{ fontSize: '11px', color: T.muted }}>—</div>
                          ) : (
                            uniqueProjects.map((p, i) => (
                              <div key={i} style={{ paddingLeft: '10px', borderLeft: `2px solid ${PURPLE}60`, marginBottom: '8px' }}>
                                <div style={{ fontSize: '12px', color: T.text }}>{p.name}</div>
                                {p.note && <div style={{ fontSize: '11px', color: T.muted }}>{p.note}</div>}
                              </div>
                            ))
                          )}
                        </div>

                        {/* Completed */}
                        <div>
                          <div style={{ fontSize: '10px', color: GREEN, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Completed</div>
                          {uniqueTasks.length === 0 ? (
                            <div style={{ fontSize: '11px', color: T.muted }}>—</div>
                          ) : (
                            uniqueTasks.map((t, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: GREEN }} />
                                <span style={{ fontSize: '11px', color: T.text }}>{t.name}</span>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Blockers + Note + Docs */}
                        <div>
                          <div style={{ fontSize: '10px', color: RED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Blockers</div>
                          {uniqueBlockers.length === 0 ? (
                            <div style={{ fontSize: '11px', color: T.muted, marginBottom: '16px' }}>None</div>
                          ) : (
                            uniqueBlockers.map((b, i) => (
                              <div key={i} style={{
                                fontSize: '11px',
                                padding: '8px 10px',
                                background: 'rgba(226,75,74,0.1)',
                                border: `0.5px solid ${RED}40`,
                                borderRadius: '4px',
                                color: T.text,
                                marginBottom: '6px'
                              }}>
                                {b.text}
                              </div>
                            ))
                          )}
                          {snap.note && (
                            <>
                              <div style={{ fontSize: '10px', color: PURPLE, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '16px', marginBottom: '8px' }}>Note to Maria</div>
                              <div style={{ fontSize: '11px', color: T.muted, fontStyle: 'italic' }}>"{snap.note}"</div>
                            </>
                          )}
                          {docs.length > 0 && (
                            <>
                              <div style={{ fontSize: '10px', color: DPURP, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '16px', marginBottom: '8px' }}>Docs & links</div>
                              {docs.map((doc, i) => {
                                const isLink = doc.url && (doc.url.startsWith('http') || doc.url.startsWith('/'));
                                const badge = isLink ? '↗' : (doc.meta?.split(' ')[0] || 'FILE');
                                return (
                                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                                    <span style={{ fontSize: '9px', padding: '1px 5px', background: 'rgba(127,119,221,0.15)', border: '0.5px solid rgba(127,119,221,0.3)', borderRadius: '3px', color: PURPLE, fontWeight: '600' }}>{badge}</span>
                                    {doc.url ? (
                                      <a href={doc.url} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: PURPLE, textDecoration: 'none' }}>{doc.name}</a>
                                    ) : (
                                      <span style={{ fontSize: '11px', color: T.text }}>{doc.name}</span>
                                    )}
                                  </div>
                                );
                              })}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ══════════════ WEEKLY MODE ══════════════ */}
      {mode === 'weekly' && (
        <>
          {/* Week cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
            {getWeeksForMonth().map((week, idx) => {
              const pct = week.target > 0 ? (week.nwg / week.target) * 100 : 0;
              const barColor = pct >= 100 ? GREEN : pct < 50 ? RED : PURPLE;
              return (
                <div key={idx} style={{
                  background: T.card,
                  borderRadius: '8px',
                  padding: '14px 16px',
                  border: `0.5px solid ${T.border}`,
                  borderTop: `2px solid ${barColor}`
                }}>
                  <div style={{ fontSize: '10px', color: T.muted, marginBottom: '8px' }}>{formatWeekRange(week.weekStart)}</div>
                  <div style={{ fontSize: '18px', fontWeight: '500', color: T.text, marginBottom: '8px' }}>{week.nwg}h NWG</div>
                  <div style={{ height: '4px', background: T.inner, borderRadius: '2px', overflow: 'hidden', marginBottom: '10px' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: barColor, borderRadius: '2px' }} />
                  </div>
                  <div style={{ fontSize: '10px', color: T.muted }}>
                    {week.tasks} tasks · {week.blockers} blockers
                  </div>
                </div>
              );
            })}
          </div>

          {/* Completed tasks grouped by day */}
          <div style={{ background: T.card, borderRadius: '8px', padding: '16px', border: `0.5px solid ${T.border}` }}>
            <div style={{ fontSize: '10px', color: GREEN, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
              Completed This Week
            </div>
            {getWeeksForMonth().flatMap(w => w.snapshots).length === 0 ? (
              <div style={{ fontSize: '11px', color: T.muted }}>No tasks completed</div>
            ) : (
              getWeeksForMonth().flatMap(w => w.snapshots).sort((a, b) => b.date.localeCompare(a.date)).map((snap, idx) => (
                (snap.completedTasks || []).length > 0 && (
                  <div key={idx} style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '10px', color: T.muted, marginBottom: '6px' }}>{formatDayShort(snap.date)}</div>
                    {snap.completedTasks.map((t, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', paddingLeft: '8px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: GREEN }} />
                        <span style={{ fontSize: '11px', color: T.text }}>{t.name}</span>
                      </div>
                    ))}
                  </div>
                )
              ))
            )}
          </div>
        </>
      )}

      {/* ══════════════ MONTHLY MODE ══════════════ */}
      {mode === 'monthly' && (() => {
        const stats = getMonthStats();
        const maxWeekNwg = Math.max(...stats.weeklyNwg.map(w => w.nwg), 16);
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.5px 1fr', gap: '0' }}>
            {/* Left column */}
            <div style={{ paddingRight: '20px' }}>
              {/* NWG chart by week */}
              <div style={{ background: T.card, borderRadius: '8px', padding: '16px', border: `0.5px solid ${T.border}`, marginBottom: '16px' }}>
                <div style={{ fontSize: '10px', color: PURPLE, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>
                  NWG Hours — {formatMonthYear(currentMonth)}
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', height: '100px', marginBottom: '12px' }}>
                  {stats.weeklyNwg.map((w, idx) => {
                    const pct = w.target > 0 ? (w.nwg / w.target) * 100 : 0;
                    const barColor = pct >= 100 ? GREEN : pct < 50 ? RED : PURPLE;
                    return (
                      <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                        <div style={{
                          width: '100%',
                          height: `${Math.max(8, (w.nwg / maxWeekNwg) * 100)}%`,
                          background: barColor,
                          borderRadius: '4px 4px 0 0',
                          minHeight: '8px'
                        }} />
                        <div style={{ fontSize: '9px', color: T.muted, marginTop: '6px' }}>W{idx + 1}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: T.muted }}>
                  <span>Total: <span style={{ color: T.text }}>{stats.totalNwg}h</span></span>
                  <span>Target: <span style={{ color: PURPLE }}>{stats.target}h</span></span>
                  <span>Tasks: <span style={{ color: GREEN }}>{stats.totalTasks}</span></span>
                </div>
              </div>

              {/* All completed tasks */}
              <div style={{ background: T.card, borderRadius: '8px', padding: '16px', border: `0.5px solid ${T.border}`, borderTop: `2px solid ${GREEN}` }}>
                <div style={{ fontSize: '10px', color: GREEN, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                  Completed This Month
                </div>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {stats.allTasks.length === 0 ? (
                    <div style={{ fontSize: '11px', color: T.muted }}>No tasks completed</div>
                  ) : (
                    stats.allTasks.slice(0, 20).map((t, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: GREEN }} />
                          <span style={{ fontSize: '11px', color: T.text }}>{t.name}</span>
                        </div>
                        <span style={{ fontSize: '10px', color: T.muted }}>{formatDayShort(t.date)}</span>
                      </div>
                    ))
                  )}
                  {stats.allTasks.length > 20 && (
                    <div style={{ fontSize: '10px', color: PURPLE, marginTop: '8px' }}>+ {stats.allTasks.length - 20} more tasks this month</div>
                  )}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div style={{ background: T.border }} />

            {/* Right column */}
            <div style={{ paddingLeft: '20px' }}>
              {/* Blockers history */}
              <div style={{ background: T.card, borderRadius: '8px', padding: '16px', border: `0.5px solid ${T.border}`, borderTop: `2px solid ${RED}`, marginBottom: '16px' }}>
                <div style={{ fontSize: '10px', color: RED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                  Blockers History — {formatMonthYear(currentMonth).split(' ')[0]}
                </div>
                {stats.allBlockers.length === 0 ? (
                  <div style={{ fontSize: '11px', color: T.muted }}>No blockers this month</div>
                ) : (
                  stats.allBlockers.map((b, i) => (
                    <div key={i} style={{
                      padding: '10px 12px',
                      background: 'rgba(226,75,74,0.1)',
                      border: `0.5px solid ${RED}40`,
                      borderRadius: '6px',
                      marginBottom: '8px'
                    }}>
                      <div style={{ fontSize: '11px', color: T.text, marginBottom: '4px' }}>{b.text}</div>
                      <div style={{ fontSize: '9px', color: T.muted }}>Raised {formatDayShort(b.date)}</div>
                    </div>
                  ))
                )}
              </div>

              {/* Projects worked on */}
              <div style={{ background: T.card, borderRadius: '8px', padding: '16px', border: `0.5px solid ${T.border}`, borderTop: `2px solid ${PURPLE}` }}>
                <div style={{ fontSize: '10px', color: PURPLE, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                  Projects This Month
                </div>
                {stats.projects.length === 0 ? (
                  <div style={{ fontSize: '11px', color: T.muted }}>No projects recorded</div>
                ) : (
                  stats.projects.map((p, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      background: T.inner,
                      border: `0.5px solid ${T.border}`,
                      borderRadius: '6px',
                      marginBottom: '8px'
                    }}>
                      <span style={{ fontSize: '12px', color: T.text }}>{p.name}</span>
                      <span style={{ fontSize: '10px', color: PURPLE }}>{p.days} days</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
