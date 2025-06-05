import express, { Request, Response } from "express";
import pool from "../config/database";
import { Worker } from "worker_threads";
import path from "path";

const router = express.Router();
const isDev = process.env.NODE_ENV === "development";
/**
 * GET /puzzles
 * Get all puzzle difficulties and levels
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
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
    const result: { [key: string]: number[] } = {};
    for (const row of rows) {
      if (!result[row.difficulty]) {
        result[row.difficulty] = [];
      }
      result[row.difficulty].push(row.level);
    }

    res.json(result);
  } catch (err) {
    console.error("Error fetching puzzles:", err);
    res.status(500).json({ error: "Failed to fetch puzzles" });
  }
});

/**
 * GET /puzzles/:difficulty
 * Get all puzzles for a specific difficulty
 */
router.get("/:difficulty", async (req: Request, res: Response) => {
  const { difficulty } = req.params;
  // Handle custom puzzles via saved_maps in game_stats
  if (difficulty === "custom") {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    try {
      const { rows } = await pool.query(
        `SELECT saved_maps FROM game_stats WHERE user_id = $1`,
        [req.user.id]
      );
      const saved: any[] = rows[0]?.saved_maps || [];
      const result: { [key: string]: number[] } = {};
      saved.forEach((m) => (result[`level${m.level}`] = m.pattern));
      return res.json(result);
    } catch (err) {
      console.error("Error fetching custom puzzles:", err);
      return res.status(500).json({ error: "Failed to fetch custom puzzles" });
    }
  }
  const validDifficulties = ["easy", "medium", "hard", "expert", "classic", ""];

  // Handle empty difficulty parameter
  const difficultyParam =
    difficulty === "%20" || difficulty === " " ? "" : difficulty;

  // Don't check validDifficulties for empty string - just proceed
  if (difficultyParam !== "" && !validDifficulties.includes(difficultyParam)) {
    return res
      .status(404)
      .json({ error: `Difficulty '${difficultyParam}' not found` });
  }

  try {
    // Classic puzzles
    const { rows } = await pool.query(
      `SELECT level, pattern FROM classic_puzzles WHERE difficulty = $1 ORDER BY level`,
      [difficultyParam]
    );

    // Format the response similar to the original structure
    const result: { [key: string]: number[] } = {};
    for (const row of rows) {
      result[`level${row.level}`] = row.pattern;
    }

    res.json(result);
  } catch (err) {
    console.error(`Error fetching ${difficultyParam} puzzles:`, err);
    res.status(500).json({ error: "Failed to fetch puzzles" });
  }
});

/**
 * GET /puzzles/:difficulty/:level
 * Get a specific puzzle by difficulty and level
 */
router.get("/:difficulty/:level", async (req: Request, res: Response) => {
  const { difficulty, level } = req.params;
  // Custom single puzzle
  if (difficulty === "custom") {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const levelNumber = parseInt(level.replace("level", ""));
    const { rows } = await pool.query(
      `SELECT saved_maps FROM game_stats WHERE user_id=$1`,
      [req.user.id]
    );
    const saved: any[] = rows[0]?.saved_maps || [];
    const found = saved.find((m) => m.level === levelNumber);
    if (!found) {
      return res.status(404).json({ error: "Custom puzzle not found" });
    }
    // Return full object with pattern, minMoves, gridSize
    return res.json(found);
  }
  const validDifficulties = ["easy", "medium", "hard", "expert", "classic", ""];
  // Handle empty difficulty parameter
  const difficultyParam =
    difficulty === "%20" || difficulty === " " ? "" : difficulty;

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
    const { rows } = await pool.query(
      `SELECT pattern FROM classic_puzzles WHERE difficulty = $1 AND level = $2`,
      [difficultyParam, levelNumber]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: `Puzzle with difficulty '${difficultyParam}' and level ${levelNumber} not found`,
      });
    }

    res.json(rows[0].pattern);
  } catch (err) {
    console.error(
      `Error fetching puzzle (${difficultyParam}, level ${levelNumber}):`,
      err
    );
    res.status(500).json({ error: "Failed to fetch puzzle" });
  }
});

/**
 * POST /puzzles/validate
 * Validate a puzzle pattern and find the shortest solution
 */
router.post("/validate", async (req: Request, res: Response) => {
  const { pattern } = req.body;
  console.log("POST /puzzles/validate, received pattern:", pattern);

  if (!pattern || !Array.isArray(pattern)) {
    console.log("Invalid pattern format");
    return res.status(400).json({ error: "Invalid pattern format" });
  }

  try {
    // Fix the worker path resolution for both dev and production
    let workerPath;
    if (isDev) {
      // Development: Use TypeScript file
      workerPath = path.resolve(__dirname, "../utils/solverWorker.ts");
      console.log("Dev worker path:", workerPath);
    } else {
      // Production: Use JavaScript file with correct path
      // In Cloud Run, files are in /app/dist/
      workerPath = path.resolve(process.cwd(), "./dist/utils/solverWorker.js");
      console.log("Prod worker path:", workerPath);
    }

    // Only use ts-node in development
    const workerOptions = isDev
      ? {
          execArgv: ["-r", "ts-node/register"],
          workerData: { pattern, size: 5, maxMoves: 25 },
        }
      : {
          workerData: { pattern, size: 5, maxMoves: 25 },
        };

    console.log("Creating worker with path:", workerPath);
    const worker = new Worker(workerPath, workerOptions);

    const result: any = await new Promise((resolve, reject) => {
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
  } catch (err: any) {
    console.error("Error validating puzzle:", err);
    if (err.message === "Invalid puzzle! Solver timed out") {
      return res
        .status(503)
        .json({ error: "Invalid puzzle! Solver timed out" });
    }

    res.status(500).json({ error: "Failed to validate puzzle" });
  }
});

/**
 * POST /puzzles/create
 * Create a new custom puzzle
 */
router.post("/create", async (req: Request, res: Response) => {
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
    const { rows: levelRows } = await pool.query(
      `SELECT MAX((item->>'level')::int) AS max_level FROM (
         SELECT jsonb_array_elements(saved_maps) AS item
         FROM game_stats WHERE user_id = $1
       ) AS sub`,
      [req.user.id]
    );
    const nextLevel = levelRows[0]?.max_level
      ? parseInt(levelRows[0].max_level) + 1
      : 1;

    // Append new custom puzzle entry with minMoves and gridSize
    await pool.query(
      `UPDATE game_stats
         SET saved_maps = COALESCE(saved_maps, '[]'::jsonb) || $2::jsonb
       WHERE user_id = $1`,
      [
        req.user.id,
        JSON.stringify({
          level: nextLevel,
          pattern,
          minMoves: minimumMoves,
          gridSize: 5,
        }),
      ]
    );

    // Fetch updated saved_maps for the user
    const { rows: statsRows } = await pool.query(
      `SELECT saved_maps FROM game_stats WHERE user_id = $1`,
      [req.user.id]
    );
    const updatedSavedMaps = statsRows[0]?.saved_maps || [];

    res.status(201).json({
      success: true,
      level: nextLevel,
      difficulty: "custom",
      gridSize: 5,
      saved_maps: updatedSavedMaps,
    });
  } catch (err) {
    console.error("Error creating puzzle:", err);
    res.status(500).json({ error: "Failed to create puzzle" });
  }
});

export default router;
