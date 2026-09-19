const express = require('express');
const pool = require('../db');
const { authRequired } = require('../middleware/auth');
const { notify } = require('../utils/notify');

const router = express.Router();

// POST /api/ratings { gig_id, to_id, score, comment }
router.post('/', authRequired, async (req, res) => {
  const { gig_id, to_id, score, comment } = req.body;
  if (!gig_id || !to_id || !score) return res.status(400).json({ error: 'gig_id, to_id, score required' });
  if (score < 1 || score > 5) return res.status(400).json({ error: 'score 1-5' });
  const { rows } = await pool.query(
    'INSERT INTO ratings (gig_id, from_id, to_id, score, comment) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [gig_id, req.user.id, to_id, score, comment || '']
  );
  await notify(to_id, 'rating', `⭐ You got a ${score}★ rating!`, gig_id);
  res.status(201).json(rows[0]);
});

// GET /api/ratings/user/:id
router.get('/user/:id', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT r.*, f.name AS from_name FROM ratings r JOIN users f ON f.id=r.from_id WHERE r.to_id=$1 ORDER BY r.created_at DESC',
    [req.params.id]
  );
  res.json(rows);
});

module.exports = router;
