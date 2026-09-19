const express = require('express');
const pool = require('../db');
const { authRequired, adminRequired } = require('../middleware/auth');

const router = express.Router();

// POST /api/reports { target_type: gig|user, target_id, reason }
router.post('/', authRequired, async (req, res) => {
  const { target_type, target_id, reason } = req.body;
  if (!['gig', 'user'].includes(target_type) || !target_id || !reason) {
    return res.status(400).json({ error: 'target_type (gig|user), target_id, reason required' });
  }
  const { rows } = await pool.query(
    'INSERT INTO reports (reporter_id, target_type, target_id, reason) VALUES ($1,$2,$3,$4) RETURNING *',
    [req.user.id, target_type, target_id, reason]
  );
  res.status(201).json(rows[0]);
});

// GET /api/reports?status=open (admin)
router.get('/', authRequired, adminRequired, async (req, res) => {
  const { status } = req.query;
  const vals = [];
  let where = '';
  if (status) { vals.push(status); where = `WHERE r.status=$1`; }
  const { rows } = await pool.query(
    `SELECT r.*, u.name AS reporter_name FROM reports r JOIN users u ON u.id=r.reporter_id ${where} ORDER BY r.created_at DESC LIMIT 100`,
    vals
  );
  res.json(rows);
});

// PUT /api/reports/:id { status: open|reviewed|resolved } (admin)
router.put('/:id', authRequired, adminRequired, async (req, res) => {
  const { status } = req.body;
  if (!['open', 'reviewed', 'resolved'].includes(status)) return res.status(400).json({ error: 'bad status' });
  const { rows } = await pool.query('UPDATE reports SET status=$1 WHERE id=$2 RETURNING *', [status, req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

module.exports = router;
