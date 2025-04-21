import pool from "../config/database";
import puzzleCollections from "../data/gamePuzzles";

/**
 * Migration script to create and populate the classic_puzzles table
 * Classic puzzles are stored in linear notation (1-25 for a 5x5 grid)
 */
async function createClassicPuzzlesTable() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Create the classic_puzzles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS classic_puzzles (
        id SERIAL PRIMARY KEY,
        difficulty VARCHAR(20) NOT NULL,
        level INT NOT NULL,
        pattern INTEGER[] NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_difficulty_level UNIQUE (difficulty, level)
      )
    `);

    // Check if the table already has data
    const { rows } = await client.query('SELECT COUNT(*) FROM classic_puzzles');
    if (parseInt(rows[0].count) > 0) {
      console.log('Classic puzzles table already populated, skipping insertion');
      await client.query('COMMIT');
      return;
    }

    // Insert puzzles from the puzzleCollections
    const difficulties = ['easy', 'medium', 'hard', 'expert'];
    
    for (const difficulty of difficulties) {
      // Get all levels for this difficulty
      const levels = Object.keys(puzzleCollections[difficulty as keyof typeof puzzleCollections])
        .filter(key => key.startsWith('level'))
        .map(key => key.replace('level', ''))
        .map(Number);
      
      for (const level of levels) {
        const pattern = puzzleCollections[difficulty as keyof typeof puzzleCollections][`level${level}` as keyof typeof puzzleCollections.easy];
        
        await client.query(
          `INSERT INTO classic_puzzles (difficulty, level, pattern) VALUES ($1, $2, $3)`,
          [difficulty, level, pattern]
        );
        
        console.log(`Inserted ${difficulty} level ${level} with ${pattern.length} cells`);
      }
    }

    await client.query('COMMIT');
    console.log('Successfully created and populated classic_puzzles table');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating classic_puzzles table:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  createClassicPuzzlesTable()
    .then(() => {
      console.log('Classic puzzles migration completed successfully');
      process.exit(0);
    })
    .catch(err => {
      console.error('Classic puzzles migration failed:', err);
      process.exit(1);
    });
}

export default createClassicPuzzlesTable; 