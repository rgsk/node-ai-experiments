import admin from "firebase-admin";

const firebaseAdmin = admin.initializeApp({
  credential: admin.credential.cert(
    "secrets/credentials-firebaseServiceAccountKey.json"
  ),
});

export default firebaseAdmin;
