# Student Freelance & Micro-Gig Campus Marketplace

Working project from synopsis (Vaibhavi Ghodke, Sneha Jadhav, Akanksha Kushwaha).

## Stack
- Backend: Node.js + Express + PostgreSQL (`pg`) + JWT
- Frontend: HTML5 + Bootstrap 5 + Vanilla JS (in `public/`)
- Payments: mock status tracking (open → assigned → completed/Paid)
- Roles: dual — any verified student can post + apply. Plus admin.

## Setup (PostgreSQL already installed)
```bash
# DB (one time)
sudo -u postgres psql -c "CREATE DATABASE campus_gigs;"
sudo -u postgres psql -c "CREATE USER campus_user WITH PASSWORD 'campus123';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE campus_gigs TO campus_user;"
# If needed: sudo -u postgres psql -c "ALTER DATABASE campus_gigs OWNER TO campus_user;"

npm install
npm run db:init
npm run db:seed   # 6 demo users + 8 gigs + applications, chats, ratings
npm start
# open http://localhost:3000
```

Demo admin: `admin@campus.edu / admin123`

## Scope (current UI)
- Browse/search/filter/sort gigs, bookmarks, profiles with ratings & history
- Discussion threads, reports, read/unread notifications
- Admin (on dashboard when admin logs in): verification queue, user/gig moderation, reports queue, charts
- Post/apply/hire flows removed from UI; backend routes retained (harmless)

## API
- `POST /api/auth/signup|login`, `GET/PUT /api/auth/me`
- `GET /api/gigs?search=&category=&status=&min_budget=&max_budget=&sort=latest|budget_asc|budget_desc|deadline`, `POST /api/gigs`, `PUT /api/gigs/:id/status`, `DELETE /api/gigs/:id`
- `POST /api/gigs/:id/apply`, `GET /api/gigs/:id/applications`, `PUT /api/applications/:id`
- `GET/POST /api/gigs/:id/messages`, `GET /api/notifications/list` (legacy), `GET /api/notifications` + `PUT /api/notifications/read-all|/:id/read` (read/unread)
- `POST /api/ratings`, `GET /api/ratings/user/:id`
- `GET/POST /api/bookmarks`, `DELETE /api/bookmarks/:gigId`, `GET /api/bookmarks/ids/set`
- `POST /api/reports`, `GET /api/reports?status=` (admin), `PUT /api/reports/:id` (admin)
- `GET /api/users/:id/public`, `GET /api/users/:id/gigs`
- `GET /api/admin/stats|users|gigs`, `PUT /api/admin/users/:id/verify`
