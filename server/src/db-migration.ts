// Database migration to add password columns
import dotenv from "dotenv";
dotenv.config();

import { Pool } from "pg";
import pool from "./config/database";

async function runMigration() {
  console.log("Starting database migration...");
  const client = await pool.connect();
  
  try {
    await client.query("BEGIN");

    // Check if columns already exist
    const columnCheckResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('password', 'password_salt');
    `);
    
    const existingColumns = columnCheckResult.rows.map(row => row.column_name);
    
    // Add password column if it doesn't exist
    if (!existingColumns.includes('password')) {
      console.log("Adding password column...");
      await client.query(`
        ALTER TABLE users
        ADD COLUMN password TEXT;
      `);
    } else {
      console.log("Password column already exists.");
    }
    
    // Add password_salt column if it doesn't exist
    if (!existingColumns.includes('password_salt')) {
      console.log("Adding password_salt column...");
      await client.query(`
        ALTER TABLE users
        ADD COLUMN password_salt TEXT;
      `);
    } else {
      console.log("Password salt column already exists.");
    }
    
    // Make google_sub column nullable
    console.log("Modifying google_sub column to allow NULL values...");
    await client.query(`
      ALTER TABLE users
      ALTER COLUMN google_sub DROP NOT NULL;
    `);
    
    // Rename buttons_pressed to best_combination
    console.log("Renaming buttons_pressed column to best_combination...");
    await client.query(`
      ALTER TABLE game_stats
      RENAME COLUMN buttons_pressed TO best_combination;
    `);
    
    await client.query("COMMIT");
    console.log("✅ Migration completed successfully!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Migration failed:", err);
    throw err;
  } finally {
    client.release();
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log("Migration completed, exiting...");
      process.exit(0);
    })
    .catch(err => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}

export default runMigration; 