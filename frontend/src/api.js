import axios from 'axios';

const BASE = '/api';

export const getStatus = () => axios.get(`${BASE}/status`).then(r => r.data);
export const updateStatus = (patch) => axios.put(`${BASE}/status`, patch).then(r => r.data);
export const updateProjects = (projects) => axios.put(`${BASE}/projects`, { projects }).then(r => r.data);
export const addBlocker = (text) => axios.post(`${BASE}/blockers`, { text }).then(r => r.data);
export const removeBlocker = (id) => axios.delete(`${BASE}/blockers/${id}`).then(r => r.data);
export const completeTask = (name) => axios.post(`${BASE}/tasks/complete`, { name }).then(r => r.data);
export const updateNwg = (hours) => axios.put(`${BASE}/nwg`, { hours }).then(r => r.data);
export const updateNote = (note) => axios.put(`${BASE}/note`, { note }).then(r => r.data);
export const addDoc = (doc) => axios.post(`${BASE}/docs`, doc).then(r => r.data);
export const removeDoc = (id) => axios.delete(`${BASE}/docs/${id}`).then(r => r.data);
