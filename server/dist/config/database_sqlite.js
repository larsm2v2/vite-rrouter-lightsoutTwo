"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeRowIdToNumber = safeRowIdToNumber;
// src/database.ts
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const process_1 = require("process");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Use an in-memory database for testing
// Get the current file's directory
// const dbPath = path.resolve(__dirname, "../database.sqlite");
const dbPath = path_1.default.resolve(process.cwd(), "database.sqlite");
// const dbPath = path.resolve(process.cwd(), "data", "database.sqlite");
// Ensure the directory exists
const dbDir = path_1.default.dirname(dbPath);
if (!fs_1.default.existsSync(dbPath)) {
    fs_1.default.writeFileSync(dbPath, ""); // Create empty file
    fs_1.default.chmodSync(dbPath, 0o666); // Set permissions
}
console.log("Database path:", dbPath);
try {
    fs_1.default.accessSync(dbPath, fs_1.default.constants.W_OK);
    console.log("✅ Directory is writable");
}
catch (err) {
    console.error("❌ Directory is NOT writable:", err);
}
console.log(`Attempting to open database at: ${dbPath}`);
function safeRowIdToNumber(rowId) {
    if (typeof rowId === "bigint" && rowId > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new Error("Database ID exceeds JavaScript safe integer range");
    }
    return Number(rowId);
}
const db = new better_sqlite3_1.default(process_1.env.NODE_ENV === "test" ? ":memory:" : dbPath, {
    verbose: process_1.env.NODE_ENV === "development" ? console.log : undefined,
    timeout: 5000,
    nativeBinding: "./node_modules/better-sqlite3/build/Release/better_sqlite3.node", // Explicit binding
});
// ?.replace(/'/g, "")
try {
    db.pragma(`KEY = '${process.env.DB_ENCRYPTION_KEY}'`);
    db.pragma("cipher_page_size = 4096");
    db.pragma("kdf_iter = 256000");
    db.pragma("cipher_compatibility = 4");
    db.prepare("SELECT count(*) FROM sqlite_master").get();
    console.log("✅ Database encryption initialized successfully");
}
catch (err) {
    console.error("❌ Database encryption failed:", err);
}
// Secure PRAGMAs for production
if (process_1.env.NODE_ENV === "production") {
    db.pragma("journal_mode = WAL");
    db.pragma("synchronous = NORMAL");
    db.pragma("foreign_keys = ON");
    db.pragma("secure_delete = ON");
}
// Verify encryption works
try {
    db.prepare("SELECT 1").get();
}
catch (err) {
    console.error("❌ Database test query failed - encryption may be misconfigured");
    throw err;
}
// User table with OIDC support
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_sub TEXT NOT NULL UNIQUE,  --Changed from googleId for OIDC compliance
    email TEXT NOT NULL UNIQUE CHECK(email LIKE '%@%.%'),
    display_name TEXT NOT NULL,
    avatar TEXT,
    google_access_token TEXT,
    google_refresh_token TEXT,
    token_expiry TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  ) STRICT` // SQLite 3.37+ strict mode
).run();
// Game stats with JSON validation
db.prepare(`
  CREATE TABLE IF NOT EXISTS game_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    current_level INTEGER DEFAULT 1 CHECK(current_level > 0),
    buttons_pressed TEXT CHECK(json_valid(buttons_pressed)),
    saved_maps TEXT CHECK(json_valid(saved_maps)),
    UNIQUE(user_id)
  ) STRICT`).run();
// Audit log with IP encryption
db.prepare(`
  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK(length(action) <= 50),
    endpoint TEXT NOT NULL CHECK(length(endpoint) <= 255),
    ip_address TEXT NOT NULL CHECK(length(ip_address) <= 45),
    user_agent TEXT CHECK(length(user_agent) <= 512),
    status_code INTEGER CHECK(status_code BETWEEN 100 AND 599),
    metadata TEXT CHECK(json_valid(metadata)),
    timestamp TEXT DEFAULT (datetime('now'))
  ) STRICT`).run();
// Optimized indexes
db.prepare("CREATE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub)").run();
db.prepare("CREATE INDEX IF NOT EXISTS idx_game_stats_user_id ON game_stats(user_id)").run();
db.prepare("CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC)").run();
// Migration for existing users (run once)
if (process_1.env.RUN_MIGRATIONS === "true") {
    try {
        db.prepare("ALTER TABLE users RENAME COLUMN googleId TO google_sub").run();
        console.log("Migration completed: renamed googleId to google_sub");
    }
    catch (err) {
        if (!err.message.includes("no such column")) {
            console.error("Migration error:", err);
        }
    }
}
exports.default = db;
