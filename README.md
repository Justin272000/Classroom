# Classroom

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
- QR-Code in der Lobby zum Beitreten: codiert `<seite>/?code=XXXX`, öffnet die App mit
  vorausgefülltem Code. Funktioniert nur, wenn die Seite über die WLAN-Adresse des
  Host-Geräts aufgerufen wurde (Vite zeigt diese beim Start als "Network" an) – über
  "localhost" scannt niemand anderes etwas Sinnvolles.
- Erstes Minispiel: **Wer würde eher** (Frage → alle stimmen ab → Ergebnis-Balkendiagramm →
  nächste Frage oder zurück zur Lobby).
- Platzhalter für **Werwolf** und **Wer bin ich** in der Lobby (noch nicht implementiert).

## Im selben WLAN mit dem Handy spielen

1. `npm run dev` starten.
2. Im Terminal-Output des Client-Servers die "Network"-Adresse suchen (z.B.
   `http://192.168.1.23:5173`) und darüber die App öffnen – nicht über `localhost`.
3. Raum erstellen, QR-Code mit dem Handy scannen (gleiches WLAN vorausgesetzt).

## Nächste Schritte (Vorschlag)

- Weitere Minispiele als eigenes Modul in `server/src/games/` + zugehörige Client-Seite ergänzen.
- Persistenz (aktuell alles In-Memory; Server-Neustart löscht alle Räume).
- Deployment (z.B. Server auf Fly.io/Render, Client als Static Build).
