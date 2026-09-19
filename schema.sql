-- Campus Gig Marketplace schema (PostgreSQL)

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  skills TEXT DEFAULT '',
  is_admin BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gigs (
  id SERIAL PRIMARY KEY,
  poster_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  budget INTEGER NOT NULL DEFAULT 0,
  deadline DATE,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','assigned','completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS applications (
  id SERIAL PRIMARY KEY,
  gig_id INTEGER NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  applicant_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  proposal TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(gig_id, applicant_id)
);

CREATE TABLE IF NOT EXISTS ratings (
  id SERIAL PRIMARY KEY,
  gig_id INTEGER NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  from_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  gig_id INTEGER NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gigs_status ON gigs(status);
CREATE INDEX IF NOT EXISTS idx_gigs_category ON gigs(category);
CREATE INDEX IF NOT EXISTS idx_apps_gig ON applications(gig_id);
CREATE INDEX IF NOT EXISTS idx_msgs_gig ON messages(gig_id);

-- Bookmarks (feature 1)
CREATE TABLE IF NOT EXISTS bookmarks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gig_id INTEGER NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, gig_id)
);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);

-- Notifications with read/unread (feature 8)
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  gig_id INTEGER REFERENCES gigs(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read, created_at DESC);

-- Reports / disputes (feature 6)
CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('gig','user')),
  target_id INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
