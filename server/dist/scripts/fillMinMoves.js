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
const puzzleSolver_1 = require("../utils/puzzleSolver");
function fillMinMoves() {
    return __awaiter(this, void 0, void 0, function* () {
        const client = yield database_1.default.connect();
        try {
            const { rows } = yield client.query(`SELECT id, pattern FROM classic_puzzles`);
            for (const row of rows) {
                const { id, pattern } = row;
                // Solve puzzle (5x5, allow up to 25 moves)
                const { solvable, minimumMoves } = (0, puzzleSolver_1.solvePuzzle)(pattern, 5, 25);
                if (solvable && typeof minimumMoves === 'number') {
                    yield client.query(`UPDATE classic_puzzles SET min_moves = $1 WHERE id = $2`, [minimumMoves, id]);
                    console.log(`Puzzle ${id}: min_moves set to ${minimumMoves}`);
                }
                else {
                    console.warn(`Puzzle ${id} not solvable, skipping update`);
                }
            }
            console.log('✅ min_moves update complete for all puzzles');
        }
        catch (err) {
            console.error('❌ Error running fillMinMoves:', err);
        }
        finally {
            client.release();
            process.exit(0);
        }
    });
}
fillMinMoves();
