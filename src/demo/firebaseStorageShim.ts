/**
 * Demomodus-vervanging van 'firebase/storage'.
 *
 * Geüploade foto's worden als object-URL in het geheugen bewaard, zodat
 * foto-uploads in de demo zichtbaar zijn tot de pagina wordt herladen.
 */

export interface DemoStorageRef {
  __path: string;
  fullPath: string;
}

const bestanden = new Map<string, string>();

export function getStorage(_app?: unknown): unknown {
  return { __demo: true };
}

export function ref(_storage: unknown, path?: string): DemoStorageRef {
  const p = path ?? '';
  return { __path: p, fullPath: p };
}

export async function uploadBytes(
  storageRef: DemoStorageRef,
  data: Blob,
  _metadata?: unknown
): Promise<{ ref: DemoStorageRef }> {
  const url = URL.createObjectURL(data);
  bestanden.set(storageRef.__path, url);
  return { ref: storageRef };
}

export async function getDownloadURL(storageRef: DemoStorageRef): Promise<string> {
  const url = bestanden.get(storageRef.__path);
  if (!url) {
    throw new Error(`[DEMO] Bestand niet gevonden: ${storageRef.__path}`);
  }
  return url;
}

export async function deleteObject(storageRef: DemoStorageRef): Promise<void> {
  const url = bestanden.get(storageRef.__path);
  if (url) {
    URL.revokeObjectURL(url);
    bestanden.delete(storageRef.__path);
  }
}

export async function listAll(
  storageRef: DemoStorageRef
): Promise<{ items: DemoStorageRef[]; prefixes: DemoStorageRef[] }> {
  const prefix = storageRef.__path.endsWith('/')
    ? storageRef.__path
    : `${storageRef.__path}/`;
  const items: DemoStorageRef[] = [];
  for (const pad of bestanden.keys()) {
    if (pad.startsWith(prefix)) {
      items.push({ __path: pad, fullPath: pad });
    }
  }
  return { items, prefixes: [] };
}
