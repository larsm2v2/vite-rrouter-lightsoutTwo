"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionConfig = void 0;
const express_session_1 = __importDefault(require("express-session"));
const connect_pg_simple_1 = __importDefault(require("connect-pg-simple"));
const database_1 = __importDefault(require("../database")); // Import your existing PostgreSQL pool
const process_1 = require("process");
const PgSession = (0, connect_pg_simple_1.default)(express_session_1.default);
exports.sessionConfig = {
    store: new PgSession({
        pool: database_1.default, // Reuse your existing connection pool
        tableName: "user_sessions", // Custom table name (optional)
        createTableIfMissing: true, // Automatically creates sessions table
        pruneSessionInterval: false, // Disable auto-pruning (or set to interval in seconds)
    }),
    secret: process_1.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process_1.env.NODE_ENV === "production",
        sameSite: "lax",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
    name: "sessionId", // Custom session cookie name (optional)
};
