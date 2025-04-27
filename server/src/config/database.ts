// src/database.ts
import dotenv from 'dotenv';
dotenv.config(); 
import { Pool } from "pg";


declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      display_name: string;
    }
  }
}

const isTestEnv = process.env.NODE_ENV === "test";
// PostgreSQL configuration
const pgConfig =
isTestEnv 
    ? {
        user: process.env.PG_USER || "postgres",
        host: process.env.PG_HOST_TEST || "localhost",
        database: process.env.PG_DATABASE_TEST || "ttlo_test",
        password: process.env.PG_PASSWORD || "your_password",
        port: parseInt(process.env.PG_PORT || "5432"),
        max: 20, // max number of clients in the pool
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      }
      : process.env.PG_URL
      ? {
          connectionString: process.env.PG_URL,
          ssl: { rejectUnauthorized: false },
          max: 10,
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
        ssl: { rejectUnauthorized: false },
      };

// Use test pool in test environment
const pool = new Pool(pgConfig);

// Test the connection
if (!isTestEnv) {
  pool
    .query("SELECT NOW() as now")
    .then((res) => {
      console.log("✅ PostgreSQL connected at", res.rows[0].now);
    })
    .catch((err) => {
      console.error("❌ PostgreSQL connection error:", err);
      process.exit(1);
    });
}

export default pool;
