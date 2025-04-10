// tests/profile.test.ts
import request from "supertest";
import app from "../app";

describe("GET /profile", () => {
  it("should redirect to login if not authenticated", async () => {
    const res = await request(app).get("/profile");
    expect(res.status).toBe(302); // Expect a redirect to /login
    expect(res.header.location).toBe("/login");
  });

  it("should return user profile if authenticated", async () => {
    // Mock an authenticated session
    const res = await request(app)
      .get("/profile")
      .set("Cookie", ["connect.sid=mock_session_id"]);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id");
  });
});
