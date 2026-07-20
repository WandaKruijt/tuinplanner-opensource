import { ref, onValue, set, update, remove, get } from 'firebase/database';
import { database } from '../config/firebase';
import type { AppData, Taak, Bed, Gewas, VerrijktGewas, TeeltplanItem, OogstItem, OogstRegistratie, OogstInstructie, Instructie, Signalering, BedVoortgang, GewassenlijstItem, TaakgroepOverride } from '../types';
import { nuISO } from '../utils/dateUtils';

const APP_VERSIE = '1.0.0';

// ============================================
// FIREBASE DATA SANITATIE
// ============================================

/**
 * Verwijder undefined waarden recursief uit een object.
 * Firebase Realtime Database accepteert geen undefined waarden.
 * Converteert undefined → null of verwijdert de key geheel.
 */
function stripUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) return null as T;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => stripUndefined(item)) as T;
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (value !== undefined) {
      result[key] = stripUndefined(value);
    }
  }
  return result as T;
}

/**
 * Converteer Firebase snapshot data naar een typed array, met null-filtering.
 * Firebase kan null waarden bevatten in Object.values() resultaten.
 */
function toArray<T>(data: unknown): T[] {
  if (!data) return [];
  return (Object.values(data) as T[]).filter((v): v is T => v != null);
}

// ============================================
// VEILIGHEIDS VALIDATIE
// ============================================

/**
 * Valideert of een bulk operatie veilig is om uit te voeren.
 * Voorkomt per ongeluk wissen van alle data.
 *
 * @param nieuwData - De nieuwe data array
 * @param entityNaam - Naam van de entiteit (voor logging)
 * @returns true als de operatie veilig is, false als het geweigerd wordt
 */
function valideerBulkOperatie<T>(nieuwData: T[], entityNaam: string): boolean {
  // Weiger lege arrays - dit zou alle data wissen
  if (!nieuwData || nieuwData.length === 0) {
    console.warn(`⚠️ VEILIGHEID: ${entityNaam} bulk operatie geweigerd - lege array zou alle data wissen`);
    return false;
  }
  return true;
}

// Database paths
const PATHS = {
  bedden: 'bedden',
  gewassen: 'gewassen',
  verrijkteGewassen: 'gewassen',  // Gewassen Encyclopedie - leest uit /gewassen/
  teeltplan: 'teeltplan',
  taken: 'taken',
  oogstlijst: 'oogstlijst',
  oogstRegistraties: 'oogstRegistraties',
  oogstInstructies: 'oogstInstructies',
  instructies: 'instructies',
  signaleringen: 'signaleringen',
  bedVoortgang: 'bedVoortgang',
  gewassenlijst: 'gewassenlijst',
  taakgroepOverrides: 'taakgroepOverrides',
  metadata: 'metadata'
};

// ============================================
// REAL-TIME LISTENERS
// ============================================

export type DataCallback = (data: AppData) => void;
export type ErrorCallback = (error: Error) => void;

/**
 * Start real-time luisteren naar alle data
 * Returns unsubscribe functie
 */
