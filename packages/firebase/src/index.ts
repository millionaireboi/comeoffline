import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let _app: FirebaseApp | undefined;
let _auth: Auth | undefined;
let _db: Firestore | undefined;
let _storage: FirebaseStorage | undefined;

function getApp(): FirebaseApp {
  if (!_app) {
    _app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  }
  return _app;
}

export { getApp as getFirebaseApp };

export const app = typeof window !== "undefined" ? getApp() : (null as unknown as FirebaseApp);

export const auth: Auth = typeof window !== "undefined"
  ? (_auth ??= getAuth(getApp()))
  : (null as unknown as Auth);

export const db: Firestore = typeof window !== "undefined"
  ? (_db ??= getFirestore(getApp()))
  : (null as unknown as Firestore);

export const storage: FirebaseStorage = typeof window !== "undefined"
  ? (_storage ??= getStorage(getApp()))
  : (null as unknown as FirebaseStorage);
