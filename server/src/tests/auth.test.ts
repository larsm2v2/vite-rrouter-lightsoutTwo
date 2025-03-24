// tests/auth.test.ts

process.env.NODE_ENV = "test"; // Set environment to "test"
import request from "supertest";
import db from "../config/database";
import app from "../app";

describe("GET /auth/google", () => {
	beforeAll(() => {
		// Seed the database with test data
		db.prepare(
			"INSERT INTO users (googleId, displayName, email) VALUES (?, ?, ?)"
		).run("test-google-id", "Test User", "test@example.com");
	});

	afterAll(() => {
		// Clean up the database after tests
		db.prepare("DELETE FROM users").run();
	});

	it("should redirect to Google OAuth", async () => {
		const res = await request(app).get("/auth/google");
		expect(res.status).toBe(302);
		expect(res.header.location).toMatch(/accounts\.google\.com/);
	});
});

// tests/auth.test.ts
describe("GET /google/callback", () => {
	it("should handle the OAuth callback", async () => {
		const res = await request(app).get("/google/callback").query({
			code: "mock_authorization_code",
			state: "mock_state",
		});
		expect(res.status).toBe(302); // Expect a redirect to /profile
		expect(res.header.location).toBe("/profile");
	});
});
