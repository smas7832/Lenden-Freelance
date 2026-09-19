/* shared helpers */
const API = '';
const getToken = () => localStorage.getItem('token');
const authHeaders = () => ({ 'Content-Type': 'application/json', ...(getToken() ? { Authorization: 'Bearer ' + getToken() } : {}) });
async function api(path, opts = {}) {
  const r = await fetch(API + path, { ...opts, headers: { ...authHeaders(), ...(opts.headers || {}) } });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'Request failed');
  return data;
}
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function currentUser() { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } }
function logout() { localStorage.removeItem('token'); localStorage.removeItem('user'); location.href = '/index.html'; }
function requireLogin() { if (!getToken()) location.href = '/index.html'; }
function toast(msg, type = '') {
  const box = document.getElementById('toasts') || (() => { const d = document.createElement('div'); d.id = 'toasts'; document.body.appendChild(d); return d; })();
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}
function catBadge(c) { return `<span class="badge b-${esc(c || 'General')}">${esc(c || 'General')}</span>`; }
function statusBadge(s) { return `<span class="badge st-${esc(s)}">${esc(s)}</span>`; }
function stars(n) { n = Math.round(Number(n) || 0); return `<span class="stars">${'★'.repeat(n)}${'☆'.repeat(Math.max(0, 5 - n))}</span>`; }
function deadlineBadge(dl, status) {
  if (!dl || status === 'completed') return '';
  const days = Math.ceil((new Date(dl) - Date.now()) / 864e5);
  if (days < 0) return `<span class="badge" style="background:#fee2e2;color:#991b1b">⏰ Overdue</span>`;
  if (days <= 2) return `<span class="badge" style="background:#fef3c7;color:#92400e">🔥 ${days}d left</span>`;
  return `<span class="badge" style="background:#f1f5f9;color:#475569">📅 ${days}d left</span>`;
}
function timeAgo(d) {
  if (!d) return '';
  const s = (Date.now() - new Date(d)) / 1e3;
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  const days = Math.floor(s / 86400);
  if (days < 30) return days + 'd ago';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
const CAT_ICON = { Tutoring: '📐', Design: '🎨', Coding: '</>', Writing: '✏️', General: '📌' };
function setUserChips() {
  const u = currentUser();
  document.querySelectorAll('[data-user]').forEach((el) => { el.textContent = u ? u.name : ''; });
  document.querySelectorAll('[data-av]').forEach((el) => { el.textContent = u ? (u.name || 'S')[0].toUpperCase() : '?'; });
}
