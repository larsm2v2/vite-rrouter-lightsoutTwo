// src/schema.ts
import pool from "./database";
import createClassicPuzzlesTable from "../migrations/create_classic_puzzles";
import migrateCustomPuzzles from "../migrations/create_custom_puzzles";

// Add a lock to prevent concurrent initialization
let isInitializing = false;
let initializationPromise: Promise<void> | null = null;

async function createTables() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        google_sub TEXT UNIQUE,
        email TEXT NOT NULL UNIQUE CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$'),
        username TEXT UNIQUE,
        password TEXT,
        password_salt TEXT,
        display_name TEXT NOT NULL,
        avatar TEXT,
        google_access_token TEXT,
        google_refresh_token TEXT,
        token_expiry TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Game stats
    await client.query(`
  CREATE TABLE IF NOT EXISTS game_stats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    current_level INTEGER DEFAULT 1 CHECK (current_level > 0),
    best_combination JSONB NOT NULL DEFAULT '[]'::jsonb,
    saved_maps JSONB NOT NULL DEFAULT '[]'::jsonb,
    UNIQUE(user_id)
  );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INT PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT NOW()
);
        `);
    // Audit log
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action TEXT NOT NULL CHECK (length(action) <= 50),
        endpoint TEXT NOT NULL CHECK (length(endpoint) <= 255),
        ip_address TEXT NOT NULL CHECK (length(ip_address) <= 45),
        user_agent TEXT CHECK (length(user_agent) <= 512),
        status_code INTEGER CHECK (status_code BETWEEN 100 AND 599),
        metadata JSONB,
        timestamp TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub);
      CREATE INDEX IF NOT EXISTS idx_game_stats_user_id ON game_stats(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_log_user_action ON audit_log(user_id, action);
    `);

    // Comments
    await client.query(`
      COMMENT ON COLUMN users.google_sub IS 'Google OAuth subject identifier';
      `);

    // Classic puzzles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS classic_puzzles (
        id SERIAL PRIMARY KEY,
        difficulty TEXT NOT NULL,
        level INTEGER NOT NULL,
        pattern INTEGER[] NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        min_moves INTEGER,
        UNIQUE(difficulty, level)
      );
    `);

    await client.query("COMMIT");
    console.log("✅ Tables created successfully");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error creating tables:", err);
    throw err;
  } finally {
    client.release();
  }
}

export async function initializeDatabase() {
  try {
    // Return existing promise if already initializing
    if (isInitializing) {
      return initializationPromise;
    }

    // Set lock
    isInitializing = true;
    
    // Create new initialization promise
    initializationPromise = createTables()
      .catch(err => {
        console.error("Database initialization error:", err);
        throw err;
      })
      .finally(() => {
        // Release lock
        isInitializing = false;
      });
    
    // Create classic_puzzles table first
    await createClassicPuzzlesTable();
    
    // Then replace with custom puzzles
    await migrateCustomPuzzles();
    
    console.log("Database schema initialization completed successfully");
  } catch (error) {
    console.error("Error initializing database schema:", error);
    throw error;
  }
}

export default pool;
