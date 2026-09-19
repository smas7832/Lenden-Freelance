// Vercel serverless entry point — re-exports the Express app.
// Local dev still uses src/server.js (app.listen). Vercel calls this
// function for /api/* and serves public/ statically (see vercel.json).
const app = require('../src/app');

module.exports = app;
