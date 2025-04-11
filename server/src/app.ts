import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import session from "express-session";
import passport from "./config/auth/passport"; // Ensure this is correctly configured
import { sessionConfig } from "./config/auth/sessions";
import * as crypto from "crypto";
import type { User } from "./types/entities/User"; // Import the User interface
import pool from "./config/database";
import { initializeDatabase } from "./config/schema";
import helmet from "helmet";
import authRoutes from "./routes/auth.routes";
import rateLimit from "express-rate-limit";
import csrf from "csrf-csrf";
import { param } from "express-validator";

const app = express();

const requiredEnvVars = [
  "SESSION_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_CALLBACK_URL",
  "CLIENT_URL",
];

requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    throw new Error(`${varName} is not defined in .env`);
  }
});

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL, // Your frontend URL
    credentials: true, // Required for cookies/sessions
  })
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  })
);
app.use(express.json());

app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());

// Google OAuth Configuration
const GOOGLE_OAUTH_URL = process.env.GOOGLE_OAUTH_URL;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL;
const GOOGLE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Hook into response finish to log the outcome
  res.on("finish", async () => {
    try {
      await pool.query(
        `INSERT INTO audit_log (
          user_id, action, endpoint, ip_address, 
          user_agent, status_code, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          req.user?.id || null,
          req.method,
          req.originalUrl,
          req.ip,
          req.headers["user-agent"],
          res.statusCode,
          JSON.stringify({
            params: req.params,
            query: req.query,
            durationMs: Date.now() - startTime,
          }),
        ]
      );
    } catch (err) {
      console.error(
        "Audit log failed:",
        err instanceof Error ? err.message : String(err)
      );
    }
  });

  next();
});
app.get("/", (req: Request, res: Response) => {
  res.redirect("/login");
});
// Redirect to Google OAuth Consent Screen
app.get("/auth/google", async (req: Request, res: Response) => {
  const state = crypto.randomBytes(16).toString("hex");
  req.session.state = state; // Save state to session
  const scopes = GOOGLE_OAUTH_SCOPES.join(" ");
  const GOOGLE_OAUTH_CONSENT_SCREEN_URL = `${GOOGLE_OAUTH_URL}?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${GOOGLE_CALLBACK_URL}&access_type=offline&response_type=code&state=${state}&scope=${scopes}`;
  res.redirect(GOOGLE_OAUTH_CONSENT_SCREEN_URL);
});

// Google OAuth Callback Route
app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
    successRedirect: "/profile",
    failureMessage: true,
  }),
  (req, res) => {
    // Successful authentication, redirect to profile
    res.redirect("/profile");
  }
);

// Protected routes
app.get("/profile", (req, res) => {
  if (!req.user) return res.redirect("/login");
  res.json(req.user);
});

app.get("/auth/check", (req, res) => {
  res.json({ authenticated: !!req.user });
});

app.get("/user", (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
  }
  res.json(req.user);
});

// Stats endpoint with validation
app.get(
  "/stats/:userId",
  param("userId").isInt().toInt(),
  async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    try {
      const stats = await pool.query(
        `SELECT 
          current_level AS "current_level",
          least_moves AS "leastMoves", 
          custom_levels AS "customLevels"
         FROM game_stats 
         WHERE user_id = $1`,
        [req.params.userId]
      );

      res.json(
        stats.rows[0] || {
          current_level: 1,
          leastMoves: [],
          customLevels: [],
        }
      );
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Database error" });
    }
  }
);
// Logout Route
app.get("/logout", (req, res) => {
  req.logout(() => {
    res.redirect("/");
  });
});

app.get("/login", (req, res) => {
  res.send("Login Page");
});

app.get("/sample-stats", (req, res) => {
  if (!req.user) res.status(401).json({ error: "Unauthorized" });

  res.json({
    current_level: 5,
    leastMoves: 18,
  });
});

// Enhanced logout
app.post("/auth/logout", (req: Request, res: Response) => {
  req.logout(() => {
    req.session?.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

// Start the server
async function startServer() {
  await initializeDatabase();
  const PORT = process.env.PORT || 8000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

startServer();
export default app;
