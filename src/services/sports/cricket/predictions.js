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
  outcome
) => {
  const id = `${userId}_${roomId}_${fixtureId}`;

  // For Cricket, store ONLY the selected winner ("home" or "away").
  // Do NOT store any scoreline prediction values (predictedHomeGoals / predictedAwayGoals).
  await setDoc(
    doc(db, "predictions", id),
    {
      userId,
      roomId,
      fixtureId: String(fixtureId),
      prediction: outcome, // "home" or "away"
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
