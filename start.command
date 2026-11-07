#!/bin/bash
# Sperling lokal starten (macOS: Doppelklick). Baut die App und öffnet http://localhost:8765
cd "$(dirname "$0")"
[ -d node_modules ] || npm install
npm run build && (sleep 2; open "http://localhost:8765/") &
npm start
