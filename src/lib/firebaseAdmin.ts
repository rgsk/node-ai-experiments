import admin from "firebase-admin";
import environmentVars from "./environmentVars";

const firebaseAdmin = admin.initializeApp({
  credential: admin.credential.cert({
    clientEmail: environmentVars.FIREBASE_CLIENT_EMAIL,
    privateKey: environmentVars.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    projectId: environmentVars.FIREBASE_PROJECT_ID,
  }),
});

export default firebaseAdmin;
