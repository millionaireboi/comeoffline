import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

if (getApps().length === 0) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccount) {
    initializeApp({
      credential: cert(JSON.parse(serviceAccount)),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
  } else {
    // Falls back to Application Default Credentials (for Cloud Run)
    initializeApp({
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
  }
}

export const db = getFirestore();
export const auth = getAuth();
export const storage = getStorage();
