import firebaseAdmin from "./firebaseAdmin";

export const verifyToken = async (token: string) => {
  const decodedIdToken = await firebaseAdmin.auth().verifyIdToken(token);

  return { decodedIdToken };
};
