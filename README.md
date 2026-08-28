# Mindgames

Web-App für Minispiele mit Freunden – online, per Raumcode, ohne Sprachchat.

## Struktur

- `server/` – Node.js + TypeScript + Socket.io. Hält den Raum-/Spielzustand im Speicher.
- `client/` – React + TypeScript + Vite. Verbindet sich per Socket.io mit dem Server.

Jeder Spieler bekommt eine stabile, in `localStorage` gespeicherte Client-ID (nicht die
flüchtige Socket-ID) – dadurch übersteht die Sitzung kurze Verbindungsabbrüche (z.B.
WLAN-Wechsel auf dem Handy), ohne dass man aus dem Raum fliegt oder der Host wechselt.

## Entwicklung starten

```bash
npm install
npm run dev
```

Startet Server (Port 4000) und Client (Port 5173) parallel. App unter http://localhost:5173.

Nur einzeln starten:

```bash
npm run dev:server
npm run dev:client
```

## Aktueller Stand

- Lobby-System mit 4-stelligem Raumcode, Host-Rolle, Live-Spielerliste.
- Erstes Minispiel: **Wer würde eher** (Frage → alle stimmen ab → Ergebnis-Balkendiagramm →
  nächste Frage oder zurück zur Lobby).
- Platzhalter für **Werwolf** und **Wer bin ich** in der Lobby (noch nicht implementiert).

## Nächste Schritte (Vorschlag)

- Weitere Minispiele als eigenes Modul in `server/src/games/` + zugehörige Client-Seite ergänzen.
- Persistenz (aktuell alles In-Memory; Server-Neustart löscht alle Räume).
- Deployment (z.B. Server auf Fly.io/Render, Client als Static Build).
