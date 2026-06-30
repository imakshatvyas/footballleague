const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
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