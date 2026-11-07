// Sperling – Gesprächsleitfaden und Einwandbehandlung je Sparte.
//
// Aufbau jeder Einwandbehandlung (klassisches Vier-Stufen-Modell aus dem Vertrieb):
//   1. auffangen  – Einwand anerkennen, ohne zuzustimmen (kein „ja, aber“), Gesprächsklima halten
//   2. isolieren  – prüfen, ob es der EINZIGE Grund ist; Vorwand von echtem Einwand trennen
//   3. antworten  – Nutzenargumente, passend zur Technik (Bumerang, Relativieren, Referenz …)
//   4. abschluss  – Abschluss- oder Alternativfrage, die zum nächsten konkreten Schritt führt
// `technik` benennt die Methode, damit der Nutzer sie lernt und wiedererkennt.
//
// R-LEITFADEN: keine konkreten Preise, Förderquoten oder Renditeversprechen eintragen.
// Argumente müssen wahr sein: Druck entsteht durch Nutzen und Klarheit, nicht durch falsche Aussagen.

export const TECHNIKEN = {
  bumerang: 'Bumerang-Methode: Der Einwand wird zum Argument für den Kauf.',
  relativieren: 'Relativieren: Kosten auf Monat/Tag oder Ersparnis herunterbrechen.',
  bedingung: 'Bedingungsfrage: „Angenommen, wir lösen das – sind wir uns dann einig?“',
  rueckfrage: 'Rückfrage: Den wahren Grund hinter dem Einwand herausfinden.',
  referenz: 'Referenz / Social Proof: Andere in ähnlicher Lage haben es gemacht.',
  vorteil: 'Vorteil-Nachteil: Kosten des Nichtstuns sichtbar machen.',
  testen: 'Ausprobieren lassen: Risiko für den Kunden auf null setzen.',
};

const allgemein = {
  ueberlegen: {
    id: 'ueberlegen', kunde: 'Ich muss mir das noch überlegen.', technik: 'rueckfrage',
    auffangen: 'Das ist eine wichtige Entscheidung, das verstehe ich.',
    isolieren: 'Darf ich fragen: Was genau möchten Sie noch überlegen? Ist es eher der Preis, die Technik oder der Zeitpunkt?',
    antworten: [
      'Meistens steckt hinter „überlegen“ eine konkrete offene Frage. Die klären wir am besten jetzt, solange ich alle Infos dabeihabe.',
      'Nach dem Gespräch fehlt oft genau die Antwort, die man braucht. Deshalb gehen wir den Punkt lieber gleich gemeinsam durch.',
    ],
    abschluss: 'Wenn wir diesen Punkt jetzt klären, spricht dann noch etwas dagegen, den nächsten Schritt zu machen?',
  },
  partner: {
    id: 'partner', kunde: 'Das muss ich erst mit meinem Partner besprechen.', technik: 'bedingung',
    auffangen: 'Absolut richtig, so eine Entscheidung trifft man gemeinsam.',
    isolieren: 'Angenommen, Ihr Partner sieht es genauso wie Sie – wären Sie persönlich dafür?',
    antworten: [
      'Damit nichts verloren geht, erkläre ich es Ihnen beiden am besten direkt zusammen. Dann kann Ihr Partner seine Fragen selbst stellen.',
      'So müssen Sie nicht alles aus dem Gedächtnis wiedergeben.',
    ],
    abschluss: 'Wann sind Sie beide zu Hause – passt es eher unter der Woche abends oder am Samstag?',
  },
  infos: {
    id: 'infos', kunde: 'Schicken Sie mir einfach Unterlagen.', technik: 'rueckfrage',
    auffangen: 'Mache ich gern.',
    isolieren: 'Damit ich Ihnen nicht irgendetwas schicke: Was interessiert Sie denn am meisten daran?',
    antworten: [
      'Allgemeine Prospekte beantworten leider nicht die Frage, was es für Ihr Haus konkret bedeutet.',
      'Das lässt sich in wenigen Minuten vor Ort klären, dann haben Sie echte Zahlen statt Broschüren.',
    ],
    abschluss: 'Ich schicke Ihnen die Unterlagen und wir schauen sie uns kurz gemeinsam an – lieber Dienstag oder Donnerstag?',
  },
  keinInteresse: {
    id: 'keinInteresse', kunde: 'Kein Interesse.', technik: 'rueckfrage',
    auffangen: 'Danke, dass Sie so offen sind.',
    isolieren: 'Darf ich fragen, ob es grundsätzlich nicht passt oder nur gerade nicht der richtige Zeitpunkt ist?',
    antworten: [
      'Viele meiner Kunden haben das am Anfang auch gesagt, bis sie gesehen haben, was es für sie konkret bedeutet.',
      'Ich möchte Ihnen nichts verkaufen, was Ihnen nichts bringt. Eine kurze Prüfung zeigt, ob es sich für Sie überhaupt lohnt.',
    ],
    abschluss: 'Wenn sich herausstellt, dass Sie damit spürbar sparen, wäre es dann einen kurzen Blick wert?',
  },
};

