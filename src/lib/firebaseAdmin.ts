import admin from "firebase-admin";

const firebaseAdmin = admin.initializeApp({
  credential: admin.credential.cert(
    "credentials-firebaseServiceAccountKey.json"
  ),
});

export default firebaseAdmin;
