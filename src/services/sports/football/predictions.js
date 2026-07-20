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
import { auth } from "../../firebase";
import { Capacitor } from "@capacitor/core";

const API_BASE = Capacitor.isNativePlatform()
  ? "https://footballtalks.netlify.app/.netlify/functions"
  : "/api";

export const savePrediction = async (
  userId,
  displayName,
  roomId,
  fixtureId,
  outcome,
  homeGoals = 0,
  awayGoals = 0,
  extraTimeWinner = null
) => {
  const finalDisplayName =
    displayName ||
    auth.currentUser?.displayName ||
    auth.currentUser?.email ||
    "Player";

  const predictionPayload = {
    userId,
    displayName: finalDisplayName,
    roomId,
    fixtureId: String(fixtureId),
    prediction: outcome,
    predictedHomeGoals: Number(homeGoals),
    predictedAwayGoals: Number(awayGoals),
    extraTimeWinner: extraTimeWinner || null,
  };

  const idToken = await auth.currentUser?.getIdToken();

  if (!idToken) {
    throw new Error("Please sign in again before saving a prediction.");
  }

  try {
    const res = await fetch(`${API_BASE}/savePrediction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idToken,
        ...predictionPayload,
        outcome,
        homeGoals: Number(homeGoals),
        awayGoals: Number(awayGoals),
      }),
    });

    if (!res.ok) {
      let errorMessage = `Save failed (${res.status})`;
      try {
        const errorBody = await res.json();
        errorMessage = errorBody.error || errorBody.message || errorMessage;
      } catch {
        // keep default message
      }
      throw new Error(errorMessage);
    }

    return undefined;
  } catch (error) {
    console.warn("savePrediction failed", error);
    throw error;
  }
};

export const getUserPredictions = async (userId, roomId) => {
  const q = query(
    collection(db, "predictions"),
    where("userId", "==", userId),
    where("roomId", "==", roomId)
  );

  const snap = await getDocs(q);

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

export const getRoomPredictions = async (roomId) => {
  const q = query(
    collection(db, "predictions"),
    where("roomId", "==", roomId)
  );

  const snap = await getDocs(q);

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};
