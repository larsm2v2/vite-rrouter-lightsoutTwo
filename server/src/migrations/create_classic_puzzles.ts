import { Pool } from "pg";
import classicPuzzles from '../classicPuzzles';
import dotenv from 'dotenv';
dotenv.config(); 


// Force use of development environment
process.env.NODE_ENV = 'development';
// Default difficulty key for classic puzzles
const defaultDifficulty = 'classic';

async function migrateClassicPuzzles() {
  const MIGRATION_VERSION = 1; // migration version to track classic puzzles population
  const mainPool = new Pool({
        user: process.env.PG_USER || "postgres",
        host: process.env.PG_HOST || "localhost",
        database: process.env.PG_DATABASE || "TTLO",
        password: process.env.PG_PASSWORD || "your_password",
        port: parseInt(process.env.PG_PORT || "5432"),

  });
  
  console.log("Connecting to TTLO database...");
  const client = await mainPool.connect();
  
  try {
    // Check if this migration has already been applied
    console.log("Checking schema_version for Classic puzzles migration...");
    const { rows } = await client.query(
      `SELECT 1 FROM schema_version WHERE version = $1`,
      [MIGRATION_VERSION]
    );
    if (rows.length > 0) {
       console.log("Classic puzzles migration already applied, skipping.");
       return;
    }

    // Check existing entries in classic_puzzles
    const rowsLevels = await client.query(
      `SELECT level FROM classic_puzzles WHERE difficulty = $1 ORDER BY level`,
      [defaultDifficulty]
    );
    const existingLevels = rowsLevels.rows.map(r => r.level);
    let puzzlesToInsert;
    if (existingLevels.length > 0) {
      // Verify first 25 levels are present
      const missing: number[] = [];
      for (let i = 1; i <= 25; i++) {
        if (!existingLevels.includes(i)) missing.push(i);
      }
      if (missing.length === 0) {
        console.log("First 25 levels exist, inserting levels 26-50...");
        puzzlesToInsert = Object.values(classicPuzzles).filter(p => p.level > 25);
      } else {
        console.error(`Missing classic levels: ${missing.join(', ')}. Aborting.`);
        await client.query('ROLLBACK');
        return;
      }
    } else {
      console.log("No existing puzzles found, inserting all 50 levels...");
      puzzlesToInsert = Object.values(classicPuzzles);
    }

    // Insert puzzles based on existing entries
    console.log(`Inserting ${puzzlesToInsert.length} puzzle levels...`);
    for (const { level, pattern, minMoves , gridSize} of puzzlesToInsert) {
      await client.query(
        `INSERT INTO classic_puzzles (difficulty, level, pattern, min_moves, grid_size) VALUES ($1, $2, $3, $4, $5)`,
        [defaultDifficulty, level, pattern, minMoves, gridSize]
      );
      console.log(`Inserted level ${level} with ${pattern.length} cells`);
    }

    // Record the migration version so we only populate once
    console.log("Recording migration version...");
    await client.query(
      `INSERT INTO schema_version (version) VALUES ($1)`,
      [MIGRATION_VERSION]
    );

    await client.query('COMMIT');
    console.log(`Successfully populated classic_puzzles table with ${puzzlesToInsert.length} Classic patterns`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during Classic puzzles migration:', err);
    throw err;
  } finally {
    client.release();
    await mainPool.end();
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  migrateClassicPuzzles()
    .then(() => {
      console.log('Classic puzzles migration completed successfully');
      process.exit(0);
    })
    .catch(err => {
      console.error('Classic puzzles migration failed:', err);
      process.exit(1);
    });
}

export default migrateClassicPuzzles; 