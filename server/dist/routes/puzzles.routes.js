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
const worker_threads_1 = require("worker_threads");
const path_1 = __importDefault(require("path"));
const router = express_1.default.Router();
const isDev = process.env.NODE_ENV === "development";
/**
 * GET /puzzles
 * Get all puzzle difficulties and levels
 */
router.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        console.error("Error fetching puzzles:", err);
        res.status(500).json({ error: "Failed to fetch puzzles" });
    }
}));
/**
 * GET /puzzles/:difficulty
 * Get all puzzles for a specific difficulty
 */
router.get("/:difficulty", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { difficulty } = req.params;
    // Handle custom puzzles via saved_maps in game_stats
    if (difficulty === "custom") {
        if (!req.user)
            return res.status(401).json({ error: "Unauthorized" });
        try {
            const { rows } = yield database_1.default.query(`SELECT saved_maps FROM game_stats WHERE user_id = $1`, [req.user.id]);
            const saved = ((_a = rows[0]) === null || _a === void 0 ? void 0 : _a.saved_maps) || [];
            const result = {};
            saved.forEach((m) => (result[`level${m.level}`] = m.pattern));
            return res.json(result);
        }
        catch (err) {
            console.error("Error fetching custom puzzles:", err);
            return res.status(500).json({ error: "Failed to fetch custom puzzles" });
        }
    }
    const validDifficulties = ["easy", "medium", "hard", "expert", "classic", ""];
    // Handle empty difficulty parameter
    const difficultyParam = difficulty === "%20" || difficulty === " " ? "" : difficulty;
    // Don't check validDifficulties for empty string - just proceed
    if (difficultyParam !== "" && !validDifficulties.includes(difficultyParam)) {
        return res
            .status(404)
            .json({ error: `Difficulty '${difficultyParam}' not found` });
    }
    try {
        // Classic puzzles
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
        res.status(500).json({ error: "Failed to fetch puzzles" });
    }
}));
/**
 * GET /puzzles/:difficulty/:level
 * Get a specific puzzle by difficulty and level
 */
router.get("/:difficulty/:level", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { difficulty, level } = req.params;
    // Custom single puzzle
    if (difficulty === "custom") {
        if (!req.user)
            return res.status(401).json({ error: "Unauthorized" });
        const levelNumber = parseInt(level.replace("level", ""));
        const { rows } = yield database_1.default.query(`SELECT saved_maps FROM game_stats WHERE user_id=$1`, [req.user.id]);
        const saved = ((_a = rows[0]) === null || _a === void 0 ? void 0 : _a.saved_maps) || [];
        const found = saved.find((m) => m.level === levelNumber);
        if (!found) {
            return res.status(404).json({ error: "Custom puzzle not found" });
        }
        // Return full object with pattern, minMoves, gridSize
        return res.json(found);
    }
    const validDifficulties = ["easy", "medium", "hard", "expert", "classic", ""];
    // Handle empty difficulty parameter
    const difficultyParam = difficulty === "%20" || difficulty === " " ? "" : difficulty;
    if (difficultyParam !== "" && !validDifficulties.includes(difficultyParam)) {
        return res
            .status(404)
            .json({ error: `Difficulty '${difficultyParam}' not found` });
    }
    const levelNumber = parseInt(level.replace("level", ""));
    if (isNaN(levelNumber)) {
        return res.status(400).json({ error: "Invalid level format" });
    }
    try {
        const { rows } = yield database_1.default.query(`SELECT pattern FROM classic_puzzles WHERE difficulty = $1 AND level = $2`, [difficultyParam, levelNumber]);
        if (rows.length === 0) {
            return res.status(404).json({
                error: `Puzzle with difficulty '${difficultyParam}' and level ${levelNumber} not found`,
            });
        }
        res.json(rows[0].pattern);
    }
    catch (err) {
        console.error(`Error fetching puzzle (${difficultyParam}, level ${levelNumber}):`, err);
        res.status(500).json({ error: "Failed to fetch puzzle" });
    }
}));
/**
 * POST /puzzles/validate
 * Validate a puzzle pattern and find the shortest solution
 */
