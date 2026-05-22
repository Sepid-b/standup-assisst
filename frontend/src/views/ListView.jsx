import { useState, useEffect, useRef } from 'react'
import { updateTask, deleteTask, fetchComments, createComment } from '../api'

const STATUSES = [
  { id: 'todo', label: 'To Do', color: '#71717a' },
  { id: 'in_progress', label: 'In Progress', color: '#7c6bf0' },
  { id: 'in_review', label: 'In Review', color: '#f39c12' },
  { id: 'blocked', label: 'Blocked', color: '#e74c3c' },
  { id: 'done', label: 'Done', color: '#71717a' }
]

const STATUS_ORDER = ['todo', 'in_progress', 'in_review', 'blocked', 'done']

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

function StatusDot({ task, T, onStatusChange }) {
  const [hovering, setHovering] = useState(false)
  const status = STATUSES.find(s => s.id === task.status) || STATUSES[0]
  const currentIndex = STATUS_ORDER.indexOf(task.status)
  const nextStatus = STATUS_ORDER[(currentIndex + 1) % STATUS_ORDER.length]
  const nextStatusObj = STATUSES.find(s => s.id === nextStatus)

  const handleClick = async (e) => {
    e.stopPropagation()
    const updated = await updateTask(task.id, { status: nextStatus })
    onStatusChange(updated)
  }

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      title={`${status.label} → ${nextStatusObj?.label}`}
      style={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: status.color,
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        transform: hovering ? 'scale(1.4)' : 'scale(1)',
        boxShadow: hovering ? `0 0 8px ${T.purple}40` : 'none'
      }}
    />
  )
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
      <div
        onClick={() => setOpen(!open)}
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
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: 4,
          background: T.bg2,
          border: `1px solid ${T.border}`,
          borderRadius: 6,
          padding: 4,
          zIndex: 200,
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

