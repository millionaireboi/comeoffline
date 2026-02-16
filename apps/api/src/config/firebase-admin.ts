// Lazy-loaded Firebase Admin - only imports when actually used
import type { Firestore } from "firebase-admin/firestore";
import type { Auth } from "firebase-admin/auth";
import type { Storage } from "firebase-admin/storage";

let _db: Firestore | null = null;
let _auth: Auth | null = null;
let _storage: Storage | null = null;
let _initialized = false;
let _initPromise: Promise<void> | null = null;

async function initializeFirebase() {
  // If already initialized, return immediately
  if (_initialized) return;

  // If initialization is in progress, wait for it
  if (_initPromise) {
    await _initPromise;
    return;
  }

  // Start initialization and store the promise
  _initPromise = (async () => {
    console.log('[firebase-admin] Lazy-loading Firebase Admin SDK...');

    const { initializeApp, cert, getApps } = await import("firebase-admin/app");
    const { getFirestore } = await import("firebase-admin/firestore");
    const { getAuth } = await import("firebase-admin/auth");
    const { getStorage } = await import("firebase-admin/storage");

    console.log('[firebase-admin] Firebase Admin SDK loaded');

    if (getApps().length === 0) {
      console.log('[firebase-admin] Initializing Firebase...');
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

      try {
        if (serviceAccount) {
          console.log('[firebase-admin] Using service account credentials');
          initializeApp({
            credential: cert(JSON.parse(serviceAccount)),
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
          });
        } else {
          console.log('[firebase-admin] Using default credentials');
          initializeApp({
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
          });
        }
        console.log('[firebase-admin] ✓ Firebase initialized');
      } catch (error) {
        console.error('[firebase-admin] ✗ Initialization error:', error);
        throw error;
      }
    }

    _db = getFirestore();
    _auth = getAuth();
    _storage = getStorage();
    _initialized = true;

    console.log('[firebase-admin] ✓ All Firebase services ready');
  })();

  await _initPromise;
}

// Lazy getters - initialize on first access
export const getDb = async (): Promise<Firestore> => {
  if (!_db) await initializeFirebase();
  return _db!;
};

export const getAuthService = async (): Promise<Auth> => {
  if (!_auth) await initializeFirebase();
  return _auth!;
};

export const getStorageService = async (): Promise<Storage> => {
  if (!_storage) await initializeFirebase();
  return _storage!;
};

// Backward compatibility - but these will be undefined until first route uses them
export let db: Firestore;
export let auth: Auth;
export let storage: Storage;

// Initialize immediately if needed (can be called from routes)
export const ensureInitialized = initializeFirebase;
