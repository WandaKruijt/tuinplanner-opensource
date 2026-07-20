/**
 * Demomodus-vervanging van 'firebase/database'.
 *
 * Implementeert het kleine deel van de Realtime Database API dat de app
 * gebruikt (ref, onValue, get, set, update, remove), bovenop de in-memory
 * demoStore. Zie src/demo/README.md.
 */

import { ready, leesPad, schrijfPad, verwijderPad, abonneer } from './demoStore';

export interface DemoDbRef {
  __path: string;
}

export interface DemoSnapshot {
  val: () => unknown;
  exists: () => boolean;
}

export function getDatabase(_app?: unknown): unknown {
  return { __demo: true };
}

export function ref(_db: unknown, path?: string): DemoDbRef {
  return { __path: path ?? '' };
}

function snapshotVoor(path: string): DemoSnapshot {
  const waarde = leesPad(path);
  return {
    val: () => waarde,
    exists: () => waarde !== null && waarde !== undefined,
  };
}

export function onValue(
  dbRef: DemoDbRef,
  callback: (snapshot: DemoSnapshot) => void,
  _errorCallback?: (error: Error) => void
): () => void {
  let actief = true;

  const emit = () => {
    if (!actief) return;
    callback(snapshotVoor(dbRef.__path));
  };

  const unsubscribe = abonneer(dbRef.__path, emit);
  // Eerste emit zodra de voorbeelddata geladen is
  ready().then(emit);

  return () => {
    actief = false;
    unsubscribe();
  };
}

export async function get(dbRef: DemoDbRef): Promise<DemoSnapshot> {
  await ready();
  return snapshotVoor(dbRef.__path);
}

export async function set(dbRef: DemoDbRef, waarde: unknown): Promise<void> {
  await ready();
  schrijfPad(dbRef.__path, waarde);
}

export async function update(dbRef: DemoDbRef, waarden: Record<string, unknown>): Promise<void> {
  await ready();
  for (const [key, waarde] of Object.entries(waarden)) {
    const pad = dbRef.__path ? `${dbRef.__path}/${key}` : key;
    schrijfPad(pad, waarde);
  }
}

export async function remove(dbRef: DemoDbRef): Promise<void> {
  await ready();
  verwijderPad(dbRef.__path);
}
