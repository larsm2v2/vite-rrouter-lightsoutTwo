import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import session from "express-session";
import passport, { configurePassport } from "./config/auth/passport";
import { sessionConfig } from "./config/auth/sessions";
import * as crypto from "crypto";
import type { User } from "./types/entities/User";
import pool from "./config/database";
import { initializeDatabase } from "./config/schema";
import helmet from "helmet";
import authRoutes from "./routes/auth.routes";
import puzzleRoutes from "./routes/puzzles.routes";
import rateLimit from "express-rate-limit";
import { param } from "express-validator";
import profileRoutes from "./routes/profile";
import cookieParser from "cookie-parser";

const app = express();
app.set("trust proxy", 1);
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

// Configure Passport
configurePassport();

// Create different Helmet configurations for different browsers
const safariHelmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://apis.google.com", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", process.env.CLIENT_URL || ""],
      imgSrc: ["'self'", "data:", "https://accounts.google.com"],
      fontSrc: ["'self'", ":", "https://fonts.gstatic.com"],
      frameSrc: ["https://accounts.google.com"],
      objectSrc: ["'none'"],
      // No require-trusted-types-for directive for Safari
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
});

const standardHelmetConfig = helmet();

// Apply the appropriate Helmet config based on browser detection
app.use((req: Request, res: Response, next: NextFunction) => {
  const userAgent = req.headers["user-agent"] || "";
  const isSafari =
    typeof userAgent === "string" &&
    userAgent.includes("Safari") &&
    !userAgent.includes("Chrome");

  console.log(
    `Browser detection: ${isSafari ? "Safari" : "Non-Safari"} browser`
  );

  if (isSafari) {
    return safariHelmetConfig(req, res, next);
  } else {
    return standardHelmetConfig(req, res, next);
  }
});

// Strip unsupported CSP directives for browsers that don't know them (Safari)
app.use((req: Request, res: Response, next: NextFunction) => {
  try {
    const ua = String(req.get("user-agent") || "");
    const origin = String(req.get("origin") || "");
    const isSafari = ua.includes("Safari") && !ua.includes("Chrome");

    // Debug — will help confirm exact Origin/UA values in Cloud Run logs
    console.log("Request UA:", ua);
    console.log("Request Origin:", origin);

    // Read the CSP set by Helmet (if any)
    const headerName = "content-security-policy";
    const headerValue = res.getHeader(headerName) as
      | string
      | string[]
      | undefined;

    if (headerValue && isSafari) {
      const csp = Array.isArray(headerValue)
        ? headerValue.join("; ")
        : String(headerValue);
      // Remove `require-trusted-types-for` (and any trailing token) for Safari
      const cleaned = csp
        .replace(/;?\s*require-trusted-types-for[^;]*/gi, "")
        .trim();
      if (cleaned) {
        res.setHeader(headerName, cleaned);
      } else {
        res.removeHeader(headerName);
      }
    }
  } catch (err) {
    // don't throw here — log and continue
    console.warn("Header-cleanup middleware error:", err);
  }
  next();
});

const allowedOrigins = [
  process.env.CLIENT_URL?.replace(/\/$/, ""),
  "https://ttlo-two.web.app",
  "http://localhost:5173",
  "http://localhost:5174",
].filter(Boolean);

// Debug incoming origins from browsers
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = String(req.headers.origin || "");
  console.log("Incoming request Origin:", origin);
  next();
});

const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    // allow non-browser requests (no Origin header)
    if (!origin) return callback(null, true);
    const normalized = origin.replace(/\/$/, "");
    const allowed = allowedOrigins.includes(normalized);
    console.log("CORS check:", { origin, normalized, allowed });
    if (allowed) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Set-Cookie",
  ],
  exposedHeaders: [
    "Content-Type",
    "Authorization",
    "X-RateLimit-Reset",
    "X-Requested-With",
    "Accept",
    "Set-Cookie",
  ],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

