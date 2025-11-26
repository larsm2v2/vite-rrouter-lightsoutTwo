import { Request, Response, NextFunction } from "express";
import { verifyToken, extractTokenFromHeader } from "../utils/jwt";
import pool from "../config/database";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        display_name: string;
      };
    }
  }
}

/**
 * Middleware to authenticate JWT tokens
 */
export async function authenticateJWT(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    // No token provided - continue without user (route can handle auth requirement)
    return next();
  }

  const payload = verifyToken(token);

  if (!payload) {
    // Invalid token
    return next();
  }

  try {
    // Fetch fresh user data from database
    const result = await pool.query(
      `SELECT id, email, display_name FROM users WHERE id = $1`,
      [payload.userId]
    );

    if (result.rows.length === 0) {
      // User no longer exists
      return next();
    }

    // Attach user to request
    req.user = result.rows[0];
    next();
  } catch (error) {
    console.error("Error fetching user in JWT middleware:", error);
    next();
  }
}

/**
 * Middleware to require authentication
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
