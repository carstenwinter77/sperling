// Sperling – Kommandozeile: Suchen, Springen, Aktionen (rein, ohne DOM, in Node testbar).
// Suchlogik nach dem Vorbild SRINO: Normalisieren, jedes Wort muss vorkommen, Punkte je Treffer,
// Gruppen je Art. Dazu Verb-Erkennung („müller anrufen“) und die Liste „Zuletzt geöffnet“.
// Durchsucht nur die entsperrten Daten im Speicher; nichts verlässt das Gerät.
import { SPARTEN, SPARTEN_KEYS, STATUS, ZULETZT_MAX, normalizeZuletzt, kundenTitel, adresseEinzeilig, offenerVerleih, type Daten, type Kunde, type ZuletztEintrag } from './model.ts';
import { LEITFADEN } from './einwaende.ts';
import { formatDateTime, suchText } from './util.ts';
export { suchText };

// ---------- Normalisierung ----------

/** Nur Ziffern (Telefonnummern ohne Leerzeichen, Striche, Klammern). */
export const ziffern = (s: unknown) => String(s ?? '').replace(/\D/g, '');

// ---------- Einträge ----------

export type Art = 'befehl' | 'kunde' | 'geraet' | 'termin' | 'notiz' | 'einwand' | 'produkt' | 'bereich';
export const ARTEN: Record<Art, string> = {
  befehl: 'Befehle', kunde: 'Kunden', geraet: 'Vorführgeräte', termin: 'Termine', notiz: 'Notizen und Gespräche', einwand: 'Einwände', produkt: 'Produkte', bereich: 'Bereiche',
};
/** Reihenfolge bei gleicher Punktzahl. */
const ART_REIHE: Art[] = ['befehl', 'kunde', 'geraet', 'termin', 'notiz', 'einwand', 'produkt', 'bereich'];

export type KundenAktion = 'anrufen' | 'email' | 'hinfahren' | 'notiz' | 'termin' | 'doku' | 'gespraech';
export type GeraeteAktion = 'verleihen' | 'reservieren' | 'zuruecknehmen';
export type Aktion = KundenAktion | GeraeteAktion;
export const AKTION_LABEL: Record<Aktion, string> = {
  anrufen: '📞 Anrufen', email: '✉️ E-Mail', hinfahren: '🚗 Hinfahren', notiz: '📝 Notiz', termin: '📅 Termin',
  doku: '📋 Enpal-Doku', gespraech: '💬 Gespräch starten', verleihen: '📦 Verleihen', reservieren: '📌 Reservieren', zuruecknehmen: '↩️ Zurücknehmen',
};

export type Befehl = 'neuerKunde' | 'neuerTermin' | 'geraetVerleihen' | 'sichern' | 'thema' | 'sperren';

export interface Eintrag {
  art: Art;
  id: string;
  titel: string;
  unter: string;
  /** Sprungziel (Hash-Route); bei Befehlen leer */
  href: string;
  /** normalisierter Suchtext (Titel + alles Durchsuchbare) */
  text: string;
  titelN: string;
  /** mögliche Aktionen am Treffer (nur was geht) */
  aktionen: Aktion[];
  befehl?: Befehl;
  /** Volltext für den Ausschnitt (Notizen) */
  voll?: string;
}

const eintrag = (e: Omit<Eintrag, 'text' | 'titelN' | 'aktionen'> & { such?: unknown[]; aktionen?: Aktion[] }): Eintrag => {
  const { such = [], aktionen = [], ...rest } = e;
  return { ...rest, aktionen, titelN: suchText(e.titel), text: suchText([e.titel, e.unter, ...such].filter(Boolean).join(' ')) };
};

const BEREICHE: [string, string, string][] = [
  ['Übersicht', '#/', 'start home anfang heute'],
  ['Kunden', '#/kunden', 'kundenliste liste'],
  ['Karte', '#/karte', 'landkarte satellit umgebung'],
  ['Kalender', '#/termine', 'termine wiedervorlagen leihgaben'],
  ['Gesprächsleitfaden', '#/gespraech', 'gespraech einwaende leitfaden'],
  ['Vorführbestand', '#/bestand', 'geraete auto vorwerk leihgaben'],
  ['Kalender: Geräte', '#/belegung', 'belegungskalender reservierungen frei belegt'],
  ['Auswertungen', '#/auswertung', 'statistik bericht zahlen'],
  ['Produkte', '#/produkte', 'produktuebersicht katalog preise enpal galvany kobold'],
  ['Förderung', '#/foerderung', 'foerderung zuschuss kfw bafa eeg einspeiseverguetung steuer gesetz gmodg heizungsgesetz recht'],
  ['Gelöschte Kunden', '#/geloescht', 'papierkorb wiederherstellen geloescht'],
  ['Einstellungen', '#/einstellungen', 'optionen sicherung icloud passwort vorlagen'],
  ['Hilfe', '#/hilfe', 'anleitung fragen begriffe faq erklaerung'],
  ['Rund-Tour starten', '#/hilfe?tour=1', 'tour rundtour rundgang einfuehrung willkommen erklaerung'],
  ['App installieren', '#/hilfe?thema=installieren', 'installation home bildschirm homescreen dock einrichten'],
];