export function subscribeToData(
  onData: DataCallback,
  onError?: ErrorCallback
): () => void {
  const unsubscribes: (() => void)[] = [];

  let currentData: Partial<AppData & { bedVoortgang: BedVoortgang[] }> = {
    bedden: [],
    gewassen: [],
    verrijkteGewassen: [],
    gewassenlijst: [],
    teeltplan: [],
    taken: [],
    oogstlijst: [],
    oogstRegistraties: [],
    oogstInstructies: [],
    instructies: [],
    signaleringen: [],
    bedVoortgang: [],
    taakgroepOverrides: [],
    laatsteSync: nuISO(),
    versie: APP_VERSIE
  };

  const emitData = () => {
    onData({
      bedden: currentData.bedden || [],
      gewassen: currentData.gewassen || [],
      verrijkteGewassen: currentData.verrijkteGewassen || [],
      gewassenlijst: currentData.gewassenlijst || [],
      teeltplan: currentData.teeltplan || [],
      taken: currentData.taken || [],
      oogstlijst: currentData.oogstlijst || [],
      oogstRegistraties: currentData.oogstRegistraties || [],
      oogstInstructies: currentData.oogstInstructies || [],
      instructies: currentData.instructies || [],
      signaleringen: currentData.signaleringen || [],
      bedVoortgang: currentData.bedVoortgang || [],
      taakgroepOverrides: currentData.taakgroepOverrides || [],
      laatsteSync: nuISO(),
      versie: APP_VERSIE
    } as AppData & { bedVoortgang: BedVoortgang[] });
  };

  // Luister naar bedden
  const beddenRef = ref(database, PATHS.bedden);
  const unsubBedden = onValue(beddenRef, (snapshot) => {
    currentData.bedden = toArray<Bed>(snapshot.val());
    emitData();
  }, (error) => {
    console.error('Firebase bedden error:', error);
    onError?.(error);
  });
  unsubscribes.push(() => unsubBedden());

  // Luister naar gewassen
  const gewassenRef = ref(database, PATHS.gewassen);
  const unsubGewassen = onValue(gewassenRef, (snapshot) => {
    currentData.gewassen = toArray<Gewas>(snapshot.val());
    emitData();
  }, (error) => {
    console.error('Firebase gewassen error:', error);
    onError?.(error);
  });
  unsubscribes.push(() => unsubGewassen());

  // Luister naar verrijkte gewassen (encyclopedie)
  const verrijkteGewassenRef = ref(database, PATHS.verrijkteGewassen);
  const unsubVerrijkteGewassen = onValue(verrijkteGewassenRef, (snapshot) => {
    currentData.verrijkteGewassen = toArray<VerrijktGewas>(snapshot.val());
    emitData();
  }, (error) => {
    console.error('Firebase verrijkteGewassen error:', error);
    onError?.(error);
  });
  unsubscribes.push(() => unsubVerrijkteGewassen());

  // Luister naar teeltplan
  const teeltplanRef = ref(database, PATHS.teeltplan);
  const unsubTeeltplan = onValue(teeltplanRef, (snapshot) => {
    currentData.teeltplan = toArray<TeeltplanItem>(snapshot.val());
    emitData();
  }, (error) => {
    console.error('Firebase teeltplan error:', error);
    onError?.(error);
  });
  unsubscribes.push(() => unsubTeeltplan());

  // Luister naar taken
  const takenRef = ref(database, PATHS.taken);
  const unsubTaken = onValue(takenRef, (snapshot) => {
    currentData.taken = toArray<Taak>(snapshot.val());
    emitData();
  }, (error) => {
    console.error('Firebase taken error:', error);
    onError?.(error);
  });
  unsubscribes.push(() => unsubTaken());

  // Luister naar oogstlijst
  const oogstlijstRef = ref(database, PATHS.oogstlijst);
  const unsubOogstlijst = onValue(oogstlijstRef, (snapshot) => {
    currentData.oogstlijst = toArray<OogstItem>(snapshot.val());
    emitData();
  }, (error) => {
    console.error('Firebase oogstlijst error:', error);
    onError?.(error);
  });
  unsubscribes.push(() => unsubOogstlijst());

  // Luister naar signaleringen
  const signaleringenRef = ref(database, PATHS.signaleringen);
  const unsubSignaleringen = onValue(signaleringenRef, (snapshot) => {
    currentData.signaleringen = toArray<Signalering>(snapshot.val());
    emitData();
  }, (error) => {
    console.error('Firebase signaleringen error:', error);
    onError?.(error);
  });
  unsubscribes.push(() => unsubSignaleringen());

  // Luister naar oogst registraties
  const oogstRegRef = ref(database, PATHS.oogstRegistraties);
  const unsubOogstReg = onValue(oogstRegRef, (snapshot) => {
    currentData.oogstRegistraties = toArray<OogstRegistratie>(snapshot.val());
    emitData();
  }, (error) => {
    console.error('Firebase oogstRegistraties error:', error);
    onError?.(error);
  });
  unsubscribes.push(() => unsubOogstReg());

  // Luister naar oogst instructies (legacy)
  const oogstInstRef = ref(database, PATHS.oogstInstructies);
  const unsubOogstInst = onValue(oogstInstRef, (snapshot) => {
    currentData.oogstInstructies = toArray<OogstInstructie>(snapshot.val());
    emitData();
  }, (error) => {
    console.error('Firebase oogstInstructies error:', error);
    onError?.(error);
  });
  unsubscribes.push(() => unsubOogstInst());

  // Luister naar instructies (nieuw)
  const instructiesRef = ref(database, PATHS.instructies);
  const unsubInstructies = onValue(instructiesRef, (snapshot) => {
    currentData.instructies = toArray<Instructie>(snapshot.val());
    emitData();
  }, (error) => {
    console.error('Firebase instructies error:', error);
    onError?.(error);
  });
  unsubscribes.push(() => unsubInstructies());

  // Luister naar gewassenlijst
  const gewassenlijstRef = ref(database, PATHS.gewassenlijst);
  const unsubGewassenlijst = onValue(gewassenlijstRef, (snapshot) => {
    currentData.gewassenlijst = toArray<GewassenlijstItem>(snapshot.val());
    emitData();
  }, (error) => {
    console.error('Firebase gewassenlijst error:', error);
    onError?.(error);
  });
  unsubscribes.push(() => unsubGewassenlijst());

  // Luister naar bedVoortgang
  const bedVoortgangRef = ref(database, PATHS.bedVoortgang);
  const unsubBedVoortgang = onValue(bedVoortgangRef, (snapshot) => {
    currentData.bedVoortgang = toArray<BedVoortgang>(snapshot.val());
    emitData();
  }, (error) => {
    console.error('Firebase bedVoortgang error:', error);
    onError?.(error);
  });
  unsubscribes.push(() => unsubBedVoortgang());

  // Luister naar taakgroep overrides
  const overridesRef = ref(database, PATHS.taakgroepOverrides);
  const unsubOverrides = onValue(overridesRef, (snapshot) => {
    currentData.taakgroepOverrides = toArray<TaakgroepOverride>(snapshot.val());
    emitData();
  }, (error) => {
    console.error('Firebase taakgroepOverrides error:', error);
    onError?.(error);
  });
  unsubscribes.push(() => unsubOverrides());

  // Return unsubscribe functie
  return () => {
    unsubscribes.forEach(unsub => unsub());
  };
}

