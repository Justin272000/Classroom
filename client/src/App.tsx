import { useEffect, useRef, useState } from "react";
import { getClientId } from "./clientId";
import Home from "./pages/Home";
import Lobby from "./pages/Lobby";
import WweGame from "./pages/WweGame";
import { socket } from "./socket";
import type { RoomState } from "./types";

export default function App() {
  const [room, setRoom] = useState<RoomState | null>(null);
  const clientId = useRef(getClientId()).current;
  // Remembers the room we're in so a dropped connection can silently rejoin
  // under the same identity once socket.io reconnects (new socket.id, same clientId).
  const sessionRef = useRef<{ code: string; name: string } | null>(null);

  useEffect(() => {
    function onConnect() {
      const session = sessionRef.current;
      if (!session) return;
      socket.emit("room:join", { code: session.code, name: session.name, clientId }, (res) => {
        if (res.ok) setRoom(res.state);
        else {
          sessionRef.current = null;
          setRoom(null);
        }
      });
    }
    function onState(state: RoomState) {
      setRoom(state);
    }

    socket.on("connect", onConnect);
    socket.on("room:state", onState);

    return () => {
      socket.off("connect", onConnect);
      socket.off("room:state", onState);
    };
  }, [clientId]);

  function handleJoined(state: RoomState, name: string) {
    sessionRef.current = { code: state.code, name };
    setRoom(state);
  }

  if (!room) {
    return <Home clientId={clientId} onJoined={handleJoined} />;
  }

  const isHost = room.hostId === clientId;

  if (room.phase === "lobby" || !room.game) {
    return <Lobby room={room} isHost={isHost} />;
  }

  return <WweGame room={room} myId={clientId} isHost={isHost} />;
}
