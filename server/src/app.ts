import dotenv from "dotenv";
dotenv.config();

import express from "express";
import session from "express-session";
import passport from "./config/passport"; // Ensure this is correctly configured
import type { User } from "./types/User"; // Import the User interface
import crypto from "crypto";

const app = express();

const requiredEnvVars = [
	"SESSION_SECRET",
	"GOOGLE_CLIENT_ID",
	"GOGGLE_CLIENT_SECRET",
	"GOOGLE_CALLBACK_URL",
];

requiredEnvVars.forEach((varName) => {
	if (!process.env[varName]) {
		throw new Error(`${varName} is not defined in .env`);
	}
});
// Middleware
app.use(express.json());
app.use(
	session({
		secret: process.env.SESSION_SECRET as string,
		resave: false,
		saveUninitialized: false,
		cookie: {
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			httpOnly: true,
			maxAge: 24 * 60 * 60 * 1000, // 24 hours
		},
	})
);
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

app.get("/", async (req, res) => {
	res.redirect("/login");
});
// Redirect to Google OAuth Consent Screen
app.get("/auth/google", async (req, res) => {
	const state = crypto.randomBytes(16).toString("hex");
	req.session.state = state; // Save state to session
	const scopes = GOOGLE_OAUTH_SCOPES.join(" ");
	const GOOGLE_OAUTH_CONSENT_SCREEN_URL = `${GOOGLE_OAUTH_URL}?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${GOOGLE_CALLBACK_URL}&access_type=offline&response_type=code&state=${state}&scope=${scopes}`;
	res.redirect(GOOGLE_OAUTH_CONSENT_SCREEN_URL);
});

// Google OAuth Callback Route
app.get(
	"/google/callback",
	passport.authenticate("google", { failureRedirect: "/login" }),
	(req, res) => {
		// Successful authentication, redirect to profile
		res.redirect("/profile");
	}
);

// Profile Route
app.get("/profile", (req, res) => {
	if (!req.user) return res.redirect("/login");
	res.json(req.user);
});

// Logout Route
app.get("/logout", (req, res) => {
	req.logout(() => {
		res.redirect("/");
	});
});

app.get("/login", (req, res) => {
	res.send("Login Page");
});

// Start the server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

export default app;
