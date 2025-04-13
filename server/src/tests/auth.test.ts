// tests/auth.test.ts
process.env.NODE_ENV = "test"; // Set environment to "test"
import request from "supertest";
import pool from "../config/database";
import app from "../app";
import { Request, Response, NextFunction } from "express";
import passport from "../config/auth/passport";
import { User } from "../types/entities/User";
describe("Authentication Routes", () => {
  let testUser: User;

  beforeEach(async () => {
    await pool.query("BEGIN");
  });

  beforeAll(async () => {
    // Seed the database with test data
    await pool.query(
      `INSERT INTO users (google_sub, display_name, email) 
       VALUES ($1, $2, $3)`,
      ["test-google-id", "Test User", "test@example.com"]
    );
  });

  afterEach(async () => {
    await pool.query("ROLLBACK");
  });
  afterAll(async () => {
    // Clean up the database after tests
    await pool.query("DELETE FROM users");
    await pool.end(); // Close the connection pool
  });

  describe("GET /auth/google", () => {
    it("should redirect to Google OAuth", async () => {
      const res = await request(app).get("/auth/google");
      expect(res.status).toBe(302);
      expect(res.header.location).toMatch(/accounts\.google\.com/);
    });
  });

  describe("GET /auth/google/callback", () => {
    it("should handle the OAuth callback successfully", async () => {
      // Mock the OAuth flow
      jest
        .spyOn(passport, "authenticate")
        .mockImplementation(
          () => (req: Request, res: Response, next: NextFunction) => {
            req.user = {
              id: 1,
              email: "test@example.com",
              display_name: "Test User",
            };
            res.redirect(process.env.CLIENT_URL + "/profile");
          }
        );

      const res = await request(app)
        .get("/auth/google/callback")
        .query({ code: "mock_code", state: "mock_state" });

      expect(res.status).toBe(302);
      expect(res.header.location).toBe(process.env.CLIENT_URL + "/profile");
    });

    it("should handle OAuth callback failure", async () => {
      jest
        .spyOn(passport, "authenticate")
        .mockImplementation(
          () => (req: Request, res: Response, next: NextFunction) => {
            res.redirect("/login?error=auth_failed");
          }
        );

      const res = await request(app)
        .get("/auth/google/callback")
        .query({ code: "invalid_code", state: "invalid_state" });

      expect(res.status).toBe(302);
      expect(res.header.location).toMatch(/login/);
    });
  });
});
