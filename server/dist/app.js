"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_session_1 = __importDefault(require("express-session"));
const passport_1 = __importDefault(require("./config/passport")); // Ensure this is correctly configured
const crypto_1 = __importDefault(require("crypto"));
const database_1 = __importDefault(require("./config/database"));
const app = (0, express_1.default)();
const requiredEnvVars = [
    "SESSION_SECRET",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_CALLBACK_URL",
];
requiredEnvVars.forEach((varName) => {
    if (!process.env[varName]) {
        throw new Error(`${varName} is not defined in .env`);
    }
});
// Middleware
app.use((0, cors_1.default)({
    origin: "http://localhost:5173", // Your frontend URL
    credentials: true, // Required for cookies/sessions
}));
app.use(express_1.default.json());
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
}));
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
// Google OAuth Configuration
const GOOGLE_OAUTH_URL = process.env.GOOGLE_OAUTH_URL;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL;
const GOOGLE_OAUTH_SCOPES = [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
];
app.get("/", (req, res) => {
    res.redirect("/login");
});
// Redirect to Google OAuth Consent Screen
app.get("/auth/google", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const state = crypto_1.default.randomBytes(16).toString("hex");
    req.session.state = state; // Save state to session
    const scopes = GOOGLE_OAUTH_SCOPES.join(" ");
    const GOOGLE_OAUTH_CONSENT_SCREEN_URL = `${GOOGLE_OAUTH_URL}?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${GOOGLE_CALLBACK_URL}&access_type=offline&response_type=code&state=${state}&scope=${scopes}`;
    res.redirect(GOOGLE_OAUTH_CONSENT_SCREEN_URL);
}));
// Google OAuth Callback Route
app.get("/auth/google/callback", passport_1.default.authenticate("google", {
    failureRedirect: "/login",
    successRedirect: "/profile",
    failureMessage: true,
}), (req, res) => {
    // Successful authentication, redirect to profile
    res.redirect("/profile");
});
// Profile Route
app.get("/profile", (req, res) => {
    if (!req.user)
        return res.redirect("/login");
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
// Auth check endpoint
app.get("/auth/check", (req, res) => {
    res.json({ authenticated: !!req.user });
});
// User data endpoint
app.get("/user", (req, res) => {
    if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
    }
    res.json(req.user);
});
app.get("/sample-stats", (req, res) => {
    if (!req.user)
        res.status(401).json({ error: "Unauthorized" });
    res.json({
        currentLevel: 5,
        leastMoves: 18,
    });
});
// Update your existing stats endpoint
app.get("/stats/:userId", (req, res) => {
    if (!req.user)
        res.status(401).json({ error: "Unauthorized" });
    try {
        const stats = database_1.default
            .prepare(`
		SELECT currentLevel, leastMoves, customLevels
		FROM game_stats 
		WHERE userId = ?
	  `)
            .get(req.params.userId);
        res.json(stats || {
            currentLevel: 1,
            leastMoves: [],
            customLevels: [],
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
});
// Enhanced logout
app.post("/auth/logout", (req, res) => {
    req.logout(() => {
        res.json({ success: true });
    });
});
// Start the server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
exports.default = app;
