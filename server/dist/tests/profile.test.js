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
// tests/profile.test.ts
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../app"));
describe("GET /profile", () => {
    it("should redirect to login if not authenticated", () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app_1.default).get("/profile");
        expect(res.status).toBe(302); // Expect a redirect to /login
        expect(res.header.location).toBe("/login");
    }));
    it("should return user profile if authenticated", () => __awaiter(void 0, void 0, void 0, function* () {
        // Mock an authenticated session
        const res = yield (0, supertest_1.default)(app_1.default)
            .get("/profile")
            .set("Cookie", ["connect.sid=mock_session_id"]);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("id");
    }));
});
