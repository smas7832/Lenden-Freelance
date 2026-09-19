const express = require('express');
const pool = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications?unread=1 — latest 30, newest first
router.get('/', authRequired, async (req, res) => {
  const vals = [req.user.id];
  let cond = '';
  if (req.query.unread === '1') cond = 'AND is_read=FALSE';
  const { rows } = await pool.query(
    `SELECT * FROM notifications WHERE user_id=$1 ${cond} ORDER BY created_at DESC LIMIT 30`,
    vals
  );
  const c = await pool.query('SELECT COUNT(*)::int AS c FROM notifications WHERE user_id=$1 AND is_read=FALSE', [req.user.id]);
  res.json({ unread: c.rows[0].c, items: rows });
});

// PUT /api/notifications/read-all
router.put('/read-all', authRequired, async (req, res) => {
  await pool.query('UPDATE notifications SET is_read=TRUE WHERE user_id=$1', [req.user.id]);
  res.json({ ok: true });
});

// PUT /api/notifications/:id/read
router.put('/:id/read', authRequired, async (req, res) => {
  await pool.query('UPDATE notifications SET is_read=TRUE WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  res.json({ ok: true });
});

module.exports = router;
