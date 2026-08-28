export interface Player {
  id: string;
  name: string;
  connected: boolean;
}

export type RoomPhase = "lobby" | "playing" | "results";

export type GameId = "wwe";

export interface WweGameState {
  id: "wwe";
  question: string;
  votedPlayerIds: string[];
  results?: { playerId: string; name: string; votes: number }[];
}

export interface RoomState {
  code: string;
  hostId: string;
  players: Player[];
  phase: RoomPhase;
  game: WweGameState | null;
}

export interface ClientToServerEvents {
  "room:create": (
    payload: { name: string; clientId: string },
    ack: (res: { ok: true; state: RoomState } | { ok: false; error: string }) => void
  ) => void;
  "room:join": (
    payload: { code: string; name: string; clientId: string },
    ack: (res: { ok: true; state: RoomState } | { ok: false; error: string }) => void
  ) => void;
  "game:start": (payload: { gameId: GameId }) => void;
  "game:next": () => void;
  "game:end": () => void;
  "wwe:vote": (payload: { targetPlayerId: string }) => void;
}

export interface ServerToClientEvents {
  "room:state": (state: RoomState) => void;
  "room:error": (message: string) => void;
}
