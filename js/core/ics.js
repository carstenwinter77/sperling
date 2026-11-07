// Sperling – Kalenderexport im iCalendar-Format (RFC 5545).
// Zeiten werden in UTC (…Z) geschrieben; jeder Kalender rechnet in Ortszeit um.

import { isValidDate } from './util.js';

const pad = (n) => String(n).padStart(2, '0');

export function icsDate(iso) {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/** Text-Escaping nach RFC 5545 §3.3.11. */
export function icsEscape(text) {
  return String(text ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

/** Zeilen auf 75 Oktette falten (UTF-8-sicher, keine Zeichen zerteilen). */
export function foldLine(line) {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out = [];
  let cur = '';
  let curLen = 0;
  let limit = 75;
  for (const ch of line) {
    const l = enc.encode(ch).length;
    if (curLen + l > limit) {
      out.push(cur);
      cur = '';
      curLen = 0;
      limit = 74; // Folgezeilen beginnen mit einem Leerzeichen
    }
    cur += ch;
    curLen += l;
  }
  if (cur) out.push(cur);
  return out.join('\r\n ');
}

/**
 * @param {Array<{id,titel,beginn,dauerMin,ort,notiz}>} termine
 * @returns {string} ICS-Datei-Inhalt
 */
export function erzeugeIcs(termine, { jetzt = new Date().toISOString() } = {}) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sperling//Aussendienst//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  for (const t of termine) {
    if (!t || !isValidDate(t.beginn)) continue;
    const start = new Date(t.beginn);
    const dauer = Number.isFinite(t.dauerMin) && t.dauerMin > 0 ? t.dauerMin : 60;
    const ende = new Date(start.getTime() + dauer * 60000);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${icsEscape(t.id)}@sperling`,
      `DTSTAMP:${icsDate(jetzt)}`,
      `DTSTART:${icsDate(start.toISOString())}`,
      `DTEND:${icsDate(ende.toISOString())}`,
      `SUMMARY:${icsEscape(t.titel || 'Termin')}`,
    );
    if (t.ort) lines.push(`LOCATION:${icsEscape(t.ort)}`);
    if (t.notiz) lines.push(`DESCRIPTION:${icsEscape(t.notiz)}`);
    lines.push(
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEscape(t.titel || 'Termin')}`, 'TRIGGER:-PT30M', 'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
