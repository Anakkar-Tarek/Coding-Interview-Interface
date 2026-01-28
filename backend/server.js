import express from "express";
import cors from "cors";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import YAML from "yamljs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const openapiPath = path.join(__dirname, "openapi.yaml");


const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";


const app = express();

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  })
);

app.use(express.json());


// Map<sessionId, { sessionId, language, code, updatedAt }>
const sessions = new Map();

function defaultState() {
  return {
    language: "javascript",
    code:
      `// Welcome! Share this link with a candidate.\n` +
      `// Try editing in two browser windows to see real-time sync.\n\n` +
      `function add(a, b) {\n  return a + b;\n}\n\n` +
      `console.log(add(2, 3));\n`,
  };
}


app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/sessions", (req, res) => {
  const sessionId = uuidv4();
  const state = defaultState();

  sessions.set(sessionId, {
    sessionId,
    language: state.language,
    code: state.code,
    updatedAt: new Date().toISOString(),
  });

  res.status(201).json({
    sessionId,
    url: `${FRONTEND_ORIGIN}/session/${sessionId}`,
  });
});

app.get("/api/sessions/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  res.json({
    sessionId: session.sessionId,
    language: session.language,
    code: session.code,
  });
});


app.get("/openapi.yaml", (req, res) => {
  if (!fs.existsSync(openapiPath)) {
    return res.status(404).json({
      error: "openapi.yaml not found",
      hint: "Place openapi.yaml inside the backend folder",
    });
  }

  const doc = YAML.load(openapiPath);
  res.type("text/yaml").send(YAML.stringify(doc, 8, 2));
});


const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: FRONTEND_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  socket.on("room:join", ({ sessionId }) => {
    const session = sessions.get(sessionId);

    if (!session) {
      socket.emit("room:error", { message: "Session not found" });
      return;
    }

    socket.join(sessionId);

    socket.emit("room:state", {
      sessionId,
      language: session.language,
      code: session.code,
    });

    socket.to(sessionId).emit("room:presence", { type: "join" });
  });

  socket.on("code:update", ({ sessionId, code }) => {
    const session = sessions.get(sessionId);
    if (!session) return;

    session.code = code;
    session.updatedAt = new Date().toISOString();
    sessions.set(sessionId, session);

    socket.to(sessionId).emit("code:update", { code });
  });

  socket.on("lang:update", ({ sessionId, language }) => {
    const session = sessions.get(sessionId);
    if (!session) return;

    session.language = language;
    session.updatedAt = new Date().toISOString();
    sessions.set(sessionId, session);

    socket.to(sessionId).emit("lang:update", { language });
  });
});


if (process.env.NODE_ENV !== "test") {
  server.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
    console.log(`OpenAPI: http://localhost:${PORT}/openapi.yaml`);
  });
}

export { app, server };

