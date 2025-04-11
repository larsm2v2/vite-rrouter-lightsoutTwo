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
Object.defineProperty(exports, "__esModule", { value: true });
// src/database.ts
const pg_1 = require("pg");
const process_1 = require("process");
// PostgreSQL configuration
const pgConfig = {
    user: process_1.env.PG_USER || "postgres",
    host: process_1.env.PG_HOST || "localhost",
    database: process_1.env.PG_DATABASE || "TTLO",
    password: process_1.env.PG_PASSWORD || "your_password",
    port: parseInt(process_1.env.PG_PORT || "5432"),
    max: 20, // max number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};
// Create the connection pool
const pool = new pg_1.Pool(pgConfig);
// Test the connection
pool
    .query("SELECT NOW() as now")
    .then((res) => {
    console.log("✅ PostgreSQL connected at:", res.rows[0].now);
})
    .catch((err) => {
    console.error("❌ PostgreSQL connection error:", err);
    process.exit(1);
});
// Graceful shutdown
process.on("SIGINT", () => __awaiter(void 0, void 0, void 0, function* () {
    yield pool.end();
    process.exit(0);
}));
exports.default = pool;
