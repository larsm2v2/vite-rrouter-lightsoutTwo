import express, { Request, Response } from 'express';
import pool from '../config/database';

const router = express.Router();

/**
 * POST /profile/reset-stats
 * Reset current_level to 1, clear best_combination and saved_maps for the logged-in user
 */
router.post('/reset-stats', async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const userId = (req.user as any).id;
  try {
    await pool.query(
      `UPDATE game_stats
         SET current_level      = 1,
             best_combination   = '[]'::jsonb
       WHERE user_id = $1`,
      [userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error resetting game stats:', err);
    res.status(500).json({ error: 'Failed to reset game stats' });
  }
});

export default router;
