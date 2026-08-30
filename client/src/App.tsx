import { useEffect, useRef, useState } from "react";
import { getClientId } from "./clientId";
import { GAMES, type GameDef } from "./games";
import CancelCultureGame from "./pages/CancelCultureGame";
import GuessItGame from "./pages/GuessItGame";
import Home from "./pages/Home";
import KennedeineFreundeGame from "./pages/KennedeineFreundeGame";
import Lobby from "./pages/Lobby";
import StadtLandFlussGame from "./pages/StadtLandFlussGame";
import WhoamiGame from "./pages/WhoamiGame";
import WweGame from "./pages/WweGame";
import ZahlenGame from "./pages/ZahlenGame";
import ZeitbombeGame from "./pages/ZeitbombeGame";
import { socket } from "./socket";
import type { RoomState } from "./types";

export default function App() {
  const [room, setRoom] = useState<RoomState | null>(null);
  const clientId = useRef(getClientId()).current;
  // Picked once per page load, shared by Home and Lobby so the two screens
  // match for this visit — a fresh reload picks again for some variety. Only
  // games with dedicated background art are eligible, so a game still
  // waiting on that asset doesn't leave Home/Lobby blank for the visit.
  const backgroundedGames = GAMES.filter((g): g is GameDef & { background: string } => !!g.background);
  const sharedBackground = useRef(backgroundedGames[Math.floor(Math.random() * backgroundedGames.length)].background)
    .current;
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

  function leaveRoom() {
    socket.emit("room:leave");
    sessionRef.current = null;
    setRoom(null);
  }

  if (!room) {
    return <Home clientId={clientId} onJoined={handleJoined} background={sharedBackground} />;
  }

  const isHost = room.hostId === clientId;

  if (room.phase === "lobby" || !room.game) {
    return (
      <Lobby room={room} isHost={isHost} myId={clientId} background={sharedBackground} onLeave={leaveRoom} />
    );
  }

  switch (room.game.id) {
    case "whoami":
      return <WhoamiGame room={room} myId={clientId} isHost={isHost} />;
    case "guessit":
      return <GuessItGame room={room} myId={clientId} isHost={isHost} />;
    case "cancelculture":
      return <CancelCultureGame room={room} myId={clientId} isHost={isHost} />;
    case "stadtlandfluss":
      return <StadtLandFlussGame room={room} myId={clientId} isHost={isHost} />;
    case "zeitbombe":
      return <ZeitbombeGame room={room} myId={clientId} isHost={isHost} />;
    case "kennedeinefreunde":
      return <KennedeineFreundeGame room={room} myId={clientId} isHost={isHost} />;
    case "zahlen":
      return <ZahlenGame room={room} myId={clientId} isHost={isHost} />;
    default:
      return <WweGame room={room} myId={clientId} isHost={isHost} />;
  }
}