// ============================================
// BEDDEN OPERATIES
// ============================================

export async function setBedden(bedden: Bed[]): Promise<void> {
  if (!valideerBulkOperatie(bedden, 'bedden')) return;

  const beddenRef = ref(database, PATHS.bedden);
  const beddenMap: Record<string, Bed> = {};
  bedden.forEach(bed => {
    beddenMap[bed.id] = bed;
  });
  await set(beddenRef, beddenMap);
}

export async function updateBed(bed: Bed): Promise<void> {
  const bedRef = ref(database, `${PATHS.bedden}/${bed.id}`);
  await set(bedRef, bed);
}

// ============================================
// GEWASSEN OPERATIES
// ============================================

export async function setGewassen(gewassen: Gewas[]): Promise<void> {
  if (!valideerBulkOperatie(gewassen, 'gewassen')) return;

  const gewassenRef = ref(database, PATHS.gewassen);
  const gewassenMap: Record<string, Gewas> = {};
  gewassen.forEach(gewas => {
    gewassenMap[gewas.id] = stripUndefined(gewas);
  });
  await set(gewassenRef, gewassenMap);
}

export async function updateGewas(gewas: Gewas): Promise<void> {
  const gewasRef = ref(database, `${PATHS.gewassen}/${gewas.id}`);
  await set(gewasRef, gewas);
}

// ============================================
// TEELTPLAN OPERATIES
// ============================================

