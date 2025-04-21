import { Pool } from "pg";

/**
 * Migration script to convert custom puzzles from RC notation to linear and store in database
 * Linear index = (row * 5) + column + 1 (for a 5x5 grid)
 */

// Function to convert row-column (RC) notation to linear index
function rcToLinear(rc: string): number {
  const [row, col] = rc.split('-').map(Number);
  return (row * 5) + col + 1;
}

interface PuzzleData {
  [difficulty: string]: {
    [level: string]: string[];
  }
}

// The custom puzzles in RC notation format
const customPuzzles: PuzzleData = {
  '0-0': {
    //6 Step Levels
    '0-0': ['2-0','2-2','2-4'],
    '0-1': ['0-0','0-2','0-4',
            '1-0','1-2','1-4',
            '3-0','3-2','3-4',
            '4-0','4-2','4-4'],
    '0-2': ['0-1','0-3',
            '1-0','1-1','1-3','1-4',
            '2-0','2-1','2-3','2-4',
            '3-0','3-1','3-3','3-4',
            '4-1','4-3'],
    '0-3': ['1-0','1-1','1-3','1-4',
            '3-0','3-4',
            '4-0','4-1','4-3','4-4'],
    '0-4': ['0-0','0-1','0-2','0-3',
            '1-0','1-1','1-2','1-4',
            '2-0','2-1','2-2','2-4',
            '3-3','3-4',
            '4-0','4-1','4-3','4-4'],
    //7 Step Levels,
    '1-0': ['2-0','2-2','2-4',
            '3-0','3-2','3-4',
            '4-1','4-2','4-3'],
    '1-1': ['0-0','0-1','0-2','0-3',
            '1-0','1-4',
            '2-0','2-4',
            '3-0','3-4',
            '4-0','4-1','4-2','4-3'],
    '1-2': ['1-2',
            '2-1','2-3',
            '3-0','3-2','3-4',
            '4-1','4-3'],
    '1-3': ['0-1','0-3',
            '1-0','1-1','1-2','1-3','1-4',
            '2-1','2-2','2-3',
            '3-1','3-3','3-4',
            '4-0','4-1','4-2'],
    '1-4': ['0-1','0-2','0-3',
            '1-1','1-2','1-3',
            '2-1','2-2','2-3'],
    //8 Step Levels
    '2-0': ['0-0','0-2','0-4',
            '1-0','1-2','1-4',
            '2-0','2-2','2-4',
            '3-0','3-2','3-4',
            '4-1','4-2','4-3'],
    '2-1': ['0-0','0-1','0-2','0-3','0-4',
            '1-1','1-3',
            '2-0','2-1','2-3','2-4',
            '3-1','3-2','3-3',
            '4-1','4-3'],
    '2-2': ['0-3',
            '1-2','1-4',
            '2-1','2-3',
            '3-0','3-2',
            '4-1'],
    '2-3': ['2-1',
            '3-1', 
            '4-1'],
    '2-4': ['1-1',
            '3-1'],
    //9 Step Levels
    '3-0': ['0-0',
            '1-0',
            '2-0',
            '3-0',
            '4-0', '4-1', '4-2', '4-3', '4-4'],
    '3-1': ['2-2',
            '3-1', '3-2', '3-3',
            '4-0', '4-1', '4-2', '4-3', '4-4'],
    '3-2': ['0-2',
            '1-1', '1-3',
            '2-0', '2-2', '2-4',
            '3-1', '3-3',
            '4-2'],
    '3-3': ['0-0', '0-2', '0-4',
            '2-0', '2-2', '2-4',
            '4-0', '4-2', '4-4'],
    '3-4': ['2-0','2-4'],
    //10 Step Levels
    '4-0': ['0-1', '0-2', '0-3', '0-4',
            '1-1',
            '2-1', '2-2', '2-3',
            '3-1',
            '4-1'],
    '4-1': ['0-1', '0-2', '0-3',
            '1-0', '1-4',
            '2-0', '2-4',
            '3-0', '3-4',
            '4-1', '4-2', '4-3'],
    '4-2': ['2-2', '2-3', '2-4',
            '3-2', '3-3',
            '4-2'],
    '4-3': ['2-0', '2-4',
            '3-0', '3-1', '3-2', '3-3', '3-4',
            '4-1', '4-4'],
    '4-4': ['0-0',
            '1-0', '1-1',
            '2-0', '2-1', '2-2',
            '3-0', '3-1', '3-2', '3-3',
            '4-1', '4-2', '4-3', '4-4'],
  },
};

// Force use of the production environment values
process.env.NODE_ENV = 'development';

async function migrateCustomPuzzles() {
  // Create a new pool that explicitly connects to TTLO database
  const mainPool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "TTLO", // Explicitly use TTLO database
    password: "tryhavok", // Use the password from .env file
    port: 5432,
  });
  
  console.log("Connecting to TTLO database...");
  const client = await mainPool.connect();
  
  try {
    console.log("Starting migration process to populate classic_puzzles table...");
    await client.query('BEGIN');
    
    // First check if classic_puzzles table exists, create it if not
    await client.query(`
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

    // Always drop and recreate the table to ensure clean data
    console.log("Dropping existing classic_puzzles table if exists...");
    await client.query('DROP TABLE IF EXISTS classic_puzzles CASCADE');
    
    console.log("Creating new classic_puzzles table...");
    await client.query(`
      CREATE TABLE classic_puzzles (
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

    let levelCounter = 1;
    const defaultDifficulty = 'classic';
    
    // Process all puzzles with a single sequential level counter
    console.log("Inserting new puzzle data...");
    for (const [difficultyKey, levels] of Object.entries(customPuzzles)) {
      for (const [levelKey, rcPatterns] of Object.entries(levels)) {
        // Convert the RC patterns to linear indices
        const linearPatterns = rcPatterns.map(rcToLinear);
        
        // Insert into the database with sequential level numbers
        await client.query(
          `INSERT INTO classic_puzzles (difficulty, level, pattern) VALUES ($1, $2, $3)`,
          [defaultDifficulty, levelCounter, linearPatterns]
        );
        
        console.log(`Inserted level ${levelCounter} with ${linearPatterns.length} cells`);
        levelCounter++;
      }
    }

    await client.query('COMMIT');
    console.log(`Successfully populated classic_puzzles table with ${levelCounter-1} custom patterns`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during custom puzzles migration:', err);
    throw err;
  } finally {
    client.release();
    await mainPool.end();
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  migrateCustomPuzzles()
    .then(() => {
      console.log('Custom puzzles migration completed successfully');
      process.exit(0);
    })
    .catch(err => {
      console.error('Custom puzzles migration failed:', err);
      process.exit(1);
    });
}

export default migrateCustomPuzzles; 