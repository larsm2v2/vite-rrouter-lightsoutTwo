// src/database.ts
import Database from "better-sqlite3";

// Use an in-memory database for testing
const db =
	process.env.NODE_ENV === "test"
		? new Database(":memory:") // In-memory database
		: new Database("database.sqlite"); // File-based database

// Create the users table if it doesn't exist
db.prepare(
	`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    googleId TEXT NOT NULL UNIQUE,
    displayName TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
  )
`
).run();

db.prepare(
	`
  CREATE TABLE IF NOT EXISTS game_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER,
  currentLevel INTEGER,
  buttonsPressed TEXT,
  savedMaps TEXT,
  FOREIGN KEY (userId) REFERENCES users(id)
)
  `
).run();

export default db;
