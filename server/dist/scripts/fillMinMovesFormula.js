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
function fillMinMovesFormula() {
    return __awaiter(this, void 0, void 0, function* () {
        const client = yield database_1.default.connect();
        try {
            const { rowCount } = yield client.query(`UPDATE classic_puzzles
       SET min_moves = 6 + FLOOR((level-1)::numeric / 5)::int
       WHERE difficulty = 'classic';`);
            console.log(`✅ Updated min_moves for ${rowCount} classic puzzles`);
        }
        catch (err) {
            console.error('❌ Error running fillMinMovesFormula:', err);
        }
        finally {
            client.release();
            process.exit(0);
        }
    });
}
fillMinMovesFormula();