export const BEFEHLE: { befehl: Befehl; titel: string; such: string }[] = [
  { befehl: 'neuerKunde', titel: 'Neuer Kunde', such: 'anlegen kunde neu hinzufuegen' },
  { befehl: 'neuerTermin', titel: 'Neuer Termin', such: 'termin wiedervorlage anlegen neu' },
  { befehl: 'geraetVerleihen', titel: 'Gerät verleihen', such: 'vorfuehrgeraet leihen ausleihen' },
  { befehl: 'sichern', titel: 'Daten in iCloud sichern', such: 'sichern sicherung backup icloud dateien sync' },
  { befehl: 'thema', titel: 'Hell / Dunkel umschalten', such: 'dunkel hell theme nachtmodus farben' },
  { befehl: 'sperren', titel: 'Sperren', such: 'abmelden schliessen lock' },
];

/** Alle durchsuchbaren Einträge aus den (entsperrten) Daten. */
/** `produkte`: Katalog-Einträge (öffentlich, keine Kundendaten), optional. */
export function index(data: Daten, produkte: { id: string; name: string; kategorieLabel: string; bereich: string; such: string }[] = []): Eintrag[] {
  const out: Eintrag[] = [];
  for (const p of produkte) out.push(eintrag({ art: 'produkt', id: p.id, titel: p.name, unter: `${p.kategorieLabel} · ${SPARTEN[p.bereich as keyof typeof SPARTEN]?.label || ''}`, href: `#/produkte?produkt=${p.id}`, such: [p.such] }));
  for (const b of BEFEHLE) out.push(eintrag({ art: 'befehl', id: b.befehl, titel: b.titel, unter: '', href: '', befehl: b.befehl, such: [b.such] }));
  for (const [titel, href, such] of BEREICHE) out.push(eintrag({ art: 'bereich', id: href, titel, unter: 'Bereich öffnen', href, such: [such] }));

  const kundeVon = new Map(data.kunden.map((k) => [k.id, k]));
  for (const k of data.kunden) {
    const statusWoerter = SPARTEN_KEYS.filter((s) => k.status[s] !== 'unbekannt').map((s) => `${SPARTEN[s].label} ${SPARTEN[s].kurz} ${STATUS[k.status[s]].label}`);
    out.push(eintrag({
      art: 'kunde', id: k.id, titel: kundenTitel(k), unter: [adresseEinzeilig(k), k.telefon].filter(Boolean).join(' · '),
      href: `#/kunde/${k.id}`, such: [k.vorname, k.nachname, k.firma, k.email, ziffern(k.telefon), ...statusWoerter, ...Object.values(k.eigene || {}).filter((v): v is string => typeof v === 'string').map((v) => v.slice(0, 200))], aktionen: kundenAktionen(k),
    }));
    const name = kundenTitel(k);
    for (const n of k.notizen) {
      out.push(eintrag({ art: 'notiz', id: n.id, titel: name, unter: formatDateTime(n.zeitpunkt), href: `#/kunde/${k.id}?tab=verlauf`, such: [n.text], voll: n.text }));
    }
    for (const g of k.gespraeche) {
      if (!g.notiz) continue;
      out.push(eintrag({ art: 'notiz', id: g.id, titel: name, unter: `${formatDateTime(g.zeitpunkt)} · Gespräch ${SPARTEN[g.sparte].kurz}`, href: `#/kunde/${k.id}?tab=verlauf`, such: [g.notiz], voll: g.notiz }));
    }
    for (const c of k.enpalKontakte) {
      const text = [c.notiz, c.naechsterSchritt].filter(Boolean).join('\n');
      if (!text) continue;
      out.push(eintrag({ art: 'notiz', id: c.id, titel: name, unter: `${formatDateTime(c.zeitpunkt)} · Enpal-Doku`, href: `#/kunde/${k.id}?tab=doku`, such: [text], voll: text }));
    }
  }
  for (const t of data.termine) {
    const k = kundeVon.get(t.kundeId);
    out.push(eintrag({
      art: 'termin', id: t.id, titel: t.titel || (t.art === 'termin' ? 'Termin' : 'Wiedervorlage'),
      unter: [formatDateTime(t.beginn), k ? kundenTitel(k) : '', t.erledigt ? 'erledigt' : ''].filter(Boolean).join(' · '),
      href: `#/termine?datum=${t.beginn.slice(0, 10)}`, such: [t.ort, t.notiz, t.art === 'termin' ? 'termin' : 'wiedervorlage'],
    }));
  }
  for (const g of data.geraete) {
    if (!g.aktiv) continue;
    const l = offenerVerleih(data, g.id);
    const bei = l ? kundeVon.get(l.kundeId) : null;
    out.push(eintrag({
      art: 'geraet', id: g.id, titel: g.name, unter: l ? `verliehen${bei ? ` an ${kundenTitel(bei)}` : ''}` : 'im Auto',
      href: `#/bestand?geraet=${g.id}`, such: [g.seriennummer, g.zubehoer, 'vorwerk geraet'],
      aktionen: l ? ['zuruecknehmen', 'reservieren'] : ['verleihen', 'reservieren'],
    }));
  }
  for (const s of SPARTEN_KEYS) {
    const l = (LEITFADEN as Record<string, { titel: string; einwaende: { id: string; kunde: string; isolieren?: string }[] }>)[s];
    for (const e of l?.einwaende || []) {
      out.push(eintrag({ art: 'einwand', id: `${s}:${e.id}`, titel: e.kunde, unter: `Einwand ${l!.titel}`, href: `#/gespraech?sparte=${s}&einwand=${e.id}`, such: ['einwand'] }));
    }
  }
  return out;
}

