import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { getRecentResults } from "./matchService";

const getMemberId = (member) => member?.uid || member?.userId || member?.id;

const getDisplayName = (member, userId) =>
  member?.displayName || member?.name || member?.email || userId || "Unknown User";

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const getFixtureId = (match) =>
  match?.fixture?.id ?? match?.fixtureId ?? match?.id ?? match?.matchId;

const getFinishedScore = (match) => {
  const homeGoals =
    match?.displayScore?.fullTime?.home ??
    match?.score?.regularTime?.home ??
    match?.goals?.home ??
    match?.homeGoals ??
    match?.score?.fullTime?.home ??
    match?.score?.regularTime?.home ??
    match?.score?.home;

  const awayGoals =
    match?.displayScore?.fullTime?.away ??
    match?.score?.regularTime?.away ??
    match?.goals?.away ??
    match?.awayGoals ??
    match?.score?.fullTime?.away ??
    match?.score?.regularTime?.away ??
    match?.score?.away;

  const parsedHomeGoals = toNumber(homeGoals);
  const parsedAwayGoals = toNumber(awayGoals);

  if (parsedHomeGoals === null || parsedAwayGoals === null) {
    return null;
  }

  return {
    homeGoals: parsedHomeGoals,
    awayGoals: parsedAwayGoals,
  };
};

const getActualWinner = ({ homeGoals, awayGoals }) => {
  if (homeGoals > awayGoals) return "home";
  if (awayGoals > homeGoals) return "away";
  return "draw";
};

const isFinishedMatch = (match) => {
  const status = match?.fixture?.status?.short ?? match?.status;

  if (status && !["FT", "FINISHED"].includes(status)) {
    return false;
  }

  return Boolean(getFixtureId(match) && getFinishedScore(match));
};

const buildFinishedMatchMap = (matches) =>
  matches.reduce((matchMap, match) => {
    if (!isFinishedMatch(match)) {
      return matchMap;
    }

    matchMap.set(String(getFixtureId(match)), {
      fixtureId: getFixtureId(match),
      date: match?.fixture?.date ?? match?.date ?? null,
      ...getFinishedScore(match),
    });

    return matchMap;
  }, new Map());

const createEmptyStats = (userId, displayName) => ({
  userId,
  displayName,
  points: 0,
  correctPredictions: 0,
  exactScorePredictions: 0,
  totalPredictions: 0,
  accuracy: 0,
  exactScoreAccuracy: 0,
  currentStreak: 0,
  bestStreak: 0,
  movement: 0,
  completedPredictions: [],
});

const getStreaks = (completedPredictions) => {
  const oldestFirst = completedPredictions
    .slice()
    .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
  let runningStreak = 0;
  let bestStreak = 0;

  oldestFirst.forEach((prediction) => {
    if (prediction.correctWinner) {
      runningStreak += 1;
      bestStreak = Math.max(bestStreak, runningStreak);
    } else {
      runningStreak = 0;
    }
  });

  const newestFirst = oldestFirst.slice().reverse();
  let currentStreak = 0;

  for (const prediction of newestFirst) {
    if (!prediction.correctWinner) break;
    currentStreak += 1;
  }

  return { currentStreak, bestStreak };
};

export const getRoomLeaderboard = async (roomId) => {
  if (!roomId) {
    return [];
  }

  const [predictionsSnap, roomSnap, finishedMatches] = await Promise.all([
    getDocs(query(collection(db, "predictions"), where("roomId", "==", roomId))),
    getDoc(doc(db, "rooms", roomId)),
    getRecentResults(),
  ]);

  if (!roomSnap.exists()) {
    return [];
  }

  const room = roomSnap.data();
  const members = Array.isArray(room.members) ? room.members : [];
  const statsByUserId = {};

  members.forEach((member) => {
    const userId = getMemberId(member);

    if (!userId) {
      return;
    }

    statsByUserId[userId] = createEmptyStats(userId, getDisplayName(member, userId));
  });

  const finishedMatchMap = buildFinishedMatchMap(
    Array.isArray(finishedMatches) ? finishedMatches : []
  );

  predictionsSnap.docs.forEach((predictionDoc) => {
    const prediction = predictionDoc.data();
    const userId = prediction.userId;
    const fixtureId = prediction.fixtureId;

    if (!userId || !fixtureId) {
      return;
    }

    if (!statsByUserId[userId]) {
      statsByUserId[userId] = createEmptyStats(userId, getDisplayName(null, userId));
    }

    const match = finishedMatchMap.get(String(fixtureId));

    if (!match) {
      return;
    }

    statsByUserId[userId].totalPredictions += 1;

    const actualWinner = getActualWinner(match);
    const predictedWinner = prediction.prediction;
    const hasCorrectWinner =
      (predictedWinner === "home" || predictedWinner === "away") &&
      predictedWinner === actualWinner;

    const predictedHomeGoals = toNumber(prediction.predictedHomeGoals);
    const predictedAwayGoals = toNumber(prediction.predictedAwayGoals);
    const hasExactScore =
      hasCorrectWinner &&
      predictedHomeGoals === match.homeGoals && predictedAwayGoals === match.awayGoals;

    statsByUserId[userId].completedPredictions.push({
      date: match.date,
      correctWinner: hasCorrectWinner,
    });

    if (!hasCorrectWinner) {
      return;
    }

    statsByUserId[userId].correctPredictions += 1;
    statsByUserId[userId].points += 1;

    if (hasExactScore) {
      statsByUserId[userId].exactScorePredictions += 1;
      statsByUserId[userId].points += 0.5;
    }
  });

  return Object.values(statsByUserId)
    .map((stats) => {
      const streaks = getStreaks(stats.completedPredictions);

      return {
        ...stats,
        ...streaks,
        accuracy:
          stats.totalPredictions > 0
            ? Math.round((stats.correctPredictions / stats.totalPredictions) * 100)
            : 0,
        exactScoreAccuracy:
          stats.totalPredictions > 0
            ? Math.round((stats.exactScorePredictions / stats.totalPredictions) * 100)
            : 0,
        completedPredictions: undefined,
      };
    })
    .sort((a, b) => b.points - a.points);
};
