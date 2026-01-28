import React from "react";
import Editor from "@monaco-editor/react";
import { socket } from "../socket";
import { getSession } from "../api";

type Lang = "javascript" | "python";

function mapLangToMonaco(language: Lang) {
  return language === "python" ? "python" : "javascript";
}

export default function CodeRoom({ sessionId }: { sessionId: string }) {
  const [connected, setConnected] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [language, setLanguage] = React.useState<Lang>("javascript");
  const [code, setCode] = React.useState<string>("");

  const ignoreRemoteRef = React.useRef(false);
  const lastSentRef = React.useRef<string>("");

  // Load initial state (HTTP) so page still works even before socket joins
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = await getSession(sessionId);
        if (!alive) return;
        setLanguage(s.language);
        setCode(s.code);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || "Failed to load session");
      }
    })();
    return () => {
      alive = false;
    };
  }, [sessionId]);

  // Socket wiring
  React.useEffect(() => {
    function onConnect() {
      setConnected(true);
      socket.emit("room:join", { sessionId });
    }
    function onDisconnect() {
      setConnected(false);
    }
    function onRoomState(payload: { sessionId: string; language: Lang; code: string }) {
      if (payload.sessionId !== sessionId) return;
      ignoreRemoteRef.current = true;
      setLanguage(payload.language);
      setCode(payload.code);
      lastSentRef.current = payload.code;
      queueMicrotask(() => {
        ignoreRemoteRef.current = false;
      });
    }
    function onRoomError(payload: { message: string }) {
      setError(payload.message);
    }
    function onCodeUpdate(payload: { code: string }) {
      ignoreRemoteRef.current = true;
      setCode(payload.code);
      lastSentRef.current = payload.code;
      queueMicrotask(() => {
        ignoreRemoteRef.current = false;
      });
    }
    function onLangUpdate(payload: { language: Lang }) {
      setLanguage(payload.language);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("room:state", onRoomState);
    socket.on("room:error", onRoomError);
    socket.on("code:update", onCodeUpdate);
    socket.on("lang:update", onLangUpdate);

    // If already connected, join immediately
    if (socket.connected) {
      onConnect();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room:state", onRoomState);
      socket.off("room:error", onRoomError);
      socket.off("code:update", onCodeUpdate);
      socket.off("lang:update", onLangUpdate);
    };
  }, [sessionId]);

  // Debounced broadcast to avoid spamming socket on each keystroke
  const debounceRef = React.useRef<number | null>(null);
  function scheduleSend(next: string) {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      if (next !== lastSentRef.current) {
        socket.emit("code:update", { sessionId, code: next });
        lastSentRef.current = next;
      }
    }, 80);
  }

  function onLocalChange(value: string | undefined) {
    const next = value ?? "";
    setCode(next);

    if (ignoreRemoteRef.current) return;
    scheduleSend(next);
  }

  function onLanguageChange(nextLang: Lang) {
    setLanguage(nextLang);
    socket.emit("lang:update", { sessionId, language: nextLang });
  }

  const shareUrl = `${window.location.origin}/session/${sessionId}`;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", fontFamily: "system-ui" }}>
      <div style={{ padding: 12, borderBottom: "1px solid #ddd", display: "flex", gap: 12, alignItems: "center" }}>
        <strong>Session:</strong>
        <code style={{ background: "#f6f6f6", padding: "2px 6px", borderRadius: 6 }}>{sessionId}</code>

        <span style={{ marginLeft: "auto", opacity: 0.8 }}>
          {connected ? "🟢 Connected" : "🟠 Disconnected"}
        </span>
      </div>

      <div style={{ padding: 12, borderBottom: "1px solid #eee", display: "flex", gap: 12, alignItems: "center" }}>
        <label>
          Language:&nbsp;
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as Lang)}
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
          </select>
        </label>

        <button
          onClick={async () => {
            await navigator.clipboard.writeText(shareUrl);
            alert("Link copied!");
          }}
        >
          Copy share link
        </button>

        <a href="http://localhost:3001/openapi.yaml" target="_blank" rel="noreferrer" style={{ marginLeft: "auto" }}>
          OpenAPI
        </a>
      </div>

      {error && (
        <div style={{ padding: 12, color: "crimson", borderBottom: "1px solid #eee" }}>
          {error}
        </div>
      )}

      <div style={{ flex: 1 }}>
        <Editor
          height="100%"
          language={mapLangToMonaco(language)}
          value={code}
          onChange={onLocalChange}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            wordWrap: "on",
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
}
