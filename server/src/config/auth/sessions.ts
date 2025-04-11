import session from "express-session";
import pgSession from "connect-pg-simple";
import pool from "../database"; // Import your existing PostgreSQL pool
import { env } from "process";

const PgSession = pgSession(session);

export const sessionConfig: session.SessionOptions = {
  store: new PgSession({
    pool: pool, // Reuse your existing connection pool
    tableName: "user_sessions", // Custom table name (optional)
    createTableIfMissing: true, // Automatically creates sessions table
    pruneSessionInterval: false, // Disable auto-pruning (or set to interval in seconds)
  }),
  secret: env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
  name: "sessionId", // Custom session cookie name (optional)
};
