const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const pool = require('./db');

async function init() {
  const schema = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8');
  await pool.query(schema);
  console.log('Schema applied.');

  const adminEmail = 'admin@campus.edu';
  const { rows } = await pool.query('SELECT id FROM users WHERE email=$1', [adminEmail]);
  if (rows.length === 0) {
    const hash = await bcrypt.hash('admin123', 10);
    await pool.query(
      "INSERT INTO users (name, email, password_hash, skills, is_admin, is_verified) VALUES ('Admin','admin@campus.edu',$1,'',TRUE,TRUE)",
      [hash]
    );
    console.log('Seed admin created: admin@campus.edu / admin123');
  } else {
    console.log('Seed admin already exists.');
  }
  await pool.end();
}

init().catch((e) => { console.error(e); process.exit(1); });
