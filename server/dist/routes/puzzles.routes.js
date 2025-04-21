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
const express_1 = __importDefault(require("express"));
const database_1 = __importDefault(require("../config/database"));
const puzzleSolver_1 = require("../utils/puzzleSolver");
const router = express_1.default.Router();
/**
 * GET /puzzles
 * Get all puzzle difficulties and levels
 */
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { rows } = yield database_1.default.query(`
      SELECT difficulty, level 
      FROM classic_puzzles 
      ORDER BY 
        CASE difficulty 
          WHEN 'easy' THEN 1 
          WHEN 'medium' THEN 2 
          WHEN 'hard' THEN 3 
          WHEN 'expert' THEN 4 
          WHEN 'classic' THEN 5
          WHEN '' THEN 6
          ELSE 7
        END, 
        level
    `);
        // Group by difficulty
        const result = {};
        for (const row of rows) {
            if (!result[row.difficulty]) {
                result[row.difficulty] = [];
            }
            result[row.difficulty].push(row.level);
        }
        res.json(result);
    }
    catch (err) {
        console.error('Error fetching puzzles:', err);
        res.status(500).json({ error: 'Failed to fetch puzzles' });
    }
}));
/**
 * GET /puzzles/:difficulty
 * Get all puzzles for a specific difficulty
 */
router.get('/:difficulty', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { difficulty } = req.params;
    const validDifficulties = ['easy', 'medium', 'hard', 'expert', 'classic', ''];
    // Handle empty difficulty parameter
    const difficultyParam = difficulty === '%20' || difficulty === ' ' ? '' : difficulty;
    // Don't check validDifficulties for empty string - just proceed
    if (difficultyParam !== '' && !validDifficulties.includes(difficultyParam)) {
        return res.status(404).json({ error: `Difficulty '${difficultyParam}' not found` });
    }
    try {
        const { rows } = yield database_1.default.query(`SELECT level, pattern FROM classic_puzzles WHERE difficulty = $1 ORDER BY level`, [difficultyParam]);
        // Format the response similar to the original structure
        const result = {};
        for (const row of rows) {
            result[`level${row.level}`] = row.pattern;
        }
        res.json(result);
    }
    catch (err) {
        console.error(`Error fetching ${difficultyParam} puzzles:`, err);
        res.status(500).json({ error: 'Failed to fetch puzzles' });
    }
}));
/**
 * GET /puzzles/:difficulty/:level
 * Get a specific puzzle by difficulty and level
 */
router.get('/:difficulty/:level', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { difficulty, level } = req.params;
    // Handle empty difficulty parameter
    const difficultyParam = difficulty === '%20' || difficulty === ' ' ? '' : difficulty;
    const levelNumber = parseInt(level.replace('level', ''));
    if (isNaN(levelNumber)) {
        return res.status(400).json({ error: 'Invalid level format' });
    }
    try {
        const { rows } = yield database_1.default.query(`SELECT pattern FROM classic_puzzles WHERE difficulty = $1 AND level = $2`, [difficultyParam, levelNumber]);
        if (rows.length === 0) {
            return res.status(404).json({
                error: `Puzzle with difficulty '${difficultyParam}' and level ${levelNumber} not found`
            });
        }
        res.json(rows[0].pattern);
    }
    catch (err) {
        console.error(`Error fetching puzzle (${difficultyParam}, level ${levelNumber}):`, err);
        res.status(500).json({ error: 'Failed to fetch puzzle' });
    }
}));
/**
 * POST /puzzles/validate
 * Validate a puzzle pattern and find the shortest solution
 */
router.post('/validate', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { pattern } = req.body;
    console.log('POST /puzzles/validate, received pattern:', pattern);
    if (!pattern || !Array.isArray(pattern)) {
        console.log('Invalid pattern format');
        return res.status(400).json({ error: 'Invalid pattern format' });
    }
    try {
        // Use the BFS solver to find the solution (allow up to 25 moves for full 5x5 grid)
        const { solvable, minimumMoves, solution } = (0, puzzleSolver_1.solvePuzzle)(pattern, 5, 25);
        console.log('Validation result:', { solvable, minimumMoves, solution });
        res.json({
            solvable,
            minimumMoves,
            solution
        });
    }
    catch (err) {
        console.error('Error validating puzzle:', err);
        res.status(500).json({ error: 'Failed to validate puzzle' });
    }
}));
/**
 * POST /puzzles/create
 * Create a new custom puzzle
 */
router.post('/create', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const { pattern, minimumMoves } = req.body;
    if (!pattern || !Array.isArray(pattern)) {
        return res.status(400).json({ error: 'Invalid pattern format' });
    }
    if (typeof minimumMoves !== 'number' || minimumMoves < 1) {
        return res.status(400).json({ error: 'Invalid minimum moves' });
    }
    try {
        // Find the next available level number for custom puzzles
        const { rows: levelRows } = yield database_1.default.query(`SELECT MAX(level) as max_level FROM classic_puzzles WHERE difficulty = 'custom'`);
        const nextLevel = ((_a = levelRows[0]) === null || _a === void 0 ? void 0 : _a.max_level) ? parseInt(levelRows[0].max_level) + 1 : 1;
        // Insert the new puzzle
        yield database_1.default.query(`INSERT INTO classic_puzzles (difficulty, level, pattern, created_by, min_moves)
       VALUES ($1, $2, $3, $4, $5)`, ['custom', nextLevel, pattern, req.user.id, minimumMoves]);
        // Also add to the user's saved maps
        yield database_1.default.query(`WITH user_stats AS (
         SELECT saved_maps FROM game_stats WHERE user_id = $1
       )
       UPDATE game_stats 
       SET saved_maps = CASE 
         WHEN user_stats.saved_maps IS NULL THEN jsonb_build_array($2::jsonb)
         ELSE user_stats.saved_maps || jsonb_build_array($2::jsonb)
       END
       FROM user_stats
       WHERE user_id = $1`, [req.user.id, JSON.stringify({ level: nextLevel, pattern, minimumMoves })]);
        // Fetch updated saved_maps for the user
        const { rows: statsRows } = yield database_1.default.query(`SELECT saved_maps FROM game_stats WHERE user_id = $1`, [req.user.id]);
        const updatedSavedMaps = ((_b = statsRows[0]) === null || _b === void 0 ? void 0 : _b.saved_maps) || [];
        res.status(201).json({
            success: true,
            level: nextLevel,
            difficulty: 'custom',
            saved_maps: updatedSavedMaps
        });
    }
    catch (err) {
        console.error('Error creating puzzle:', err);
        res.status(500).json({ error: 'Failed to create puzzle' });
    }
}));
exports.default = router;