app.options("*", cors(corsOptions));
// app.options("*", (req, res) => {
//   const origin = req.header("origin") || "";
//   const normalized = origin.replace(/\/$/, "");
//   if (origin && allowedOrigins.includes(normalized)) {
//     res.setHeader("Access-Control-Allow-Origin", origin);
//     res.setHeader("Access-Control-Allow-Credentials", "true");
//   }
//   res.setHeader("Vary", "Origin");
//   res.setHeader(
//     "Access-Control-Allow-Methods",
//     "GET,POST,PUT,PATCH,DELETE,OPTIONS"
//   );
//   res.setHeader(
//     "Access-Control-Allow-Headers",
//     "Content-Type,Authorization,X-Requested-With,Accept,Set-Cookie"
//   );
//   return res.sendStatus(204);
// });

// Ensure this runs after cors() but before your route handlers
app.use((req: Request, res: Response, next: NextFunction) => {
  try {
    const origin = String(req.get("origin") || "");
    const normalized = origin.replace(/\/$/, "");
    const allowedOrigins = [
      process.env.CLIENT_URL?.replace(/\/$/, ""),
      "https://ttlo-two.web.app",
      "http://localhost:5173",
      "http://localhost:5174",
    ].filter(Boolean);

    if (origin && allowedOrigins.includes(normalized)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Vary", "Origin");
    }

    // For preflight requests, set required headers and end early
    if (req.method === "OPTIONS") {
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET,POST,PUT,PATCH,DELETE,OPTIONS"
      );
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type,Authorization,X-Requested-With,Accept,Set-Cookie"
      );
      return res.status(204).end();
    }
  } catch (err) {
    console.warn("Sync CORS middleware error:", err);
  }
  next();
});

app.use(express.json());
app.use(cookieParser());
// Add URL-encoded middleware to handle form data
app.use(express.urlencoded({ extended: true }));

app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());

// Add request logger middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  console.log("Headers:", req.headers);
  next();
});
const apiRouter = express.Router();
app.use("/api", apiRouter);

// DEBUG middleware — add only temporarily
apiRouter.use((req, _res, next) => {
  console.log("DEBUG sessionID:", (req as any).sessionID);
  console.log("DEBUG req.session (summary):", {
    hasSession: !!req.session,
    keys: req.session ? Object.keys(req.session) : null,
  });
  console.log("DEBUG req.user:", !!(req as any).user);
  next();
});
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // Increased limit
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Explicitly return boolean (never undefined)
    return (
      req.path === "/auth/check" &&
      req.method === "GET" &&
      !!req.get("Referer")?.includes("/login")
    );
  },
});
apiRouter.use(authRateLimiter);
apiRouter.use((req, res, next) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, private, must-revalidate"
  );
  res.setHeader("Pragma", "no-cache");
  next();
});

apiRouter.use((req, _res, next) => {
  console.log("cookie header:", req.headers.cookie);
  console.log(
    "sessionID:",
    (req as any).sessionID,
    "req.user:",
    (req as any).user
  );
  next();
});
// Mount auth routes
apiRouter.use("/auth", authRoutes);

// Mount puzzle routes
apiRouter.use("/puzzles", puzzleRoutes);

// Mount profile routes
apiRouter.use("/profile", profileRoutes);

// Google OAuth Configuration
const GOOGLE_OAUTH_URL = process.env.GOOGLE_OAUTH_URL;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL;
const GOOGLE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

//Audit Log
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Hook into response finish to log the outcome
  res.on("finish", async () => {
    try {
      // Skip audit logging for test routes
      if (process.env.NODE_ENV === "test" && req.path.startsWith("/test/")) {
        return;
      }

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
      // Only log errors in non-test environment
      if (process.env.NODE_ENV !== "test") {
        console.error(
          "Audit log failed:",
          err instanceof Error ? err.message : String(err)
        );
      }
    }
  });

  next();
});
app.get("/", (req: Request, res: Response) => {
  res.redirect(process.env.CLIENT_URL + "/login");
});

