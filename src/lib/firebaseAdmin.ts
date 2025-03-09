import admin from "firebase-admin";
import path from "path";
const firebaseAdmin = admin.initializeApp({
  credential: admin.credential.cert(
    path.join(process.cwd(), "credentials-firebaseServiceAccountKey.json")
  ),
});

export default firebaseAdmin;
