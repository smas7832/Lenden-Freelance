const express = require('express');
const pool = require('../db');
const { authRequired } = require('../middleware/auth');
const { notify } = require('../utils/notify');

const router = express.Router();

// POST /api/gigs/:id/apply
router.post('/gigs/:id/apply', authRequired, async (req, res) => {
  const gigId = req.params.id;
  const { proposal } = req.body;
  if (!proposal) return res.status(400).json({ error: 'proposal required' });
  const g = await pool.query('SELECT * FROM gigs WHERE id=$1', [gigId]);
  if (!g.rows[0]) return res.status(404).json({ error: 'Gig not found' });
  if (g.rows[0].poster_id === req.user.id) return res.status(400).json({ error: 'Cannot apply to own gig' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO applications (gig_id, applicant_id, proposal) VALUES ($1,$2,$3) RETURNING *',
      [gigId, req.user.id, proposal]
    );
    const me = await pool.query('SELECT name FROM users WHERE id=$1', [req.user.id]);
    await notify(g.rows[0].poster_id, 'application', `${me.rows[0]?.name || 'Someone'} applied: ${g.rows[0].title}`, gigId);
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Already applied' });
    throw e;
  }
});

// GET /api/gigs/:id/applications (poster only)
router.get('/gigs/:id/applications', authRequired, async (req, res) => {
  const g = await pool.query('SELECT * FROM gigs WHERE id=$1', [req.params.id]);
  if (!g.rows[0]) return res.status(404).json({ error: 'Not found' });
  if (g.rows[0].poster_id !== req.user.id && !req.user.is_admin) return res.status(403).json({ error: 'Only poster' });
  const { rows } = await pool.query(
    'SELECT a.*, u.name AS applicant_name, u.skills FROM applications a JOIN users u ON u.id=a.applicant_id WHERE a.gig_id=$1 ORDER BY a.created_at',
    [req.params.id]
  );
  res.json(rows);
});

// PUT /api/applications/:id -> accept/reject (poster of that gig only)
router.put('/applications/:id', authRequired, async (req, res) => {
  const { status } = req.body;
  if (!['accepted', 'rejected'].includes(status)) return res.status(400).json({ error: 'bad status' });
  const a = await pool.query('SELECT a.*, g.poster_id FROM applications a JOIN gigs g ON g.id=a.gig_id WHERE a.id=$1', [req.params.id]);
  if (!a.rows[0]) return res.status(404).json({ error: 'Not found' });
  if (a.rows[0].poster_id !== req.user.id) return res.status(403).json({ error: 'Only poster' });
  const { rows } = await pool.query('UPDATE applications SET status=$1 WHERE id=$2 RETURNING *', [status, req.params.id]);
  if (status === 'accepted') {
    await pool.query("UPDATE gigs SET status='assigned' WHERE id=$1 AND status='open'", [a.rows[0].gig_id]);
  }
  const gg = await pool.query('SELECT title FROM gigs WHERE id=$1', [a.rows[0].gig_id]);
  await notify(a.rows[0].applicant_id, 'application', `Your application for "${gg.rows[0]?.title || 'gig'}" was ${status}`, a.rows[0].gig_id);
  res.json(rows[0]);
});

// GET /api/applications/mine
router.get('/applications/mine/list', authRequired, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT a.*, g.title FROM applications a JOIN gigs g ON g.id=a.gig_id WHERE a.applicant_id=$1 ORDER BY a.created_at DESC',
    [req.user.id]
  );
  res.json(rows);
});

module.exports = router;