apiRouter.get("/__routes", (_req, res) => {
  try {
    const routes: string[] = [];
    // inspect stack to enumerate routes and methods
    (apiRouter as any).stack.forEach((layer: any) => {
      if (layer.route && layer.route.path) {
        const methods = Object.keys(layer.route.methods)
          .map((m) => m.toUpperCase())
          .join(",");
        routes.push(`${methods} /api${layer.route.path}`);
      } else if (
        layer.name === "router" &&
        layer.handle &&
        layer.handle.stack
      ) {
        // nested routers (e.g. authRoutes)
        layer.handle.stack.forEach((l: any) => {
          if (l.route && l.route.path) {
            const methods = Object.keys(l.route.methods)
              .map((m: string) => m.toUpperCase())
              .join(",");
            routes.push(
              `${methods} /api${layer.regexp?.toString() || ""}${l.route.path}`
            );
          }
        });
      }
    });
    res.json({ routes });
  } catch (err) {
    res
      .status(500)
      .json({ error: "failed to enumerate routes", details: String(err) });
  }
});

apiRouter.use("/auth", authRoutes);

// Health and API routes moved to apiRouter so hosting rewrites to /api/* work
apiRouter.get("/health", (req, res) => {
  res.json({
    status: "ok",
    env: process.env.NODE_ENV,
    port: process.env.PORT || 8080,
    clientUrl: process.env.CLIENT_URL,
    timestamp: new Date().toISOString(),
  });
});

