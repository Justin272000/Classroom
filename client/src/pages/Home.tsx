import { useState, type FormEvent } from "react";
import { socket } from "../socket";
import type { RoomState } from "../types";

interface Props {
  clientId: string;
  onJoined: (state: RoomState, name: string) => void;
}

type Mode = "create" | "join";

export default function Home({ clientId, onJoined }: Props) {
  const [mode, setMode] = useState<Mode>("create");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    <div className="page centered">
      <h1>Mindgames</h1>
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
