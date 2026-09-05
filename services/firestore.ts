import { db } from "../src/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

// Spieler speichern
export async function savePlayer(id: string, data: any) {
  await setDoc(doc(db, "spieler", id), data, { merge: true });
}

// Spieler laden
export async function getPlayer(id: string) {
  const snapshot = await getDoc(doc(db, "spieler", id));
  return snapshot.exists() ? snapshot.data() : null;
}

// Training speichern
export async function saveTraining(id: string, data: any) {
  await setDoc(doc(db, "training_sessions", id), data, { merge: true });
}

// Training laden
export async function getTraining(id: string) {
  const snapshot = await getDoc(doc(db, "training_sessions", id));
  return snapshot.exists() ? snapshot.data() : null;
}