router.post("/validate", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { pattern } = req.body;
    console.log("POST /puzzles/validate, received pattern:", pattern);
    if (!pattern || !Array.isArray(pattern)) {
        console.log("Invalid pattern format");
        return res.status(400).json({ error: "Invalid pattern format" });
    }
    try {
        // Import fs to check for file existence
        const fs = require("fs");
        // Try multiple paths in order of preference
        const possiblePaths = [
            // JS in production locations
            path_1.default.resolve(process.cwd(), "dist/utils/solverWorker.js"),
            path_1.default.resolve(process.cwd(), "utils/solverWorker.js"),
            path_1.default.resolve(process.cwd(), "src/utils/solverWorker.js"),
            // TS files for development
            path_1.default.resolve(__dirname, "../utils/solverWorker.ts"),
        ];
        // Find the first path that exists
        let workerPath;
        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                workerPath = p;
                console.log(`Found solver at: ${workerPath}`);
                break;
            }
        }
        if (!workerPath) {
            console.error("Could not find solverWorker file at any expected location");
            throw new Error("Solver not found");
        }
        // Determine if we need ts-node based on the file extension
        const needsTsNode = workerPath.endsWith(".ts");
        // Configure worker options based on the file type
        const workerOptions = needsTsNode
            ? {
                execArgv: ["-r", "ts-node/register"],
                workerData: { pattern, size: 5, maxMoves: 25 },
            }
            : {
                workerData: { pattern, size: 5, maxMoves: 25 },
            };
        console.log(`Creating worker with path: ${workerPath}, needsTsNode: ${needsTsNode}`);
        const worker = new worker_threads_1.Worker(workerPath, workerOptions);
        const result = yield new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                worker.terminate();
                reject(new Error("Invalid puzzle! Solver timed out"));
            }, 15000);
            worker.on("message", (msg) => {
                clearTimeout(timeout);
                resolve(msg);
            });
            worker.on("error", (err) => {
                clearTimeout(timeout);
                reject(err);
            });
            worker.on("exit", (code) => {
                if (code !== 0) {
                    clearTimeout(timeout);
                    reject(new Error(`Worker stopped with exit code ${code}`));
                }
            });
        });
        if (result.error) {
            console.error("Error in solver worker:", result.error);
            return res.status(500).json({ error: "Failed to validate puzzle" });
        }
        const { solvable, minimumMoves, solution } = result;
        console.log("Validation result:", { solvable, minimumMoves, solution });
        res.json({ solvable, minimumMoves, solution });
    }
    catch (err) {
        console.error("Error validating puzzle:", err);
        if (err.message === "Invalid puzzle! Solver timed out") {
            return res
                .status(503)
                .json({ error: "Invalid puzzle! Solver timed out" });
        }
        res.status(500).json({ error: "Failed to validate puzzle" });
    }
}));
/**
 * POST /puzzles/create
 * Create a new custom puzzle
 */
router.post("/create", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const { pattern, minimumMoves } = req.body;
    if (!pattern || !Array.isArray(pattern)) {
        return res.status(400).json({ error: "Invalid pattern format" });
    }
    if (typeof minimumMoves !== "number" || minimumMoves < 1) {
        return res.status(400).json({ error: "Invalid minimum moves" });
    }
    try {
        // Find the next available custom level
        const { rows: levelRows } = yield database_1.default.query(`SELECT MAX((item->>'level')::int) AS max_level FROM (
         SELECT jsonb_array_elements(saved_maps) AS item
         FROM game_stats WHERE user_id = $1
       ) AS sub`, [req.user.id]);
        const nextLevel = ((_a = levelRows[0]) === null || _a === void 0 ? void 0 : _a.max_level)
            ? parseInt(levelRows[0].max_level) + 1
            : 1;
        // Append new custom puzzle entry with minMoves and gridSize
        yield database_1.default.query(`UPDATE game_stats
         SET saved_maps = COALESCE(saved_maps, '[]'::jsonb) || $2::jsonb
       WHERE user_id = $1`, [
            req.user.id,
            JSON.stringify({
                level: nextLevel,
                pattern,
                minMoves: minimumMoves,
                gridSize: 5,
            }),
        ]);
        // Fetch updated saved_maps for the user
        const { rows: statsRows } = yield database_1.default.query(`SELECT saved_maps FROM game_stats WHERE user_id = $1`, [req.user.id]);
        const updatedSavedMaps = ((_b = statsRows[0]) === null || _b === void 0 ? void 0 : _b.saved_maps) || [];
        res.status(201).json({
            success: true,
            level: nextLevel,
            difficulty: "custom",
            gridSize: 5,
            saved_maps: updatedSavedMaps,
        });
    }
    catch (err) {
        console.error("Error creating puzzle:", err);
        res.status(500).json({ error: "Failed to create puzzle" });
    }
}));
exports.default = router;
