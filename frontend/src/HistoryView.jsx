import React, { useState, useEffect } from 'react';
import { getHistory } from './api';

const PURPLE = '#7F77DD';
const RED    = '#E24B4A';
const GREEN  = '#1D9E75';
const DPURP  = '#534AB7';

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

// Get Monday of a week from any date
function getWeekMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Format date range for week
function formatWeekRange(monday) {
  const fri = new Date(monday);
  fri.setDate(monday.getDate() + 4);
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(monday)} - ${fmt(fri)}, ${fri.getFullYear()}`;
}

// Format day name
function formatDay(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function HistoryView({ T, dark }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [expandedDays, setExpandedDays] = useState({});

  useEffect(() => {
    getHistory()
      .then(data => {
        setHistory(data);
        setLoading(false);
        // Default to current week
        if (data.length > 0) {
          const currentMonday = getWeekMonday(new Date());
          setSelectedWeek(currentMonday.toISOString().split('T')[0]);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: T.muted, fontSize: '13px' }}>
        Loading history...
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: T.muted, fontSize: '13px' }}>
        No history yet. Start using the app to build your history!
      </div>
    );
  }

  // Group snapshots by week
  const weekMap = {};
  history.forEach(snap => {
    const monday = getWeekMonday(snap.date);
    const weekKey = monday.toISOString().split('T')[0];
    if (!weekMap[weekKey]) {
      weekMap[weekKey] = { monday, snapshots: [], totalNwg: 0, target: 16 };
    }
    weekMap[weekKey].snapshots.push(snap);
    // Use the max NWG hours from any day that week
    if (snap.nwgHours > weekMap[weekKey].totalNwg) {
      weekMap[weekKey].totalNwg = snap.nwgHours;
    }
    if (snap.nwgTarget) {
      weekMap[weekKey].target = snap.nwgTarget;
    }
  });

  const weeks = Object.keys(weekMap).sort((a, b) => b.localeCompare(a));
  const currentWeekData = selectedWeek ? weekMap[selectedWeek] : null;

  // Get all completed tasks for the selected week
  const weekCompletedTasks = currentWeekData
    ? currentWeekData.snapshots.flatMap(s => s.completedTasks || [])
    : [];

  // Remove duplicates by name
  const uniqueTasks = [];
  const seenNames = new Set();
  weekCompletedTasks.forEach(t => {
    if (!seenNames.has(t.name)) {
      seenNames.add(t.name);
      uniqueTasks.push(t);
    }
  });

  const toggleDay = (date) => {
    setExpandedDays(prev => ({ ...prev, [date]: !prev[date] }));
  };

  const formatWeekLabel = (mondayStr) => {
    const monday = new Date(mondayStr);
    const fri = new Date(monday);
    fri.setDate(monday.getDate() + 4);
    const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(monday)} - ${fmt(fri)}`;
  };

  return (
    <div>
      {/* Week selector */}
      <Card T={T} accent={PURPLE} style={{ marginBottom: '14px' }}>
        <CardLabel color={PURPLE}>Select Week</CardLabel>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {weeks.map(weekKey => (
            <button
              key={weekKey}
              onClick={() => setSelectedWeek(weekKey)}
              style={{
                fontSize: '11px',
                padding: '6px 12px',
                borderRadius: '20px',
                border: `0.5px solid ${selectedWeek === weekKey ? 'rgba(127,119,221,0.5)' : T.border}`,
                background: selectedWeek === weekKey ? 'rgba(127,119,221,0.2)' : 'transparent',
                color: selectedWeek === weekKey ? (dark ? 'white' : DPURP) : T.muted,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: selectedWeek === weekKey ? '500' : '400'
              }}
            >
              {formatWeekLabel(weekKey)}
            </button>
          ))}
        </div>
      </Card>

      {currentWeekData && (
        <>
          {/* NWG progress for the week */}
          <Card T={T} accent={PURPLE} style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <CardLabel color={PURPLE}>NWG Hours This Week</CardLabel>
              <span style={{
                fontSize: '10px',
                padding: '2px 8px',
                background: currentWeekData.totalNwg >= currentWeekData.target ? 'rgba(29,158,117,0.2)' : 'rgba(127,119,221,0.2)',
                color: currentWeekData.totalNwg >= currentWeekData.target ? GREEN : (dark ? '#a0a0d8' : DPURP),
                borderRadius: '20px',
                border: `0.5px solid ${currentWeekData.totalNwg >= currentWeekData.target ? 'rgba(29,158,117,0.4)' : 'rgba(127,119,221,0.4)'}`,
                marginTop: '-8px'
              }}>
                {currentWeekData.totalNwg >= currentWeekData.target ? 'Complete' : `${(currentWeekData.target - currentWeekData.totalNwg).toFixed(1)}h to go`}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '28px', fontWeight: '500', color: T.text }}>
                {currentWeekData.totalNwg % 1 === 0 ? currentWeekData.totalNwg : currentWeekData.totalNwg.toFixed(1)}
              </span>
              <span style={{ fontSize: '12px', color: T.muted }}>/ {currentWeekData.target}h target</span>
            </div>
            <div style={{ height: '8px', background: T.inner, borderRadius: '4px', overflow: 'hidden', marginBottom: '6px' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, (currentWeekData.totalNwg / currentWeekData.target) * 100)}%`,
                background: currentWeekData.totalNwg >= currentWeekData.target ? GREEN : PURPLE,
                borderRadius: '4px',
                transition: 'width 0.5s ease'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: T.label }}>
              <span>0h</span><span>4h</span><span>8h</span><span>12h</span><span>16h</span>
            </div>
          </Card>

          {/* Daily timeline */}
          <Card T={T} accent={DPURP} style={{ marginBottom: '14px' }}>
            <CardLabel color={PURPLE}>Daily Timeline</CardLabel>
            {currentWeekData.snapshots.length === 0 ? (
              <div style={{ fontSize: '11px', color: T.muted, padding: '8px 0' }}>No entries this week.</div>
            ) : (
              currentWeekData.snapshots
                .sort((a, b) => b.date.localeCompare(a.date))
                .map(snap => {
                  const isExpanded = expandedDays[snap.date];
                  const statusLabel = STATUS_LABELS[snap.status] || snap.statusCustom || 'In progress';
                  const statusColor = STATUS_COLORS[snap.status] || PURPLE;

                  return (
                    <div key={snap.id} style={{ marginBottom: '10px' }}>
                      {/* Day header - clickable */}
                      <div
                        onClick={() => toggleDay(snap.date)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          background: T.inner,
                          border: `0.5px solid ${T.border}`,
                          borderRadius: isExpanded ? '6px 6px 0 0' : '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '12px', fontWeight: '500', color: T.text }}>
                            {formatDay(snap.date)}
                          </span>
                          <span style={{
                            fontSize: '10px',
                            padding: '2px 8px',
                            background: `${statusColor}20`,
                            color: statusColor,
                            borderRadius: '10px',
                            border: `0.5px solid ${statusColor}40`
                          }}>
                            {statusLabel}
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', color: T.muted }}>
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      </div>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div style={{
                          padding: '12px',
                          background: T.card,
                          border: `0.5px solid ${T.border}`,
                          borderTop: 'none',
                          borderRadius: '0 0 6px 6px'
                        }}>
                          {/* Working on */}
                          {snap.currentProjects && snap.currentProjects.length > 0 && (
                            <div style={{ marginBottom: '12px' }}>
                              <div style={{ fontSize: '10px', color: PURPLE, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                                Working on
                              </div>
                              {snap.currentProjects.map((p, i) => (
                                <div key={i} style={{ paddingLeft: '10px', borderLeft: `2px solid ${PURPLE}40`, marginBottom: '6px', paddingTop: '2px', paddingBottom: '2px' }}>
                                  <div style={{ fontSize: '12px', color: T.text }}>{p.name}</div>
                                  {p.note && <div style={{ fontSize: '11px', color: T.muted }}>{p.note}</div>}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Other projects */}
                          {snap.otherProjects && snap.otherProjects.length > 0 && (
                            <div style={{ marginBottom: '12px' }}>
                              <div style={{ fontSize: '10px', color: PURPLE, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                                Other projects
                              </div>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {snap.otherProjects.map((p, i) => (
                                  <span key={i} style={{
                                    fontSize: '11px',
                                    padding: '4px 10px',
                                    background: 'rgba(127,119,221,0.1)',
                                    border: `0.5px solid ${T.border}`,
                                    borderRadius: '4px',
                                    color: T.text
                                  }}>
                                    {p.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Completed tasks */}
                          {snap.completedTasks && snap.completedTasks.length > 0 && (
                            <div style={{ marginBottom: '12px' }}>
                              <div style={{ fontSize: '10px', color: GREEN, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                                Completed
                              </div>
                              {snap.completedTasks.map((t, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: `${GREEN}30`, border: `0.5px solid ${GREEN}60`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: GREEN }} />
                                  </div>
                                  <span style={{ fontSize: '11px', color: T.text }}>{t.name}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Blockers */}
                          {snap.blockers && snap.blockers.length > 0 && (
                            <div style={{ marginBottom: '12px' }}>
                              <div style={{ fontSize: '10px', color: RED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                                Blockers
                              </div>
                              {snap.blockers.map((b, i) => (
                                <div key={i} style={{
                                  fontSize: '11px',
                                  padding: '8px 10px',
                                  background: 'rgba(226,75,74,0.1)',
                                  border: `0.5px solid ${RED}40`,
                                  borderRadius: '4px',
                                  color: T.text,
                                  marginBottom: '4px'
                                }}>
                                  {b.text}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Note */}
                          {snap.note && (
                            <div>
                              <div style={{ fontSize: '10px', color: PURPLE, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                                Note to Maria
                              </div>
                              <div style={{
                                fontSize: '12px',
                                padding: '10px 12px',
                                background: 'rgba(127,119,221,0.1)',
                                border: `0.5px solid ${PURPLE}40`,
                                borderRadius: '4px',
                                color: T.text,
                                fontStyle: 'italic',
                                lineHeight: '1.5'
                              }}>
                                "{snap.note}"
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
            )}
          </Card>

          {/* Completed tasks this week */}
          <Card T={T} accent={GREEN}>
            <CardLabel color={GREEN}>Completed This Week</CardLabel>
            {uniqueTasks.length === 0 ? (
              <div style={{ fontSize: '11px', color: T.muted, padding: '8px 0' }}>No completed tasks this week.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {uniqueTasks.map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'rgba(29,158,117,0.2)', border: '0.5px solid rgba(29,158,117,0.5)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: GREEN }} />
                    </div>
                    <span style={{ fontSize: '12px', color: T.text }}>{t.name}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
