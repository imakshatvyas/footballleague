import {
  doc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";

export const savePrediction = async (
  userId,
  roomId,
  fixtureId,
  outcome,
  homeGoals = 0,
  awayGoals = 0
) => {
  const id = `${userId}_${roomId}_${fixtureId}`;

  await setDoc(
    doc(db, "predictions", id),
    {
      userId,
      roomId,
      fixtureId: String(fixtureId),

      // Winner prediction
      prediction: outcome,

      // Scoreline prediction
      predictedHomeGoals: Number(homeGoals),
      predictedAwayGoals: Number(awayGoals),

      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

export const getUserPredictions = async (userId, roomId) => {
  const q = query(
    collection(db, "predictions"),
    where("userId", "==", userId),
    where("roomId", "==", roomId)
  );

  const snap = await getDocs(q);
  return snap.docs.map((doc) => doc.data());
};

export const getRoomPredictions = async (roomId) => {
  const q = query(
    collection(db, "predictions"),
    where("roomId", "==", roomId)
  );

  const snap = await getDocs(q);
  return snap.docs.map((doc) => doc.data());
};
