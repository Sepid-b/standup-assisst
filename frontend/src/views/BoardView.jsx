import { useState, useEffect, useRef } from 'react'
import {
  updateTask, createTask, deleteTask, fetchComments, createComment,
  fetchAllTags, createTag, fetchTaskTags, addTagToTask, removeTagFromTask,
  fetchTaskDocs, addDoc, deleteDoc,
  fetchTaskAttachments, uploadAttachment, deleteAttachment
} from '../api'

const STATUSES = [
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'in_review', label: 'In Review' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'done', label: 'Done' }
]

const PRIORITIES = [
  { id: 'high', label: 'High', color: '#e74c3c' },
  { id: 'medium', label: 'Medium', color: '#f39c12' },
  { id: 'low', label: 'Low', color: '#2ecc71' }
]

function Dropdown({ value, options, onChange, placeholder, T, renderOption }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selected = options.find(o => o.id === value)

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          background: 'transparent',
          border: `1px solid ${T.border}`,
          borderRadius: 5,
          cursor: 'pointer',
          color: T.text,
          fontSize: 11,
          minWidth: 100
        }}
      >
        {renderOption ? renderOption(selected) : (selected?.label || placeholder)}
        <i className="ti ti-chevron-down" style={{ fontSize: 12, color: T.text3, marginLeft: 'auto' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: 4,
          background: T.bg2,
          border: `1px solid ${T.border}`,
          borderRadius: 6,
          padding: 4,
          minWidth: 140,
          zIndex: 100,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}>
          {options.map(opt => (
            <div
              key={opt.id}
              onClick={() => { onChange(opt.id); setOpen(false) }}
              style={{
                padding: '6px 10px',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 11,
                color: T.text
              }}
              onMouseEnter={e => e.currentTarget.style.background = T.bg3}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {renderOption ? renderOption(opt) : opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Fix 2: TaskCard with proper hover that doesn't affect borderLeft
function TaskCard({ task, T, onClick, onDragStart, onDragOver, onDrop, dropIndicator }) {
  const [isHovered, setIsHovered] = useState(false)
  const priority = PRIORITIES.find(p => p.id === task.priority) || PRIORITIES[1]
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'
  const isDone = task.status === 'done'
  const isBlocked = task.status === 'blocked'
  const projectColor = task.project?.color || T.border

  const formatDate = (dateStr) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onDragOver={(e) => onDragOver(e, task)}
      onDrop={(e) => onDrop(e, task)}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        background: isBlocked ? 'rgba(231,76,60,0.03)' : T.bg2,
        borderTop: `0.5px solid ${isHovered ? T.text3 : T.border}`,
        borderRight: `0.5px solid ${isHovered ? T.text3 : T.border}`,
        borderBottom: `0.5px solid ${isHovered ? T.text3 : T.border}`,
        borderLeft: `3px solid ${projectColor}`,
        borderRadius: 5,
        padding: '7px 8px',
        marginBottom: 6,
        cursor: 'grab',
        opacity: isDone ? 0.4 : 1,
        transition: 'border-color 0.2s'
      }}
    >
      {/* Drop indicator line */}
      {dropIndicator === 'above' && (
        <div style={{
          position: 'absolute',
          top: -4,
          left: 0,
          right: 0,
          height: 2,
          background: T.purple,
          borderRadius: 1
        }} />
      )}
      {dropIndicator === 'below' && (
        <div style={{
          position: 'absolute',
          bottom: -4,
          left: 0,
          right: 0,
          height: 2,
          background: T.purple,
          borderRadius: 1
        }} />
      )}

      {task.project && (
        <div style={{ fontSize: 9, color: T.text3, marginBottom: 3 }}>
          {task.project.name}
        </div>
      )}
      <div style={{ fontSize: 11, color: T.text, lineHeight: 1.4, marginBottom: 4 }}>
        {task.title}
      </div>
      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
          {task.tags.slice(0, 3).map(tag => (
            <span
              key={tag.id}
              style={{
                padding: '2px 6px',
                borderRadius: 10,
                fontSize: 9,
                background: `${tag.color}25`,
                color: tag.color
              }}
            >
              {tag.name}
            </span>
          ))}
          {task.tags.length > 3 && (
            <span style={{
              padding: '2px 6px',
              borderRadius: 10,
              fontSize: 9,
              background: T.bg3,
              color: T.text3
            }}>
              +{task.tags.length - 3}
            </span>
          )}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: priority.color
        }} />
        {task.due_date && (
          <span style={{ fontSize: 9, color: isOverdue ? '#e74c3c' : T.text3 }}>
            {formatDate(task.due_date)}
          </span>
        )}
        {/* Comment indicator */}
        {task.comment_count > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <i className="ti ti-message" style={{ fontSize: 10, color: T.text3 }} />
            <span style={{ fontSize: 9, color: T.text3 }}>{task.comment_count}</span>
          </div>
        )}
        {/* Docs/links indicator */}
        {task.docs_count > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <i className="ti ti-link" style={{ fontSize: 10, color: T.text3 }} />
            <span style={{ fontSize: 9, color: T.text3 }}>{task.docs_count}</span>
          </div>
        )}
        <div style={{ flex: 1 }} />
        {task.assignee && (
          <div style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: T.bg3,
            border: `1px solid ${T.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 8,
            color: T.text
          }}>
            {task.assignee.avatar_letter}
          </div>
        )}
      </div>
    </div>
  )
}

function NewTaskForm({ T, members, projects, currentMember, onSave, onCancel }) {
  const [title, setTitle] = useState('')
  const [assigneeId, setAssigneeId] = useState(currentMember?.id || '')
  const [projectId, setProjectId] = useState(projects[0]?.id || '')
  const [priority, setPriority] = useState('medium')
  const [dueDate, setDueDate] = useState('')

  const handleSubmit = async () => {
    if (!title.trim()) return
    const task = await createTask({
      title: title.trim(),
      assignee_id: assigneeId || null,
      project_id: projectId || null,
      priority,
      due_date: dueDate || null,
      created_by: currentMember?.id,
      status: 'todo'
    })
    onSave(task)
    setTitle('')
  }

  return (
    <div style={{
      background: T.bg2,
      border: `1px solid ${T.border}`,
      borderRadius: 5,
      padding: 10,
      marginBottom: 8
    }}>
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Task title..."
        autoFocus
        style={{
          width: '100%',
          padding: '6px 8px',
          background: T.bg3,
          border: `1px solid ${T.border}`,
          borderRadius: 4,
          color: T.text,
          fontSize: 11,
          marginBottom: 8,
          outline: 'none'
        }}
        onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
      />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        <select
          value={assigneeId}
          onChange={e => setAssigneeId(e.target.value)}
          style={{
            padding: '4px 6px',
            background: T.bg3,
            border: `1px solid ${T.border}`,
            borderRadius: 4,
            color: T.text,
            fontSize: 10
          }}
        >
          <option value="">Unassigned</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select
          value={projectId}
          onChange={e => setProjectId(e.target.value)}
          style={{
            padding: '4px 6px',
            background: T.bg3,
            border: `1px solid ${T.border}`,
            borderRadius: 4,
            color: T.text,
            fontSize: 10
          }}
        >
          <option value="">No project</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select
          value={priority}
          onChange={e => setPriority(e.target.value)}
          style={{
            padding: '4px 6px',
            background: T.bg3,
            border: `1px solid ${T.border}`,
            borderRadius: 4,
            color: T.text,
            fontSize: 10
          }}
        >
          {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          style={{
            padding: '4px 6px',
            background: T.bg3,
            border: `1px solid ${T.border}`,
            borderRadius: 4,
            color: T.text,
            fontSize: 10
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={handleSubmit}
          style={{
            padding: '5px 12px',
            background: T.purple,
            border: 'none',
            borderRadius: 4,
            color: '#fff',
            fontSize: 10,
            cursor: 'pointer'
          }}
        >
          Save
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: '5px 12px',
            background: 'transparent',
            border: `1px solid ${T.border}`,
            borderRadius: 4,
            color: T.text,
            fontSize: 10,
            cursor: 'pointer'
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

const STATUS_COLORS = {
  todo: '#71717a',
  in_progress: '#7c6bf0',
  in_review: '#f39c12',
  blocked: '#e74c3c',
  done: '#71717a'
}

// Render comment content with highlighted @mentions
function CommentContent({ content, T, members }) {
  const parts = content.split(/(@\w+)/g)
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('@')) {
          const name = part.slice(1)
          const member = members.find(m => m.name.toLowerCase() === name.toLowerCase())
          return (
            <span
              key={i}
              style={{
                color: T.purple,
                fontWeight: 500,
                background: `${T.purple}15`,
                padding: '1px 4px',
                borderRadius: 3
              }}
            >
              {part}
            </span>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </span>
  )
}

// Input with @mention autocomplete
function MentionInput({ value, onChange, onSubmit, placeholder, T, members }) {
  const [showMentions, setShowMentions] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const [mentionIndex, setMentionIndex] = useState(0)
  const [cursorPos, setCursorPos] = useState(0)
  const inputRef = useRef()

  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(mentionFilter.toLowerCase())
  )

  const handleChange = (e) => {
    const newValue = e.target.value
    const pos = e.target.selectionStart
    onChange(newValue)
    setCursorPos(pos)

    // Check if we should show mentions dropdown
    const textBeforeCursor = newValue.slice(0, pos)
    const atMatch = textBeforeCursor.match(/@(\w*)$/)
    if (atMatch) {
      setShowMentions(true)
      setMentionFilter(atMatch[1])
      setMentionIndex(0)
    } else {
      setShowMentions(false)
    }
  }

  const insertMention = (member) => {
    const textBeforeCursor = value.slice(0, cursorPos)
    const textAfterCursor = value.slice(cursorPos)
    const beforeMention = textBeforeCursor.replace(/@\w*$/, '')
    const newValue = beforeMention + '@' + member.name + ' ' + textAfterCursor
    onChange(newValue)
    setShowMentions(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (showMentions && filteredMembers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMentionIndex(i => Math.min(i + 1, filteredMembers.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMentionIndex(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        insertMention(filteredMembers[mentionIndex])
      } else if (e.key === 'Escape') {
        setShowMentions(false)
      }
    } else if (e.key === 'Enter' && !showMentions) {
      onSubmit()
    }
  }

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '8px 10px',
          background: T.bg3,
          border: `1px solid ${T.border}`,
          borderRadius: 6,
          color: T.text,
          fontSize: 11,
          outline: 'none'
        }}
      />
      {showMentions && filteredMembers.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: 0,
          marginBottom: 4,
          background: T.bg2,
          border: `1px solid ${T.border}`,
          borderRadius: 6,
          padding: 4,
          minWidth: 160,
          zIndex: 200,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          {filteredMembers.map((member, i) => (
            <div
              key={member.id}
              onClick={() => insertMention(member)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 10px',
                borderRadius: 4,
                cursor: 'pointer',
                background: i === mentionIndex ? T.bg3 : 'transparent'
              }}
              onMouseEnter={() => setMentionIndex(i)}
            >
              <div style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: member.avatar_color || T.bg3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9,
                color: '#fff'
              }}>
                {member.avatar_letter}
              </div>
              <span style={{ fontSize: 11, color: T.text }}>{member.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Custom dropdown for modal fields
function ModalDropdown({ value, options, onChange, T, renderValue, renderOption }) {
  const [open, setOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 })
  const ref = useRef()
  const triggerRef = useRef()

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleOpen = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      })
    }
    setOpen(!open)
  }

  const selected = options.find(o => o.id === value)

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        ref={triggerRef}
        onClick={handleOpen}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 10px',
          background: T.bg3,
          border: `1px solid ${T.border}`,
          borderRadius: 6,
          cursor: 'pointer',
          width: '100%'
        }}
      >
        {renderValue(selected)}
        <i className="ti ti-chevron-down" style={{ fontSize: 12, color: T.text3, marginLeft: 'auto' }} />
      </div>
      {open && (
        <div style={{
          position: 'fixed',
          top: menuPosition.top,
          left: menuPosition.left,
          width: menuPosition.width,
          background: T.bg2,
          border: `1px solid ${T.border}`,
          borderRadius: 6,
          padding: 4,
          zIndex: 300,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          maxHeight: 200,
          overflowY: 'auto'
        }}>
          {options.map(opt => (
            <div
              key={opt.id}
              onClick={() => { onChange(opt.id); setOpen(false) }}
              style={{
                padding: '6px 10px',
                borderRadius: 4,
                cursor: 'pointer',
                background: opt.id === value ? `rgba(124,107,240,0.1)` : 'transparent'
              }}
              onMouseEnter={e => e.currentTarget.style.background = T.bg3}
              onMouseLeave={e => e.currentTarget.style.background = opt.id === value ? `rgba(124,107,240,0.1)` : 'transparent'}
            >
              {renderOption(opt)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Helper to format file size
function formatFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Helper to get icon for doc URL
function getDocIcon(url) {
  if (url?.includes('figma.com')) return { icon: 'ti-brand-figma', color: '#a259ff' }
  if (url?.includes('docs.google.com')) return { icon: 'ti-file-text', color: '#4285f4' }
  return { icon: 'ti-link', color: '#2ecc71' }
}

// Helper to get icon for attachment mime type
function getAttachmentIcon(mimeType) {
  if (mimeType?.startsWith('image/')) return { icon: 'ti-photo', color: '#2ecc71' }
  if (mimeType === 'application/pdf') return { icon: 'ti-file-type-pdf', color: '#e74c3c' }
  return { icon: 'ti-file', color: '#71717a' }
}

// Color options for tag picker
const TAG_COLOR_OPTIONS = [
  '#a259ff', '#f0b95a', '#e74c3c', '#2ecc71', '#5dade2',
  '#7c6bf0', '#e84393', '#f39c12', '#1abc9c', '#9b59b6'
]

// Tag picker component
function TagPicker({ taskTags, allTags, onAdd, onRemove, onCreate, T }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedColor, setSelectedColor] = useState(TAG_COLOR_OPTIONS[0])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const ref = useRef()

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filteredTags = allTags.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
  const taskTagIds = taskTags.map(t => t.id)
  const canCreate = search && !allTags.some(t => t.name.toLowerCase() === search.toLowerCase())

  const handleTagClick = (tag) => {
    if (taskTagIds.includes(tag.id)) {
      onRemove(tag.id)
    } else {
      onAdd(tag.id)
    }
  }

  const handleCreate = async () => {
    if (!search.trim()) return
    await onCreate(search.trim(), selectedColor)
    setSearch('')
    setShowCreateForm(false)
    setSelectedColor(TAG_COLOR_OPTIONS[0])
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          padding: '3px 9px',
          borderRadius: 20,
          fontSize: 10,
          border: `1px dashed ${T.border}`,
          color: T.text3,
          background: 'none',
          cursor: 'pointer',
          transition: 'border-color 0.2s, color 0.2s'
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = T.purple; e.currentTarget.style.color = T.purple }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.text3 }}
      >
        + Add tag
      </button>
      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: 6,
          background: T.bg2,
          border: `0.5px solid ${T.border}`,
          borderRadius: 8,
          padding: 6,
          minWidth: 200,
          zIndex: 20,
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
        }}>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setShowCreateForm(false) }}
            placeholder="Search or create tag..."
            autoFocus
            style={{
              width: '100%',
              padding: '6px 8px',
              background: '#18181b',
              border: `0.5px solid ${T.border}`,
              borderRadius: 5,
              color: T.text,
              fontSize: 11,
              marginBottom: 6,
              outline: 'none'
            }}
          />
          <div style={{ maxHeight: 150, overflowY: 'auto' }}>
            {filteredTags.map(tag => (
              <div
                key={tag.id}
                onClick={() => handleTagClick(tag)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '5px 8px',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
                onMouseEnter={e => e.currentTarget.style.background = T.bg3}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <input
                  type="checkbox"
                  checked={taskTagIds.includes(tag.id)}
                  readOnly
                  style={{ accentColor: T.purple }}
                />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: tag.color }} />
                <span style={{ fontSize: 11, color: T.text }}>{tag.name}</span>
              </div>
            ))}
            {filteredTags.length === 0 && !canCreate && (
              <div style={{ padding: '8px', color: T.text3, fontSize: 11, textAlign: 'center' }}>
                No tags yet
              </div>
            )}
          </div>
          {canCreate && (
            <>
              <div style={{ height: 1, background: T.border, margin: '6px 0' }} />
              {!showCreateForm ? (
                <div
                  onClick={() => setShowCreateForm(true)}
                  style={{
                    padding: '5px 8px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    color: T.purple,
                    fontSize: 11,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = T.bg3}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: selectedColor }} />
                  + Create "{search}"
                </div>
              ) : (
                <div style={{ padding: '6px 0' }}>
                  <div style={{ fontSize: 10, color: T.text3, marginBottom: 6 }}>Pick a color:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {TAG_COLOR_OPTIONS.map(color => (
                      <div
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: color,
                          cursor: 'pointer',
                          border: selectedColor === color ? '2px solid #fff' : '2px solid transparent',
                          boxShadow: selectedColor === color ? '0 0 0 1px ' + color : 'none'
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={handleCreate}
                      style={{
                        flex: 1,
                        padding: '5px 10px',
                        background: selectedColor,
                        border: 'none',
                        borderRadius: 4,
                        color: '#fff',
                        fontSize: 10,
                        cursor: 'pointer',
                        fontWeight: 500
                      }}
                    >
                      Create "{search}"
                    </button>
                    <button
                      onClick={() => setShowCreateForm(false)}
                      style={{
                        padding: '5px 10px',
                        background: 'transparent',
                        border: `1px solid ${T.border}`,
                        borderRadius: 4,
                        color: T.text3,
                        fontSize: 10,
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// Redesigned TaskModal with full features
function TaskModal({ task, T, members, projects, currentMember, onClose, onUpdate, onDelete }) {
  // Core task state
  const [title, setTitle] = useState(task.title)
  const [editedTitle, setEditedTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || '')
  const [status, setStatus] = useState(task.status)
  const [priority, setPriority] = useState(task.priority)
  const [assigneeId, setAssigneeId] = useState(task.assignee_id || '')
  const [projectId, setProjectId] = useState(task.project_id || '')
  const [dueDate, setDueDate] = useState(task.due_date || '')
  const [editingTitle, setEditingTitle] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Tags state
  const [taskTags, setTaskTags] = useState([])
  const [allTags, setAllTags] = useState([])

  // Docs state
  const [docs, setDocs] = useState([])
  const [showAddLink, setShowAddLink] = useState(false)
  const [newDocTitle, setNewDocTitle] = useState('')
  const [newDocUrl, setNewDocUrl] = useState('')

  // Attachments state
  const [attachments, setAttachments] = useState([])
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Comments state
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [sendingComment, setSendingComment] = useState(false)

  const dateInputRef = useRef()
  const fileInputRef = useRef()
  const project = projects.find(p => p.id === projectId)

  // Load all data on mount
  useEffect(() => {
    Promise.all([
      fetchTaskTags(task.id).then(setTaskTags),
      fetchAllTags().then(setAllTags),
      fetchTaskDocs(task.id).then(setDocs),
      fetchTaskAttachments(task.id).then(setAttachments),
      fetchComments(task.id).then(setComments)
    ])
  }, [task.id])

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  const handleTitleSave = () => {
    setTitle(editedTitle)
    setEditingTitle(false)
  }

  const handleTitleCancel = () => {
    setEditedTitle(title)
    setEditingTitle(false)
  }

  const handleSave = async () => {
    setIsSaving(true)
    const updates = {
      title,
      description,
      status,
      priority,
      assignee_id: assigneeId || null,
      project_id: projectId || null,
      due_date: dueDate || null
    }
    const updated = await updateTask(task.id, updates)
    onUpdate({ ...updated, tags: taskTags })
    setIsSaving(false)
    onClose()
  }

  const handleDelete = async () => {
    await deleteTask(task.id)
    onDelete(task.id)
    onClose()
  }

  // Tag handlers
  const handleAddTag = async (tagId) => {
    const tag = await addTagToTask(task.id, tagId)
    setTaskTags(prev => [...prev, tag])
  }

  const handleRemoveTag = async (tagId) => {
    await removeTagFromTask(task.id, tagId)
    setTaskTags(prev => prev.filter(t => t.id !== tagId))
  }

  const handleCreateTag = async (name, color) => {
    const tag = await createTag(name, currentMember?.id, color)
    setAllTags(prev => [...prev, tag])
    await handleAddTag(tag.id)
  }

  // Doc handlers
  const handleAddDoc = async () => {
    if (!newDocTitle.trim() || !newDocUrl.trim()) return
    const doc = await addDoc(task.id, newDocTitle.trim(), newDocUrl.trim(), currentMember?.id)
    setDocs(prev => [...prev, doc])
    setNewDocTitle('')
    setNewDocUrl('')
    setShowAddLink(false)
  }

  const handleDeleteDoc = async (docId) => {
    await deleteDoc(docId)
    setDocs(prev => prev.filter(d => d.id !== docId))
  }

  // Attachment handlers
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const attachment = await uploadAttachment(task.id, file, currentMember?.id)
    setAttachments(prev => [...prev, attachment])
    setUploading(false)
    setShowUpload(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDeleteAttachment = async (attachmentId) => {
    await deleteAttachment(attachmentId)
    setAttachments(prev => prev.filter(a => a.id !== attachmentId))
  }

  // Comment handlers
  const handleSendComment = async () => {
    if (!newComment.trim() || !currentMember) return
    setSendingComment(true)
    const comment = await createComment(task.id, currentMember.id, newComment.trim())
    setComments(prev => [...prev, comment])
    setNewComment('')
    setSendingComment(false)
    onUpdate({ ...task, comment_count: comments.length + 1 })
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'No due date'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatTimestamp = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  const statusOptions = STATUSES.map(s => ({ ...s, color: STATUS_COLORS[s.id] }))
  const assigneeOptions = [{ id: '', name: 'Unassigned', avatar_letter: '?', avatar_color: T.bg3 }, ...members]
  const projectOptions = [{ id: '', name: 'No project', color: T.text3 }, ...projects]

  return (
    <div
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div style={{
        width: 640,
        maxHeight: '88vh',
        background: '#232326',
        borderRadius: 10,
        border: `0.5px solid ${T.border}`,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '18px 24px 16px',
          borderBottom: `0.5px solid ${T.border}`,
          borderLeft: `4px solid ${project?.color || T.text3}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}>
          <div style={{ flex: 1 }}>
            {/* Project line */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: project?.color || T.text3 }} />
              <span style={{ fontSize: 11, color: '#71717a' }}>{project?.name || 'No project'}</span>
            </div>
            {/* Title */}
            {editingTitle ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  value={editedTitle}
                  onChange={e => setEditedTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleTitleSave()
                    if (e.key === 'Escape') handleTitleCancel()
                  }}
                  autoFocus
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    background: '#2e2e32',
                    border: `0.5px solid ${T.border}`,
                    borderRadius: 5,
                    color: '#f4f4f5',
                    fontSize: 18,
                    fontWeight: 500,
                    outline: 'none'
                  }}
                />
                <button
                  onClick={handleTitleSave}
                  style={{
                    background: '#2ecc71',
                    border: 'none',
                    borderRadius: 4,
                    color: '#fff',
                    width: 28,
                    height: 28,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <i className="ti ti-check" style={{ fontSize: 14 }} />
                </button>
                <button
                  onClick={handleTitleCancel}
                  style={{
                    background: T.bg3,
                    border: `1px solid ${T.border}`,
                    borderRadius: 4,
                    color: T.text3,
                    width: 28,
                    height: 28,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <i className="ti ti-x" style={{ fontSize: 14 }} />
                </button>
              </div>
            ) : (
              <h2
                onClick={() => setEditingTitle(true)}
                style={{
                  fontSize: 18,
                  fontWeight: 500,
                  color: '#f4f4f5',
                  cursor: 'pointer',
                  margin: 0
                }}
              >
                {title}
              </h2>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: T.text3,
              cursor: 'pointer',
              padding: 4,
              marginLeft: 12
            }}
          >
            <i className="ti ti-x" style={{ fontSize: 20 }} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 210px',
          gap: 24,
          padding: '20px 24px',
          overflowY: 'auto',
          flex: 1
        }}>
          {/* LEFT COLUMN */}
          <div>
            {/* Description */}
            <label style={{ fontSize: 9, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add a description..."
              style={{
                width: '100%',
                minHeight: 80,
                padding: 10,
                background: '#2e2e32',
                border: `0.5px solid ${T.border}`,
                borderRadius: 6,
                color: '#f4f4f5',
                fontSize: 11,
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none'
              }}
            />

            {/* Docs, links & files */}
            <label style={{ fontSize: 9, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginTop: 16, marginBottom: 8 }}>
              Docs, links & files
            </label>

            {/* Docs list */}
            {docs.map(doc => {
              const iconInfo = getDocIcon(doc.url)
              return (
                <div
                  key={doc.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 10px',
                    background: '#2e2e32',
                    border: `0.5px solid ${T.border}`,
                    borderRadius: 6,
                    marginBottom: 5,
                    position: 'relative'
                  }}
                  className="doc-item"
                >
                  <div style={{
                    width: 26,
                    height: 26,
                    borderRadius: 5,
                    background: `${iconInfo.color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <i className={`ti ${iconInfo.icon}`} style={{ fontSize: 14, color: iconInfo.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: '#f4f4f5', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</div>
                    <div style={{ fontSize: 9, color: '#71717a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.url}</div>
                  </div>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ color: '#71717a', padding: 4 }}>
                    <i className="ti ti-external-link" style={{ fontSize: 14 }} />
                  </a>
                  <button onClick={() => handleDeleteDoc(doc.id)} style={{ background: 'none', border: 'none', color: '#71717a', padding: 4, cursor: 'pointer' }}>
                    <i className="ti ti-trash" style={{ fontSize: 14 }} />
                  </button>
                </div>
              )
            })}

            {/* Attachments list */}
            {attachments.map(att => {
              const iconInfo = getAttachmentIcon(att.mime_type)
              return (
                <div
                  key={att.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 10px',
                    background: '#2e2e32',
                    border: `0.5px solid ${T.border}`,
                    borderRadius: 6,
                    marginBottom: 5
                  }}
                >
                  <div style={{
                    width: 26,
                    height: 26,
                    borderRadius: 5,
                    background: `${iconInfo.color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <i className={`ti ${iconInfo.icon}`} style={{ fontSize: 14, color: iconInfo.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: '#f4f4f5', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</div>
                    <div style={{ fontSize: 9, color: '#71717a' }}>
                      {formatFileSize(att.size_bytes)} {att.uploader?.name ? `• uploaded by ${att.uploader.name}` : ''}
                    </div>
                  </div>
                  <a href={att.url} target="_blank" rel="noopener noreferrer" style={{ color: '#71717a', padding: 4 }}>
                    <i className="ti ti-download" style={{ fontSize: 14 }} />
                  </a>
                  <button onClick={() => handleDeleteAttachment(att.id)} style={{ background: 'none', border: 'none', color: '#71717a', padding: 4, cursor: 'pointer' }}>
                    <i className="ti ti-trash" style={{ fontSize: 14 }} />
                  </button>
                </div>
              )
            })}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                onClick={() => { setShowAddLink(true); setShowUpload(false) }}
                style={{
                  flex: 1,
                  border: `1px dashed ${T.border}`,
                  borderRadius: 6,
                  padding: '6px 10px',
                  fontSize: 11,
                  color: '#71717a',
                  background: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                <i className="ti ti-link" style={{ fontSize: 14 }} />
                Add link
              </button>
              <button
                onClick={() => { setShowUpload(true); setShowAddLink(false) }}
                style={{
                  flex: 1,
                  border: `1px dashed ${T.border}`,
                  borderRadius: 6,
                  padding: '6px 10px',
                  fontSize: 11,
                  color: '#71717a',
                  background: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                <i className="ti ti-paperclip" style={{ fontSize: 14 }} />
                Attach file
              </button>
            </div>

            {/* Add link form */}
            {showAddLink && (
              <div style={{ marginTop: 8, padding: 10, background: '#2e2e32', borderRadius: 6, border: `0.5px solid ${T.border}` }}>
                <input
                  value={newDocTitle}
                  onChange={e => setNewDocTitle(e.target.value)}
                  placeholder="Title"
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    marginBottom: 6,
                    background: '#18181b',
                    border: `0.5px solid ${T.border}`,
                    borderRadius: 4,
                    color: '#f4f4f5',
                    fontSize: 11,
                    outline: 'none'
                  }}
                />
                <input
                  value={newDocUrl}
                  onChange={e => setNewDocUrl(e.target.value)}
                  placeholder="URL"
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    marginBottom: 8,
                    background: '#18181b',
                    border: `0.5px solid ${T.border}`,
                    borderRadius: 4,
                    color: '#f4f4f5',
                    fontSize: 11,
                    outline: 'none'
                  }}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={handleAddDoc} style={{ padding: '5px 12px', background: T.purple, border: 'none', borderRadius: 4, color: '#fff', fontSize: 10, cursor: 'pointer' }}>Save</button>
                  <button onClick={() => { setShowAddLink(false); setNewDocTitle(''); setNewDocUrl('') }} style={{ padding: '5px 12px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 4, color: '#71717a', fontSize: 10, cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            )}

            {/* Upload zone */}
            {showUpload && (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  marginTop: 8,
                  padding: 20,
                  background: '#2e2e32',
                  borderRadius: 6,
                  border: `1px dashed ${T.border}`,
                  textAlign: 'center',
                  cursor: 'pointer'
                }}
              >
                {uploading ? (
                  <div style={{ color: '#71717a', fontSize: 11 }}>Uploading...</div>
                ) : (
                  <>
                    <i className="ti ti-cloud-upload" style={{ fontSize: 24, color: '#71717a', marginBottom: 6 }} />
                    <div style={{ color: '#71717a', fontSize: 11 }}>Drop files here or browse</div>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </div>
            )}

            {/* Comments section */}
            <label style={{ fontSize: 9, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginTop: 20, marginBottom: 10 }}>
              Comments
            </label>

              {/* Comment list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                {comments.length === 0 ? (
                  <div style={{ color: T.text3, fontSize: 11 }}>No comments yet. Type @ to mention someone.</div>
                ) : (
                  comments.map(comment => (
                    <div key={comment.id}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <div style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: comment.member?.avatar_color || T.bg3,
                          border: `1px solid ${T.border}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 10,
                          color: '#fff'
                        }}>
                          {comment.member?.avatar_letter || '?'}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 500, color: T.text }}>{comment.member?.name || 'Unknown'}</span>
                        <span style={{ fontSize: 10, color: T.text3 }}>{formatTimestamp(comment.created_at)}</span>
                      </div>
                      <div style={{ fontSize: 12, color: T.text2, marginLeft: 32 }}>
                        <CommentContent content={comment.content} T={T} members={members} />
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add comment input with @mention */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: currentMember?.avatar_color || T.bg3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  color: '#fff',
                  flexShrink: 0
                }}>
                  {currentMember?.avatar_letter || '?'}
                </div>
                <MentionInput
                  value={newComment}
                  onChange={setNewComment}
                  onSubmit={handleSendComment}
                  placeholder="Add a comment... (type @ to mention)"
                  T={T}
                  members={members}
                />
                <button
                  onClick={handleSendComment}
                  disabled={sendingComment || !newComment.trim()}
                  style={{
                    padding: '6px 12px',
                    background: T.purple,
                    border: 'none',
                    borderRadius: 5,
                    color: '#fff',
                    fontSize: 11,
                    cursor: 'pointer',
                    opacity: sendingComment || !newComment.trim() ? 0.5 : 1
                  }}
                >
                  Post
                </button>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Tags */}
              <div>
                <label style={{ fontSize: 9, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Tags</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                  {taskTags.map(tag => (
                    <div
                      key={tag.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '3px 9px',
                        borderRadius: 20,
                        fontSize: 10,
                        fontWeight: 500,
                        background: `${tag.color}25`,
                        color: tag.color,
                        position: 'relative'
                      }}
                      className="tag-pill"
                    >
                      {tag.name}
                      <button
                        onClick={() => handleRemoveTag(tag.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: tag.color,
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: 10,
                          lineHeight: 1,
                          marginLeft: 2
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <TagPicker
                    taskTags={taskTags}
                    allTags={allTags}
                    onAdd={handleAddTag}
                    onRemove={handleRemoveTag}
                    onCreate={handleCreateTag}
                    T={T}
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label style={{ fontSize: 9, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Status</label>
                <ModalDropdown
                  value={status}
                  options={statusOptions}
                  onChange={setStatus}
                  T={T}
                  renderValue={(opt) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: opt?.color || T.text3 }} />
                      <span style={{ fontSize: 11, color: T.text }}>{opt?.label || 'Select'}</span>
                    </div>
                  )}
                  renderOption={(opt) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: opt.color }} />
                      <span style={{ fontSize: 11, color: T.text }}>{opt.label}</span>
                    </div>
                  )}
                />
              </div>

              {/* Assignee */}
              <div>
                <label style={{ fontSize: 9, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Assignee</label>
                <ModalDropdown
                  value={assigneeId}
                  options={assigneeOptions}
                  onChange={setAssigneeId}
                  T={T}
                  renderValue={(opt) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: opt?.avatar_color || T.bg3,
                        border: `1px solid ${T.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 9,
                        color: opt?.id ? '#fff' : T.text3
                      }}>
                        {opt?.avatar_letter || '?'}
                      </div>
                      <span style={{ fontSize: 11, color: opt?.id ? T.text : T.text3 }}>{opt?.name || 'Unassigned'}</span>
                    </div>
                  )}
                  renderOption={(opt) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: opt.avatar_color || T.bg3,
                        border: `1px solid ${T.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 9,
                        color: opt.id ? '#fff' : T.text3
                      }}>
                        {opt.avatar_letter || '?'}
                      </div>
                      <span style={{ fontSize: 11, color: T.text }}>{opt.name}</span>
                    </div>
                  )}
                />
              </div>

              {/* Priority */}
              <div>
                <label style={{ fontSize: 9, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Priority</label>
                <ModalDropdown
                  value={priority}
                  options={PRIORITIES}
                  onChange={setPriority}
                  T={T}
                  renderValue={(opt) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: opt?.color || T.text3 }} />
                      <span style={{ fontSize: 11, color: T.text }}>{opt?.label || 'Select'}</span>
                    </div>
                  )}
                  renderOption={(opt) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: opt.color }} />
                      <span style={{ fontSize: 11, color: T.text }}>{opt.label}</span>
                    </div>
                  )}
                />
              </div>

              {/* Due Date */}
              <div>
                <label style={{ fontSize: 9, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Due Date</label>
                <div
                  onClick={() => dateInputRef.current?.showPicker()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 10px',
                    background: T.bg3,
                    border: `1px solid ${T.border}`,
                    borderRadius: 6,
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                >
                  <i className="ti ti-calendar" style={{ fontSize: 14, color: T.text3 }} />
                  <span style={{ fontSize: 11, color: dueDate ? T.text : T.text3 }}>{formatDate(dueDate)}</span>
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    style={{
                      position: 'absolute',
                      opacity: 0,
                      pointerEvents: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Project */}
              <div>
                <label style={{ fontSize: 9, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Project</label>
                <ModalDropdown
                  value={projectId}
                  options={projectOptions}
                  onChange={setProjectId}
                  T={T}
                  renderValue={(opt) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: opt?.color || T.text3 }} />
                      <span style={{ fontSize: 11, color: opt?.id ? T.text : T.text3 }}>{opt?.name || 'No project'}</span>
                    </div>
                  )}
                  renderOption={(opt) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: opt.color }} />
                      <span style={{ fontSize: 11, color: T.text }}>{opt.name}</span>
                    </div>
                  )}
                />
              </div>
            </div>
          </div>

        {/* Modal Footer */}
        <div style={{
          padding: '12px 24px',
          borderTop: `0.5px solid ${T.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          {showDeleteConfirm ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 11, color: T.text }}>Are you sure?</span>
              <button
                onClick={handleDelete}
                style={{
                  background: '#e74c3c',
                  border: 'none',
                  borderRadius: 4,
                  color: '#fff',
                  fontSize: 11,
                  padding: '5px 10px',
                  cursor: 'pointer'
                }}
              >
                Yes, delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: T.text3,
                  fontSize: 11,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#e74c3c',
                fontSize: 11,
                cursor: 'pointer',
                padding: '6px 0'
              }}
            >
              Delete task
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              padding: '8px 20px',
              background: T.purple,
              border: 'none',
              borderRadius: 6,
              color: '#fff',
              fontSize: 11,
              fontWeight: 500,
              cursor: 'pointer',
              opacity: isSaving ? 0.7 : 1
            }}
          >
            {isSaving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BoardView({ T, currentMember, members, projects, tasks, onTaskUpdate, onTaskCreate, onTaskDelete, onRefresh }) {
  const [filterMember, setFilterMember] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [search, setSearch] = useState('')
  const [showNewTask, setShowNewTask] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [draggedTask, setDraggedTask] = useState(null)
  const [dropTarget, setDropTarget] = useState(null) // { taskId, position: 'above' | 'below' }

  const memberOptions = [{ id: '', label: 'All members' }, ...members.map(m => ({ id: m.id, label: m.name, color: m.avatar_color, letter: m.avatar_letter }))]
  const projectOptions = [{ id: '', label: 'All projects' }, ...projects.map(p => ({ id: p.id, label: p.name, color: p.color })), { id: 'none', label: 'No project' }]
  const priorityOptions = [{ id: '', label: 'All priorities' }, ...PRIORITIES]

  const filteredTasks = tasks.filter(task => {
    if (filterMember && task.assignee_id !== filterMember) return false
    if (filterProject === 'none' && task.project_id) return false
    if (filterProject && filterProject !== 'none' && task.project_id !== filterProject) return false
    if (filterPriority && task.priority !== filterPriority) return false
    if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // Fix 1: Sort tasks by sort_order ascending
  const getTasksByStatus = (status) => {
    return filteredTasks
      .filter(t => t.status === status)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  }

  const handleDragStart = (e, task) => {
    setDraggedTask(task)
    e.dataTransfer.setData('taskId', task.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  // Fix 1: Handle drag over on cards for reordering
  const handleCardDragOver = (e, targetTask) => {
    e.preventDefault()
    e.stopPropagation()
    if (!draggedTask || draggedTask.id === targetTask.id) {
      setDropTarget(null)
      return
    }

    const rect = e.currentTarget.getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    const position = e.clientY < midY ? 'above' : 'below'

    setDropTarget({ taskId: targetTask.id, position })
  }

  const handleColumnDragOver = (e) => {
    e.preventDefault()
    // Clear drop target when over column but not over a card
    if (e.target === e.currentTarget) {
      setDropTarget(null)
    }
  }

  // Fix 1: Handle drop on card for reordering
  const handleCardDrop = async (e, targetTask) => {
    e.preventDefault()
    e.stopPropagation()

    if (!draggedTask || draggedTask.id === targetTask.id) {
      setDraggedTask(null)
      setDropTarget(null)
      return
    }

    const targetStatus = targetTask.status
    const tasksInColumn = getTasksByStatus(targetStatus)
    const targetIndex = tasksInColumn.findIndex(t => t.id === targetTask.id)

    // Calculate new sort_order
    let newSortOrder
    if (dropTarget?.position === 'above') {
      const prevTask = tasksInColumn[targetIndex - 1]
      const prevOrder = prevTask ? prevTask.sort_order || 0 : 0
      const targetOrder = targetTask.sort_order || 0
      newSortOrder = prevTask ? (prevOrder + targetOrder) / 2 : targetOrder - 1
    } else {
      const nextTask = tasksInColumn[targetIndex + 1]
      const targetOrder = targetTask.sort_order || 0
      const nextOrder = nextTask ? nextTask.sort_order || 0 : targetOrder + 2
      newSortOrder = (targetOrder + nextOrder) / 2
    }

    // Optimistic update
    const updatedTask = { ...draggedTask, status: targetStatus, sort_order: newSortOrder }
    onTaskUpdate(updatedTask)

    // API call
    const result = await updateTask(draggedTask.id, { status: targetStatus, sort_order: newSortOrder })
    onTaskUpdate(result)

    setDraggedTask(null)
    setDropTarget(null)
  }

  // Handle drop on column (empty space or different column)
  const handleColumnDrop = async (e, newStatus) => {
    e.preventDefault()

    if (!draggedTask) return

    // If dropped on empty column space, add to bottom
    const tasksInColumn = getTasksByStatus(newStatus)
    const maxSortOrder = tasksInColumn.length > 0
      ? Math.max(...tasksInColumn.map(t => t.sort_order || 0))
      : 0
    const newSortOrder = maxSortOrder + 1

    // Optimistic update
    const updatedTask = { ...draggedTask, status: newStatus, sort_order: newSortOrder }
    onTaskUpdate(updatedTask)

    // API call
    const result = await updateTask(draggedTask.id, { status: newStatus, sort_order: newSortOrder })
    onTaskUpdate(result)

    setDraggedTask(null)
    setDropTarget(null)
  }

  const handleDragEnd = () => {
    setDraggedTask(null)
    setDropTarget(null)
  }

  const handleTaskSaved = (task) => {
    onTaskCreate(task)
    setShowNewTask(false)
  }

  const handleTaskUpdated = (task) => {
    onTaskUpdate(task)
  }

  const handleTaskDeleted = (taskId) => {
    onTaskDelete(taskId)
    setSelectedTask(null)
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <Dropdown
          value={filterMember}
          options={memberOptions}
          onChange={setFilterMember}
          placeholder="All members"
          T={T}
          renderOption={(opt) => opt ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {opt.color && (
                <div style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: opt.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 8,
                  color: '#fff'
                }}>{opt.letter}</div>
              )}
              <span>{opt.label}</span>
            </div>
          ) : 'All members'}
        />
        <Dropdown
          value={filterProject}
          options={projectOptions}
          onChange={setFilterProject}
          placeholder="All projects"
          T={T}
          renderOption={(opt) => opt ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {opt.color && <div style={{ width: 6, height: 6, borderRadius: 2, background: opt.color }} />}
              <span>{opt.label}</span>
            </div>
          ) : 'All projects'}
        />
        <Dropdown
          value={filterPriority}
          options={priorityOptions}
          onChange={setFilterPriority}
          placeholder="All priorities"
          T={T}
          renderOption={(opt) => opt ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {opt.color && <div style={{ width: 6, height: 6, borderRadius: '50%', background: opt.color }} />}
              <span>{opt.label}</span>
            </div>
          ) : 'All priorities'}
        />

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search tasks..."
          style={{
            flex: 1,
            minWidth: 150,
            padding: '6px 10px',
            background: 'transparent',
            border: `1px solid ${T.border}`,
            borderRadius: 5,
            color: T.text,
            fontSize: 11,
            marginLeft: 'auto'
          }}
        />

        <button
          onClick={() => setShowNewTask(true)}
          style={{
            padding: '6px 14px',
            background: T.purple,
            border: 'none',
            borderRadius: 5,
            color: '#fff',
            fontSize: 11,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          <i className="ti ti-plus" style={{ fontSize: 12 }} />
          New task
        </button>
      </div>

      {/* Board */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 12,
          flex: 1,
          overflow: 'auto'
        }}
        onDragEnd={handleDragEnd}
      >
        {STATUSES.map(status => (
          <div
            key={status.id}
            onDragOver={handleColumnDragOver}
            onDrop={(e) => handleColumnDrop(e, status.id)}
            style={{
              background: T.bg,
              borderRadius: 6,
              padding: 10,
              minHeight: 200
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.text3 }} />
              <span style={{ fontSize: 10, textTransform: 'uppercase', color: T.text2, fontWeight: 500 }}>
                {status.label}
              </span>
              <span style={{
                fontSize: 10,
                background: T.bg3,
                color: T.text3,
                padding: '1px 6px',
                borderRadius: 8
              }}>
                {getTasksByStatus(status.id).length}
              </span>
            </div>

            {status.id === 'todo' && showNewTask && (
              <NewTaskForm
                T={T}
                members={members}
                projects={projects}
                currentMember={currentMember}
                onSave={handleTaskSaved}
                onCancel={() => setShowNewTask(false)}
              />
            )}

            {getTasksByStatus(status.id).map(task => (
              <TaskCard
                key={task.id}
                task={task}
                T={T}
                onClick={() => setSelectedTask(task)}
                onDragStart={handleDragStart}
                onDragOver={handleCardDragOver}
                onDrop={handleCardDrop}
                dropIndicator={dropTarget?.taskId === task.id ? dropTarget.position : null}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Task Modal */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          T={T}
          members={members}
          projects={projects}
          currentMember={currentMember}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskUpdated}
          onDelete={handleTaskDeleted}
        />
      )}
    </div>
  )
}
