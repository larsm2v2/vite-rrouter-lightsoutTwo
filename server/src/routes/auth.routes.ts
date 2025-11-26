import { Router } from "express";
import passport from "passport";
import crypto from "crypto";
import { Request, Response } from "express";
import express from "express";
import jwt from "jsonwebtoken";
import { hashPassword, comparePassword } from "../config/auth/password";
import pool from "../config/database";

declare module "express-session" {
  interface SessionData {
    oauthState?: string; // Add this line
  }
}
const router = Router();

// Simple test endpoint to verify request body parsing
router.post("/test-body", (req: Request, res: Response) => {
  console.log("Test body endpoint hit");
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);
  console.log("Body type:", typeof req.body);

  res.status(200).json({
    receivedBody: req.body,
    bodyKeys: Object.keys(req.body),
    contentType: req.headers["content-type"],
  });
});

// Initiate Google auth
router.get("/google", (req: Request, res: Response, next) => {
  // Generate random state for OAuth
  const state = crypto.randomBytes(16).toString("hex");
  req.session.oauthState = state;

  passport.authenticate("google", {
    state,
    prompt: "select_account", // Force account selection
  })(req, res, next);
});

// Google callback
router.get(
  "/google/callback",
  (req, res, next) => {
    console.log("OAuth callback received:", {
      state: req.query.state,
      code:
        typeof req.query.code === "string"
          ? req.query.code.substring(0, 10) + "..."
          : req.query.code,
      error: req.query.error,
    });
    next();
  },
  passport.authenticate("google", {
    failureRedirect: process.env.CLIENT_URL + "/login",
    failureMessage: true,
  }),
  (req, res) => {
    console.log("Authentication successful, redirecting to profile");
    res.redirect(process.env.CLIENT_URL + "/profile");
  }
);

// Protected route example
router.get("/profile", (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  res.json(req.user as Express.User);
});

// Logout
router.post("/logout", (req, res) => {
  req.logout(() => {
    req.session?.destroy(() => {
      // Clear the correct cookie name that matches sessionConfig
      res.clearCookie("connect.sid", {
        path: "/",
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        httpOnly: true,
      });
      res.json({ success: true });
    });
  });
});

// Registration route
router.post("/register", async (req: Request, res: Response) => {
  try {
    // Extract fields
    const { email, password, display_name } = req.body;

    console.log("Registration request:", {
      email: email,
      hasPassword: !!password,
      display_name: display_name,
    });

    // Basic validation
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    // Use email as display name if not provided
    const userDisplayName = display_name || email.split("@")[0];

    // Check if email already exists
    const emailCheckResult = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (emailCheckResult.rows.length > 0) {
      return res.status(400).json({ message: "Email already in use" });
    }

    // Hash password
    const { hash, salt } = await hashPassword(password);

    // Insert new user with password
    const result = await pool.query(
      `INSERT INTO users (google_sub, email, password, password_salt, display_name) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, email, display_name`,
      [null, email, hash, salt, userDisplayName]
    );

    const user = result.rows[0];

    // Create game stats for the user
    await pool.query("INSERT INTO game_stats (user_id) VALUES ($1)", [user.id]);

    // Auto-login the user
    req.login(user, (err) => {
      if (err) {
        console.error("Auto-login error:", err);
        return res.status(201).json({
          message: "User registered successfully but login failed",
          user: {
            id: user.id,
            email: user.email,
            displayName: user.display_name,
          },
        });
      }

      return res.status(201).json({
        message: "User registered and logged in successfully",
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
        },
      });
    });
  } catch (err) {
    console.error("Registration error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Login route
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    // Find user
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];

    // Check if this is a password-based account
    if (!user.password || !user.password_salt) {
      return res
        .status(401)
        .json({ message: "This account uses Google login" });
    }

    // Verify password
    const isMatch = await comparePassword(
      password,
      user.password,
      user.password_salt
    );

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Set session
    req.login(user, (err) => {
      if (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: "Internal server error" });
      }

      return res.json({
        message: "Login successful",
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
        },
      });
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Demo mode for portfolio - instant access without signup
router.post("/demo", async (req: Request, res: Response) => {
  try {
    console.log("Demo login request received");

    // Find or create demo user
    let demoUserResult = await pool.query(
      "SELECT id, email, display_name FROM users WHERE email = $1",
      ["demo@portfolio.local"]
    );

    let demoUser;

    if (demoUserResult.rows.length === 0) {
      console.log("Creating new demo user");
      // Create demo user
      const createResult = await pool.query(
        `INSERT INTO users (google_sub, email, display_name, password, password_salt) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id, email, display_name`,
        [null, "demo@portfolio.local", "Portfolio Demo User", null, null]
      );
      demoUser = createResult.rows[0];

      // Create game stats for demo user
      await pool.query("INSERT INTO game_stats (user_id) VALUES ($1)", [
        demoUser.id,
      ]);
      console.log("Demo user created with ID:", demoUser.id);
    } else {
      demoUser = demoUserResult.rows[0];
      console.log("Using existing demo user with ID:", demoUser.id);
    }

    // Log in the demo user and establish session
    req.login(demoUser, (err) => {
      if (err) {
        console.error("Demo login error:", err);
        return res.status(500).json({ message: "Demo mode failed" });
      }

      // Explicitly save session before responding
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error("Session save error:", saveErr);
        }

        console.log("Demo login successful, sessionID:", req.sessionID);

        return res.json({
          message: "Demo mode activated",
          user: {
            id: demoUser.id,
            email: demoUser.email,
            displayName: demoUser.display_name,
            isDemo: true,
          },
        });
      });
    });
  } catch (err) {
    console.error("Demo mode error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
