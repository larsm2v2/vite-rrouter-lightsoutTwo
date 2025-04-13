// tests/profile.test.ts
import request from "supertest";
import app from "../app";
import { User } from "../types/entities/User";
import { createTestUser } from "./test-utils";
import pool from "../config/database";

describe("GET /profile", () => {
  let testUser: Express.User;
  let authCookie: string;

  beforeAll(async () => {
    testUser = await createTestUser();
    // Simulate login to get session cookie
    await pool.query(`INSERT INTO game_stats (user_id) VALUES ($1)`, [
      testUser.id,
    ]);
    // const loginRes = await request(app)
    //   .post("/auth/mock-login") // You'll need to add this test route
    //   .send({ userId: testUser.id });
    // authCookie = loginRes.headers["set-cookie"];
  });

  it("should redirect to login if not authenticated", async () => {
    const res = await request(app).get("/profile");
    expect(res.status).toBe(401); // Expect a redirect to /login
  });

  it("should return profile when authenticated", async () => {
    const loginRes = await request(app)
      .post("/test/mock-login")
      .send({ userId: testUser.id });

    const res = await request(app)
      .get("/profile")
      .set("Cookie", loginRes.headers["set-cookie"]);

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(testUser.id);
  });
});

app.post("/test/mock-login", (req, res) => {
  req.logIn(
    {
      id: req.body.userId,
      email: "test@example.com",
      display_name: "Test User",
    },
    () => res.send("OK")
  );
});
