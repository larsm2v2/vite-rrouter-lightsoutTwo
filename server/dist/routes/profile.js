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
const router = express_1.default.Router();
/**
 * POST /profile/reset-stats
 * Reset current_level to 1, clear best_combination and saved_maps for the logged-in user
 */
router.post('/reset-stats', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.user.id;
    try {
        yield database_1.default.query(`UPDATE game_stats
         SET current_level      = 1,
             best_combination   = '[]'::jsonb
       WHERE user_id = $1`, [userId]);
        res.json({ success: true });
    }
    catch (err) {
        console.error('Error resetting game stats:', err);
        res.status(500).json({ error: 'Failed to reset game stats' });
    }
}));
exports.default = router;
