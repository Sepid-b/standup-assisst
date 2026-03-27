import { createClient } from '@supabase/supabase-js';

let supabase = null;

export function getSupabase() {
  if (!supabase) {
    const url = process.env.SUPABASE_URL || 'https://tfiidornnjexkxyrkgcq.supabase.co';
    const key = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmaWlkb3JubmpleGt4eXJrZ2NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzUwMjcsImV4cCI6MjA4OTk1MTAyN30.75QQbQiROHmPmcuaGxhd9ii2PTekTPc6o7fFHfr4ALY';
    supabase = createClient(url, key);
  }
  return supabase;
}

export function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}