export async function setTeeltplan(teeltplan: TeeltplanItem[]): Promise<void> {
  if (!valideerBulkOperatie(teeltplan, 'teeltplan')) return;

  const teeltplanRef = ref(database, PATHS.teeltplan);
  const teeltplanMap: Record<string, TeeltplanItem> = {};
  teeltplan.forEach(item => {
    teeltplanMap[item.id] = stripUndefined(item);
  });
  await set(teeltplanRef, teeltplanMap);
}

export async function updateTeeltplanItem(item: TeeltplanItem): Promise<void> {
  const itemRef = ref(database, `${PATHS.teeltplan}/${item.id}`);
  await set(itemRef, item);
}

// ============================================
// TAKEN OPERATIES
// ============================================

export async function setTaken(taken: Taak[]): Promise<void> {
  if (!valideerBulkOperatie(taken, 'taken')) return;

  const takenRef = ref(database, PATHS.taken);
  const takenMap: Record<string, Taak> = {};
  taken.forEach(taak => {
    takenMap[taak.id] = stripUndefined(taak);
  });
  await set(takenRef, takenMap);
}

export async function voegTaakToe(taak: Taak): Promise<void> {
  // Verwijder undefined waarden voor Firebase
  const cleanTaak = JSON.parse(JSON.stringify(taak));
  const taakRef = ref(database, `${PATHS.taken}/${taak.id}`);
  await set(taakRef, cleanTaak);
}

export async function updateTaak(taak: Taak): Promise<void> {
  const taakRef = ref(database, `${PATHS.taken}/${taak.id}`);
  // Verwijder undefined waarden voor Firebase
  const cleanTaak = JSON.parse(JSON.stringify({ ...taak, gewijzigd: nuISO() }));
  await set(taakRef, cleanTaak);
}

export async function verwijderTaak(taakId: string): Promise<void> {
  const taakRef = ref(database, `${PATHS.taken}/${taakId}`);
  await remove(taakRef);
}

// ============================================
// BULK OPERATIES (voor import)
// ============================================

export async function importeerAlleData(data: AppData): Promise<void> {
  // Valideer dat we niet per ongeluk alles wissen
  const heeftBedden = data.bedden && data.bedden.length > 0;
  const heeftGewassen = data.gewassen && data.gewassen.length > 0;
  const heeftTeeltplan = data.teeltplan && data.teeltplan.length > 0;
  const heeftTaken = data.taken && data.taken.length > 0;

  if (!heeftBedden && !heeftGewassen && !heeftTeeltplan && !heeftTaken) {
    console.warn('⚠️ VEILIGHEID: importeerAlleData geweigerd - alle arrays zijn leeg');
    return;
  }

  // Importeer alleen niet-lege arrays (individuele validatie in elke set-functie)
  await Promise.all([
    setBedden(data.bedden),
    setGewassen(data.gewassen),
    setTeeltplan(data.teeltplan),
    setTaken(data.taken)
  ]);
}

/**
 * Haal alle data eenmalig op (niet real-time)
 */