/** Was am Kunden-Treffer möglich ist (kein Telefon → kein Anrufen usw.). */
export function kundenAktionen(k: Pick<Kunde, 'telefon' | 'email' | 'ort' | 'lat' | 'lng'>): KundenAktion[] {
  const a: KundenAktion[] = [];
  if (ziffern(k.telefon).length >= 3) a.push('anrufen');
  if (/@/.test(k.email || '')) a.push('email');
  if ((k.ort || '').trim() || (k.lat !== null && k.lng !== null)) a.push('hinfahren');
  a.push('gespraech', 'notiz', 'termin', 'doku');
  return a;
}

// ---------- Bewertung ----------

/** Punkte für einen Eintrag; 0 = kein Treffer (jedes Suchwort muss vorkommen). */
export function punkte(e: Pick<Eintrag, 'text' | 'titelN'>, woerter: string[], eingabe: string): number {
  if (!woerter.length) return 0;
  const teile = e.text.split(' ');
  let summe = 0;
  for (const w of woerter) {
    if (teile.includes(w)) summe += 3;
    else if (teile.some((t) => t.startsWith(w))) summe += 2;
    else if (e.text.includes(w)) summe += 1;
    else return 0;
  }
  if (e.titelN === eingabe) summe += 6;
  else if (e.titelN.startsWith(eingabe)) summe += 4;
  return summe;
}

export interface Treffer extends Eintrag { punkte: number }
export interface Gruppe { art: Art; label: string; treffer: Treffer[]; mehr: number }

// ---------- Verb-Erkennung ----------

const VERBEN: [Aktion, string[]][] = [
  ['anrufen', ['anrufen', 'anruf', 'telefonieren', 'telefon', 'tel', 'call']],
  ['email', ['email', 'mail', 'mailen']],
  ['hinfahren', ['hinfahren', 'fahren', 'navi', 'navigation', 'route']],
  ['notiz', ['notiz', 'notieren']],
  ['termin', ['termin', 'wiedervorlage']],
  ['doku', ['doku', 'dokumentation']],
  ['gespraech', ['gespraech', 'beraten', 'beratung']],
  ['verleihen', ['verleihen', 'leihen', 'ausleihen']],
  ['zuruecknehmen', ['zuruecknehmen', 'zurueck', 'ruecknahme']],
  ['reservieren', ['reservieren', 'reservierung']],
];

/** Erkennt ein Aktionswort in der Eingabe; der Rest wird normal gesucht. */
export function verbErkennen(eingabe: string): { aktion: Aktion | null; rest: string } {
  const woerter = suchText(eingabe).split(' ').filter(Boolean);
  for (let i = 0; i < woerter.length; i++) {
    const hit = VERBEN.find(([, ws]) => ws.includes(woerter[i]!));
    if (hit) return { aktion: hit[0], rest: woerter.filter((_, j) => j !== i).join(' ') };
  }
  return { aktion: null, rest: woerter.join(' ') };
}

