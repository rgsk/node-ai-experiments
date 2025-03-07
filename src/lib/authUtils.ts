import firebaseAdmin from "./firebaseAdmin.js";
export const verifyToken: (token: string) => Promise<{
  decodedIdToken: any;
}> = async (token: string) => {
  const decodedIdToken = await firebaseAdmin.auth().verifyIdToken(token);

  return { decodedIdToken };
};