export const LEITFADEN = {
  pv: {
    titel: 'Photovoltaik',
    einstieg: [
      'Wie hoch ist Ihre Stromrechnung ungefähr im Jahr?',
      'Wie haben sich Ihre Stromkosten in den letzten Jahren entwickelt?',
      'Planen Sie in den nächsten Jahren ein E-Auto oder eine neue Heizung?',
      'Wenn Sie Ihren Strom zum großen Teil selbst erzeugen könnten, was würde Ihnen das bedeuten?',
    ],
    einwaende: [
      { id: 'teuer', kunde: 'Das ist mir zu teuer.', technik: 'relativieren',
        auffangen: 'Gut, dass Sie das direkt ansprechen. Geld ist ein wichtiger Punkt.',
        isolieren: 'Mal angenommen, die Finanzierung passt in Ihr Monatsbudget – wäre die Anlage dann grundsätzlich etwas für Sie?',
        antworten: [
          'Zu teuer im Vergleich wozu? Sie zahlen Ihren Strom so oder so – die Frage ist nur, ob an den Versorger oder für Ihre eigene Anlage.',
          'Wir rechnen mit Ihrem echten Verbrauch: Was die Anlage über die Jahre spart, stellen wir direkt der monatlichen Rate gegenüber.',
          'Mit Miet- oder Finanzierungsmodell ist keine große Anfangsinvestition nötig.',
        ],
        abschluss: 'Sollen wir Ihre Zahlen jetzt gemeinsam durchrechnen, damit Sie schwarz auf weiß sehen, was übrig bleibt?' },
      { id: 'lohnt', kunde: 'Lohnt sich doch heute gar nicht mehr.', technik: 'bumerang',
        auffangen: 'Das hört man oft, und es ist gut, kritisch zu sein.',
        isolieren: 'Wenn ich Ihnen zeige, dass es sich für Ihr Haus rechnet, wäre das dann für Sie ein Thema?',
        antworten: [
          'Gerade weil die Einspeisevergütung gesunken ist, lohnt sich heute der Eigenverbrauch: Jede selbst genutzte Kilowattstunde müssen Sie nicht teuer einkaufen.',
          'Module sind in den letzten Jahren deutlich günstiger geworden, während Strom teuer bleibt.',
          'Mit Speicher, E-Auto oder Wärmepumpe nutzen Sie noch mehr vom eigenen Strom.',
        ],
        abschluss: 'Darf ich mir kurz Ihre letzte Stromabrechnung anschauen, damit wir das konkret für Sie prüfen?' },
      { id: 'alt', kunde: 'Dafür bin ich zu alt.', technik: 'vorteil',
        auffangen: 'Ich verstehe, dass Sie nicht für die nächsten 30 Jahre planen wollen.',
        isolieren: 'Geht es Ihnen eher um die Laufzeit oder darum, dass Sie selbst noch etwas davon haben?',
        antworten: [
          'Die Ersparnis beginnt ab dem ersten Monat, nicht erst in 20 Jahren.',
          'Eine Anlage steigert den Wert des Hauses – das kommt auch Kindern oder Erben zugute.',
          'Mit einem Miet- oder Finanzierungsmodell binden Sie kein Erspartes.',
        ],
        abschluss: 'Wer würde das Haus später einmal übernehmen? Sollen wir die direkt mit dazu holen?' },
      { id: 'dach', kunde: 'Mein Dach ist nicht geeignet.', technik: 'rueckfrage',
        auffangen: 'Gut, dass Sie sich darüber schon Gedanken gemacht haben.',
        isolieren: 'Woran machen Sie das fest – Ausrichtung, Verschattung oder Zustand des Dachs?',
        antworten: [
          'Auch Ost-West-Dächer liefern gut, gerade morgens und abends, wenn Sie zu Hause sind.',
          'Verschattung und Ausrichtung prüfen wir genau, bevor überhaupt ein Angebot entsteht.',
          'Steht eine Dachsanierung an, ist genau jetzt der günstigste Zeitpunkt, beides zu verbinden.',
        ],
        abschluss: 'Lassen Sie uns das kurz prüfen – darf ich jetzt einen Blick aufs Dach werfen?' },
      { id: 'anbieter', kunde: 'Ich habe schon ein Angebot von jemand anderem.', technik: 'referenz',
        auffangen: 'Sehr gut, dann haben Sie sich schon intensiv damit beschäftigt.',
        isolieren: 'Was hat Sie am anderen Angebot überzeugt, und was hält Sie noch davon ab, zu unterschreiben?',
        antworten: [
          'Viele meiner Kunden hatten auch schon ein Angebot und haben sich nach dem Vergleich für uns entschieden.',
          'Vergleichen Sie nicht nur den Preis, sondern auch Leistung, Komponenten, Garantie und Service nach der Montage.',
        ],
        abschluss: 'Darf ich mir das Angebot kurz anschauen, damit Sie einen fairen Vergleich haben?' },
      { id: 'warten', kunde: 'Ich warte, bis die Technik noch besser wird.', technik: 'vorteil',
        auffangen: 'Verständlich, niemand möchte zu früh einsteigen.',
        isolieren: 'Ist das der einzige Grund, oder gibt es noch etwas anderes?',
        antworten: [
          'Die Module sind heute sehr ausgereift. Jedes Jahr Warten ist ein Jahr volle Stromrechnung.',
          'Was Sie in der Wartezeit an den Versorger zahlen, ist für immer weg.',
        ],
        abschluss: 'Wollen wir ausrechnen, was Sie das Warten pro Jahr kostet?' },
      allgemein.ueberlegen,
      allgemein.partner,
      allgemein.infos,
      allgemein.keinInteresse,
    ],
  },
  wp: {
    titel: 'Wärmepumpe',
    einstieg: [
      'Wie alt ist Ihre Heizung, und womit heizen Sie aktuell?',
      'Was zahlen Sie ungefähr im Jahr für Heizung und Warmwasser?',
      'Gab es zuletzt Reparaturen oder Probleme mit der Heizung?',
      'Was würden Sie tun, wenn die Heizung im nächsten Winter ausfällt?',
    ],
    einwaende: [
      { id: 'altbau', kunde: 'Im Altbau funktioniert eine Wärmepumpe nicht.', technik: 'rueckfrage',
        auffangen: 'Das ist eine berechtigte Frage, die mir oft gestellt wird.',
        isolieren: 'Wenn wir prüfen und es passt technisch für Ihr Haus – wäre die Wärmepumpe dann für Sie interessant?',
        antworten: [
          'Entscheidend ist nicht das Baujahr, sondern die nötige Vorlauftemperatur. Viele Bestandsgebäude mit Heizkörpern laufen sehr gut damit.',
          'Wir prüfen Wohnfläche, Dämmung und Heizkörper, bevor überhaupt etwas angeboten wird.',
        ],
        abschluss: 'Darf ich mir jetzt kurz Heizung und Heizkörper anschauen?' },
      { id: 'teuer', kunde: 'Die Anschaffung ist zu teuer.', technik: 'relativieren',
        auffangen: 'Absolut verständlich, das ist eine größere Investition.',
        isolieren: 'Angenommen, Förderung und Finanzierung machen die monatliche Belastung tragbar – wäre das dann für Sie eine Option?',
        antworten: [
          'Für den Heizungstausch gibt es staatliche Förderung. Die aktuelle Höhe für Ihren Fall ermitteln wir verbindlich.',
          'Rechnen Sie die laufenden Kosten dagegen: Öl und Gas werden durch den CO₂-Preis Jahr für Jahr teurer.',
          'Mit eigenem PV-Strom sinken die Betriebskosten zusätzlich.',
        ],
        abschluss: 'Sollen wir die Förderung für Ihr Haus jetzt gemeinsam prüfen?' },
      { id: 'funktioniert', kunde: 'Meine Heizung läuft doch noch.', technik: 'bumerang',
        auffangen: 'Freut mich, dann sind Sie nicht unter Druck.',
        isolieren: 'Wie alt ist die Heizung genau, und wann war die letzte größere Reparatur?',
        antworten: [
          'Gerade weil sie noch läuft, haben Sie jetzt die Wahl. Fällt sie im Winter aus, entscheidet der Zeitdruck statt Sie.',
          'Ein geplanter Wechsel ist fast immer günstiger als ein Notfalltausch.',
        ],
        abschluss: 'Wollen wir jetzt in Ruhe planen, damit Sie im Ernstfall vorbereitet sind?' },
      { id: 'laut', kunde: 'Die sind doch laut.', technik: 'referenz',
        auffangen: 'Gut, dass Sie auch an die Nachbarn denken.',
        isolieren: 'Wäre das Thema Lautstärke der einzige Punkt, der Sie zögern lässt?',
        antworten: [
          'Moderne Geräte sind deutlich leiser als früher. Viele meiner Kunden hören sie im Alltag gar nicht.',
          'Wir planen den Aufstellort so, dass Schlafzimmer und Nachbarn berücksichtigt sind.',
        ],
        abschluss: 'Schauen wir uns gleich gemeinsam an, wo das Außengerät bei Ihnen am besten steht?' },
      { id: 'strompreis', kunde: 'Strom ist doch so teuer.', technik: 'bumerang',
        auffangen: 'Stimmt, Strom ist kein Schnäppchen.',
        isolieren: 'Wenn die Gesamtkosten trotzdem unter Ihren heutigen Heizkosten liegen – wäre das dann ein Argument?',
        antworten: [
          'Genau deshalb ist die Wärmepumpe so effizient: Aus einer Kilowattstunde Strom macht sie ein Mehrfaches an Wärme.',
          'Mit Wärmepumpentarif und eigenem PV-Strom wird es noch günstiger.',
        ],
        abschluss: 'Sollen wir Wärmepumpe und PV gemeinsam durchrechnen?' },
      { id: 'abwarten', kunde: 'Ich warte erst mal ab, was die Politik macht.', technik: 'vorteil',
        auffangen: 'Verstehe ich, da war viel Unruhe.',
        isolieren: 'Ist das der einzige Grund, oder gibt es noch etwas anderes?',
        antworten: [
          'Wer heute plant, kennt die aktuellen Bedingungen sicher. Ob die Förderung später besser oder schlechter ist, weiß niemand.',
          'Die CO₂-Kosten für Öl und Gas steigen dagegen planmäßig weiter.',
        ],
        abschluss: 'Wollen wir die Zahlen für Ihr Haus unverbindlich festhalten, damit Sie eine sichere Grundlage haben?' },
      allgemein.ueberlegen,
      allgemein.partner,
      allgemein.infos,
      allgemein.keinInteresse,
    ],
  },
  vorwerk: {
    titel: 'Vorwerk',
    einstieg: [
      'Womit saugen Sie aktuell, und wie zufrieden sind Sie damit?',
      'Welche Böden haben Sie: Teppich, Parkett, Fliesen?',
      'Gibt es Haustiere oder Allergiker im Haushalt?',
      'Was nervt Sie beim Putzen am meisten?',
    ],
    einwaende: [
      { id: 'hab', kunde: 'Ich habe schon einen Staubsauger.', technik: 'testen',
        auffangen: 'Natürlich, fast jeder hat einen.',
        isolieren: 'Wenn Sie ehrlich sind: Macht er Ihnen die Arbeit so leicht, wie Sie es sich wünschen?',
        antworten: [
          'Den Unterschied merkt man erst im direkten Vergleich – beim Teppich, bei Tierhaaren, beim Gewicht.',
          'Deshalb lasse ich Ihnen ein Gerät da, und Sie vergleichen in Ruhe bei sich zu Hause. Ohne Risiko.',
        ],
        abschluss: 'Soll ich Ihnen den Kobold bis nächste Woche dalassen?' },
      { id: 'teuer', kunde: 'Vorwerk ist mir zu teuer.', technik: 'relativieren',
        auffangen: 'Gut, dass Sie offen darüber sprechen.',
        isolieren: 'Wenn die monatliche Rate gut in Ihr Budget passt – wäre der Kobold dann Ihr Gerät?',
        antworten: [
          'Rechnen Sie es auf die Jahre herunter: Ein Gerät, das lange hält, ist am Ende günstiger als mehrere billige nacheinander.',
          'Sie bekommen Service und Ersatzteile direkt vom Hersteller und mich als festen Ansprechpartner.',
          'Ratenzahlung ist möglich.',
        ],
        abschluss: 'Wollen wir kurz ausrechnen, wie die Rate für Sie aussehen würde?' },
      { id: 'keinezeit', kunde: 'Ich habe gerade keine Zeit für eine Vorführung.', technik: 'testen',
        auffangen: 'Verstehe ich, der Alltag ist voll.',
        isolieren: 'Ist es nur der Zeitpunkt, oder interessiert Sie das Thema grundsätzlich nicht?',
        antworten: [
          'Dann machen wir es ganz einfach: Ich lasse Ihnen das Gerät da, Sie testen, wann es Ihnen passt.',
          'Die Vorführung bei Ihnen zu Hause dauert nur kurz.',
        ],
        abschluss: 'Passt es Ihnen besser unter der Woche abends oder am Samstag?' },
      { id: 'roboter', kunde: 'Ich brauche keinen Saugroboter.', technik: 'rueckfrage',
        auffangen: 'Das sehen viele am Anfang so.',
        isolieren: 'Wie oft saugen Sie aktuell pro Woche?',
        antworten: [
          'Der Roboter ersetzt nicht das gründliche Saugen, er hält zwischendurch sauber. Gerade mit Haustieren merkt man das sofort.',
          'Viele Kunden sagen nach einer Woche, dass sie ihn nicht mehr hergeben wollen.',
        ],
        abschluss: 'Wollen Sie ihn eine Woche testen?' },
      { id: 'online', kunde: 'Das kaufe ich lieber online.', technik: 'vorteil',
        auffangen: 'Online ist bequem, das stimmt.',
        isolieren: 'Was ist Ihnen beim Kauf wichtiger: der schnelle Klick oder dass das Gerät wirklich zu Ihnen passt?',
        antworten: [
          'Bei mir testen Sie das Gerät vorher bei sich zu Hause auf Ihren Böden.',
          'Sie haben einen festen Ansprechpartner für Fragen und Service statt einer Hotline.',
        ],
        abschluss: 'Soll ich Ihnen das Gerät für ein paar Tage dalassen?' },
      allgemein.ueberlegen,
      allgemein.partner,
      allgemein.keinInteresse,
    ],
  },
};

