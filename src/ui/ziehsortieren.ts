// Sperling – Listen per Griff umsortieren (Maus, Finger, Stift). Der Griff ist ein Knopf;
// mit der Tastatur verschiebt Pfeil hoch/runter auf dem Griff. Pfeilknöpfe der Liste bleiben die Alternative.
// Während des Ziehens wird nur die Anzeige umgestellt; erst beim Loslassen kommt fertig(von, nach).

export function ziehSortieren(liste: HTMLElement, griffSelektor: string, fertig: (von: number, nach: number) => void) {
  const eintraege = () => [...liste.children] as HTMLElement[];
  liste.addEventListener('keydown', (ev) => {
    const g = (ev.target as Element).closest<HTMLElement>(griffSelektor);
    if (!g || (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown')) return;
    const li = g.closest('li');
    const von = eintraege().indexOf(li as HTMLElement);
    const nach = von + (ev.key === 'ArrowUp' ? -1 : 1);
    if (von < 0 || nach < 0 || nach >= eintraege().length) return;
    ev.preventDefault();
    fertig(von, nach);
  });
  liste.addEventListener('pointerdown', (ev) => {
    const g = (ev.target as Element).closest<HTMLElement>(griffSelektor);
    if (!g || ev.button > 0) return;
    const li = g.closest('li') as HTMLElement | null;
    if (!li) return;
    ev.preventDefault();
    const von = eintraege().indexOf(li);
    // Bewegung am Dokument verfolgen: Das Umhängen des Eintrags im DOM beendet eine Zeiger-Erfassung am Griff.
    li.classList.add('zieht');
    const bewegen = (e: PointerEvent) => {
      const andere = eintraege().filter((x) => x !== li);
      const ziel = andere.find((x) => { const r = x.getBoundingClientRect(); return e.clientY < r.top + r.height / 2; });
      if (ziel) { if (li.nextElementSibling !== ziel) liste.insertBefore(li, ziel); }
      else if (liste.lastElementChild !== li) liste.appendChild(li);
    };
    const ende = () => {
      document.removeEventListener('pointermove', bewegen);
      document.removeEventListener('pointerup', ende);
      document.removeEventListener('pointercancel', ende);
      li.classList.remove('zieht');
      const nach = eintraege().indexOf(li);
      if (von >= 0 && nach >= 0 && nach !== von) fertig(von, nach);
    };
    document.addEventListener('pointermove', bewegen);
    document.addEventListener('pointerup', ende);
    document.addEventListener('pointercancel', ende);
  });
}
