import { Router } from "express";
import passport from "passport";
import { doubleCsrf } from "csrf-csrf";
import { Request, Response } from "express";

const router = Router();
const { generateToken } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET!,
});

// Initiate Google auth
router.get("/google", (req: Request, res: Response, next) => {
  // Generate CSRF token for OAuth state
  const state = generateToken(req, res);
  passport.authenticate("google", {
    state,
    prompt: "select_account", // Force account selection
  })(req, res, next);
});

// Google callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
    failureMessage: true,
  }),
  (req, res) => {
    res.redirect("/profile");
  }
);

// Protected route example
router.get("/profile", (req, res) => {
  if (!req.user) return res.redirect("/login");
  res.json(req.user as Express.User);
});

// Logout
router.post("/logout", (req, res) => {
  req.logout(() => {
    req.session?.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });
});

export default router;
