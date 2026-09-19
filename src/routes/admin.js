const express = require('express');
const pool = require('../db');
const { authRequired, adminRequired } = require('../middleware/auth');
const { notify } = require('../utils/notify');

const router = express.Router();

// GET /api/admin/stats
router.get('/stats', authRequired, adminRequired, async (req, res) => {
  const users = await pool.query('SELECT COUNT(*)::int AS c FROM users');
  const gigs = await pool.query('SELECT COUNT(*)::int AS c FROM gigs');
  const apps = await pool.query('SELECT COUNT(*)::int AS c FROM applications');
  const byCat = await pool.query('SELECT category, COUNT(*)::int AS c FROM gigs GROUP BY category');
  const byStatus = await pool.query('SELECT status, COUNT(*)::int AS c FROM gigs GROUP BY status');
  res.json({ users: users.rows[0].c, gigs: gigs.rows[0].c, applications: apps.rows[0].c, by_category: byCat.rows, by_status: byStatus.rows });
});

// GET /api/admin/users
router.get('/users', authRequired, adminRequired, async (req, res) => {
  const { rows } = await pool.query('SELECT id, name, email, skills, is_admin, is_verified, created_at FROM users ORDER BY created_at DESC');
  res.json(rows);
});

// PUT /api/admin/users/:id/verify { is_verified }
router.put('/users/:id/verify', authRequired, adminRequired, async (req, res) => {
  const { is_verified } = req.body;
  const { rows } = await pool.query('UPDATE users SET is_verified=$1 WHERE id=$2 RETURNING id, name, email, is_verified', [!!is_verified, req.params.id]);
  if (!!is_verified && rows[0]) await notify(rows[0].id, 'system', '✅ Your account is verified! You can now post gigs.');
  res.json(rows[0]);
});

// GET /api/admin/gigs
router.get('/gigs', authRequired, adminRequired, async (req, res) => {
  const { rows } = await pool.query('SELECT g.*, u.name AS poster_name FROM gigs g JOIN users u ON u.id=g.poster_id ORDER BY g.created_at DESC');
  res.json(rows);
});

// GET /api/admin/ratings — latest ratings (overview activity)
router.get('/ratings', authRequired, adminRequired, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT r.*, f.name AS from_name, t.name AS to_name FROM ratings r JOIN users f ON f.id=r.from_id JOIN users t ON t.id=r.to_id ORDER BY r.created_at DESC LIMIT 50'
  );
  res.json(rows);
});

// GET /api/users/:id/public
router.get('/users/:id/public', async (req, res) => {
  const { rows } = await pool.query('SELECT id, name, email, skills, is_verified, created_at FROM users WHERE id=$1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  const r = await pool.query('SELECT ROUND(AVG(score)::numeric,1) AS avg, COUNT(*) AS count FROM ratings WHERE to_id=$1', [req.params.id]);
  const done = await pool.query(
    `SELECT COUNT(DISTINCT a.gig_id)::int AS c FROM applications a WHERE a.applicant_id=$1 AND a.status='accepted'`,
    [req.params.id]
  );
  res.json({ ...rows[0], rating_avg: r.rows[0].avg, rating_count: Number(r.rows[0].count), completed: done.rows[0].c });
});

// GET /api/users/:id/gigs — public posted gigs
router.get('/users/:id/gigs', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM gigs WHERE poster_id=$1 ORDER BY created_at DESC LIMIT 50', [req.params.id]);
  res.json(rows);
});

// GET /api/users/:id/work — gigs where user was accepted (freelance history + earnings)
router.get('/users/:id/work', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT g.id, g.title, g.category, g.budget, g.status, g.deadline, a.status AS app_status
     FROM applications a JOIN gigs g ON g.id=a.gig_id
     WHERE a.applicant_id=$1 AND a.status='accepted' ORDER BY a.created_at DESC LIMIT 50`,
    [req.params.id]
  );
  res.json(rows);
});

module.exports = router;
