import { useEffect, useState, type FormEvent } from "react";
import Lettering from "../components/Lettering";
import { pageBackgroundStyle } from "../pageBackground";
import { socket } from "../socket";
import type { RoomState } from "../types";

interface Props {
  clientId: string;
  onJoined: (state: RoomState, name: string) => void;
  background: string;
}

type Mode = "create" | "join";

function codeFromUrl(): string {
  const raw = new URLSearchParams(window.location.search).get("code") ?? "";
  return raw.trim().toUpperCase().slice(0, 4);
}

export default function Home({ clientId, onJoined, background }: Props) {
  const [mode, setMode] = useState<Mode>(() => (codeFromUrl() ? "join" : "create"));
  const [name, setName] = useState("");
  const [code, setCode] = useState(codeFromUrl);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Scanning a room's QR code lands here with ?code=XXXX; drop it from the visible
  // URL once read so it doesn't linger if the page is bookmarked or reshared.
  useEffect(() => {
    if (window.location.search) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) return;
    if (mode === "join" && !code.trim()) return;

    setBusy(true);
    setError(null);

    if (mode === "create") {
      socket.emit("room:create", { name, clientId }, (res) => {
        setBusy(false);
        if (res.ok) onJoined(res.state, name);
        else setError(res.error);
      });
    } else {
      socket.emit("room:join", { name, code, clientId }, (res) => {
        setBusy(false);
        if (res.ok) onJoined(res.state, name);
        else setError(res.error);
      });
    }
  }

  return (
    <div className="page centered" style={pageBackgroundStyle(background)}>
      <Lettering src="/lettering/classroom.webp" alt="Classroom" />
      <p className="subtitle">Minispiele mit Freunden – online, ohne miteinander zu sprechen.</p>

      <div className="tabs">
        <button
          type="button"
          className={mode === "create" ? "tab active" : "tab"}
          onClick={() => setMode("create")}
        >
          Raum erstellen
        </button>
        <button type="button" className={mode === "join" ? "tab active" : "tab"} onClick={() => setMode("join")}>
          Raum beitreten
        </button>
      </div>

      <form className="card" onSubmit={submit}>
        <label>
          Dein Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            placeholder="z.B. Alex"
            autoFocus
            required
          />
        </label>

        {mode === "join" && (
          <label>
            Raumcode
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={4}
              placeholder="ABCD"
              required
            />
          </label>
        )}

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={busy}>
          {mode === "create" ? "Raum erstellen" : "Beitreten"}
        </button>
      </form>
    </div>
  );
}
