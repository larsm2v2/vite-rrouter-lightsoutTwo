"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../config/database"));
const gamePuzzles_1 = __importDefault(require("../data/gamePuzzles"));
/**
 * Migration script to create and populate the classic_puzzles table
 * Classic puzzles are stored in linear notation (1-25 for a 5x5 grid)
 */
function createClassicPuzzlesTable() {
    return __awaiter(this, void 0, void 0, function* () {
        const client = yield database_1.default.connect();
        try {
            yield client.query('BEGIN');
            // Create the classic_puzzles table
            yield client.query(`
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
            const { rows } = yield client.query('SELECT COUNT(*) FROM classic_puzzles');
            if (parseInt(rows[0].count) > 0) {
                console.log('Classic puzzles table already populated, skipping insertion');
                yield client.query('COMMIT');
                return;
            }
            // Insert puzzles from the puzzleCollections
            const difficulties = ['easy', 'medium', 'hard', 'expert'];
            for (const difficulty of difficulties) {
                // Get all levels for this difficulty
                const levels = Object.keys(gamePuzzles_1.default[difficulty])
                    .filter(key => key.startsWith('level'))
                    .map(key => key.replace('level', ''))
                    .map(Number);
                for (const level of levels) {
                    const pattern = gamePuzzles_1.default[difficulty][`level${level}`];
                    yield client.query(`INSERT INTO classic_puzzles (difficulty, level, pattern) VALUES ($1, $2, $3)`, [difficulty, level, pattern]);
                    console.log(`Inserted ${difficulty} level ${level} with ${pattern.length} cells`);
                }
            }
            yield client.query('COMMIT');
            console.log('Successfully created and populated classic_puzzles table');
        }
        catch (err) {
            yield client.query('ROLLBACK');
            console.error('Error creating classic_puzzles table:', err);
            throw err;
        }
        finally {
            client.release();
        }
    });
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
exports.default = createClassicPuzzlesTable;
