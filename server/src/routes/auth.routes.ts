import { Router } from "express";
import passport from "passport";
import crypto from "crypto";
import { Request, Response } from "express";
import express from "express";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { hashPassword, comparePassword } from "../config/auth/password";
import pool from "../config/database";
import { generateToken } from "../utils/jwt";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

    // Set a timeout to prevent hanging
    const timeout = setTimeout(() => {
      console.error(
        "OAuth callback timeout - passport.authenticate is hanging"
      );
      if (!res.headersSent) {
        res.redirect(process.env.CLIENT_URL + "/login?error=oauth_timeout");
      }
    }, 10000); // 10 second timeout

    // Clear timeout when response is sent
    res.on("finish", () => clearTimeout(timeout));

    next();
  },
  (req, res, next) => {
    console.log("Calling passport.authenticate...");
    passport.authenticate("google", {
      failureRedirect: process.env.CLIENT_URL + "/login?error=auth_failed",
      failureMessage: true,
      session: true, // Need session for OAuth flow to work
    })(req, res, (err: any) => {
      console.log("passport.authenticate callback invoked");
      if (err) {
        console.error("Passport authenticate error:", err);
      }
      next(err);
    });
  },
  (req, res) => {
    try {
      console.log("Authentication successful, generating JWT");

      if (!req.user) {
        console.error("No user found after authentication");
        return res.redirect(process.env.CLIENT_URL + "/login?error=no_user");
      }

      // Generate JWT token
      const token = generateToken(req.user);
      console.log("JWT token generated, redirecting to client");

      // Clear the session after getting the user (we only need it for OAuth)
      req.logout((err) => {
        if (err) {
          console.error("Error logging out session:", err);
        }
        // Redirect to client with token
        res.redirect(process.env.CLIENT_URL + "/auth/callback?token=" + token);
      });
    } catch (error) {
      console.error("Error in OAuth callback handler:", error);
      res.redirect(
        process.env.CLIENT_URL + "/login?error=token_generation_failed"
      );
    }
  }
);

// Protected route example
router.get("/profile", (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  res.json(req.user as Express.User);
});

// Logout
router.post("/logout", (req, res) => {
  // With JWT, logout is handled client-side by removing the token
  // Server doesn't need to do anything
  res.json({ success: true, message: "Logout successful" });
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

    // Generate JWT token
    const token = generateToken(user);

    return res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
      },
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

    // Generate JWT token
    const token = generateToken(user);

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
      },
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

    // Generate JWT token for demo user
    const token = generateToken(demoUser);

    console.log("Demo login successful");

    return res.json({
      message: "Demo mode activated",
      token,
      user: {
        id: demoUser.id,
        email: demoUser.email,
        displayName: demoUser.display_name,
        isDemo: true,
      },
    });
  } catch (err) {
    console.error("Demo mode error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// PKCE OAuth verification endpoint
router.post("/verify", async (req: Request, res: Response) => {
  try {
    const { code, code_verifier } = req.body;

    if (!code || !code_verifier) {
      return res.status(400).json({ error: "Missing code or code_verifier" });
    }

    // Exchange authorization code for tokens with Google
    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: "https://ttlo-two.web.app/auth/callback",
      code_verifier,
    });

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", errorText);
      return res.status(401).json({ error: "Token exchange failed" });
    }

    const tokens = await tokenResponse.json();
    const { id_token } = tokens;

    if (!id_token) {
      return res.status(401).json({ error: "No id_token received from Google" });
    }

    // Verify the id_token with Google
    const ticket = await googleClient.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(401).json({ error: "Invalid id_token" });
    }

    const { sub: googleSub, email, name } = payload;

    if (!googleSub || !email) {
      return res
        .status(401)
        .json({ error: "Missing user information in id_token" });
    }

    // Find or create user in database
    let userResult = await pool.query(
      "SELECT id, email, display_name FROM users WHERE google_sub = $1",
      [googleSub]
    );

    let user;

    if (userResult.rows.length === 0) {
      // Create new user
      const displayName = name || email.split("@")[0];
      const createResult = await pool.query(
        `INSERT INTO users (google_sub, email, display_name, password, password_salt) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id, email, display_name`,
        [googleSub, email, displayName, null, null]
      );
      user = createResult.rows[0];

      // Create game stats for new user
      await pool.query("INSERT INTO game_stats (user_id) VALUES ($1)", [
        user.id,
      ]);
    } else {
      user = userResult.rows[0];
    }

    // Generate JWT token for the user
    const token = generateToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
      },
    });
  } catch (err) {
    console.error("OAuth verification error:", err);
    return res.status(500).json({ error: "Verification failed" });
  }
});

export default router;
