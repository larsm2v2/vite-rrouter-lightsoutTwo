"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/database.ts
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const pg_1 = require("pg");
const process_1 = require("process");
const test_config_1 = require("./test-config");
// PostgreSQL configuration
const pgConfig = process.env.NODE_ENV === "test"
    ? {
        user: process_1.env.PG_USER || "postgres",
        host: process.env.PG_HOST_TEST || "localhost",
        database: process.env.PG_DATABASE_TEST || "ttlo_test",
        password: process.env.PG_PASSWORD || "your_password",
        port: parseInt(process_1.env.PG_PORT || "5432"),
        max: 20, // max number of clients in the pool
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    }
    : {
        user: process.env.PG_USER || "postgres",
        host: process.env.PG_HOST || "localhost",
        database: process.env.PG_DATABASE || "TTLO",
        password: process.env.PG_PASSWORD || "your_password",
        port: parseInt(process.env.PG_PORT || "5432"),
        max: 10, // max number of clients in the pool
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        connectionString: process.env.PG_URL,
        ssl: { rejectUnauthorized: false },
    };
// Use test pool in test environment
const pool = process.env.NODE_ENV === "test" ? test_config_1.testPool : new pg_1.Pool(pgConfig);
// Test the connection
if (process.env.NODE_ENV !== "test") {
    pool
        .query("SELECT NOW() as now")
        .then((res) => {
        if (process.env.NODE_ENV !== "test") {
            console.log("✅ PostgreSQL connected");
        }
    })
        .catch((err) => {
        console.error("❌ PostgreSQL connection error:", err);
        if (process.env.NODE_ENV !== "test") {
            process.exit(1); // Only exit in non-test environments
        }
    });
}
exports.default = pool;
