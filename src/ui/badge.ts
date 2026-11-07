// Sperling – Zahl am App-Symbol: heute fällige/überfällige Termine und überfällige Leihgaben.
// Nur eine Zahl, keine Inhalte. Geht nur in der installierten App (iOS/iPadOS 16.4+, Android, Mac).
export function badgeZahl(data, jetzt = new Date()) {
  if (!data) return 0;
  const ende = new Date(jetzt); ende.setHours(23, 59, 59, 999);
  const e = ende.toISOString();
  const n = jetzt.toISOString();
  const termine = data.termine.filter((t) => !t.erledigt && t.beginn <= e).length;
  const leih = data.leihvorgaenge.filter((l) => !l.rueckgabe && l.rueckgabeGeplant && l.rueckgabeGeplant < n).length;
  return termine + leih;
}

let letzte = -1;
export function badgeSetzen(data) {
  if (!('setAppBadge' in navigator)) return;
  const z = badgeZahl(data);
  if (z === letzte) return;
  letzte = z;
  (z ? navigator.setAppBadge(z) : navigator.clearAppBadge()).catch(() => {});
}
