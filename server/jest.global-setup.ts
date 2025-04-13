// jest.global-setup.ts
import { Pool } from "pg";
import { initializeDatabase } from "./src/config/schema";
import dotenv from "dotenv";

// Load test environment variables
dotenv.config({ path: ".env.test" });

const testPool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: parseInt(process.env.PG_PORT || "5432"),
});

export default async () => {
  try {
    // Verify connection
    await testPool.query("SELECT 1");
    console.log("✅ Test database connected");

    // Initialize schema
    await initializeDatabase();
  } catch (err) {
    console.error("❌ Test database connection failed");
    console.error("Current DB config:", {
      user: process.env.PG_USER,
      host: process.env.PG_HOST,
      database: process.env.PG_DATABASE,
      port: process.env.PG_PORT,
    });
    throw err;
  } finally {
    await testPool.end();
  }
};
