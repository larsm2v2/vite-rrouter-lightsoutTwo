"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const passport_1 = __importDefault(require("passport"));
const csrf_csrf_1 = require("csrf-csrf");
const router = (0, express_1.Router)();
const { generateToken } = (0, csrf_csrf_1.doubleCsrf)({
    getSecret: () => process.env.CSRF_SECRET,
});
// Initiate Google auth
router.get("/google", (req, res, next) => {
    // Generate CSRF token for OAuth state
    const state = generateToken(req, res);
    passport_1.default.authenticate("google", {
        state,
        prompt: "select_account", // Force account selection
    })(req, res, next);
});
// Google callback
router.get("/google/callback", passport_1.default.authenticate("google", {
    failureRedirect: "/login",
    failureMessage: true,
}), (req, res) => {
    res.redirect("/profile");
});
// Protected route example
router.get("/profile", (req, res) => {
    if (!req.user)
        return res.redirect("/login");
    res.json(req.user);
});
// Logout
router.post("/logout", (req, res) => {
    req.logout(() => {
        var _a;
        (_a = req.session) === null || _a === void 0 ? void 0 : _a.destroy(() => {
            res.clearCookie("connect.sid");
            res.json({ success: true });
        });
    });
});
exports.default = router;
