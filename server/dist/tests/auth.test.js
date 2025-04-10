"use strict";
// tests/auth.test.ts
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
process.env.NODE_ENV = "test"; // Set environment to "test"
const supertest_1 = __importDefault(require("supertest"));
const database_1 = __importDefault(require("../config/database"));
const app_1 = __importDefault(require("../app"));
describe("GET /auth/google", () => {
    beforeAll(() => {
        // Seed the database with test data
        database_1.default.prepare("INSERT INTO users (googleId, displayName, email) VALUES (?, ?, ?)").run("test-google-id", "Test User", "test@example.com");
    });
    afterAll(() => {
        // Clean up the database after tests
        database_1.default.prepare("DELETE FROM users").run();
    });
    it("should redirect to Google OAuth", () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app_1.default).get("/auth/google");
        expect(res.status).toBe(302);
        expect(res.header.location).toMatch(/accounts\.google\.com/);
    }));
});
// tests/auth.test.ts
describe("GET /google/callback", () => {
    it("should handle the OAuth callback", () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app_1.default).get("/google/callback").query({
            code: "mock_authorization_code",
            state: "mock_state",
        });
        expect(res.status).toBe(302); // Expect a redirect to /profile
        expect(res.header.location).toBe("/profile");
    }));
});
