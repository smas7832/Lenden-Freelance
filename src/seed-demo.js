require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./db');

const USERS = [
  { name: 'Priya Sharma', email: 'priya@campus.edu', skills: 'Python, Tutoring' },
  { name: 'Rahul Verma', email: 'rahul@campus.edu', skills: 'Figma, Logo Design' },
  { name: 'Neha Patel', email: 'neha@campus.edu', skills: 'Content Writing, English' },
  { name: 'Amit Kumar', email: 'amit@campus.edu', skills: 'HTML, CSS, JavaScript' },
  { name: 'Pooja Singh', email: 'pooja@campus.edu', skills: 'Maths, Statistics' },
  { name: 'Karan Mehta', email: 'karan@campus.edu', skills: 'Photo Editing, Canva' },
];

const GIGS = [
  { by: 'priya@campus.edu', title: 'Python loops + OOP tutoring', category: 'Tutoring', budget: 500, description: '2 sessions, loops + OOP with practice problems. 3 days.', status: 'open' },
  { by: 'rahul@campus.edu', title: 'Fest logo needed', category: 'Design', budget: 800, description: 'Modern flat logo for college fest + Instagram post. 4 days.', status: 'open' },
  { by: 'amit@campus.edu', title: 'Resume portfolio website', category: 'Coding', budget: 1500, description: 'Single page portfolio, mobile responsive, contact form. 1 week.', status: 'open' },
  { by: 'pooja@campus.edu', title: 'Maths assignment help', category: 'Tutoring', budget: 300, description: 'Probability + matrices, 10 questions with steps. 2 days.', status: 'open' },
  { by: 'neha@campus.edu', title: 'Blog article on AI in education', category: 'Writing', budget: 400, description: '800 words, original, with references. 3 days.', status: 'assigned' },
  { by: 'karan@campus.edu', title: 'Event photo editing (50 pics)', category: 'Design', budget: 600, description: 'Lightroom color correction + crop for fest photos. 5 days.', status: 'assigned' },
  { by: 'priya@campus.edu', title: 'Java mini project help', category: 'Coding', budget: 1200, description: 'Library management console app with MySQL. 1 week.', status: 'completed' },
  { by: 'amit@campus.edu', title: 'Club poster design', category: 'Design', budget: 700, description: 'A3 poster + WhatsApp forward version. Done last week.', status: 'completed' },
];

