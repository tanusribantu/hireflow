import { cert, getApps, initializeApp } from "firebase-admin/app";
import { Auth, getAuth } from "firebase-admin/auth";
import { Firestore, getFirestore } from "firebase-admin/firestore";

function initAdmin(): { db: Firestore; auth: Auth } | null {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyValue = process.env.FIREBASE_PRIVATE_KEY;

  console.log("Firebase Admin environment variables:", {
    FIREBASE_PROJECT_ID: Boolean(projectId),
    FIREBASE_CLIENT_EMAIL: Boolean(clientEmail),
    FIREBASE_PRIVATE_KEY: Boolean(privateKeyValue),
  });

  const privateKey = privateKeyValue?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    // Routes can return a configuration error when credentials are absent.
    return null;
  }

  const app = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });

  return { db: getFirestore(app), auth: getAuth(app) };
}

const admin = initAdmin();

export const adminDb = admin?.db || null;
export const adminAuth = admin?.auth || null;
