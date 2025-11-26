import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || process.env.SESSION_SECRET || "fallback-secret";
const JWT_EXPIRY = "7d"; // 7 days

export interface JwtPayload {
  userId: number;
  email: string;
  displayName: string;
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(user: {
  id: number;
  email: string;
  display_name: string;
}): string {
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    displayName: user.display_name,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
    issuer: "ttlo-backend",
  });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: "ttlo-backend",
    }) as JwtPayload;
    return decoded;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(
  authHeader: string | undefined
): string | null {
  if (!authHeader) return null;

  // Support both "Bearer <token>" and just "<token>"
  const parts = authHeader.split(" ");
  if (parts.length === 2 && parts[0] === "Bearer") {
    return parts[1];
  } else if (parts.length === 1) {
    return parts[0];
  }

  return null;
}
