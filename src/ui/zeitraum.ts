// Sperling – Zeitraum wählen im Monatskalender (wie bei Hotelbuchungen).
// Starttag antippen und weiterwischen, oder zweimal tippen (Beginn, Ende). Belegte Tage sind
// schraffiert und gesperrt; ein Zeitraum endet immer vor dem ersten belegten Tag.
import { esc } from '../core/util.ts';
import { tagVon, tagDatum, plusTage, wochenanfang, begrenzen, type Tag } from '../core/belegung.ts';

const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

export interface ZeitraumOptionen {
  von?: Tag | null;
  bis?: Tag | null;
  /** Tag gesperrt (belegt)? */
  belegt?: (t: Tag) => boolean;
  /** Kurztext für gesperrte Tage (Tooltip), z. B. „reserviert für Meier“ */
  info?: (t: Tag) => string;
  /** frühester wählbarer Tag */
  min?: Tag;
  /** Dauer in Tagen, die der erste Tipp vorschlägt */
  vorgabeTage?: number;
  onChange?: (von: Tag | null, bis: Tag | null) => void;
}

export interface ZeitraumWahl {
  get(): { von: Tag | null; bis: Tag | null };
  set(von: Tag | null, bis: Tag | null): void;
  /** Sperren neu setzen (z. B. nach Kundenwechsel); kürzt den Zeitraum bei Bedarf */
  setBelegt(fn: (t: Tag) => boolean, info?: (t: Tag) => string): void;
}

export function zeitraumWahl(box: HTMLElement, opt: ZeitraumOptionen = {}): ZeitraumWahl {
  let von = opt.von ?? null;
  let bis = opt.bis ?? von;
  let belegt = opt.belegt ?? (() => false);
  let info = opt.info ?? (() => '');
  const min = opt.min ?? '0000-01-01';
  const vorgabe = Math.max(1, opt.vorgabeTage ?? 1);
  let monat = tagDatum(von ?? tagVon(new Date()));
  monat.setDate(1);
  let wartetAufEnde = false;
  const gesperrt = (t: Tag) => t < min || belegt(t);
  const melden = () => opt.onChange?.(von, bis);

  const zeichnen = () => {
    const heute = tagVon(new Date());
    const erster = tagVon(monat);
    const start = wochenanfang(erster);
    const tage = Array.from({ length: 42 }, (_, i) => plusTage(start, i));
    box.innerHTML = `<div class="zr">
      <div class="zr-kopf"><button type="button" class="btn klein ghost" data-mon="-1" aria-label="Voriger Monat">‹</button><strong>${MONATE[monat.getMonth()]} ${monat.getFullYear()}</strong><button type="button" class="btn klein ghost" data-mon="1" aria-label="Nächster Monat">›</button></div>
      <div class="zr-raster">${['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((w) => `<span class="zr-wt">${w}</span>`).join('')}
      ${tage.map((t) => {
    const kl = ['zr-tag'];
    if (tagDatum(t).getMonth() !== monat.getMonth()) kl.push('fremd');
    if (t === heute) kl.push('heute');
    if (t < min) kl.push('vorbei');
    else if (belegt(t)) kl.push('belegt');
    if (von && bis && t >= von && t <= bis) kl.push('drin');
    if (t === von) kl.push('start');
    if (t === bis) kl.push('ende');
    const titel = belegt(t) ? info(t) : '';
    return `<button type="button" class="${kl.join(' ')}" data-tag="${t}"${titel ? ` title="${esc(titel)}"` : ''}>${tagDatum(t).getDate()}</button>`;
  }).join('')}</div>
      <p class="zr-text">${von ? `${fmt(von)}${bis && bis !== von ? ` – ${fmt(bis)}` : ''} · ${bis ? anzahl(von, bis) : 1} ${bis && anzahl(von, bis) > 1 ? 'Tage' : 'Tag'}${wartetAufEnde ? ' · jetzt das Ende antippen' : ''}` : 'Beginn antippen, dann bis zum Ende wischen oder das Ende antippen.'}</p>
    </div>`;
  };

  const waehle = (a: Tag, b: Tag) => {
    const [x, y] = a <= b ? [a, b] : [b, a];
    if (gesperrt(x)) return false;
    const ende = begrenzen(x, y, gesperrt);
    if (!ende) return false;
    von = x; bis = ende;
    return true;
  };

  // Zeiger: Tippen oder Wischen über die Tage
  let anker: Tag | null = null;
  let gewischt = false;
  const tagUnter = (e: PointerEvent): Tag | null => {
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('.zr-tag');
    return el && box.contains(el) ? el.dataset.tag || null : null;
  };
  box.addEventListener('pointerdown', (e) => {
    const t = (e.target as Element).closest<HTMLElement>('.zr-tag')?.dataset.tag;
    if (!t || e.button > 0) return;
    if (gesperrt(t)) { ruetteln(box); return; }
    anker = t; gewischt = false;
  });
  box.addEventListener('pointermove', (e) => {
    if (!anker) return;
    const t = tagUnter(e);
    if (!t || (t === anker && !gewischt)) return;
    if (!gewischt) { gewischt = true; box.querySelector('.zr-raster')?.setPointerCapture?.(e.pointerId); }
    if (waehle(anker, t)) { wartetAufEnde = false; zeichnen(); }
  });
  const loslassen = (e: PointerEvent) => {
    if (!anker) return;
    const t = anker;
    anker = null;
    if (gewischt) { melden(); return; }
    // Tippen: erster Tipp = Beginn (+ Vorschlag fürs Ende), zweiter Tipp = Ende
    if (wartetAufEnde && von && t > von) {
      if (waehle(von, t)) wartetAufEnde = false;
    } else if (waehle(t, plusTage(t, vorgabe - 1))) {
      wartetAufEnde = true;
    }
    e.preventDefault();
    zeichnen();
    melden();
  };
  box.addEventListener('pointerup', loslassen);
  box.addEventListener('pointercancel', () => { anker = null; });
  box.addEventListener('click', (e) => {
    const m = (e.target as Element).closest<HTMLElement>('[data-mon]');
    if (!m) return;
    monat = new Date(monat.getFullYear(), monat.getMonth() + Number(m.dataset.mon), 1);
    zeichnen();
  });

  // Anfangswerte prüfen: gesperrter Beginn -> keine Auswahl, sonst vor dem ersten belegten Tag kürzen
  if (von && !waehle(von, bis || von)) { von = null; bis = null; }
  zeichnen();
  return {
    get: () => ({ von, bis }),
    set: (a, b) => { if (a && waehle(a, b || a)) { monat = tagDatum(a); monat.setDate(1); } else { von = null; bis = null; } wartetAufEnde = false; zeichnen(); melden(); },
    setBelegt: (fn, inf) => {
      belegt = fn; if (inf) info = inf;
      if (von && !waehle(von, bis || von)) { von = null; bis = null; }
      zeichnen(); melden();
    },
  };
}

const fmt = (t: Tag) => tagDatum(t).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' });
const anzahl = (a: Tag, b: Tag) => Math.round((tagDatum(b).getTime() - tagDatum(a).getTime()) / 86400000) + 1;

function ruetteln(el: HTMLElement) {
  el.classList.remove('ruetteln');
  void el.offsetWidth;
  el.classList.add('ruetteln');
  navigator.vibrate?.(30);
}
