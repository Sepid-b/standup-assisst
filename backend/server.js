import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { createClient } from '@supabase/supabase-js'

const app = express()
app.use(cors())
app.use(express.json())

// Multer setup for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
})

// Tag colors for auto-assignment
const TAG_COLORS = ['#a259ff', '#f0b95a', '#e74c3c', '#2ecc71', '#5dade2', '#7c6bf0', '#e84393', '#f39c12']

const supabase = createClient(
  'https://tfiidornnjexkxyrkgcq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmaWlkb3JubmpleGt4eXJrZ2NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzUwMjcsImV4cCI6MjA4OTk1MTAyN30.75QQbQiROHmPmcuaGxhd9ii2PTekTPc6o7fFHfr4ALY'
)

// GET /api/members - all members
app.get('/api/members', async (req, res) => {
  const { data, error } = await supabase
    .from('pm_members')
    .select('*')
    .order('created_at')
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// GET /api/projects - projects where member is in pm_project_members
app.get('/api/projects', async (req, res) => {
  const { member_id } = req.query
  let query = supabase.from('pm_projects').select('*')

  if (member_id) {
    const { data: memberProjects } = await supabase
      .from('pm_project_members')
      .select('project_id')
      .eq('member_id', member_id)
    const projectIds = memberProjects?.map(p => p.project_id) || []
    if (projectIds.length > 0) {
      query = query.in('id', projectIds)
    } else {
      return res.json([])
    }
  }

  const { data, error } = await query.order('created_at')
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// POST /api/projects - create project + add member_ids to pm_project_members
app.post('/api/projects', async (req, res) => {
  const { name, color, description, budget_hours, member_ids } = req.body

  const { data: project, error: projectError } = await supabase
    .from('pm_projects')
    .insert({ name, color, description, budget_hours })
    .select()
    .single()

  if (projectError) return res.status(500).json({ error: projectError.message })

  if (member_ids?.length > 0) {
    const memberships = member_ids.map(member_id => ({
      project_id: project.id,
      member_id
    }))
    await supabase.from('pm_project_members').insert(memberships)
  }

  res.json(project)
})

// GET /api/tasks - tasks visible to member (their projects + unassigned)
app.get('/api/tasks', async (req, res) => {
  const { member_id, project_id, status } = req.query

  let query = supabase
    .from('pm_tasks')
    .select(`
      *,
      assignee:pm_members!pm_tasks_assignee_id_fkey(*),
      creator:pm_members!pm_tasks_created_by_fkey(*),
      project:pm_projects(*)
    `)

  if (project_id) {
    query = query.eq('project_id', project_id)
  }

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query.order('sort_order').order('created_at', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })

  // Get comment counts and tags for all tasks
  const taskIds = data.map(t => t.id)
  if (taskIds.length > 0) {
    // Get comment counts
    const { data: commentCounts } = await supabase
      .from('pm_task_comments')
      .select('task_id')
      .in('task_id', taskIds)

    const countMap = {}
    commentCounts?.forEach(c => {
      countMap[c.task_id] = (countMap[c.task_id] || 0) + 1
    })

    // Get tags for all tasks
    const { data: taskTags } = await supabase
      .from('pm_task_tags')
      .select('task_id, pm_tags(*)')
      .in('task_id', taskIds)

    const tagsMap = {}
    taskTags?.forEach(tt => {
      if (!tagsMap[tt.task_id]) tagsMap[tt.task_id] = []
      tagsMap[tt.task_id].push(tt.pm_tags)
    })

    // Get docs count for all tasks
    const { data: docsCounts } = await supabase
      .from('pm_docs')
      .select('task_id')
      .in('task_id', taskIds)

    const docsCountMap = {}
    docsCounts?.forEach(d => {
      docsCountMap[d.task_id] = (docsCountMap[d.task_id] || 0) + 1
    })

    data.forEach(task => {
      task.comment_count = countMap[task.id] || 0
      task.tags = tagsMap[task.id] || []
      task.docs_count = docsCountMap[task.id] || 0
    })
  }

  res.json(data)
})

// POST /api/tasks - create task, log to pm_activity_log
app.post('/api/tasks', async (req, res) => {
  const { title, description, status, priority, assignee_id, created_by, project_id, due_date } = req.body

  const { data: task, error } = await supabase
    .from('pm_tasks')
    .insert({ title, description, status, priority, assignee_id, created_by, project_id, due_date })
    .select(`
      *,
      assignee:pm_members!pm_tasks_assignee_id_fkey(*),
      creator:pm_members!pm_tasks_created_by_fkey(*),
      project:pm_projects(*)
    `)
    .single()

  if (error) return res.status(500).json({ error: error.message })

  // New tasks have 0 comments
  task.comment_count = 0

  // Log activity
  await supabase.from('pm_activity_log').insert({
    member_id: created_by,
    task_id: task.id,
    project_id,
    action: 'created_task',
    details: { title }
  })

  res.json(task)
})

// PUT /api/tasks/:id - update task
app.put('/api/tasks/:id', async (req, res) => {
  const { id } = req.params
  const updates = { ...req.body, updated_at: new Date().toISOString() }

  // If status changed to done, set completed_at
  if (updates.status === 'done') {
    updates.completed_at = new Date().toISOString()
  } else if (updates.status && updates.status !== 'done') {
    updates.completed_at = null
  }

  const { data: task, error } = await supabase
    .from('pm_tasks')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      assignee:pm_members!pm_tasks_assignee_id_fkey(*),
      creator:pm_members!pm_tasks_created_by_fkey(*),
      project:pm_projects(*)
    `)
    .single()

  if (error) return res.status(500).json({ error: error.message })

  // Get comment count for this task
  const { data: commentData } = await supabase
    .from('pm_task_comments')
    .select('id')
    .eq('task_id', id)
  task.comment_count = commentData?.length || 0

  // Log activity
  if (updates.status) {
    await supabase.from('pm_activity_log').insert({
      member_id: updates.updated_by || task.assignee_id,
      task_id: id,
      project_id: task.project_id,
      action: 'status_changed',
      details: { status: updates.status }
    })
  }

  res.json(task)
})

// DELETE /api/tasks/:id
app.delete('/api/tasks/:id', async (req, res) => {
  const { id } = req.params
  const { error } = await supabase.from('pm_tasks').delete().eq('id', id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

// GET /api/tasks/:id/comments - get all comments for a task
app.get('/api/tasks/:id/comments', async (req, res) => {
  const { id } = req.params

  const { data, error } = await supabase
    .from('pm_task_comments')
    .select(`
      *,
      member:pm_members(id, name, avatar_letter, avatar_color)
    `)
    .eq('task_id', id)
    .order('created_at', { ascending: true })

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// POST /api/tasks/:id/comments - add a comment to a task
app.post('/api/tasks/:id/comments', async (req, res) => {
  const { id } = req.params
  const { member_id, content } = req.body

  const { data, error } = await supabase
    .from('pm_task_comments')
    .insert({ task_id: id, member_id, content })
    .select(`
      *,
      member:pm_members(id, name, avatar_letter, avatar_color)
    `)
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// ==================== TAGS ENDPOINTS ====================

// GET /api/tags - all tags ordered by name
app.get('/api/tags', async (req, res) => {
  const { data, error } = await supabase
    .from('pm_tags')
    .select('*')
    .order('name')
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// POST /api/tags - create new tag with auto-assigned color
app.post('/api/tags', async (req, res) => {
  const { name, color, created_by } = req.body

  // Auto-assign color if not provided
  let tagColor = color
  if (!tagColor) {
    const { data: existingTags } = await supabase.from('pm_tags').select('id')
    const colorIndex = (existingTags?.length || 0) % TAG_COLORS.length
    tagColor = TAG_COLORS[colorIndex]
  }

  const { data, error } = await supabase
    .from('pm_tags')
    .insert({ name, color: tagColor, created_by })
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// GET /api/tasks/:id/tags - tags on this task
app.get('/api/tasks/:id/tags', async (req, res) => {
  const { id } = req.params
  const { data, error } = await supabase
    .from('pm_task_tags')
    .select('tag_id, pm_tags(*)')
    .eq('task_id', id)
  if (error) return res.status(500).json({ error: error.message })
  res.json(data.map(row => row.pm_tags))
})

// POST /api/tasks/:id/tags - add tag to task
app.post('/api/tasks/:id/tags', async (req, res) => {
  const { id } = req.params
  const { tag_id } = req.body
  const { data, error } = await supabase
    .from('pm_task_tags')
    .insert({ task_id: id, tag_id })
    .select('tag_id, pm_tags(*)')
    .single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data.pm_tags)
})

// DELETE /api/tasks/:id/tags/:tag_id - remove tag from task
app.delete('/api/tasks/:id/tags/:tag_id', async (req, res) => {
  const { id, tag_id } = req.params
  const { error } = await supabase
    .from('pm_task_tags')
    .delete()
    .eq('task_id', id)
    .eq('tag_id', tag_id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

// ==================== DOCS ENDPOINTS ====================

// GET /api/tasks/:id/docs - docs for this task
app.get('/api/tasks/:id/docs', async (req, res) => {
  const { id } = req.params
  const { data, error } = await supabase
    .from('pm_docs')
    .select('*')
    .eq('task_id', id)
    .order('created_at')
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// POST /api/tasks/:id/docs - add doc
app.post('/api/tasks/:id/docs', async (req, res) => {
  const { id } = req.params
  const { title, url, added_by } = req.body
  const { data, error } = await supabase
    .from('pm_docs')
    .insert({ task_id: id, title, url, added_by })
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// DELETE /api/docs/:id - delete a doc
app.delete('/api/docs/:id', async (req, res) => {
  const { id } = req.params
  const { error } = await supabase.from('pm_docs').delete().eq('id', id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

// ==================== ATTACHMENTS ENDPOINTS ====================

// GET /api/tasks/:id/attachments - attachments for this task
app.get('/api/tasks/:id/attachments', async (req, res) => {
  const { id } = req.params
  const { data, error } = await supabase
    .from('pm_attachments')
    .select('*, uploader:pm_members!pm_attachments_uploaded_by_fkey(id, name, avatar_letter, avatar_color)')
    .eq('task_id', id)
    .order('created_at')
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// POST /api/tasks/:id/attachments - upload file to storage and save record
app.post('/api/tasks/:id/attachments', upload.single('file'), async (req, res) => {
  const { id } = req.params
  const { uploaded_by } = req.body
  const file = req.file

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' })
  }

  try {
    // Generate unique filename
    const timestamp = Date.now()
    const filename = `${id}/${timestamp}-${file.originalname}`

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('task-attachments')
      .upload(filename, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      })

    if (uploadError) {
      return res.status(500).json({ error: uploadError.message })
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('task-attachments')
      .getPublicUrl(filename)

    // Save attachment record to database
    const { data, error } = await supabase
      .from('pm_attachments')
      .insert({
        task_id: id,
        name: file.originalname,
        size_bytes: file.size,
        mime_type: file.mimetype,
        url: urlData.publicUrl,
        uploaded_by
      })
      .select('*, uploader:pm_members!pm_attachments_uploaded_by_fkey(id, name, avatar_letter, avatar_color)')
      .single()

    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/attachments/:id - delete from storage and database
app.delete('/api/attachments/:id', async (req, res) => {
  const { id } = req.params

  // First get the attachment to find the file path
  const { data: attachment, error: fetchError } = await supabase
    .from('pm_attachments')
    .select('url')
    .eq('id', id)
    .single()

  if (fetchError) return res.status(500).json({ error: fetchError.message })

  // Extract file path from URL
  if (attachment?.url) {
    const urlParts = attachment.url.split('/task-attachments/')
    if (urlParts[1]) {
      await supabase.storage.from('task-attachments').remove([urlParts[1]])
    }
  }

  // Delete the database record
  const { error } = await supabase.from('pm_attachments').delete().eq('id', id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

// ==================== STANDUP ENDPOINTS ====================

// GET /api/standups/vibes - all members' vibe for today
app.get('/api/standups/vibes', async (req, res) => {
  const today = new Date().toISOString().split('T')[0]

  const { data: members } = await supabase
    .from('pm_members')
    .select('*')
    .order('created_at')

  const { data: standups } = await supabase
    .from('pm_standups')
    .select('*')
    .eq('date', today)

  const vibeMap = {}
  standups?.forEach(s => { vibeMap[s.member_id] = s.vibe })

  const result = members?.map(m => ({
    ...m,
    vibe: vibeMap[m.id] || 3
  })) || []

  res.json(result)
})

// PUT /api/standups/vibe - upsert today's standup vibe
app.put('/api/standups/vibe', async (req, res) => {
  const { member_id, vibe } = req.body
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('pm_standups')
    .upsert({ member_id, date: today, vibe }, { onConflict: 'member_id,date' })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`)
})
