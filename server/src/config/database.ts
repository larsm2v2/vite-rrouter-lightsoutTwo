// src/database.ts
import { Pool, PoolConfig } from "pg";
import { env } from "process";

declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      display_name: string;
    }
  }
}
// PostgreSQL configuration
const pgConfig: PoolConfig =
  process.env.NODE_ENV === "test"
    ? {
        user: env.PG_USER || "postgres",
        host: process.env.PG_HOST_TEST || "localhost",
        database: process.env.PG_DATABASE_TEST || "ttlo_test",
        password: env.PG_PASSWORD || "your_password",
        port: parseInt(env.PG_PORT || "5432"),
        max: 20, // max number of clients in the pool
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      }
    : {
        user: env.PG_USER || "postgres",
        host: env.PG_HOST || "localhost",
        database: env.PG_DATABASE || "TTLO",
        password: env.PG_PASSWORD || "your_password",
        port: parseInt(env.PG_PORT || "5432"),
        max: 20, // max number of clients in the pool
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      };

// Create the connection pool
const pool = new Pool(pgConfig);

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

export default pool;
