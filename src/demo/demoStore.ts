/**
 * In-memory datastore voor de demomodus.
 *
 * De store laadt eenmalig /demo-data.json en houdt daarna alle data in het
 * geheugen bij. Wijzigingen werken volledig (taken afvinken, notities, enz.)
 * maar verdwijnen zodra de pagina wordt herladen. Zo kan iedereen vrij
 * doorklikken zonder dat de demo vervuild raakt.
 */

type Listener = { path: string; cb: () => void };

let tree: Record<string, unknown> = {};
const listeners = new Set<Listener>();

let readyPromise: Promise<void> | null = null;

export function ready(): Promise<void> {
  if (!readyPromise) {
    readyPromise = fetch('/demo-data.json')
      .then((res) => {
        if (!res.ok) throw new Error(`demo-data.json niet gevonden (${res.status})`);
        return res.json();
      })
      .then((data) => {
        tree = data && typeof data === 'object' ? data : {};
        console.info('[DEMO] Voorbeelddata geladen');
      })
      .catch((err) => {
        console.error('[DEMO] Kon demo-data.json niet laden:', err);
        tree = {};
      });
  }
  return readyPromise;
}

function segmenten(path: string): string[] {
  return path.split('/').filter((s) => s.length > 0);
}

export function leesPad(path: string): unknown {
  let huidig: unknown = tree;
  for (const seg of segmenten(path)) {
    if (huidig === null || typeof huidig !== 'object') return null;
    huidig = (huidig as Record<string, unknown>)[seg];
    if (huidig === undefined) return null;
  }
  // Diepe kopie zodat de app de store nooit per ongeluk muteert
  return huidig === undefined ? null : JSON.parse(JSON.stringify(huidig ?? null));
}

export function schrijfPad(path: string, waarde: unknown): void {
  const segs = segmenten(path);
  if (segs.length === 0) {
    tree = (waarde as Record<string, unknown>) ?? {};
    notify('');
    return;
  }
  let huidig = tree as Record<string, unknown>;
  for (let i = 0; i < segs.length - 1; i++) {
    const seg = segs[i];
    if (huidig[seg] === null || typeof huidig[seg] !== 'object') {
      huidig[seg] = {};
    }
    huidig = huidig[seg] as Record<string, unknown>;
  }
  const laatste = segs[segs.length - 1];
  if (waarde === null || waarde === undefined) {
    delete huidig[laatste];
  } else {
    huidig[laatste] = JSON.parse(JSON.stringify(waarde));
  }
  notify(path);
}

export function verwijderPad(path: string): void {
  schrijfPad(path, null);
}

export function abonneer(path: string, cb: () => void): () => void {
  const listener: Listener = { path, cb };
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Twee paden zijn verwant als het ene een prefix van het andere is:
 * een schrijfactie op 'taken/abc' raakt een listener op 'taken', en een
 * schrijfactie op 'taken' raakt een listener op 'taken/abc'.
 */
function verwant(listenerPad: string, gewijzigdPad: string): boolean {
  if (listenerPad === '' || gewijzigdPad === '') return true;
  const a = segmenten(listenerPad);
  const b = segmenten(gewijzigdPad);
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// Notificaties worden per microtask gebundeld en asynchroon afgeleverd,
// net als bij echte Firebase. Zo kan een schrijfactie nooit synchroon
// opnieuw de code triggeren die de schrijfactie deed (rondzing-risico).
const wachtendePaden = new Set<string>();
let flushGepland = false;

function notify(pad: string): void {
  wachtendePaden.add(pad);
  if (flushGepland) return;
  flushGepland = true;
  queueMicrotask(() => {
    flushGepland = false;
    const paden = [...wachtendePaden];
    wachtendePaden.clear();
    for (const listener of listeners) {
      if (paden.some((p) => verwant(listener.path, p))) {
        try {
          listener.cb();
        } catch (err) {
          console.error('[DEMO] Listener fout:', err);
        }
      }
    }
  });
}
