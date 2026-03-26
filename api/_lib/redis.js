import { Redis } from '@upstash/redis';

let redis = null;

export function getRedis() {
  if (!redis) {
    // Try different environment variable patterns
    const url = process.env.KV_REST_API_URL || process.env.STORAGE_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.STORAGE_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

    if (url && token) {
      redis = new Redis({ url, token });
    }
  }
  return redis;
}

export const defaultData = {
  status: 'inprogress',
  currentProjects: [],
  otherProjects: [],
  blockers: [],
  completedTasks: [],
  nwgHours: 0,
  nwgTarget: 16,
  handoverDocs: [],
  note: '',
  lastUpdated: new Date().toISOString()
};

export async function getData() {
  const r = getRedis();
  if (r) {
    const data = await r.get('standup-data');
    return data || defaultData;
  }
  return defaultData;
}

export async function setData(data) {
  data.lastUpdated = new Date().toISOString();
  const r = getRedis();
  if (r) {
    await r.set('standup-data', data);
  }
  return data;
}

export function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // Prevent caching so Maria always gets fresh data
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}
