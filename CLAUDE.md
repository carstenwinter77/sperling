# Hinweise für KI-Assistenten

Vor jeder Arbeit an Sperling lesen, in dieser Reihenfolge:
1. `docs/STAND.md` – was fertig ist, was offen ist
2. `docs/REGELN.md` – verbindliche Regeln (vor allem R-TEXT, R-KRYPTO, R-XSS, R-SCHEMA, R-SW)
3. `docs/ARCHITEKTUR.md` und `docs/DATENMODELL.md` bei Strukturänderungen

Nach jeder Arbeit: `npm test` und `npm run test:e2e` (Server auf Port 8765) grün, `docs/STAND.md` und `CHANGELOG.md` aktualisieren, `CACHE_VERSION` in `sw.js` erhöhen.

Kommunikation mit dem Auftraggeber auf Deutsch. Nutzer der App ist ein Außendienstler (Außendienst Enpal + Vorwerk), hauptsächlich auf dem Tablet.

Der Demo-Link (claude.ai Artifact) wird aus `sperling-demo.html` + den App-Dateien veröffentlicht.
