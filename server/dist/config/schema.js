"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = initializeDatabase;
// src/schema.ts
const database_1 = __importDefault(require("./database"));
const create_classic_puzzles_1 = __importDefault(require("../migrations/create_classic_puzzles"));
const create_custom_puzzles_1 = __importDefault(require("../migrations/create_custom_puzzles"));
// Add a lock to prevent concurrent initialization
let isInitializing = false;
let initializationPromise = null;
function createTables() {
    return __awaiter(this, void 0, void 0, function* () {
        const client = yield database_1.default.connect();
        try {
            yield client.query("BEGIN");
            // Users table
            yield client.query(`
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
            yield client.query(`
  CREATE TABLE IF NOT EXISTS game_stats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    current_level INTEGER DEFAULT 1 CHECK (current_level > 0),
    best_combination JSONB NOT NULL DEFAULT '[]'::jsonb,
    saved_maps JSONB NOT NULL DEFAULT '[]'::jsonb,
    UNIQUE(user_id)
  );
    `);
            yield client.query(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INT PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT NOW()
);
        `);
            // Audit log
            yield client.query(`
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
            yield client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub);
      CREATE INDEX IF NOT EXISTS idx_game_stats_user_id ON game_stats(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_log_user_action ON audit_log(user_id, action);
    `);
            // Comments
            yield client.query(`
      COMMENT ON COLUMN users.google_sub IS 'Google OAuth subject identifier';
      `);
            // Classic puzzles table
            yield client.query(`
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
            yield client.query("COMMIT");
            console.log("✅ Tables created successfully");
        }
        catch (err) {
            yield client.query("ROLLBACK");
            console.error("❌ Error creating tables:", err);
            throw err;
        }
        finally {
            client.release();
        }
    });
}
function initializeDatabase() {
    return __awaiter(this, void 0, void 0, function* () {
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
            yield (0, create_classic_puzzles_1.default)();
            // Then replace with custom puzzles
            yield (0, create_custom_puzzles_1.default)();
            console.log("Database schema initialization completed successfully");
        }
        catch (error) {
            console.error("Error initializing database schema:", error);
            throw error;
        }
    });
}
exports.default = database_1.default;
