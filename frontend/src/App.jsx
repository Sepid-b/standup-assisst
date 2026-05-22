import { useState, useEffect, useRef } from 'react'
import { fetchMembers, fetchProjects, fetchVibes, fetchTasks } from './api'
import BoardView from './views/BoardView'
import ListView from './views/ListView'

// Fix 5: Neutral gray dark mode colors (no purple tint)
const darkTheme = {
  bg: '#18181b',
  bg2: '#232326',
  bg3: '#2e2e32',
  border: '#3f3f46',
  text: '#f4f4f5',
  text2: '#a1a1aa',
  text3: '#71717a',
  purple: '#7c6bf0'
}

const lightTheme = {
  bg: '#f5f5f8', bg2: '#ffffff', bg3: '#eeeef2',
  border: '#dddde3', text: '#1a1a2e', text2: '#6b6b80', text3: '#9e9eb0',
  purple: '#7c6bf0'
}

const VIBE_EMOJIS = { 1: '😩', 2: '😔', 3: '😐', 4: '😊', 5: '🔥' }

function VibeAvatar({ member, index, T }) {
  const [showEmoji, setShowEmoji] = useState(false)

  useEffect(() => {
    const delay = index * 300
    const interval = setInterval(() => {
      setShowEmoji(true)
      setTimeout(() => setShowEmoji(false), 2000)
    }, 4000)

    const initialTimeout = setTimeout(() => {
      setShowEmoji(true)
      setTimeout(() => setShowEmoji(false), 2000)
    }, delay)

    return () => {
      clearInterval(interval)
      clearTimeout(initialTimeout)
    }
  }, [index])

  const vibe = member.vibe || 3

  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        backgroundColor: member.avatar_color,
        marginLeft: index === 0 ? 0 : -6,
        border: `2px solid ${T.bg2}`,
        boxShadow: `0 0 0 1.5px ${T.bg2}, 0 0 0 3px ${member.avatar_color}`,
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.2s, z-index 0.2s',
        zIndex: 1
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)'; e.currentTarget.style.zIndex = 10 }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.zIndex = 1 }}
    >
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 600,
        color: '#fff',
        transition: 'transform 0.4s ease, opacity 0.4s ease',
        transform: showEmoji ? 'translateY(-100%)' : 'translateY(0)',
        opacity: showEmoji ? 0 : 1
      }}>
        {member.avatar_letter}
      </div>
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 13,
        transition: 'transform 0.4s ease, opacity 0.4s ease',
        transform: showEmoji ? 'translateY(0)' : 'translateY(100%)',
        opacity: showEmoji ? 1 : 0
      }}>
        {VIBE_EMOJIS[vibe]}
      </div>
    </div>
  )
}

