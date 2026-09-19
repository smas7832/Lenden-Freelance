const pool = require('../db');

// Fire-and-forget in-app notification (never throws)
async function notify(userId, type, title, gigId = null) {
  if (!userId) return;
  try {
    await pool.query(
      'INSERT INTO notifications (user_id, type, title, gig_id) VALUES ($1,$2,$3,$4)',
      [userId, type, title, gigId]
    );
  } catch (e) {
    console.error('notify failed:', e.message);
  }
}

module.exports = { notify };
