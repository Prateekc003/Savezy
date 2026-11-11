
import { initializeApp } from
  "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";

import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, sendPasswordResetEmail, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";

import {
  getFirestore, doc, setDoc, getDoc, serverTimestamp, collection,
  writeBatch, query, where, onSnapshot, updateDoc
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

// Use the exact values from Firebase Console > Project settings > General.
const firebaseConfig = {
  apiKey: "AIzaSyDsOVahM9-Qam-Nvo3d4cFfeUz54i1JxgQ",
  authDomain: "eggroyyal.firebaseapp.com",
  projectId: "eggroyyal",
  storageBucket: "eggroyyal.firebasestorage.app",
  messagingSenderId: "799028600034",
  appId: "1:799028600034:web:97687bec6ec4acb87a12bb",
  measurementId: "G-ZKQRRSVRT7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function register(name, email, password) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, "users", credential.user.uid), {
    name,
    createdAt: serverTimestamp()
  });
  return credential.user;
}

async function login(email, password) {
  return (await signInWithEmailAndPassword(auth, email, password)).user;
}

async function logout() { await signOut(auth); }
async function resetPassword(email) { await sendPasswordResetEmail(auth, email); }
function listenAuth(callback) { return onAuthStateChanged(auth, callback); }

async function getUserProfile(uid) {
  const snapshot = await getDoc(doc(db, "users", uid));
  if (!snapshot.exists()) throw new Error("Your Firestore user profile is missing.");
  return snapshot.data();
}

// An admin is a signed-in user with a manually-created admins/{uid} document.
async function checkAdmin(uid) {
  if (!uid) return false;
  return (await getDoc(doc(db, "admins", uid))).exists();
}

function mapListing(snapshot) {
  const d = snapshot.data();
  return {
    id: snapshot.id,
    brand: d.brand || "",
    cat: d.category || "",
    type: d.kind || "",
    off: d.offer || "",
    price: Number(d.price || 0),
    exp: d.expiresOn || "",
    min: Number(d.minSpend || 0),
    elig: d.conditions || "",
    seller: d.sellerName || "",
    sellerId: d.sellerId || "",
    st: d.status || "",
    createdAt: d.createdAt || null,
    trend: false
  };
}

// Live subscription used by Homepage and Explore.
function subscribeListings(status, callback) {
  const q = query(collection(db, "listings"), where("status", "==", status));
  return onSnapshot(q,
    snapshot => callback(snapshot.docs.map(mapListing), null),
    error => callback([], error)
  );
}

// Admin-only pending listing subscription, including private evidence.
function subscribePendingListings(callback) {
  const q = query(collection(db, "listings"), where("status", "==", "pending"));
  return onSnapshot(q, async snapshot => {
    try {
      const rows = await Promise.all(snapshot.docs.map(async item => {
        const listing = mapListing(item);
        const evidence = await getDoc(doc(db, "listings", item.id, "private", "evidence"));
        listing.evidence = evidence.exists() ? (evidence.data().text || "") : "";
        return listing;
      }));
      callback(rows, null);
    } catch (error) {
      callback([], error);
    }
  }, error => callback([], error));
}

async function updateListingStatus(listingId, status) {
  if (!["approved", "rejected"].includes(status)) {
    throw new Error("Invalid review status.");
  }
  if (!auth.currentUser || !(await checkAdmin(auth.currentUser.uid))) {
    throw new Error("This account is not an administrator.");
  }
  await updateDoc(doc(db, "listings", listingId), { status });
}

// Atomic creation of public listing + private evidence + private code.
async function createListing(formData) {
  const user = auth.currentUser;
  if (!user) throw new Error("Please log in before submitting a coupon.");

  const profileSnapshot = await getDoc(doc(db, "users", user.uid));
  if (!profileSnapshot.exists()) throw new Error("Your Firestore user profile is missing.");
  const sellerName = profileSnapshot.data().name;
  if (typeof sellerName !== "string" || !sellerName.trim()) {
    throw new Error("Your user profile does not contain a valid name.");
  }

  const listingRef = doc(collection(db, "listings"));
  const evidenceRef = doc(db, "listings", listingRef.id, "private", "evidence");
  const codeRef = doc(db, "listings", listingRef.id, "private", "code");
  const batch = writeBatch(db);

  batch.set(listingRef, {
    sellerId: user.uid,
    sellerName: sellerName.trim(),
    brand: formData.brand,
    category: formData.category,
    kind: formData.kind,
    offer: formData.offer,
    price: formData.price,
    expiresOn: formData.expiresOn,
    minSpend: formData.minSpend,
    conditions: formData.conditions,
    status: "pending",
    createdAt: serverTimestamp()
  });
  batch.set(evidenceRef, { text: formData.evidence });
  batch.set(codeRef, { code: formData.code });

  await batch.commit();
  return { id: listingRef.id };
}

window.savezyAuth = {
  register, login, logout, resetPassword, getUserProfile, listenAuth,
  checkAdmin, subscribeListings, subscribePendingListings,
  updateListingStatus, createListing
};

window.dispatchEvent(new Event("savezy-auth-ready"));
