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
// tests/auth.test.ts
process.env.NODE_ENV = "test"; // Set environment to "test"
const supertest_1 = __importDefault(require("supertest"));
const database_1 = __importDefault(require("../config/database"));
const app_1 = __importDefault(require("../app"));
const passport_1 = __importDefault(require("../config/auth/passport"));
describe("Authentication Routes", () => {
    beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
        // Seed the database with test data
        yield database_1.default.query(`INSERT INTO users (google_sub, display_name, email) 
       VALUES ($1, $2, $3)`, ["test-google-id", "Test User", "test@example.com"]);
    }));
    afterAll(() => __awaiter(void 0, void 0, void 0, function* () {
        // Clean up the database after tests
        yield database_1.default.query("DELETE FROM users");
        yield database_1.default.end(); // Close the connection pool
    }));
    describe("GET /auth/google", () => {
        it("should redirect to Google OAuth", () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(app_1.default).get("/auth/google");
            expect(res.status).toBe(302);
            expect(res.header.location).toMatch(/accounts\.google\.com/);
        }));
    });
    describe("GET /auth/google/callback", () => {
        it("should handle the OAuth callback successfully", () => __awaiter(void 0, void 0, void 0, function* () {
            // Mock the OAuth flow
            jest
                .spyOn(passport_1.default, "authenticate")
                .mockImplementation(() => (req, res, next) => {
                req.user = {
                    id: 1,
                    email: "test@example.com",
                    display_name: "Test User",
                };
                next();
            });
            const res = yield (0, supertest_1.default)(app_1.default)
                .get("/auth/google/callback")
                .query({ code: "mock_code", state: "mock_state" });
            expect(res.status).toBe(302);
            expect(res.header.location).toBe("/profile");
        }));
        it("should handle OAuth callback failure", () => __awaiter(void 0, void 0, void 0, function* () {
            jest
                .spyOn(passport_1.default, "authenticate")
                .mockImplementation(() => (req, res, next) => {
                res.redirect("/login?error=auth_failed");
            });
            const res = yield (0, supertest_1.default)(app_1.default)
                .get("/auth/google/callback")
                .query({ code: "invalid_code", state: "invalid_state" });
            expect(res.status).toBe(302);
            expect(res.header.location).toMatch(/login/);
        }));
    });
});
