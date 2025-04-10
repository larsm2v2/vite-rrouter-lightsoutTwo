// src/database.ts
import Database from "better-sqlite3";
import { env } from "process";
// Use an in-memory database for testing

export function safeRowIdToNumber(rowId: number | bigint): number {
  if (typeof rowId === "bigint" && rowId > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("Database ID exceeds JavaScript safe integer range");
  }
  return Number(rowId);
}
const db = new Database(
  env.NODE_ENV === "test" ? ":memory:" : "database.sqlite",
  {
    verbose: env.NODE_ENV === "development" ? console.log : undefined,
    timeout: 5000,
    nativeBinding:
      "./node_modules/better-sqlite3/build/Release/better_sqlite3.node", // Explicit binding
  }
);
db.pragma(`KEY = '${env.DB_ENCRYPTION_KEY}'`);
db.pragma("cipher_page_size = 4096");
db.pragma("kdf_iter = 256000");

// Secure PRAGMAs for production
if (env.NODE_ENV === "production") {
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");
  db.pragma("secure_delete = ON");
}

// User table with OIDC support
db.prepare(
  `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_sub TEXT NOT NULL UNIQUE,  // Changed from googleId for OIDC compliance
    email TEXT NOT NULL UNIQUE CHECK(email LIKE '%@%.%'),
    displayName TEXT NOT NULL,
    avatar TEXT,
    google_access_token TEXT,
    google_refresh_token TEXT,
    token_expiry TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  ) STRICT` // SQLite 3.37+ strict mode
).run();

// Game stats with JSON validation
db.prepare(
  `
  CREATE TABLE IF NOT EXISTS game_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    current_level INTEGER DEFAULT 1 CHECK(current_level > 0),
    buttons_pressed TEXT CHECK(json_valid(buttons_pressed)),
    saved_maps TEXT CHECK(json_valid(saved_maps)),
    UNIQUE(user_id)
  ) STRICT`
).run();

// Audit log with IP encryption
db.prepare(
  `
  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK(length(action) <= 50),
    endpoint TEXT NOT NULL CHECK(length(endpoint) <= 255),
    ip_address TEXT NOT NULL CHECK(length(ip_address) <= 45),
    user_agent TEXT CHECK(length(user_agent) <= 512),
    status_code INTEGER CHECK(status_code BETWEEN 100 AND 599),
    metadata TEXT CHECK(json_valid(metadata)),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  ) STRICT`
).run();

// Optimized indexes
db.prepare(
  "CREATE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub)"
).run();
db.prepare(
  "CREATE INDEX IF NOT EXISTS idx_game_stats_user_id ON game_stats(user_id)"
).run();
db.prepare(
  "CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC)"
).run();

// Migration for existing users (run once)
if (env.RUN_MIGRATIONS === "true") {
  try {
    db.prepare("ALTER TABLE users RENAME COLUMN googleId TO google_sub").run();
    console.log("Migration completed: renamed googleId to google_sub");
  } catch (err: any) {
    if (!err.message.includes("no such column")) {
      console.error("Migration error:", err);
    }
  }
}

export default db;
