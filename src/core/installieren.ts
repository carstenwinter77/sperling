// Sperling – Installationshilfe (rein, ohne DOM, in Node testbar).
// Erkennt Gerät und Browser aus der Browser-Kennung und liefert die passenden Schritte,
// um Sperling als App auf den Home-Bildschirm bzw. ins Dock zu holen. Nichts davon wird gespeichert.

export type Geraet = 'iphone' | 'ipad' | 'android' | 'windows' | 'mac' | 'linux';
export type Browser = 'safari' | 'chrome' | 'edge' | 'samsung' | 'firefox' | 'andere';

/** Gerät und Browser ablesen. iPadOS meldet sich als Mac, verrät sich aber über Touch. */
export function erkennen(ua: string, beruehrung = 0): { geraet: Geraet; browser: Browser } {
  let geraet: Geraet = 'windows';
  if (/iPhone|iPod/.test(ua)) geraet = 'iphone';
  else if (/iPad/.test(ua) || (/Macintosh/.test(ua) && beruehrung > 1)) geraet = 'ipad';
  else if (/Android/.test(ua)) geraet = 'android';
  else if (/Macintosh|Mac OS X/.test(ua)) geraet = 'mac';
  else if (/Linux|CrOS/.test(ua)) geraet = 'linux';

  let browser: Browser = 'andere';
  if (/SamsungBrowser/.test(ua)) browser = 'samsung';
  else if (/Edg(e|A|iOS)?\//.test(ua)) browser = 'edge';
  else if (/Firefox|FxiOS/.test(ua)) browser = 'firefox';
  else if (/Chrome|CriOS|Chromium/.test(ua)) browser = 'chrome';
  else if (/Safari/.test(ua)) browser = 'safari';
  return { geraet, browser };
}

export const GERAETE: { key: Geraet; name: string }[] = [
  { key: 'ipad', name: 'iPad' },
  { key: 'iphone', name: 'iPhone' },
  { key: 'android', name: 'Android' },
  { key: 'windows', name: 'Windows' },
  { key: 'mac', name: 'Mac' },
];
export const BROWSER_NAME: Record<Browser, string> = { safari: 'Safari', chrome: 'Chrome', edge: 'Edge', samsung: 'Samsung Internet', firefox: 'Firefox', andere: 'anderer Browser' };
export const geraetName = (g: Geraet) => (g === 'linux' ? 'Linux-Laptop' : GERAETE.find((x) => x.key === g)?.name ?? g);

export interface Weg { id: string; geraet: Geraet[]; browser: Browser[]; titel: string; schritte: string[]; hinweis?: string }

export const WEGE: Weg[] = [
  {
    id: 'ios-safari', geraet: ['iphone', 'ipad'], browser: ['safari', 'andere'], titel: 'Mit Safari',
    schritte: [
      'Sperling in Safari öffnen (diese Seite).',
      'Auf das Teilen-Symbol tippen: das Quadrat mit dem Pfeil nach oben. Am iPad oben rechts, am iPhone unten in der Mitte.',
      'Nach unten blättern und „Zum Home-Bildschirm“ wählen.',
      '„Als Web-App öffnen“ eingeschaltet lassen und oben rechts auf „Hinzufügen“ tippen.',
      'Ab jetzt Sperling über das neue Symbol auf dem Home-Bildschirm starten, nicht mehr über Safari.',
    ],
    hinweis: 'Nur die installierte App kann Face ID nutzen, und iPadOS löscht ihre Daten nicht nach 7 Tagen ohne Nutzung.',
  },
  {
    id: 'ios-andere', geraet: ['iphone', 'ipad'], browser: ['chrome', 'edge', 'firefox'], titel: 'Mit Chrome, Edge oder Firefox',
    schritte: [
      'Auf das Teilen-Symbol in der Adresszeile tippen (Quadrat mit Pfeil nach oben).',
      '„Zum Home-Bildschirm“ wählen und bestätigen.',
      'Sperling danach über das neue Symbol auf dem Home-Bildschirm starten.',
    ],
    hinweis: 'Fehlt der Punkt, die Adresse in Safari öffnen und dort installieren. Safari ist auf iPad und iPhone am zuverlässigsten.',
  },
  {
    id: 'android-chrome', geraet: ['android'], browser: ['chrome', 'edge', 'andere'], titel: 'Mit Chrome',
    schritte: [
      'Erscheint unten „Sperling installieren“ oder oben der Knopf „Installieren“: einfach antippen.',
      'Sonst oben rechts auf die drei Punkte ⋮ tippen.',
      '„App installieren“ (oder „Zum Startbildschirm hinzufügen“) wählen und bestätigen.',
      'Sperling über das neue Symbol starten.',
    ],
  },
  {
    id: 'android-samsung', geraet: ['android'], browser: ['samsung'], titel: 'Mit Samsung Internet',
    schritte: [
      'Unten rechts auf das Menü ☰ tippen.',
      '„Seite hinzufügen zu“ und dann „Startbildschirm“ wählen.',
      'Sperling über das neue Symbol starten.',
    ],
  },
  {
    id: 'android-firefox', geraet: ['android'], browser: ['firefox'], titel: 'Mit Firefox',
    schritte: [
      'Auf die drei Punkte ⋮ tippen.',
      '„Installieren“ bzw. „Zum Startbildschirm hinzufügen“ wählen.',
      'Sperling über das neue Symbol starten.',
    ],
  },
  {
    id: 'desktop-chrome', geraet: ['windows', 'mac', 'linux'], browser: ['chrome', 'andere'], titel: 'Mit Chrome',
    schritte: [
      'Rechts in der Adresszeile auf das Installieren-Symbol klicken (Bildschirm mit Pfeil).',
      'Alternativ: Menü ⋮ → „Streamen, speichern und teilen“ → „Seite als App installieren“.',
      'Bestätigen. Sperling öffnet sich in einem eigenen Fenster und liegt im Startmenü bzw. im Programme-Ordner.',
    ],
  },
  {
    id: 'desktop-edge', geraet: ['windows', 'mac', 'linux'], browser: ['edge'], titel: 'Mit Edge',
    schritte: [
      'Rechts in der Adresszeile auf das Installieren-Symbol klicken.',
      'Alternativ: Menü … → „Apps“ → „Diese Website als App installieren“.',
      'Bestätigen. Sperling erscheint im Startmenü und kann an die Taskleiste angeheftet werden.',
    ],
  },
  {
    id: 'mac-safari', geraet: ['mac'], browser: ['safari'], titel: 'Mit Safari',
    schritte: [
      'Sperling in Safari öffnen (diese Seite).',
      'In der Menüleiste „Ablage“ → „Zum Dock hinzufügen …“ wählen.',
      '„Hinzufügen“ klicken. Sperling startet ab jetzt aus dem Dock in einem eigenen Fenster.',
    ],
  },
  {
    id: 'desktop-firefox', geraet: ['windows', 'mac', 'linux'], browser: ['firefox'], titel: 'Mit Firefox',
    schritte: [
      'Firefox kann Web-Apps am Computer nicht installieren.',
      'Sperling in Chrome oder Edge öffnen (am Mac auch Safari) und dort installieren.',
      'Alternativ ein Lesezeichen anlegen; Sperling funktioniert auch im Browser-Tab.',
    ],
  },
];

/** Wege für ein Gerät, der zum Browser passende zuerst. */
export function wegeFuer(geraet: Geraet, browser: Browser): Weg[] {
  const g = geraet === 'linux' ? 'windows' : geraet;
  const liste = WEGE.filter((w) => w.geraet.includes(g));
  return [...liste.filter((w) => w.browser.includes(browser)), ...liste.filter((w) => !w.browser.includes(browser))];
}