// Fix 4: ProfileButton with proper dropdown
function ProfileButton({ member, members, onSelect, T }) {
  const [profileOpen, setProfileOpen] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const buttonRef = useRef()
  const dropdownRef = useRef()

  useEffect(() => {
    const interval = setInterval(() => {
      setShowEmoji(true)
      setTimeout(() => setShowEmoji(false), 2000)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        profileOpen &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      ) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [profileOpen])

  const vibe = member?.vibe || 3

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={buttonRef}
        onClick={() => setProfileOpen(!profileOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 10px 4px 4px',
          background: 'transparent',
          border: `1px solid ${T.border}`,
          borderRadius: 20,
          cursor: 'pointer',
          color: T.text
        }}
      >
        <div style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          backgroundColor: member?.avatar_color || T.bg3,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 600,
            color: '#fff',
            transition: 'transform 0.4s ease, opacity 0.4s ease',
            transform: showEmoji ? 'translateY(-100%)' : 'translateY(0)',
            opacity: showEmoji ? 0 : 1
          }}>
            {member?.avatar_letter || '?'}
          </div>
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            transition: 'transform 0.4s ease, opacity 0.4s ease',
            transform: showEmoji ? 'translateY(0)' : 'translateY(100%)',
            opacity: showEmoji ? 1 : 0
          }}>
            {VIBE_EMOJIS[vibe]}
          </div>
        </div>
        <span style={{ fontSize: 12, fontWeight: 500 }}>{member?.name || 'Select'}</span>
        <i className="ti ti-chevron-down" style={{ fontSize: 14, color: T.text3 }} />
      </button>

      {profileOpen && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: 44,
            right: 0,
            background: T.bg2,
            border: `1px solid ${T.border}`,
            borderRadius: 8,
            padding: 6,
            minWidth: 180,
            zIndex: 50,
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
          }}
        >
          <div style={{
            fontSize: 10,
            textTransform: 'uppercase',
            color: T.text3,
            padding: '6px 10px 8px',
            letterSpacing: 0.5
          }}>
            Switch member
          </div>
          {members.map(m => (
            <div
              key={m.id}
              onClick={() => { onSelect(m); setProfileOpen(false) }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 6,
                cursor: 'pointer',
                background: 'transparent'
              }}
              onMouseEnter={e => e.currentTarget.style.background = T.bg3}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                backgroundColor: m.avatar_color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9,
                fontWeight: 600,
                color: '#fff'
              }}>
                {m.avatar_letter}
              </div>
              <span style={{ fontSize: 12, color: T.text, flex: 1 }}>{m.name}</span>
              {m.id === member?.id && (
                <i className="ti ti-check" style={{ fontSize: 14, color: T.purple }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Sidebar({ collapsed, setCollapsed, activeView, setActiveView, projects, tasks, T }) {
  const myTasksCount = tasks.filter(t => t.status !== 'done').length
  const dueThisWeekCount = tasks.filter(t => {
    if (!t.due_date || t.status === 'done') return false
    const due = new Date(t.due_date)
    const now = new Date()
    const weekEnd = new Date(now)
    weekEnd.setDate(weekEnd.getDate() + 7)
    return due <= weekEnd
  }).length

  const getProjectTaskCount = (projectId) => tasks.filter(t => t.project_id === projectId && t.status !== 'done').length

  const menuItems = [
    { icon: 'ti-user', label: 'My tasks', badge: myTasksCount, id: 'my-tasks' },
    { icon: 'ti-calendar', label: 'Due this week', badge: dueThisWeekCount, id: 'due-week' }
  ]

  const bottomItems = [
    { icon: 'ti-sun', label: 'Standup', id: 'standup' },
    { icon: 'ti-clock', label: 'Time tracking', id: 'time' },
    { icon: 'ti-files', label: 'Docs & links', id: 'docs' },
    { icon: 'ti-history', label: 'Activity', id: 'activity' }
  ]

  return (
    <div style={{
      width: collapsed ? 40 : 188,
      minWidth: collapsed ? 40 : 188,
      background: T.bg2,
      borderRight: `1px solid ${T.border}`,
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.2s, min-width 0.2s',
      overflow: 'hidden'
    }}>
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          width: '100%',
          padding: collapsed ? '12px 0' : '12px 14px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: collapsed ? 'center' : 'flex-start',
          color: T.text3
        }}
      >
        <i className={`ti ti-layout-sidebar-left-${collapsed ? 'expand' : 'collapse'}`} style={{ fontSize: 16 }} />
      </button>

      <div style={{ flex: 1, padding: collapsed ? '0' : '0 8px' }}>
        {menuItems.map(item => (
          <div
            key={item.id}
            onClick={() => setActiveView(item.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'space-between',
              gap: 10,
              padding: collapsed ? '10px 0' : '8px 10px',
              borderRadius: 6,
              cursor: 'pointer',
              background: activeView === item.id ? 'rgba(124,107,240,0.07)' : 'transparent',
              color: activeView === item.id ? T.purple : T.text2,
              marginBottom: 2
            }}
            onMouseEnter={e => { if (activeView !== item.id) e.currentTarget.style.background = T.bg3 }}
            onMouseLeave={e => { if (activeView !== item.id) e.currentTarget.style.background = 'transparent' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <i className={`ti ${item.icon}`} style={{ fontSize: 16 }} />
              {!collapsed && <span style={{ fontSize: 12 }}>{item.label}</span>}
            </div>
            {!collapsed && item.badge > 0 && (
              <span style={{
                fontSize: 10,
                background: T.bg3,
                color: T.text3,
                padding: '2px 6px',
                borderRadius: 10
              }}>{item.badge}</span>
            )}
          </div>
        ))}

        <div style={{
          height: 1,
          background: T.border,
          margin: collapsed ? '5px 8px' : '5px 12px'
        }} />

        {bottomItems.map(item => (
          <div
            key={item.id}
            onClick={() => setActiveView(item.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 10,
              padding: collapsed ? '10px 0' : '8px 10px',
              borderRadius: 6,
              cursor: 'pointer',
              background: activeView === item.id ? 'rgba(124,107,240,0.07)' : 'transparent',
              color: activeView === item.id ? T.purple : T.text2,
              marginBottom: 2
            }}
            onMouseEnter={e => { if (activeView !== item.id) e.currentTarget.style.background = T.bg3 }}
            onMouseLeave={e => { if (activeView !== item.id) e.currentTarget.style.background = 'transparent' }}
          >
            <i className={`ti ${item.icon}`} style={{ fontSize: 16 }} />
            {!collapsed && <span style={{ fontSize: 12 }}>{item.label}</span>}
          </div>
        ))}

        <div style={{
          height: 1,
          background: T.border,
          margin: collapsed ? '5px 8px' : '5px 12px'
        }} />

        {!collapsed && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 10px',
            marginBottom: 4
          }}>
            <span style={{ fontSize: 9, textTransform: 'uppercase', color: T.text3, letterSpacing: 0.5 }}>Projects</span>
            <button style={{
              background: 'transparent',
              border: 'none',
              color: T.purple,
              cursor: 'pointer',
              fontSize: 14,
              padding: 0,
              lineHeight: 1
            }}>
              <i className="ti ti-plus" />
            </button>
          </div>
        )}

        {projects.map(project => (
          <div
            key={project.id}
            onClick={() => setActiveView(`project-${project.id}`)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'space-between',
              gap: 10,
              padding: collapsed ? '10px 0' : '8px 10px',
              borderRadius: 6,
              cursor: 'pointer',
              background: activeView === `project-${project.id}` ? 'rgba(124,107,240,0.07)' : 'transparent',
              color: activeView === `project-${project.id}` ? T.purple : T.text2,
              marginBottom: 2
            }}
            onMouseEnter={e => { if (activeView !== `project-${project.id}`) e.currentTarget.style.background = T.bg3 }}
            onMouseLeave={e => { if (activeView !== `project-${project.id}`) e.currentTarget.style.background = 'transparent' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: project.color
              }} />
              {!collapsed && <span style={{ fontSize: 12 }}>{project.name}</span>}
            </div>
            {!collapsed && (
              <span style={{
                fontSize: 10,
                background: T.bg3,
                color: T.text3,
                padding: '2px 6px',
                borderRadius: 10
              }}>{getProjectTaskCount(project.id)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const [isDark, setIsDark] = useState(true)
  const [members, setMembers] = useState([])
  const [currentMember, setCurrentMember] = useState(null)
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [vibes, setVibes] = useState([])
  const [viewMode, setViewMode] = useState('board')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeView, setActiveView] = useState('my-tasks')

  const T = isDark ? darkTheme : lightTheme

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (currentMember) {
      loadProjects()
      loadTasks()
    }
  }, [currentMember])

  const loadData = async () => {
    const [membersData, vibesData] = await Promise.all([
      fetchMembers(),
      fetchVibes()
    ])
    setMembers(membersData)
    setVibes(vibesData)
    if (membersData.length > 0) {
      const memberWithVibe = vibesData.find(v => v.id === membersData[0].id) || membersData[0]
      setCurrentMember({ ...membersData[0], vibe: memberWithVibe.vibe || 3 })
    }
  }

  const loadProjects = async () => {
    const data = await fetchProjects(currentMember?.id)
    setProjects(data)
  }

  const loadTasks = async () => {
    const data = await fetchTasks({ memberId: currentMember?.id })
    setTasks(data)
  }

  const handleMemberSelect = (member) => {
    const vibeData = vibes.find(v => v.id === member.id)
    setCurrentMember({ ...member, vibe: vibeData?.vibe || 3 })
  }

  const handleTaskUpdate = (updatedTask) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t))
  }

  const handleTaskCreate = (newTask) => {
    setTasks(prev => [newTask, ...prev])
  }

  const handleTaskDelete = (taskId) => {
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      color: T.text,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Top Navigation */}
      <nav style={{
        height: 44,
        background: T.bg2,
        borderBottom: `1px solid ${T.border}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 20
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-layout-board" style={{ fontSize: 20, color: T.purple }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>TeamFlow</span>
        </div>

        {/* View Toggle */}
        <div style={{
          display: 'flex',
          background: T.bg3,
          borderRadius: 8,
          padding: 2
        }}>
          {['board', 'list'].map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: '5px 14px',
                fontSize: 11,
                fontWeight: 500,
                border: viewMode === mode ? `1px solid ${T.border}` : '1px solid transparent',
                borderRadius: 6,
                background: viewMode === mode ? T.bg2 : 'transparent',
                color: viewMode === mode ? T.purple : T.text3,
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {mode}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Vibe Avatars */}
        <div style={{ display: 'flex', alignItems: 'center', paddingRight: 8 }}>
          {vibes.map((member, i) => (
            <VibeAvatar key={member.id} member={member} index={i} T={T} />
          ))}
        </div>

        {/* Separator */}
        <div style={{ width: 1, height: 20, background: T.border }} />

        {/* Theme Toggle */}
        <button
          onClick={() => setIsDark(!isDark)}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: T.text3,
            padding: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <i className={`ti ti-${isDark ? 'sun' : 'moon'}`} style={{ fontSize: 18 }} />
        </button>

        {/* Profile Button */}
        <ProfileButton
          member={currentMember}
          members={members}
          onSelect={handleMemberSelect}
          T={T}
        />
      </nav>

      {/* Main Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          activeView={activeView}
          setActiveView={setActiveView}
          projects={projects}
          tasks={tasks}
          T={T}
        />

        <main style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {viewMode === 'board' ? (
            <BoardView
              T={T}
              currentMember={currentMember}
              members={members}
              projects={projects}
              tasks={tasks}
              onTaskUpdate={handleTaskUpdate}
              onTaskCreate={handleTaskCreate}
              onTaskDelete={handleTaskDelete}
              onRefresh={loadTasks}
            />
          ) : (
            <ListView
              T={T}
              currentMember={currentMember}
              members={members}
              projects={projects}
              tasks={tasks}
              onTaskUpdate={handleTaskUpdate}
              onTaskDelete={handleTaskDelete}
              onRefresh={loadTasks}
            />
          )}
        </main>
      </div>
    </div>
  )
}
