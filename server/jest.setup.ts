// jest.setup.ts (create this file)
import { initializeDatabase } from "./src/config/schema";
import pool from "./src/config/database";

module.exports = async () => {
  await initializeDatabase();
};