// Redesigned TaskModal with full features
function TaskModal({ task, T, members, projects, currentMember, onClose, onUpdate, onDelete }) {
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
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [sendingComment, setSendingComment] = useState(false)

  const dateInputRef = useRef()
  const project = projects.find(p => p.id === projectId)

  useEffect(() => {
    loadComments()
  }, [task.id])

  const loadComments = async () => {
    const data = await fetchComments(task.id)
    setComments(data)
  }

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
    onUpdate(updated)
    setIsSaving(false)
    onClose()
  }

  const handleDelete = async () => {
    await deleteTask(task.id)
    onDelete(task.id)
    onClose()
  }

  const handleSendComment = async () => {
    if (!newComment.trim() || !currentMember) return
    setSendingComment(true)
    const comment = await createComment(task.id, currentMember.id, newComment.trim())
    const newComments = [...comments, comment]
    setComments(newComments)
    setNewComment('')
    setSendingComment(false)
    // Update task's comment count in parent
    onUpdate({ ...task, comment_count: newComments.length })
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

  const statusOptions = STATUSES
  const assigneeOptions = [{ id: '', name: 'Unassigned', avatar_letter: '?', avatar_color: T.bg3 }, ...members]
  const projectOptions = [{ id: '', name: 'No project', color: T.text3 }, ...projects]

  return (
    <div
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div style={{
        width: 620,
        maxHeight: '85vh',
        background: T.bg2,
        borderRadius: 10,
        border: `0.5px solid ${T.border}`,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: `1px solid ${T.border}`,
          borderLeft: `4px solid ${project?.color || T.text3}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: project?.color || T.text3 }} />
              <span style={{ fontSize: 11, color: T.text3 }}>{project?.name || 'No project'}</span>
            </div>
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
                    background: T.bg3,
                    border: `1px solid ${T.border}`,
                    borderRadius: 5,
                    color: T.text,
                    fontSize: 20,
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
                  fontSize: 20,
                  fontWeight: 500,
                  color: T.text,
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
          padding: '20px 24px',
          overflowY: 'auto',
          flex: 1
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 220px',
            gap: 24
          }}>
            {/* Left column */}
            <div>
              <label style={{ fontSize: 11, color: T.text3, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Add a description..."
                style={{
                  width: '100%',
                  minHeight: 100,
                  padding: 10,
                  background: T.bg3,
                  border: `1px solid ${T.border}`,
                  borderRadius: 6,
                  color: T.text,
                  fontSize: 12,
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none'
                }}
              />

              <label style={{ fontSize: 11, color: T.text3, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginTop: 20, marginBottom: 10 }}>
                Comments
              </label>

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

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 10, color: T.text3, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Status</label>
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

              <div>
                <label style={{ fontSize: 10, color: T.text3, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Assignee</label>
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

              <div>
                <label style={{ fontSize: 10, color: T.text3, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Priority</label>
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

              <div>
                <label style={{ fontSize: 10, color: T.text3, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Due Date</label>
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

              <div>
                <label style={{ fontSize: 10, color: T.text3, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Project</label>
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
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: `1px solid ${T.border}`,
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

export default function ListView({ T, currentMember, members, projects, tasks, onTaskUpdate, onTaskDelete, onRefresh }) {
  const [filterMember, setFilterMember] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [search, setSearch] = useState('')
  const [selectedTask, setSelectedTask] = useState(null)

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

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const isOverdue = (task) => {
    if (!task.due_date || task.status === 'done') return false
    return new Date(task.due_date) < new Date()
  }

  const handleStatusChange = (updatedTask) => {
    onTaskUpdate(updatedTask)
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
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}` }}>
              <th style={{ width: 40, padding: '8px 10px', textAlign: 'left', color: T.text3, fontWeight: 500 }}>Status</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', color: T.text3, fontWeight: 500 }}>Task</th>
              <th style={{ width: 120, padding: '8px 10px', textAlign: 'left', color: T.text3, fontWeight: 500 }}>Project</th>
              <th style={{ width: 100, padding: '8px 10px', textAlign: 'left', color: T.text3, fontWeight: 500 }}>Assignee</th>
              <th style={{ width: 60, padding: '8px 10px', textAlign: 'center', color: T.text3, fontWeight: 500 }}>Priority</th>
              <th style={{ width: 80, padding: '8px 10px', textAlign: 'left', color: T.text3, fontWeight: 500 }}>Due</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map(task => {
              const isDone = task.status === 'done'
              const priority = PRIORITIES.find(p => p.id === task.priority) || PRIORITIES[1]

              return (
                <tr
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  style={{
                    borderBottom: `1px solid ${T.border}`,
                    opacity: isDone ? 0.45 : 1,
                    cursor: 'pointer',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = T.bg3}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '10px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                    <StatusDot task={task} T={T} onStatusChange={handleStatusChange} />
                  </td>
                  <td style={{
                    padding: '10px',
                    color: isDone ? T.text3 : T.text,
                    textDecoration: isDone ? 'line-through' : 'none'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {task.title}
                      {task.comment_count > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <i className="ti ti-message" style={{ fontSize: 11, color: T.text3 }} />
                          <span style={{ fontSize: 9, color: T.text3 }}>{task.comment_count}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '10px' }}>
                    {task.project ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{
                          width: 6,
                          height: 6,
                          borderRadius: 2,
                          background: task.project.color
                        }} />
                        <span style={{ fontSize: 10, color: T.text2 }}>{task.project.name}</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: 10, color: T.text3 }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '10px' }}>
                    {task.assignee ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{
                          width: 16,
                          height: 16,
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
                        <span style={{ fontSize: 10, color: T.text2 }}>{task.assignee.name}</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: 10, color: T.text3 }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    <div style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: priority.color,
                      margin: '0 auto'
                    }} />
                  </td>
                  <td style={{
                    padding: '10px',
                    fontSize: 10,
                    color: isOverdue(task) ? '#e74c3c' : T.text3
                  }}>
                    {formatDate(task.due_date)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filteredTasks.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: 40,
            color: T.text3,
            fontSize: 12
          }}>
            No tasks found
          </div>
        )}
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
