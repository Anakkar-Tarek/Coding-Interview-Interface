import React from "react";
import { Routes, Route, useNavigate, useParams } from "react-router-dom";
import { createSession } from "./api";
import CodeRoom from "./components/CodeRoom";

function Home() {
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const navigate = useNavigate();

  async function onCreate() {
    setErr(null);
    setLoading(true);
    try {
      const { sessionId } = await createSession();
      navigate(`/session/${sessionId}`);
    } catch (e: any) {
      setErr(e?.message || "Failed to create session");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 16, fontFamily: "system-ui" }}>
      <h1 style={{ marginBottom: 8 }}>Coding Interview Platform</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Create a session link, share it, and edit collaboratively in real time.
      </p>

      <button
        onClick={onCreate}
        disabled={loading}
        style={{ padding: "10px 14px", cursor: loading ? "not-allowed" : "pointer" }}
      >
        {loading ? "Creating..." : "Create session"}
      </button>

      {err && <p style={{ color: "crimson" }}>{err}</p>}

      <hr style={{ margin: "24px 0" }} />

      <p style={{ opacity: 0.8 }}>
        Tip: open the same session in two browser windows to verify real-time sync.
      </p>
    </div>
  );
}

function SessionPage() {
  const { sessionId } = useParams();
  if (!sessionId) return <div>Missing sessionId</div>;
  return <CodeRoom sessionId={sessionId} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/session/:sessionId" element={<SessionPage />} />
    </Routes>
  );
}
