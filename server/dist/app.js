"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const passport_1 = __importDefault(require("./config/auth/passport")); // Ensure this is correctly configured
const sessions_1 = require("./config/auth/sessions");
const crypto = __importStar(require("crypto"));
const database_1 = __importDefault(require("./config/database"));
const schema_1 = require("./config/schema");
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const express_validator_1 = require("express-validator");
const app = (0, express_1.default)();
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
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CLIENT_URL, // Your frontend URL
    credentials: true, // Required for cookies/sessions
}));
app.use((0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
}));
app.use(express_1.default.json());
app.use((0, express_session_1.default)(sessions_1.sessionConfig));
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
app.use((req, res, next) => {
    const startTime = Date.now();
    // Hook into response finish to log the outcome
    res.on("finish", () => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        try {
            yield database_1.default.query(`INSERT INTO audit_log (
          user_id, action, endpoint, ip_address, 
          user_agent, status_code, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
                ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || null,
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
            ]);
        }
        catch (err) {
            console.error("Audit log failed:", err instanceof Error ? err.message : String(err));
        }
    }));
    next();
});
app.get("/", (req, res) => {
    res.redirect("/login");
});
// Redirect to Google OAuth Consent Screen
app.get("/auth/google", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const state = crypto.randomBytes(16).toString("hex");
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
// Protected routes
app.get("/profile", (req, res) => {
    if (!req.user)
        return res.redirect("/login");
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
app.get("/stats/:userId", (0, express_validator_1.param)("userId").isInt().toInt(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user)
        return res.status(401).json({ error: "Unauthorized" });
    try {
        const stats = yield database_1.default.query(`SELECT 
          current_level AS "current_level",
          least_moves AS "leastMoves", 
          custom_levels AS "customLevels"
         FROM game_stats 
         WHERE user_id = $1`, [req.params.userId]);
        res.json(stats.rows[0] || {
            current_level: 1,
            leastMoves: [],
            customLevels: [],
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
}));
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
    if (!req.user)
        res.status(401).json({ error: "Unauthorized" });
    res.json({
        current_level: 5,
        leastMoves: 18,
    });
});
// Enhanced logout
app.post("/auth/logout", (req, res) => {
    req.logout(() => {
        var _a;
        (_a = req.session) === null || _a === void 0 ? void 0 : _a.destroy(() => {
            res.clearCookie("connect.sid");
            res.json({ success: true });
        });
    });
});
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Internal Server Error" });
});
// Start the server
function startServer() {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, schema_1.initializeDatabase)();
        const PORT = process.env.PORT || 8000;
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    });
}
startServer();
exports.default = app;
