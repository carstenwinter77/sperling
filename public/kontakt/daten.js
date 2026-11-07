// Sperling – Kontaktseite: ALLE persönlichen Angaben stehen nur hier.
// Werden von index.html (Kontaktseite) und datenschutz.html (Datenschutzerklärung) gelesen.
// Stand: Konzept – die E-Mail-Adresse ist noch ein Platzhalter.
// eslint-disable-next-line no-unused-vars
const KONTAKT = {
  konzept: true,                          // false = Hinweis „Platzhalter“ ausblenden
  vorname: 'Jan',
  nachname: 'Sperling',
  titel: 'Berater für Photovoltaik und Wärmepumpe',
  telefon: '0152 31704399',              // Arbeitsnummer (Anzeige); Wählen/WhatsApp mit +49
  whatsapp: '+49 152 31704399',
  email: 'kontakt@beispiel.de',           // Platzhalter
  // Beratungsgebiet: als Satzteil („Ich berate Hausbesitzer …“) und kurz (Kontaktkarte):
  regionSatz: 'zwischen Peine und Salzgitter und im ganzen Umland',
  region: 'Peine, Salzgitter und Umgebung',
  // Für Datenschutzerklärung und Impressum (ladungsfähige Anschrift, kein Postfach):
  strasse: 'Nordstraße 2',
  plzOrt: '38268 Lengede',
  ustId: '',                              // falls vorhanden eintragen (erscheint dann im Impressum)
  // Zuständige Datenschutz-Aufsichtsbehörde = die des Bundeslands, in dem der Geschäftssitz liegt:
  aufsicht: 'die Datenschutz-Aufsichtsbehörde Niedersachsen (LfD Niedersachsen), Prinzenstraße 5, 30159 Hannover',
  aufsichtUrl: 'https://www.lfd.niedersachsen.de',
  // true, wenn Kundendaten in der Arbeits-App zusätzlich als verschlüsselte Sicherungsdatei in iCloud Drive gesichert werden:
  cloudSicherung: true,
  datenschutzStand: 'November 2026',
};
