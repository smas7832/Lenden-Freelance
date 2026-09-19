const express = require('express');
const pool = require('../db');
const { authRequired } = require('../middleware/auth');
const { notify } = require('../utils/notify');

const router = express.Router();

// GET /api/gigs/:id/messages
router.get('/gigs/:id/messages', authRequired, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT m.*, u.name AS sender_name FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.gig_id=$1 ORDER BY m.created_at LIMIT 200',
    [req.params.id]
  );
  res.json(rows);
});

// POST /api/gigs/:id/messages
router.post('/gigs/:id/messages', authRequired, async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  const { rows } = await pool.query(
    'INSERT INTO messages (gig_id, sender_id, text) VALUES ($1,$2,$3) RETURNING *',
    [req.params.id, req.user.id, text]
  );
  const g = await pool.query('SELECT poster_id FROM gigs WHERE id=$1', [req.params.id]);
  if (g.rows[0]) {
    const others = new Set();
    if (g.rows[0].poster_id !== req.user.id) others.add(g.rows[0].poster_id);
    const ap = await pool.query('SELECT DISTINCT applicant_id FROM applications WHERE gig_id=$1', [req.params.id]);
    ap.rows.forEach((r) => { if (r.applicant_id !== req.user.id) others.add(r.applicant_id); });
    const me2 = await pool.query('SELECT name FROM users WHERE id=$1', [req.user.id]);
    for (const uid of others) await notify(uid, 'message', `💬 ${me2.rows[0]?.name || 'Someone'}: ${text.slice(0, 60)}`, req.params.id);
  }
  res.status(201).json(rows[0]);
});

// GET /api/notifications — simple: apps on my gigs + my app status + new messages
router.get('/notifications/list', authRequired, async (req, res) => {
  const appsOnMine = await pool.query(
    `SELECT a.id, a.status, a.created_at, g.title, g.id AS gig_id, u.name AS applicant_name
     FROM applications a JOIN gigs g ON g.id=a.gig_id JOIN users u ON u.id=a.applicant_id
     WHERE g.poster_id=$1 ORDER BY a.created_at DESC LIMIT 10`,
    [req.user.id]
  );
  const myApps = await pool.query(
    `SELECT a.id, a.status, a.created_at, g.title, g.id AS gig_id
     FROM applications a JOIN gigs g ON g.id=a.gig_id
     WHERE a.applicant_id=$1 ORDER BY a.created_at DESC LIMIT 10`,
    [req.user.id]
  );
  res.json({ on_my_gigs: appsOnMine.rows, my_applications: myApps.rows });
});

module.exports = router;
