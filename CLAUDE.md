# Hinweise für KI-Assistenten

Vor jeder Arbeit an Sperling lesen, in dieser Reihenfolge:
1. `docs/STAND.md` – was fertig ist, was offen ist
2. `docs/REGELN.md` – verbindliche Regeln (vor allem R-TEXT, R-KRYPTO, R-XSS, R-SCHEMA, R-SW)
3. `docs/ARCHITEKTUR.md` und `docs/DATENMODELL.md` bei Strukturänderungen

Nach jeder Arbeit: `npm run check` (0 Fehler), `npm test`, `npm run build` und `npm run test:e2e` grün (Browser-Test gegen den Build: `npm start` stellt `dist/` auf Port 8765 bereit), `docs/STAND.md` und `CHANGELOG.md` aktualisieren, Version in `package.json` erhöhen (Service Worker und App übernehmen sie). Ausgeliefert wird per GitHub Actions bei jedem Push auf `main`.

Kommunikation mit dem Auftraggeber auf Deutsch. Nutzer der App ist ein Außendienstler (Außendienst Enpal + Vorwerk), hauptsächlich auf dem Tablet.

Der Demo-Link (claude.ai Artifact) wird aus `dist/sperling-demo.html` + den gebauten Dateien in `dist/` veröffentlicht.
