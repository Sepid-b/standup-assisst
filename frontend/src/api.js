const API_BASE = '/api'

export async function fetchMembers() {
  const res = await fetch(`${API_BASE}/members`)
  return res.json()
}

export async function fetchProjects(memberId) {
  const url = memberId ? `${API_BASE}/projects?member_id=${memberId}` : `${API_BASE}/projects`
  const res = await fetch(url)
  return res.json()
}

export async function createProject(project) {
  const res = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project)
  })
  return res.json()
}

export async function fetchTasks({ memberId, projectId, status }) {
  const params = new URLSearchParams()
  if (memberId) params.append('member_id', memberId)
  if (projectId) params.append('project_id', projectId)
  if (status) params.append('status', status)
  const res = await fetch(`${API_BASE}/tasks?${params}`)
  return res.json()
}

export async function createTask(task) {
  const res = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task)
  })
  return res.json()
}

export async function updateTask(id, updates) {
  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  })
  return res.json()
}

export async function deleteTask(id) {
  const res = await fetch(`${API_BASE}/tasks/${id}`, { method: 'DELETE' })
  return res.json()
}

export async function fetchVibes() {
  const res = await fetch(`${API_BASE}/standups/vibes`)
  return res.json()
}

export async function updateVibe(memberId, vibe) {
  const res = await fetch(`${API_BASE}/standups/vibe`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ member_id: memberId, vibe })
  })
  return res.json()
}

export async function fetchComments(taskId) {
  const res = await fetch(`${API_BASE}/tasks/${taskId}/comments`)
  return res.json()
}

export async function createComment(taskId, memberId, content) {
  const res = await fetch(`${API_BASE}/tasks/${taskId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ member_id: memberId, content })
  })
  return res.json()
}

// ==================== TAGS API ====================

export async function fetchAllTags() {
  const res = await fetch(`${API_BASE}/tags`)
  return res.json()
}

export async function createTag(name, createdBy, color) {
  const res = await fetch(`${API_BASE}/tags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, created_by: createdBy, color })
  })
  return res.json()
}

export async function fetchTaskTags(taskId) {
  const res = await fetch(`${API_BASE}/tasks/${taskId}/tags`)
  return res.json()
}

export async function addTagToTask(taskId, tagId) {
  const res = await fetch(`${API_BASE}/tasks/${taskId}/tags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tag_id: tagId })
  })
  return res.json()
}

export async function removeTagFromTask(taskId, tagId) {
  const res = await fetch(`${API_BASE}/tasks/${taskId}/tags/${tagId}`, {
    method: 'DELETE'
  })
  return res.json()
}

// ==================== DOCS API ====================

export async function fetchTaskDocs(taskId) {
  const res = await fetch(`${API_BASE}/tasks/${taskId}/docs`)
  return res.json()
}

export async function addDoc(taskId, title, url, addedBy) {
  const res = await fetch(`${API_BASE}/tasks/${taskId}/docs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, url, added_by: addedBy })
  })
  return res.json()
}

export async function deleteDoc(docId) {
  const res = await fetch(`${API_BASE}/docs/${docId}`, {
    method: 'DELETE'
  })
  return res.json()
}

// ==================== ATTACHMENTS API ====================

export async function fetchTaskAttachments(taskId) {
  const res = await fetch(`${API_BASE}/tasks/${taskId}/attachments`)
  return res.json()
}

export async function uploadAttachment(taskId, file, uploadedBy, onProgress) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('uploaded_by', uploadedBy)

  const res = await fetch(`${API_BASE}/tasks/${taskId}/attachments`, {
    method: 'POST',
    body: formData
  })
  return res.json()
}

export async function deleteAttachment(attachmentId) {
  const res = await fetch(`${API_BASE}/attachments/${attachmentId}`, {
    method: 'DELETE'
  })
  return res.json()
}
