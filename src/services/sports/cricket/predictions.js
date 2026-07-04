import {
  getDocs,
  collection,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebase";
import { auth } from "../../firebase";
import { Capacitor } from "@capacitor/core";

const API_BASE = Capacitor.isNativePlatform()
  ? "https://footballtalks.netlify.app/.netlify/functions"
  : "/api";

export const savePrediction = async (
  userId,
  roomId,
  fixtureId,
  outcome
) => {
  // For Cricket, store ONLY the selected winner ("home" or "away").
  // Routes through Netlify function to bypass ad blockers blocking firestore.googleapis.com
  const idToken = await auth.currentUser.getIdToken();

  const res = await fetch(`${API_BASE}/savePrediction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      idToken,
      userId,
      displayName: auth.currentUser.displayName || "Player",
      roomId,
      fixtureId: String(fixtureId),
      outcome,
      homeGoals: 0,
      awayGoals: 0,
      extraTimeWinner: null,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Save failed (${res.status})`);
  }
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
