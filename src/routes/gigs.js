const express = require('express');
const pool = require('../db');
const { authRequired } = require('../middleware/auth');
const { notify } = require('../utils/notify');

const router = express.Router();

// GET /api/gigs?search=&category=&status=open&min_budget=&max_budget=&sort=latest|budget_asc|budget_desc|deadline
router.get('/', async (req, res) => {
  const { search = '', category = '', status = 'open', min_budget, max_budget, sort = 'latest' } = req.query;
  const conds = [];
  const vals = [];
  if (status) { vals.push(status); conds.push(`g.status=$${vals.length}`); }
  if (category) { vals.push(category); conds.push(`g.category=$${vals.length}`); }
  if (search) { vals.push(`%${search}%`); conds.push(`(g.title ILIKE $${vals.length} OR g.description ILIKE $${vals.length})`); }
  if (min_budget !== undefined && min_budget !== '') { vals.push(Number(min_budget)); conds.push(`g.budget >= $${vals.length}`); }
  if (max_budget !== undefined && max_budget !== '') { vals.push(Number(max_budget)); conds.push(`g.budget <= $${vals.length}`); }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  const order = sort === 'budget_asc' ? 'g.budget ASC' : sort === 'budget_desc' ? 'g.budget DESC' : sort === 'deadline' ? 'g.deadline ASC NULLS LAST' : 'g.created_at DESC';
  const { rows } = await pool.query(
    `SELECT g.*, u.name AS poster_name FROM gigs g JOIN users u ON u.id=g.poster_id ${where} ORDER BY ${order} LIMIT 100`,
    vals
  );
  res.json(rows);
});

// GET /api/gigs/mine (posted by me + applied by me)
router.get('/mine', authRequired, async (req, res) => {
  const posted = await pool.query('SELECT * FROM gigs WHERE poster_id=$1 ORDER BY created_at DESC', [req.user.id]);
  const applied = await pool.query(
    `SELECT g.*, a.status AS my_app_status FROM applications a JOIN gigs g ON g.id=a.gig_id WHERE a.applicant_id=$1 ORDER BY a.created_at DESC`,
    [req.user.id]
  );
  res.json({ posted: posted.rows, applied: applied.rows });
});

// GET /api/gigs/:id (with applications + messages + ratings)
router.get('/:id', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT g.*, u.name AS poster_name FROM gigs g JOIN users u ON u.id=g.poster_id WHERE g.id=$1',
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Gig not found' });
  res.json(rows[0]);
});

// POST /api/gigs
router.post('/', authRequired, async (req, res) => {
  const { title, category, budget, deadline, description } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const { rows } = await pool.query(
    'INSERT INTO gigs (poster_id, title, category, budget, deadline, description) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [req.user.id, title, category || 'General', Number(budget) || 0, deadline || null, description || '']
  );
  res.status(201).json(rows[0]);
});

// PUT /api/gigs/:id/status -> open|assigned|completed (poster only)
router.put('/:id/status', authRequired, async (req, res) => {
  const { status } = req.body;
  if (!['open', 'assigned', 'completed'].includes(status)) return res.status(400).json({ error: 'bad status' });
  const g = await pool.query('SELECT * FROM gigs WHERE id=$1', [req.params.id]);
  if (!g.rows[0]) return res.status(404).json({ error: 'Not found' });
  if (g.rows[0].poster_id !== req.user.id) return res.status(403).json({ error: 'Only poster can change status' });
  const { rows } = await pool.query('UPDATE gigs SET status=$1 WHERE id=$2 RETURNING *', [status, req.params.id]);
  if (status === 'completed') {
    const acc = await pool.query("SELECT DISTINCT applicant_id FROM applications WHERE gig_id=$1 AND status='accepted'", [req.params.id]);
    for (const r of acc.rows) await notify(r.applicant_id, 'gig', `Gig "${rows[0].title}" marked completed / Paid 💰`, req.params.id);
  }
  res.json(rows[0]);
});

// DELETE /api/gigs/:id (poster or admin)
router.delete('/:id', authRequired, async (req, res) => {
  const g = await pool.query('SELECT * FROM gigs WHERE id=$1', [req.params.id]);
  if (!g.rows[0]) return res.status(404).json({ error: 'Not found' });
  if (g.rows[0].poster_id !== req.user.id && !req.user.is_admin) return res.status(403).json({ error: 'Not allowed' });
  await pool.query('DELETE FROM gigs WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
