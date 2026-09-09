const path = require("path");
const Database = require("better-sqlite3");

const dbPath = process.env.DB_PATH || path.join(__dirname, "..", "data", "devocional.db");
require("fs").mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    google_sub TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notes (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day INTEGER NOT NULL,
    text TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, day)
  );
`);

// Migracao leve para bancos ja existentes criados antes do login com Google
// (password_hash era NOT NULL e google_sub nao existia).
const columns = db.prepare("PRAGMA table_info(users)").all();
if (!columns.some((c) => c.name === "google_sub")) {
  db.exec("ALTER TABLE users ADD COLUMN google_sub TEXT UNIQUE");
}

module.exports = db;
