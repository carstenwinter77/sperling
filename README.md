# Sperling

Außendienst-App für einen Berater, der **Photovoltaik und Wärmepumpen (Enpal)** sowie **Vorwerk-Staubsauger** verkauft. Ein Kunde, drei Sparten, eine Karte – damit Synergien zwischen den Geschäftszweigen sichtbar werden.

- Läuft als installierbare Web-App (PWA) auf Tablet, iPhone, iPad, Android und im Laptop-Browser, auch offline.
- Alle Daten liegen **verschlüsselt** auf dem Gerät (AES-256-GCM, Master-Passwort). Es gibt keinen Server.
- Optionaler Abgleich als verschlüsselte Datei über die **eigene Dropbox** („neuester Stand gewinnt“).

**Version:** 0.2.0 (Stand 07.11.2026)

## Schnellstart

```bash
npm start            # startet http://localhost:8765  (oder Doppelklick auf start.command am Mac)
npm test             # Unit-Tests (Node ≥ 20)
npm run test:e2e     # Browser-Test, Server muss laufen, Playwright nötig
```

Die App muss über `http://localhost` oder `https://` geöffnet werden, nicht per Doppelklick auf `index.html` (Verschlüsselung und Module funktionieren unter `file://` nicht).

Demo mit Beispielkunden ohne Speicherung: `http://localhost:8765/?demo`

## Dokumentation (Nachschlagewerk)

| Datei | Inhalt |
|---|---|
| [docs/STAND.md](docs/STAND.md) | Was erledigt ist, was offen ist, bekannte Einschränkungen |
| [docs/REGELN.md](docs/REGELN.md) | Verbindliche Regeln und Konventionen für jede Änderung |
| [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md) | Aufbau, Module, Datenfluss, Sicherheit, Sync |
| [docs/DATENMODELL.md](docs/DATENMODELL.md) | Alle Felder, Status-Werte, Migration |
| [docs/ANLEITUNG.md](docs/ANLEITUNG.md) | Installation, Hosting, Dropbox einrichten, Bedienung |
| [docs/MASKOTTCHEN.md](docs/MASKOTTCHEN.md) | Welcher Sperling wofür steht |
| [CHANGELOG.md](CHANGELOG.md) | Versionsverlauf |