export async function getInitialData(): Promise<AppData> {
  const [beddenSnap, gewassenSnap, verrijkteGewassenSnap, gewassenlijstSnap, teeltplanSnap, takenSnap, oogstSnap, oogstRegSnap, oogstInstSnap, instructiesSnap, sigSnap, voortgangSnap, overridesSnap] = await Promise.all([
    get(ref(database, PATHS.bedden)),
    get(ref(database, PATHS.gewassen)),
    get(ref(database, PATHS.verrijkteGewassen)),
    get(ref(database, PATHS.gewassenlijst)),
    get(ref(database, PATHS.teeltplan)),
    get(ref(database, PATHS.taken)),
    get(ref(database, PATHS.oogstlijst)),
    get(ref(database, PATHS.oogstRegistraties)),
    get(ref(database, PATHS.oogstInstructies)),
    get(ref(database, PATHS.instructies)),
    get(ref(database, PATHS.signaleringen)),
    get(ref(database, PATHS.bedVoortgang)),
    get(ref(database, PATHS.taakgroepOverrides))
  ]);

  return {
    bedden: toArray<Bed>(beddenSnap.val()),
    gewassen: toArray<Gewas>(gewassenSnap.val()),
    verrijkteGewassen: toArray<VerrijktGewas>(verrijkteGewassenSnap.val()),
    gewassenlijst: toArray<GewassenlijstItem>(gewassenlijstSnap.val()),
    teeltplan: toArray<TeeltplanItem>(teeltplanSnap.val()),
    taken: toArray<Taak>(takenSnap.val()),
    oogstlijst: toArray<OogstItem>(oogstSnap.val()),
    oogstRegistraties: toArray<OogstRegistratie>(oogstRegSnap.val()),
    oogstInstructies: toArray<OogstInstructie>(oogstInstSnap.val()),
    instructies: toArray<Instructie>(instructiesSnap.val()),
    signaleringen: toArray<Signalering>(sigSnap.val()),
    bedVoortgang: toArray<BedVoortgang>(voortgangSnap.val()),
    taakgroepOverrides: toArray<TaakgroepOverride>(overridesSnap.val()),
    laatsteSync: nuISO(),
    versie: APP_VERSIE
  };
}

/**
 * Check of er data in Firebase staat
 */
export async function heeftData(): Promise<boolean> {
  const beddenSnap = await get(ref(database, PATHS.bedden));
  return beddenSnap.exists();
}

// ============================================
// OOGSTLIJST OPERATIES
// ============================================

export async function setOogstlijst(oogstlijst: OogstItem[]): Promise<void> {
  if (!valideerBulkOperatie(oogstlijst, 'oogstlijst')) return;

  const oogstlijstRef = ref(database, PATHS.oogstlijst);
  const oogstlijstMap: Record<string, OogstItem> = {};
  oogstlijst.forEach(item => {
    // Verwijder undefined waarden voor Firebase
    const cleanItem = JSON.parse(JSON.stringify(item));
    oogstlijstMap[item.id] = cleanItem;
  });
  await set(oogstlijstRef, oogstlijstMap);
}

export async function updateOogstItem(item: OogstItem): Promise<void> {
  // Verwijder alle undefined waarden recursief voor Firebase
  const cleanItem = JSON.parse(JSON.stringify(item));
  const itemRef = ref(database, `${PATHS.oogstlijst}/${item.id}`);
  await set(itemRef, cleanItem);
}

export async function verwijderOogstItem(itemId: string): Promise<void> {
  const itemRef = ref(database, `${PATHS.oogstlijst}/${itemId}`);
  await remove(itemRef);
}

// ============================================
// SIGNALERINGEN OPERATIES
// ============================================

export async function setSignaleringen(signaleringen: Signalering[]): Promise<void> {
  if (!valideerBulkOperatie(signaleringen, 'signaleringen')) return;

  const signaleringenRef = ref(database, PATHS.signaleringen);
  const signaleringenMap: Record<string, Signalering> = {};
  signaleringen.forEach(sig => {
    // Verwijder undefined waarden voor Firebase
    const cleanSig = JSON.parse(JSON.stringify(sig));
    signaleringenMap[sig.id] = cleanSig;
  });
  await set(signaleringenRef, signaleringenMap);
}

export async function updateSignalering(signalering: Signalering): Promise<void> {
  const sigRef = ref(database, `${PATHS.signaleringen}/${signalering.id}`);
  await set(sigRef, signalering);
}

export async function verwijderSignalering(sigId: string): Promise<void> {
  const sigRef = ref(database, `${PATHS.signaleringen}/${sigId}`);
  await remove(sigRef);
}

// ============================================
// OOGST REGISTRATIES OPERATIES
// ============================================

export async function setOogstRegistraties(registraties: OogstRegistratie[]): Promise<void> {
  if (!valideerBulkOperatie(registraties, 'oogstRegistraties')) return;

  const regRef = ref(database, PATHS.oogstRegistraties);
  const regMap: Record<string, OogstRegistratie> = {};
  registraties.forEach(reg => {
    regMap[reg.id] = reg;
  });
  await set(regRef, regMap);
}

