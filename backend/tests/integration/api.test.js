import request from "supertest";
import { app } from "../../server.js";

describe("API integration tests", () => {
  test("GET /api/health returns ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  test("POST /api/sessions creates a session", async () => {
    const res = await request(app).post("/api/sessions");
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("sessionId");
    expect(res.body).toHaveProperty("url");
  });

  test("GET /api/sessions/:id returns session data", async () => {
    const create = await request(app).post("/api/sessions");
    const id = create.body.sessionId;

    const res = await request(app).get(`/api/sessions/${id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("language");
    expect(res.body).toHaveProperty("code");
  });

  test("GET /api/sessions/:id returns 404 for invalid id", async () => {
    const res = await request(app).get("/api/sessions/does-not-exist");
    expect(res.statusCode).toBe(404);
  });
});