/** Überleitungen: aus einem laufenden Gespräch elegant zur anderen Sparte. */
export const UEBERLEITUNG = {
  pv: { wp: 'Mit eigenem Solarstrom wird auch das Heizen mit einer Wärmepumpe besonders günstig. Wie heizen Sie aktuell?', vorwerk: 'Ganz nebenbei: Ich betreue auch Vorwerk. Wenn Sie mögen, lasse ich Ihnen einen Kobold zum Testen da.' },
  wp: { pv: 'Eine Wärmepumpe braucht Strom. Haben Sie schon über eine PV-Anlage nachgedacht, damit ein Teil davon vom eigenen Dach kommt?', vorwerk: 'Ganz nebenbei: Ich betreue auch Vorwerk. Wenn Sie mögen, lasse ich Ihnen einen Kobold zum Testen da.' },
  vorwerk: { pv: 'Darf ich noch etwas fragen: Haben Sie schon einmal über eine Solaranlage nachgedacht? Das berate ich ebenfalls.', wp: 'Wie alt ist eigentlich Ihre Heizung? Zum Thema Wärmepumpe berate ich ebenfalls.' },
};

export const ERGEBNIS = {
  ueberzeugt: 'Einwand ausgeräumt',
  offen: 'Noch offen',
  bleibt: 'Kunde bleibt dabei',
};

/** Erzeugt den Notiztext für eine Sparte aus den angeklickten Einwänden. */
export function gespraechsNotiz(sparte, verlauf, freitext = '') {
  const l = LEITFADEN[sparte];
  if (!l) throw new Error(`Unbekannte Sparte: ${sparte}`);
  const zeilen = [];
  for (const e of l.einwaende) {
    const v = verlauf[e.id];
    if (v) zeilen.push(`- „${e.kunde}“ → ${ERGEBNIS[v] || ERGEBNIS.offen}`);
  }
  if (!zeilen.length && !freitext.trim()) return '';
  return [`Gespräch ${l.titel}${zeilen.length ? ', Einwände:' : ''}`, ...zeilen, freitext.trim()].filter(Boolean).join('\n');
}
