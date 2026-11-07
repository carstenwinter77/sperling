// Sperling – Kontaktseite: ALLE persönlichen Angaben stehen nur hier.
// Werden von index.html (Kontaktseite) und datenschutz.html (Datenschutzerklärung) gelesen.
// Stand: Konzept – Telefon, E-Mail, Region und Anschrift sind Platzhalter.
// eslint-disable-next-line no-unused-vars
const KONTAKT = {
  konzept: true,                          // false = Hinweis „Platzhalter“ ausblenden
  vorname: 'Jan',
  nachname: 'Sperling',
  titel: 'Berater für Photovoltaik und Wärmepumpe',
  telefon: '+49 151 23456789',            // Platzhalter
  whatsapp: '+49 151 23456789',           // Platzhalter (darf gleich der Telefonnummer sein)
  email: 'kontakt@beispiel.de',           // Platzhalter
  region: 'Raum Musterstadt',             // Platzhalter
  // Für Datenschutzerklärung und Impressum (ladungsfähige Anschrift, kein Postfach):
  strasse: 'Musterstraße 1',              // Platzhalter
  plzOrt: '12345 Musterstadt',            // Platzhalter
  // Zuständige Datenschutz-Aufsichtsbehörde = die des Bundeslands, in dem der Geschäftssitz liegt:
  aufsicht: 'die Datenschutz-Aufsichtsbehörde des Bundeslandes, in dem ich meinen Geschäftssitz habe', // Platzhalter
  aufsichtUrl: 'https://www.bfdi.bund.de/DE/Service/Anschriften/Laender/Laender-node.html',
  // true, wenn Kundendaten in der Arbeits-App zusätzlich als verschlüsselte Sicherungsdatei in iCloud Drive gesichert werden:
  cloudSicherung: true,
  datenschutzStand: 'November 2026',
};
