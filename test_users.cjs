const admin = require('firebase-admin');
const serviceAccount = require('./netlify/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function run() {
  const users = await db.collection('users').get();
  users.forEach(doc => {
    const data = doc.data();
    console.log(data.displayName);
  });
}

run().catch(console.error);
