// Firestore data layer. A small in-memory cache keeps Spark-plan (free tier)
// reads to a minimum: bills, suggestions and the company profile are fetched
// once per session and kept in sync locally after every write.
import { db } from "../firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  increment,
} from "firebase/firestore";

const EMPTY_SUGGESTIONS = { clients: [], projects: [], campaigns: [], lastBillNo: "" };

let cache = { uid: null, bills: null, suggestions: null, profile: null };

function scope(uid) {
  if (cache.uid !== uid) {
    cache = { uid, bills: null, suggestions: null, profile: null };
  }
}

export function invalidateCache() {
  cache = { uid: null, bills: null, suggestions: null, profile: null };
}

// ---------------------------------------------------------------------------
// Company profile (kept in the original `companyProfiles/{uid}` collection)
// ---------------------------------------------------------------------------
export async function getCompanyProfile(uid) {
  scope(uid);
  if (cache.profile !== null) return cache.profile;
  const snap = await getDoc(doc(db, "companyProfiles", uid));
  cache.profile = snap.exists() ? snap.data() : undefined; // undefined = known missing
  return cache.profile;
}

export async function saveCompanyProfile(uid, data) {
  scope(uid);
  const payload = { ...data, userId: uid, updatedAt: new Date().toISOString() };
  if (!cache.profile) payload.createdAt = payload.createdAt || new Date().toISOString();
  await setDoc(doc(db, "companyProfiles", uid), payload, { merge: true });
  cache.profile = { ...(cache.profile || {}), ...payload };
  return cache.profile;
}

// ---------------------------------------------------------------------------
// Bills (`users/{uid}/bills/{id}`)
// ---------------------------------------------------------------------------
export async function listBills(uid) {
  scope(uid);
  if (cache.bills) return cache.bills;
  const q = query(collection(db, "users", uid, "bills"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  cache.bills = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return cache.bills;
}

export async function saveBill(uid, bill) {
  scope(uid);
  const now = new Date().toISOString();
  const payload = { ...bill, createdAt: now, updatedAt: now };
  const ref = await addDoc(collection(db, "users", uid, "bills"), payload);
  const saved = { id: ref.id, ...payload };
  cache.bills = [saved, ...(cache.bills || [])];
  return saved;
}

export async function updateBill(uid, id, bill) {
  scope(uid);
  const payload = { ...bill, updatedAt: new Date().toISOString() };
  await updateDoc(doc(db, "users", uid, "bills", id), payload);
  if (cache.bills) {
    cache.bills = cache.bills.map((b) => (b.id === id ? { ...b, ...payload } : b));
  }
  return { id, ...payload };
}

export async function deleteBill(uid, id) {
  scope(uid);
  await deleteDoc(doc(db, "users", uid, "bills", id));
  if (cache.bills) cache.bills = cache.bills.filter((b) => b.id !== id);
}

export async function bumpDownloadCount(uid) {
  try {
    await setDoc(doc(db, "users", uid), { downloadCount: increment(1) }, { merge: true });
  } catch (err) {
    console.warn("Could not update download count:", err);
  }
}

// ---------------------------------------------------------------------------
// Autocomplete suggestions (`users/{uid}/meta/suggestions`) — one tiny doc
// instead of scanning all bills on every form load.
// ---------------------------------------------------------------------------
export async function getSuggestions(uid) {
  scope(uid);
  if (cache.suggestions) return cache.suggestions;
  const snap = await getDoc(doc(db, "users", uid, "meta", "suggestions"));
  cache.suggestions = snap.exists() ? { ...EMPTY_SUGGESTIONS, ...snap.data() } : { ...EMPTY_SUGGESTIONS };
  return cache.suggestions;
}

function dedupePush(list, value, cap) {
  const v = (value || "").trim();
  if (!v) return (list || []).slice(0, cap);
  const rest = (list || []).filter((x) => x.toLowerCase() !== v.toLowerCase());
  return [v, ...rest].slice(0, cap);
}

/** Called after every bill save — remembers client, project, campaign and last bill no. */
export async function recordBillUsage(uid, bill) {
  scope(uid);
  const s = await getSuggestions(uid);
  const name = (bill.billto || "").trim();

  let clients = (s.clients || []).filter(
    (c) => (c.name || "").toLowerCase() !== name.toLowerCase()
  );
  if (name) {
    clients.unshift({
      name,
      address: bill.address || "",
      gst: bill.gst || "",
      pan: bill.pan || "",
      lastUsed: new Date().toISOString(),
    });
  }
  clients = clients.slice(0, 60);

  const next = {
    clients,
    projects: dedupePush(s.projects, bill.projectname, 40),
    campaigns: dedupePush(s.campaigns, bill.campaign, 40),
    lastBillNo: (bill.billno || "").trim() || s.lastBillNo || "",
    updatedAt: new Date().toISOString(),
  };

  await setDoc(doc(db, "users", uid, "meta", "suggestions"), next);
  cache.suggestions = next;
  return next;
}

/** "INV-009" → "INV-010", "12" → "13". Empty / no digits → sensible defaults. */
export function suggestNextBillNo(lastBillNo) {
  const last = (lastBillNo || "").trim();
  if (!last) return "001";
  const match = last.match(/(\d+)(?!.*\d)/);
  if (!match) return "";
  const num = match[1];
  const next = String(Number(num) + 1).padStart(num.length, "0");
  return last.slice(0, match.index) + next + last.slice(match.index + num.length);
}