export async function updateOogstRegistratie(registratie: OogstRegistratie): Promise<void> {
  const regRef = ref(database, `${PATHS.oogstRegistraties}/${registratie.id}`);
  await set(regRef, registratie);
}

export async function verwijderOogstRegistratie(regId: string): Promise<void> {
  const regRef = ref(database, `${PATHS.oogstRegistraties}/${regId}`);
  await remove(regRef);
}

// ============================================
// BED VOORTGANG OPERATIES
// ============================================

export async function setBedVoortgang(voortgang: BedVoortgang[]): Promise<void> {
  if (!valideerBulkOperatie(voortgang, 'bedVoortgang')) return;

  const voortgangRef = ref(database, PATHS.bedVoortgang);
  const voortgangMap: Record<string, BedVoortgang> = {};
  voortgang.forEach(item => {
    const cleanItem = JSON.parse(JSON.stringify(item));
    voortgangMap[item.id] = cleanItem;
  });
  await set(voortgangRef, voortgangMap);
}

export async function updateBedVoortgang(item: BedVoortgang): Promise<void> {
  const cleanItem = JSON.parse(JSON.stringify(item));
  const itemRef = ref(database, `${PATHS.bedVoortgang}/${item.id}`);
  await set(itemRef, cleanItem);
}

export async function verwijderBedVoortgang(itemId: string): Promise<void> {
  const itemRef = ref(database, `${PATHS.bedVoortgang}/${itemId}`);
  await remove(itemRef);
}

// ============================================
// TAAKGROEP OVERRIDES OPERATIES
// ============================================

export async function updateTaakgroepOverride(override: TaakgroepOverride): Promise<void> {
  const cleanOverride = JSON.parse(JSON.stringify(override));
  const overrideRef = ref(database, `${PATHS.taakgroepOverrides}/${override.id}`);
  await set(overrideRef, cleanOverride);
}

export async function verwijderTaakgroepOverride(overrideId: string): Promise<void> {
  const overrideRef = ref(database, `${PATHS.taakgroepOverrides}/${overrideId}`);
  await remove(overrideRef);
}

// ============================================
// OOGST INSTRUCTIES
// ============================================

export async function setOogstInstructies(instructies: OogstInstructie[]): Promise<void> {
  if (!valideerBulkOperatie(instructies, 'oogstInstructies')) return;

  const instructiesMap: Record<string, OogstInstructie> = {};
  instructies.forEach(instructie => {
    instructiesMap[instructie.id] = JSON.parse(JSON.stringify(instructie));
  });
  const instructiesRef = ref(database, PATHS.oogstInstructies);
  await set(instructiesRef, instructiesMap);
}

export async function updateOogstInstructie(instructie: OogstInstructie): Promise<void> {
  const cleanInstructie = JSON.parse(JSON.stringify(instructie));
  const instructieRef = ref(database, `${PATHS.oogstInstructies}/${instructie.id}`);
  await set(instructieRef, cleanInstructie);
}

export async function verwijderOogstInstructie(instructieId: string): Promise<void> {
  const instructieRef = ref(database, `${PATHS.oogstInstructies}/${instructieId}`);
  await remove(instructieRef);
}

// ============================================
// INSTRUCTIES (NIEUW)
// ============================================

export async function setInstructies(instructies: Instructie[]): Promise<void> {
  if (!valideerBulkOperatie(instructies, 'instructies')) return;

  const instructiesMap: Record<string, Instructie> = {};
  instructies.forEach(instructie => {
    instructiesMap[instructie.id] = JSON.parse(JSON.stringify(instructie));
  });
  const instructiesRef = ref(database, PATHS.instructies);
  await set(instructiesRef, instructiesMap);
}

export async function updateInstructie(instructie: Instructie): Promise<void> {
  const cleanInstructie = JSON.parse(JSON.stringify(instructie));
  const instructieRef = ref(database, `${PATHS.instructies}/${instructie.id}`);
  await set(instructieRef, cleanInstructie);
}

