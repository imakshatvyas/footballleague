const admin = require("firebase-admin");

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
  : null;

if (!projectId) {
  throw new Error("FIREBASE_PROJECT_ID is missing");
}

if (!clientEmail) {
  throw new Error("FIREBASE_CLIENT_EMAIL is missing");
}

if (!privateKey) {
  throw new Error("FIREBASE_PRIVATE_KEY is missing");
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

  console.log("Firebase Admin initialized");
}

const db = admin.firestore();
const messaging = admin.messaging();

module.exports = {
  admin,
  db,
  messaging,
};