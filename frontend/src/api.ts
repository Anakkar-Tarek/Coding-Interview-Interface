const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.trim() || "http://localhost:3001";

export async function createSession(): Promise<{ sessionId: string; url: string }> {
  const res = await fetch(`${API_BASE}/api/sessions`, { method: "POST" });
  if (!res.ok) {
    throw new Error(`Failed to create session (${res.status})`);
  }
  return res.json();
}

export async function getSession(sessionId: string): Promise<{
  sessionId: string;
  language: "javascript" | "python";
  code: string;
}> {
  const res = await fetch(`${API_BASE}/api/sessions/${encodeURIComponent(sessionId)}`);
  if (!res.ok) {
    throw new Error(`Failed to load session (${res.status})`);
  }
  return res.json();
}

export { API_BASE };
