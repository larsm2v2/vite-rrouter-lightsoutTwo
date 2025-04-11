// src/database.ts
import { Pool, PoolConfig } from "pg";
import { env } from "process";

// PostgreSQL configuration
const pgConfig: PoolConfig = {
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
pool
  .query("SELECT NOW() as now")
  .then((res) => {
    console.log("✅ PostgreSQL connected at:", res.rows[0].now);
  })
  .catch((err) => {
    console.error("❌ PostgreSQL connection error:", err);
    process.exit(1);
  });

// Graceful shutdown
process.on("SIGINT", async () => {
  await pool.end();
  process.exit(0);
});

export default pool;
