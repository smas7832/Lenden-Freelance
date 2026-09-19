const express = require('express');
const pool = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// GET /api/bookmarks — my saved gigs
router.get('/', authRequired, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT g.*, u.name AS poster_name, b.created_at AS saved_at FROM bookmarks b
     JOIN gigs g ON g.id=b.gig_id JOIN users u ON u.id=g.poster_id
     WHERE b.user_id=$1 ORDER BY b.created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
});

// POST /api/bookmarks/:gigId — save
router.post('/:gigId', authRequired, async (req, res) => {
  const { rows } = await pool.query('SELECT id FROM gigs WHERE id=$1', [req.params.gigId]);
  if (!rows[0]) return res.status(404).json({ error: 'Gig not found' });
  await pool.query(
    'INSERT INTO bookmarks (user_id, gig_id) VALUES ($1,$2) ON CONFLICT (user_id, gig_id) DO NOTHING',
    [req.user.id, req.params.gigId]
  );
  res.status(201).json({ ok: true });
});

// DELETE /api/bookmarks/:gigId — unsave
router.delete('/:gigId', authRequired, async (req, res) => {
  await pool.query('DELETE FROM bookmarks WHERE user_id=$1 AND gig_id=$2', [req.user.id, req.params.gigId]);
  res.json({ ok: true });
});

// GET /api/bookmarks/ids — saved gig id set (for hearts)
router.get('/ids/set', authRequired, async (req, res) => {
  const { rows } = await pool.query('SELECT gig_id FROM bookmarks WHERE user_id=$1', [req.user.id]);
  res.json(rows.map((r) => r.gig_id));
});

module.exports = router;
