# Sperling

Außendienst-App für einen Berater, der **Photovoltaik und Wärmepumpen (Enpal)** sowie **Vorwerk-Staubsauger** verkauft. Ein Kunde, drei Sparten, eine Karte – damit Synergien zwischen den Geschäftszweigen sichtbar werden.

- Läuft als installierbare Web-App (PWA) auf Tablet, iPhone, iPad, Android und im Laptop-Browser, auch offline.
- Alle Daten liegen **verschlüsselt** auf dem Gerät (AES-256-GCM, Master-Passwort). Es gibt keinen Server.
- Datensicherung als verschlüsselte Datei in **iCloud Drive** (über das Teilen-Menü).

Geschrieben in TypeScript, gebaut mit Vite, ausgeliefert über GitHub Pages.

## Schnellstart

```bash
npm install          # einmalig
npm run dev          # Entwicklung mit Neuladen, http://localhost:8765
npm run check        # TypeScript-Prüfung
npm test             # Unit-Tests (Node ≥ 22)
npm run build        # baut dist/
npm start            # stellt dist/ auf http://localhost:8765 bereit (Mac: Doppelklick auf start.command)
npm run test:e2e     # Browser-Test gegen npm start, Playwright nötig
```

Die App muss über `http://localhost` oder `https://` geöffnet werden, nicht per Doppelklick auf `index.html` (Verschlüsselung und Module funktionieren unter `file://` nicht).

Demo mit Beispielkunden ohne Speicherung: `http://localhost:8765/?demo`

## Dokumentation (Nachschlagewerk)

| Datei | Inhalt |
|---|---|
| [docs/STAND.md](docs/STAND.md) | Was erledigt ist, was offen ist, bekannte Einschränkungen |
| [docs/REGELN.md](docs/REGELN.md) | Verbindliche Regeln und Konventionen für jede Änderung |
| [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md) | Aufbau, Module, Datenfluss, Sicherheit, Sicherung |
| [docs/DATENMODELL.md](docs/DATENMODELL.md) | Alle Felder, Status-Werte, Migration |
| [docs/ANLEITUNG.md](docs/ANLEITUNG.md) | Installation, Hosting, Bedienung, Datensicherung |
| [docs/MASKOTTCHEN.md](docs/MASKOTTCHEN.md) | Welcher Sperling wofür steht |
| [CHANGELOG.md](CHANGELOG.md) | Versionsverlauf |
