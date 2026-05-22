import express from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'

const app = express()
app.use(cors())
app.use(express.json())

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

  // Get comment counts for all tasks
  const taskIds = data.map(t => t.id)
  if (taskIds.length > 0) {
    const { data: commentCounts } = await supabase
      .from('pm_task_comments')
      .select('task_id')
      .in('task_id', taskIds)

    const countMap = {}
    commentCounts?.forEach(c => {
      countMap[c.task_id] = (countMap[c.task_id] || 0) + 1
    })

    data.forEach(task => {
      task.comment_count = countMap[task.id] || 0
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