// Protected routes
apiRouter.get("/profile", async (req, res) => {
  // For tests, add debug logging
  if (process.env.NODE_ENV === "test") {
    console.log("Profile request:", {
      hasUser: !!req.user,
      user: req.user,
      sessionID: req.sessionID,
      hasSession: !!req.session,
    });
  }

  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  try {
    // Get user profile
    const userResult = await pool.query(
      `SELECT id, email, display_name, avatar 
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    // Get game stats
    const statsResult = await pool.query(
      `SELECT current_level, best_combination, saved_maps
       FROM game_stats WHERE user_id = $1`,
      [req.user.id]
    );

    // Base stats (ensure defaults)
    const baseStats = statsResult.rows[0] || {
      current_level: 1,
      best_combination: [],
      saved_maps: [],
    };

    // Fetch minimum moves for all classic levels
    const { rows: minMovesRows } = await pool.query(
      `SELECT level, min_moves FROM classic_puzzles WHERE difficulty = '' OR difficulty = 'classic'`
    );
    const minMovesMap: { [level: number]: number } = {};
    minMovesRows.forEach((row: any) => {
      minMovesMap[row.level] = row.min_moves;
    });

    res.json({
      user: userResult.rows[0],
      stats: {
        ...baseStats,
        min_moves: minMovesMap,
      },
    });
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

apiRouter.get("/auth/check", (req, res) => {
  if (!req.user) {
    console.log("Full Request: ", req);
    console.log("Requested User: ", req.user);
    return res.status(200).json({ authenticated: false });
  }

  // Return minimal user data for frontend
  res.json({
    authenticated: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      display_name: req.user.display_name,
    },
  });
});

apiRouter.get("/user", (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  res.json(req.user);
});

// Stats endpoint with validation
apiRouter.get(
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
apiRouter.get("/logout", (req, res) => {
  req.logout(() => {
    res.redirect("/");
  });
});

apiRouter.get("/sample-stats", (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  res.json({
    current_level: 5,
    leastMoves: 18,
  });
});

// Enhanced logout
apiRouter.post("/auth/logout", (req: Request, res: Response) => {
  req.logout(() => {
    req.session?.destroy(() => {
      res.clearCookie("sessionId");
      res.json({ success: true });
    });
  });
});

apiRouter.post("/game/progress", async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  try {
    const { level, moves, completed } = req.body;

    // Validate input
    if (!level || typeof level !== "number") {
      return res.status(400).json({ error: "Invalid level" });
    }

    // First, get the current level
    const userStatsResult = await pool.query(
      `SELECT current_level, best_combination 
       FROM game_stats WHERE user_id = $1`,
      [req.user.id]
    );

    const userStats = userStatsResult.rows[0];
    const currentLevel = userStats?.current_level || 1;

    // Only update level if the completed level is the current one
    // and we're moving to the next level
    let newLevel = currentLevel;
    if (completed && level === currentLevel) {
      newLevel = currentLevel + 1;
    }

    // Store the moves as best combination if better than current
    // or if no best combination exists for this level
    let bestCombination = userStats?.best_combination || [];
    if (Array.isArray(bestCombination)) {
      // If this level doesn't have a best combination yet or new moves is better
      if (!bestCombination[level - 1] || moves < bestCombination[level - 1]) {
        // Create a copy of the array with the right length
        const newBestCombination = [...bestCombination];
        // Make sure the array is long enough
        while (newBestCombination.length < level) {
          newBestCombination.push(null);
        }
        // Set the new best for this level
        newBestCombination[level - 1] = moves;
        bestCombination = newBestCombination;
      }
    }

    // Update the database
    await pool.query(
      `UPDATE game_stats
       SET current_level = $1, best_combination = $2
       WHERE user_id = $3`,
      [newLevel, JSON.stringify(bestCombination), req.user.id]
    );

    res.json({
      success: true,
      current_level: newLevel,
      best_combination: bestCombination,
    });
  } catch (err) {
    console.error("Game progress update error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // Log the error with stack trace
  console.error("Server error:", err);
  console.error("Error stack:", err.stack);

  // For OAuth errors, add more detailed logging
  if (req.path.includes("/auth/google") || req.path.includes("/callback")) {
    console.error("OAuth error details:", {
      path: req.path,
      method: req.method,
      query: req.query,
      session: req.session ? "Session exists" : "No session",
      user: req.user ? "User exists" : "No user",
    });
  }

  // Don't expose error details in production
  if (process.env.NODE_ENV === "production") {
    return res.status(500).json({ error: "Internal Server Error" });
  } else {
    // In development, return the error details
    return res.status(500).json({
      error: "Internal Server Error",
      message: err.message,
      stack: err.stack,
    });
  }
});

// Initialize database for tests
if (process.env.NODE_ENV === "test") {
  initializeDatabase()
    .then(() => console.log("✅ Test database initialized"))
    .catch((err) =>
      console.error("❌ Test database initialization failed:", err)
    );
}

// Test routes - only available in test environment
if (process.env.NODE_ENV === "test") {
  app.post(
    "/test/mock-login",
    (req: Request, res: Response, next: NextFunction) => {
      console.log("Mock login request:", {
        userId: req.body.userId,
        sessionID: req.sessionID,
      });

      // Create test user object
      const testUser = {
        id: req.body.userId,
        email: "test@example.com",
        display_name: "Test User",
      };

      // Login with the test user
      req.login(testUser, { session: true }, (err) => {
        if (err) {
          console.error("Login error:", err);
          return res.status(500).json({ error: err.message });
        }

        // Save the session
        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
            return res.status(500).json({ error: err.message });
          }

          console.log("Login successful:", {
            user: req.user,
            sessionID: req.sessionID,
            sessionCookie: req.sessionID && res.getHeader("set-cookie"),
          });

          // Return success with the cookie
          return res.status(200).json({ success: true });
        });
      });
    }
  );
}

// Test route for cookie debugging
app.get("/test/cookie", (req, res) => {
  // Set a test cookie
  res.cookie("test-cookie", "hello", {
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    httpOnly: true,
  });

  // Return info about the request
  res.json({
    cookies: req.cookies,
    user: req.user ? { id: req.user.id, email: req.user.email } : null,
    userAgent: req.headers["user-agent"],
    isSafari:
      req.headers["user-agent"]?.includes("Safari") &&
      !req.headers["user-agent"]?.includes("Chrome"),
  });
});

async function ensureDatabaseInitialized() {
  try {
    // Try to query the users table
    await pool.query("SELECT 1 FROM users LIMIT 1");
    console.log("✅ Database already initialized.");
  } catch (error) {
    console.warn(
      "⚠️ Database not initialized. Running initializeDatabase()..."
    );
    await initializeDatabase();
  }
}

// Start the server
async function startServer() {
  // bind to the Cloud Run provided PORT immediately (fallback 8080)
  const PORT = Number(process.env.PORT) || 8080;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log("process.env.PORT:", process.env.PORT);
  });
  ensureDatabaseInitialized()
    .then(() => console.log("Database ensured/initialized"))
    .catch((err) =>
      console.error(
        "Database initialization error (non-fatal at startup):",
        err
      )
    );
}

if (process.env.NODE_ENV !== "test") {
  startServer(); // Only start server when not testing
}

export default app;
