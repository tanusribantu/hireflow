import admin from "firebase-admin";

let initialized = false;

function initAdmin() {
  if (initialized) return;
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!key) {
    // Do not throw here — routes will check and return informative errors.
    return;
  }
  const serviceAccount = JSON.parse(key);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  initialized = true;
}

initAdmin();

export const adminDb = initialized ? admin.firestore() : null;
