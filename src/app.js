const express = require('express');
const path = require('path');
const pool = require('./db');

const app = express();
app.use(express.json());
const cors = require('cors');
app.use(cors());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', async (req, res) => {
  try { await pool.query('SELECT 1'); res.json({ ok: true }); }
  catch { res.status(500).json({ ok: false }); }
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/gigs', require('./routes/gigs'));
app.use('/api', require('./routes/applications')); // /api/gigs/:id/apply, /api/applications/:id
app.use('/api', require('./routes/messages')); // /api/gigs/:id/messages + /api/notifications/list
app.use('/api/ratings', require('./routes/ratings'));
app.use('/api/bookmarks', require('./routes/bookmarks'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api', require('./routes/admin')); // /api/users/:id/public + /api/users/:id/gigs

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

module.exports = app;