async function main() {
  const hash = await bcrypt.hash('pass123', 10);
  const ids = {};
  for (const u of USERS) {
    await pool.query(
      'INSERT INTO users (name, email, password_hash, skills, is_verified) VALUES ($1,$2,$3,$4,TRUE) ON CONFLICT (email) DO NOTHING',
      [u.name, u.email, hash, u.skills]
    );
    const { rows } = await pool.query('SELECT id FROM users WHERE email=$1', [u.email]);
    ids[u.email] = rows[0].id;
  }
  console.log('Users ready:', Object.keys(ids).length);

  const gigIds = {};
  for (const g of GIGS) {
    const ex = await pool.query('SELECT id FROM gigs WHERE title=$1', [g.title]);
    if (ex.rows.length) { gigIds[g.title] = ex.rows[0].id; continue; }
    const { rows } = await pool.query(
      'INSERT INTO gigs (poster_id, title, category, budget, deadline, description, status) VALUES ($1,$2,$3,$4,CURRENT_DATE+7,$5,$6) RETURNING id',
      [ids[g.by], g.title, g.category, g.budget, g.description, g.status]
    );
    gigIds[g.title] = rows[0].id;
  }
  console.log('Gigs ready:', Object.keys(gigIds).length);
  const gid = (t) => gigIds[t];

  // Applications (idempotent via UNIQUE gig+applicant)
  const apps = [
    [gid('Fest logo needed'), ids['karan@campus.edu'], 'I edit photos + Canva expert, 2-day delivery. Portfolio ready.', 'pending'],
    [gid('Fest logo needed'), ids['amit@campus.edu'], 'I can do logo in Figma with 2 revisions.', 'pending'],
    [gid('Resume portfolio website'), ids['amit@campus.edu'], 'Wrong poster skipped', 'pending'],
    [gid('Resume portfolio website'), ids['rahul@campus.edu'], 'I design + code landing pages, live in 5 days.', 'pending'],
    [gid('Blog article on AI in education'), ids['pooja@campus.edu'], 'Strong English, will deliver with references.', 'accepted'],
    [gid('Event photo editing (50 pics)'), ids['rahul@campus.edu'], 'Lightroom pro, done 3 events before.', 'accepted'],
  ].filter((a) => a[1] && a[0]);
  // fix: remove self-application (amit posted resume gig)
  for (const [gigId, appId, proposal, status] of apps) {
    const g = await pool.query('SELECT poster_id FROM gigs WHERE id=$1', [gigId]);
    if (g.rows[0] && g.rows[0].poster_id === appId) continue;
    await pool.query(
      'INSERT INTO applications (gig_id, applicant_id, proposal, status) VALUES ($1,$2,$3,$4) ON CONFLICT (gig_id, applicant_id) DO NOTHING',
      [gigId, appId, proposal, status]
    );
  }
  console.log('Applications seeded');

  // Messages (only if thread empty)
  const threads = [
    [gid('Blog article on AI in education'), [[ids['neha@campus.edu'], 'Hi! I have shared the topic outline, please check'], [ids['pooja@campus.edu'], 'Checked it, please keep the introduction a bit shorter'], [ids['neha@campus.edu'], 'Okay, I will send the draft tomorrow 👍']]],
    [gid('Java mini project help'), [[ids['priya@campus.edu'], 'Thanks! I received the code and report'], [ids['amit@campus.edu'], 'You are welcome! They usually ask about the ER diagram in the viva, do revise it']]],
    [gid('Fest logo needed'), [[ids['rahul@campus.edu'], 'What size do you need? Square or banner?'], [ids['karan@campus.edu'], 'Both — an insta post and a flex banner']]],
  ];
  for (const [gigId, msgs] of threads) {
    if (!gigId) continue;
    const { rows } = await pool.query('SELECT COUNT(*)::int c FROM messages WHERE gig_id=$1', [gigId]);
    if (rows[0].c > 0) continue;
    for (const [sid, text] of msgs) {
      if (!sid) continue;
      await pool.query('INSERT INTO messages (gig_id, sender_id, text) VALUES ($1,$2,$3)', [gigId, sid, text]);
    }
  }
  console.log('Messages seeded');

  // Ratings (only if none for that gig)
  const ratings = [
    [gid('Java mini project help'), ids['priya@campus.edu'], ids['amit@campus.edu'], 5, 'Clean code + viva prep, highly recommended!'],
    [gid('Java mini project help'), ids['amit@campus.edu'], ids['priya@campus.edu'], 5, 'Clear requirements, paid on time.'],
    [gid('Club poster design'), ids['amit@campus.edu'], ids['rahul@campus.edu'], 4, 'Nice poster, one revision needed.'],
    [gid('Club poster design'), ids['rahul@campus.edu'], ids['amit@campus.edu'], 5, 'Quick feedback and payment.'],
  ];
  for (const [gigId, from, to, score, comment] of ratings) {
    if (!gigId || !from || !to) continue;
    const { rows } = await pool.query('SELECT COUNT(*)::int c FROM ratings WHERE gig_id=$1 AND from_id=$2', [gigId, from]);
    if (rows[0].c > 0) continue;
    await pool.query('INSERT INTO ratings (gig_id, from_id, to_id, score, comment) VALUES ($1,$2,$3,$4,$5)', [gigId, from, to, score, comment]);
  }
  console.log('Ratings seeded');
  console.log('SEED OK — demo login: priya@campus.edu / pass123 (all demo users same password)');
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