export interface Vorschlag { aktion: Aktion; ziel: Treffer }
export interface Ergebnis { vorschlag: Vorschlag | null; gruppen: Gruppe[] }

/** Durchsucht die Einträge; bis zu `proGruppe` Treffer je Art, Gruppen nach bestem Treffer sortiert. */
export function suchen(eintraege: Eintrag[], eingabe: string, proGruppe = 5): Ergebnis {
  const voll = suchText(eingabe);
  if (!voll) return { vorschlag: null, gruppen: [] };
  const { aktion, rest } = verbErkennen(eingabe);
  const gruppen = gruppieren(eintraege, voll, proGruppe);
  let vorschlag: Vorschlag | null = null;
  if (aktion && rest) {
    // Aktionswort + Name: bester Kunde/bestes Gerät mit dieser Aktion
    const ziele = gruppieren(eintraege.filter((e) => e.aktionen.includes(aktion)), rest, 1);
    const best = ziele.flatMap((g) => g.treffer).sort((a, b) => b.punkte - a.punkte)[0];
    if (best) vorschlag = { aktion, ziel: best };
    // Treffer für den Rest zeigen, falls die volle Eingabe nichts findet
    if (!gruppen.length) return { vorschlag, gruppen: gruppieren(eintraege, rest, proGruppe) };
  }
  return { vorschlag, gruppen };
}

function gruppieren(eintraege: Eintrag[], eingabe: string, proGruppe: number): Gruppe[] {
  const woerter = eingabe.split(' ').filter(Boolean);
  const je = new Map<Art, Treffer[]>();
  for (const e of eintraege) {
    const p = punkte(e, woerter, eingabe);
    if (!p) continue;
    if (!je.has(e.art)) je.set(e.art, []);
    je.get(e.art)!.push({ ...e, punkte: p });
  }
  const out: Gruppe[] = [];
  for (const [art, liste] of je) {
    liste.sort((a, b) => b.punkte - a.punkte || a.titel.localeCompare(b.titel, 'de'));
    out.push({ art, label: ARTEN[art], treffer: liste.slice(0, proGruppe), mehr: Math.max(0, liste.length - proGruppe) });
  }
  return out.sort((a, b) => b.treffer[0]!.punkte - a.treffer[0]!.punkte || ART_REIHE.indexOf(a.art) - ART_REIHE.indexOf(b.art));
}

/** Kurzer Ausschnitt um das erste gefundene Suchwort (für Notizen). */
export function ausschnitt(text: string, eingabe: string, laenge = 90): string {
  const flach = text.replace(/\s+/g, ' ').trim();
  if (flach.length <= laenge) return flach;
  const n = suchText(flach);
  const w = suchText(eingabe).split(' ').find((x) => x && n.includes(x));
  // Position grob über den Anteil bestimmen (Normalisierung verlängert ä→ae)
  const pos = w ? Math.floor((n.indexOf(w) / Math.max(1, n.length)) * flach.length) : 0;
  const start = Math.max(0, Math.min(pos - 25, flach.length - laenge));
  return `${start > 0 ? '…' : ''}${flach.slice(start, start + laenge).trim()}${start + laenge < flach.length ? '…' : ''}`;
}

// ---------- Zuletzt geöffnet ----------

export { ZULETZT_MAX, normalizeZuletzt, type ZuletztEintrag };

/** Neu vorne einreihen, Doppelte entfernen, auf ZULETZT_MAX kürzen. */
export function zuletztHinzu(liste: ZuletztEintrag[], neu: ZuletztEintrag, max = ZULETZT_MAX): ZuletztEintrag[] {
  return [neu, ...liste.filter((x) => !(x.art === neu.art && x.id === neu.id))].slice(0, max);
}

/** Titel frisch aus den Daten; Gelöschtes fällt weg. */
export function zuletztAufloesen(data: Pick<Daten, 'kunden' | 'geraete'>, liste: ZuletztEintrag[]): { art: 'kunde' | 'geraet'; id: string; titel: string; href: string }[] {
  const out: { art: 'kunde' | 'geraet'; id: string; titel: string; href: string }[] = [];
  for (const z of liste) {
    if (z.art === 'kunde') {
      const k = data.kunden.find((x) => x.id === z.id);
      if (k) out.push({ ...z, titel: kundenTitel(k), href: `#/kunde/${k.id}` });
    } else {
      const g = data.geraete.find((x) => x.id === z.id && x.aktiv);
      if (g) out.push({ ...z, titel: g.name, href: `#/bestand?geraet=${g.id}` });
    }
  }
  return out;
}