export async function verwijderInstructie(instructieId: string): Promise<void> {
  const instructieRef = ref(database, `${PATHS.instructies}/${instructieId}`);
  await remove(instructieRef);
}

// ============================================
// GEWASSENLIJST OPERATIES
// ============================================

export async function setGewassenlijst(items: GewassenlijstItem[]): Promise<void> {
  const gewassenlijstRef = ref(database, PATHS.gewassenlijst);
  if (!items || items.length === 0) {
    // Leeg is OK bij replace-modus, maar log het
    console.warn('setGewassenlijst: lege array ontvangen');
    await set(gewassenlijstRef, null);
    return;
  }
  const gewassenlijstMap: Record<string, GewassenlijstItem> = {};
  items.forEach(item => {
    const cleanItem = JSON.parse(JSON.stringify(item));
    gewassenlijstMap[item.id] = cleanItem;
  });
  await set(gewassenlijstRef, gewassenlijstMap);
}

export async function updateGewassenlijstItem(item: GewassenlijstItem): Promise<void> {
  const cleanItem = JSON.parse(JSON.stringify(item));
  const itemRef = ref(database, `${PATHS.gewassenlijst}/${item.id}`);
  await set(itemRef, cleanItem);
}

export async function getGewassenlijstData(): Promise<Record<string, GewassenlijstItem> | null> {
  const snapshot = await get(ref(database, PATHS.gewassenlijst));
  return snapshot.val();
}

/**
 * Upsert gewassenlijst items via update() - voegt toe of overschrijft per key,
 * zonder bestaande keys die niet in de map zitten te verwijderen.
 */
export async function upsertGewassenlijst(items: Record<string, GewassenlijstItem>): Promise<void> {
  if (!items || Object.keys(items).length === 0) {
    console.warn('upsertGewassenlijst: lege map ontvangen, niets te doen');
    return;
  }
  const gewassenlijstRef = ref(database, PATHS.gewassenlijst);
  const cleanItems: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(items)) {
    cleanItems[key] = JSON.parse(JSON.stringify(item));
  }
  await update(gewassenlijstRef, cleanItems);
}

export async function getTeeltplanData(): Promise<Record<string, TeeltplanItem> | null> {
  const snapshot = await get(ref(database, PATHS.teeltplan));
  return snapshot.val();
}

export async function setTeeltplanMap(teeltplanMap: Record<string, TeeltplanItem>): Promise<void> {
  const teeltplanRef = ref(database, PATHS.teeltplan);
  await set(teeltplanRef, stripUndefined(teeltplanMap));
}

// ============================================
// AUTOMATISCHE BACKUPS
// ============================================

/**
 * Maak een automatische backup in Firebase vóór een destructieve operatie.
 * Backups worden opgeslagen onder /backups/{collectie}/{timestamp}
 *
 * Als de backup mislukt, wordt een Error gegooid zodat de aanroepende
 * code de destructieve operatie kan afbreken.
 */
export async function backupCollectie(collectieNaam: string, reden: string = 'Import backup'): Promise<string | null> {
  try {
    const snapshot = await get(ref(database, collectieNaam));
    if (!snapshot.exists()) {
      console.log(`Geen data om te backuppen voor ${collectieNaam}`);
      return null;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPad = `backups/${collectieNaam}/${timestamp}`;

    await set(ref(database, backupPad), stripUndefined({
      data: snapshot.val(),
      aangemaakt: new Date().toISOString(),
      aantalItems: Object.keys(snapshot.val()).length,
      reden,
    }));

    console.log(`Backup gemaakt: ${backupPad} (${Object.keys(snapshot.val()).length} items)`);
    return backupPad;
  } catch (error) {
    console.error(`Backup mislukt voor ${collectieNaam}:`, error);
    throw new Error(`Backup mislukt. Import is afgebroken om dataverlies te voorkomen.`);
  }
}
