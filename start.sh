#!/bin/bash
# App uses system Postgres on 5432 (permission fixed).
# Just start the app. Run after reboot: sudo systemctl start postgresql
cd "$(dirname "$0")"
node src/server.js
