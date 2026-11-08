// Sperling – einheitliche Symbole für Menüleiste, „Mehr“-Menü und Einstellungen.
// Eigene, schlichte Linien-Symbole (24×24) in der Akzentfarbe mit heller Füllfläche.
// Farbe kommt per CSS (`.sym` → var(--braun)), passt sich also hell/dunkel automatisch an.

/** Zahnrad als Pfad berechnet (8 Zähne), damit es gleichmäßig wird. */
function zahnrad(): string {
  const cx = 12, cy = 12, aussen = 9, innen = 6.9, zaehne = 8;
  const pkt: string[] = [];
  for (let i = 0; i < zaehne; i++) {
    const a = (i / zaehne) * Math.PI * 2;
    const b = Math.PI / zaehne; // halbe Teilung
    const w = [a - b * 0.95, a - b * 0.45, a + b * 0.45, a + b * 0.95];
    const r = [innen, aussen, aussen, innen];
    w.forEach((x, j) => pkt.push(`${(cx + r[j]! * Math.cos(x)).toFixed(2)} ${(cy + r[j]! * Math.sin(x)).toFixed(2)}`));
  }
  return `M${pkt.join('L')}Z`;
}

const S: Record<string, string> = {
  start: '<path class="fs" d="M5.5 10v10h13V10L12 4.5z"/><path d="M3.5 11.5 12 4l8.5 7.5"/><path d="M10 20v-5.5h4V20"/>',
  kunden: '<circle class="fs" cx="9" cy="8" r="3.5"/><path d="M2.5 20c.5-3.6 3.2-5.5 6.5-5.5s6 1.9 6.5 5.5"/><path d="M15.5 4.8a3.3 3.3 0 0 1 0 6.4"/><path d="M17.5 14.8c2.2.6 3.6 2.4 4 5.2"/>',
  karte: '<path class="fs" d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6z"/><path d="M9 4v14M15 6v14"/>',
  termine: '<rect class="fs" x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2"/>',
  gespraech: '<path class="fs" d="M4 5.5h16v10H10l-4.5 4v-4H4z"/><path d="M8 9.5h8M8 12.5h5"/>',
  bestand: '<path class="fs" d="M3.5 8 12 4l8.5 4v9L12 21l-8.5-4z"/><path d="M3.5 8 12 12l8.5-4M12 12v9M7.8 6l8.5 4.1"/>',
  produkte: '<path class="fs" d="M3.5 3.5H11l9 9-7.5 7.5-9-9z"/><circle cx="7.8" cy="7.8" r="1.5"/>',
  foerderung: '<circle class="fs" cx="12" cy="12" r="8.5"/><path d="M15.2 8.4a4.2 4.2 0 1 0 0 7.2"/><path d="M7.5 10.9h5.5M7.5 13.4h5"/>',
  auswertung: '<path d="M3.5 20.5h17"/><rect class="fs" x="5" y="12" width="3.4" height="6" rx=".8"/><rect class="fs" x="10.3" y="6" width="3.4" height="12" rx=".8"/><rect class="fs" x="15.6" y="9" width="3.4" height="9" rx=".8"/>',
  einstellungen: `<path class="fs" d="${zahnrad()}"/><circle cx="12" cy="12" r="3"/>`,
  suche: '<circle class="fs" cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>',
  sperren: '<rect class="fs" x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3M12 14.5V17"/>',
  mehr: '<path d="M4 6.5h16M4 12h16M4 17.5h16"/>',
  tour: '<circle class="fs" cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  // Einstellungen: Bereiche
  allgemein: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle class="fs" cx="15" cy="7" r="2.2"/><circle class="fs" cx="9" cy="17" r="2.2"/>',
  texte: '<rect class="fs" x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="m4.5 7 7.5 6 7.5-6"/>',
  kundendaten: '<rect class="fs" x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="8.5" cy="10.5" r="2"/><path d="M5.5 16c.6-1.6 1.6-2.4 3-2.4s2.4.8 3 2.4M14 10h4M14 13.5h4"/>',
  sicherung: '<path class="fs" d="M7 19h10.5a4 4 0 0 0 .6-8 6 6 0 0 0-11.7-1.3A4.7 4.7 0 0 0 7 19z"/><path d="M12 16.5V11M9.6 13.2 12 10.8l2.4 2.4"/>',
  sicherheit: '<path class="fs" d="M12 3.5 19 6v5.5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
  kontaktseite: '<circle class="fs" cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.3 2.4 3.4 5.2 3.4 8.5s-1.1 6.1-3.4 8.5c-2.3-2.4-3.4-5.2-3.4-8.5S9.7 5.9 12 3.5z"/>',
  hilfe: '<circle class="fs" cx="12" cy="12" r="8.5"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.5v.4"/><path d="M12 16.8v.1"/>',
  aufraeumen: '<path d="M4 7h16M9.5 7V4.5h5V7"/><path class="fs" d="M6 7l1 13h10l1-13"/><path d="M10 11v5.5M14 11v5.5"/>',
};

export type SymbolName = keyof typeof S;

/** Inline-SVG; dekorativ (aria-hidden), Beschriftung steht daneben. */
export function symbol(name: string, klasse = ''): string {
  const inhalt = S[name] ?? S.mehr;
  return `<svg class="sym ${klasse}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${inhalt}</svg>`;
}
