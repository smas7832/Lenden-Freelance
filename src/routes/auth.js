const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();
const sign = (u) => jwt.sign(
  { id: u.id, email: u.email, is_admin: u.is_admin },
  process.env.JWT_SECRET || 'dev_secret',
  { expiresIn: '7d' }
);

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { name, email, password, skills } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users (name, email, password_hash, skills) VALUES ($1,$2,$3,$4) RETURNING id, name, email, skills, is_admin, is_verified',
      [name, email.toLowerCase().trim(), hash, skills || '']
    );
    res.json({ user: rows[0], token: sign(rows[0]) });
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Email already registered' });
    res.status(500).json({ error: 'Signup failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email, password required' });
  const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email.toLowerCase().trim()]);
  const u = rows[0];
  if (!u) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, u.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const { password_hash, ...safe } = u;
  res.json({ user: safe, token: sign(u) });
});

// GET /api/auth/me
const { authRequired } = require('../middleware/auth');
router.get('/me', authRequired, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, name, email, skills, is_admin, is_verified, created_at FROM users WHERE id=$1',
    [req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  // avg rating
  const r = await pool.query('SELECT ROUND(AVG(score)::numeric,1) AS avg, COUNT(*) AS count FROM ratings WHERE to_id=$1', [req.user.id]);
  res.json({ ...rows[0], rating_avg: r.rows[0].avg, rating_count: Number(r.rows[0].count) });
});

// PUT /api/auth/me (update name/skills)
router.put('/me', authRequired, async (req, res) => {
  const { name, skills } = req.body;
  const { rows } = await pool.query(
    'UPDATE users SET name=COALESCE($1,name), skills=COALESCE($2,skills) WHERE id=$3 RETURNING id, name, email, skills, is_admin, is_verified',
    [name || null, skills ?? null, req.user.id]
  );
  res.json(rows[0]);
});

module.exports = router;
