// jest.global-teardown.ts
import pool from "./src/config/database";

export default async () => {
  await pool.query("TRUNCATE users, game_stats, audit_log CASCADE");
  await pool.end();
  // Add delay for connection cleanup
  await new Promise((resolve) => setTimeout(resolve, 500));
};
