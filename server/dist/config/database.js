"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/database.ts
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
// Use an in-memory database for testing
const db = process.env.NODE_ENV === "test"
    ? new better_sqlite3_1.default(":memory:") // In-memory database
    : new better_sqlite3_1.default("database.sqlite"); // File-based database
// Create the users table if it doesn't exist
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    googleId TEXT NOT NULL UNIQUE,
    displayName TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
  )
`).run();
db.prepare(`
  CREATE TABLE IF NOT EXISTS game_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER,
  currentLevel INTEGER,
  buttonsPressed TEXT,
  savedMaps TEXT,
  FOREIGN KEY (userId) REFERENCES users(id)
)
  `).run();
exports.default = db;
