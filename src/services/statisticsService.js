import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { getRoomLeaderboard } from './leaderboardService';
import { getTournamentMatches } from './matchService';

export const ACHIEVEMENTS = [
  {
    id: 'first_prediction',
    title: 'First Prediction',
    description: 'Make your first match prediction.',
    icon: '1',
  },
  {
    id: 'five_streak',
    title: '5 Prediction Streak',
    description: 'Get five winners correct in a row.',
    icon: '5',
  },
  {
    id: 'twenty_five_predictions',
    title: '25 Predictions',
    description: 'Submit 25 match predictions.',
    icon: '25',
  },
  {
    id: 'five_exact_scores',
    title: '5 Exact Scores',
    description: 'Predict five exact scorelines.',
    icon: '5',
  },
  {
    id: 'top_of_leaderboard',
    title: 'Top of Leaderboard',
    description: 'Reach first place in any room.',
    icon: 'TOP',
  },
  {
    id: 'hundred_predictions',
    title: '100 Predictions',
    description: 'Submit 100 match predictions.',
    icon: '100',
  },
  {
    id: 'world_cup_expert',
    title: 'World Cup Expert',
    description: 'Score 20 points from finished matches.',
    icon: 'WC',
  },
];

export const calculateAccuracy = (correct, total) => {
  if (!total) return 0;
  return Math.round((correct / total) * 100);
};

const toDate = (value) => {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const getFixtureId = (match) => String(match?.fixture?.id ?? match?.id ?? '');

const getActualScore = (match) => {
  const homeGoals = toNumber(
    match?.displayScore?.fullTime?.home ??
    match?.score?.regularTime?.home ??
    match?.goals?.home ??
    match?.score?.fullTime?.home
  );
  const awayGoals = toNumber(
    match?.displayScore?.fullTime?.away ??
    match?.score?.regularTime?.away ??
    match?.goals?.away ??
    match?.score?.fullTime?.away
  );

  if (homeGoals === null || awayGoals === null) return null;

  return { homeGoals, awayGoals };
};

const getWinner = ({ homeGoals, awayGoals }) => {
  if (homeGoals > awayGoals) return 'home';
  if (awayGoals > homeGoals) return 'away';
  return 'draw';
};

const getScoreWinner = (score) => {
  const homeGoals = toNumber(score?.home);
  const awayGoals = toNumber(score?.away);

  if (homeGoals === null || awayGoals === null) return null;
  if (homeGoals > awayGoals) return 'home';
  if (awayGoals > homeGoals) return 'away';
  return 'draw';
};

const mapApiWinner = (winner) => {
  if (winner === 'HOME_TEAM' || winner === 'HOME') return 'home';
  if (winner === 'AWAY_TEAM' || winner === 'AWAY') return 'away';
  return null;
};

const getPredictionWinner = (match, fullTimeScore) => {
  const fullTimeWinner = getWinner(fullTimeScore);

  if (fullTimeWinner !== 'draw') {
    return fullTimeWinner;
  }

  const penaltyWinner = getScoreWinner(
    match?.displayScore?.penalties ?? match?.score?.penalties
  );

  if (penaltyWinner && penaltyWinner !== 'draw') {
    return penaltyWinner;
  }

  const extraTimeWinner = getScoreWinner(
    match?.displayScore?.afterExtraTime ?? match?.score?.extraTime
  );

  if (extraTimeWinner && extraTimeWinner !== 'draw') {
    return extraTimeWinner;
  }

  const finalScoreWinner = getScoreWinner(match?.score?.fullTime);

  if (finalScoreWinner && finalScoreWinner !== 'draw') {
    return finalScoreWinner;
  }

  return mapApiWinner(match?.score?.winner) || 'draw';
};

const buildMatchMap = (matches) =>
  (matches || []).reduce((map, match) => {
    const fixtureId = getFixtureId(match);
    if (fixtureId) map.set(fixtureId, match);
    return map;
  }, new Map());

const scoreFootballPrediction = (prediction, match) => {
  const status = match?.fixture?.status?.short;
  const score = getActualScore(match);

  if (status !== 'FT' || !score) {
    return {
      isFinished: false,
      correctWinner: false,
      exactScore: false,
      points: 0,
      actualHomeGoals: null,
      actualAwayGoals: null,
    };
  }

  const actualWinner = getPredictionWinner(match, score);
  const predictedWinner = prediction.prediction;

  let correctWinner = false;
  if (predictedWinner === "draw" && actualWinner === "draw") {
    // Determine the final knockout winner if any
    const decisiveWinner = getPredictionWinner(match, score); // this matches our resolved penalties/ET winner
    correctWinner = (decisiveWinner === "draw" || prediction.extraTimeWinner === decisiveWinner);
  } else {
    correctWinner = predictedWinner === actualWinner;
  }

  const exactScore =
    correctWinner &&
    toNumber(prediction.predictedHomeGoals) === score.homeGoals &&
    toNumber(prediction.predictedAwayGoals) === score.awayGoals;

  return {
    isFinished: true,
    correctWinner,
    exactScore,
    points: correctWinner ? (exactScore ? 1.5 : 1) : 0,
    actualHomeGoals: score.homeGoals,
    actualAwayGoals: score.awayGoals,
  };
};

const scoreCricketPrediction = (prediction, match) => {
  const status = match?.fixture?.status?.short;

  if (status !== 'FT') {
    return {
      isFinished: false,
      correctWinner: false,
      exactScore: false,
      points: 0,
      actualHomeGoals: null,
      actualAwayGoals: null,
    };
  }

  const actualWinner = match.fixture?.winner;
  const correctWinner = prediction.prediction === actualWinner;

  return {
    isFinished: true,
    correctWinner,
    exactScore: false,
    points: correctWinner ? 1 : 0,
    actualHomeGoals: match.goals?.home,
    actualAwayGoals: match.goals?.away,
  };
};

const getUserPredictions = async (userId) => {
  const predictionsQuery = query(
    collection(db, 'predictions'),
    where('userId', '==', userId)
  );
  const snap = await getDocs(predictionsQuery);

  return snap.docs.map((predictionDoc) => ({
    id: predictionDoc.id,
    ...predictionDoc.data(),
  }));
};

const getUserRoomsFromProfile = async (userProfile) => {
  const roomIds = userProfile?.rooms || [];
  const roomDocs = await Promise.all(roomIds.map((roomId) => getDoc(doc(db, 'rooms', roomId))));

  return roomDocs
    .filter((roomSnap) => roomSnap.exists())
    .map((roomSnap) => ({
      id: roomSnap.id,
      ...roomSnap.data(),
    }));
};

const calculateStreaks = (finishedHistory) => {
  const oldestFirst = finishedHistory.slice().reverse();
  let currentRun = 0;
  let bestStreak = 0;

  oldestFirst.forEach((prediction) => {
    if (prediction.correctWinner) {
      currentRun += 1;
      bestStreak = Math.max(bestStreak, currentRun);
    } else {
      currentRun = 0;
    }
  });

  let currentStreak = 0;
  for (const prediction of finishedHistory) {
    if (!prediction.correctWinner) break;
    currentStreak += 1;
  }

  return { currentStreak, bestStreak };
};

export const calculatePredictionHistory = async (userId, cachedMatches = null, rooms = []) => {
  const [predictions, footballMatches, cricketMatches] = await Promise.all([
    getUserPredictions(userId),
    getTournamentMatches('football'),
    getTournamentMatches('cricket'),
  ]);

  const footballMap = buildMatchMap(footballMatches);
  const cricketMap = buildMatchMap(cricketMatches);
  const roomSportMap = new Map(rooms.map((room) => [room.id, room.sport || 'football']));

  return predictions
    .map((prediction) => {
      const sport = roomSportMap.get(prediction.roomId) || 'football';
      const isCricket = sport === 'cricket';
      const match = isCricket ? cricketMap.get(String(prediction.fixtureId)) : footballMap.get(String(prediction.fixtureId));

      const scored = isCricket
        ? scoreCricketPrediction(prediction, match)
        : scoreFootballPrediction(prediction, match);

      const homeName = match?.teams?.home?.name || 'Home';
      const awayName = match?.teams?.away?.name || 'Away';
      const predictionDate = toDate(prediction.updatedAt) || toDate(match?.fixture?.date);

      return {
        id: prediction.id,
        sport,
        fixtureId: String(prediction.fixtureId),
        fixture: `${homeName} vs ${awayName}`,
        homeTeam: homeName,
        awayTeam: awayName,
        predictedWinner: prediction.prediction,
        predictedHomeGoals: isCricket ? 0 : (toNumber(prediction.predictedHomeGoals) ?? 0),
        predictedAwayGoals: isCricket ? 0 : (toNumber(prediction.predictedAwayGoals) ?? 0),
        extraTimeWinner: prediction.extraTimeWinner || null,
        actualHomeGoals: scored.actualHomeGoals,
        actualAwayGoals: scored.actualAwayGoals,
        correctWinner: scored.correctWinner,
        exactScore: scored.exactScore,
        isFinished: scored.isFinished,
        points: scored.points,
        date: predictionDate,
        createdAt: prediction.updatedAt,
      };
    })
    .sort((a, b) => (b.date?.getTime?.() || 0) - (a.date?.getTime?.() || 0));
};

export const calculateAchievements = (stats, existingUnlocked = []) => {
  const existing = new Set(existingUnlocked);
  const unlockedIds = new Set(existingUnlocked);

  if (stats.totalPredictions >= 1) unlockedIds.add('first_prediction');
  if (stats.bestStreak >= 5) unlockedIds.add('five_streak');
  if (stats.totalPredictions >= 25) unlockedIds.add('twenty_five_predictions');
  if (stats.exactScorePredictions >= 5) unlockedIds.add('five_exact_scores');
  if (stats.hasLeaderboardTop) unlockedIds.add('top_of_leaderboard');
  if (stats.totalPredictions >= 100) unlockedIds.add('hundred_predictions');
  if (stats.totalPoints >= 20) unlockedIds.add('world_cup_expert');

  const unlocked = ACHIEVEMENTS.map((achievement) => ({
    ...achievement,
    unlocked: unlockedIds.has(achievement.id),
    justUnlocked: unlockedIds.has(achievement.id) && !existing.has(achievement.id),
  }));

  const unlockedCount = unlocked.filter((achievement) => achievement.unlocked).length;

  return {
    all: unlocked,
    unlockedIds: Array.from(unlockedIds),
    unlockedCount,
    totalCount: ACHIEVEMENTS.length,
    completionPercentage: calculateAccuracy(unlockedCount, ACHIEVEMENTS.length),
  };
};

export const saveFavoriteTeam = async (userId, team) => {
  await setDoc(
    doc(db, 'users', userId),
    {
      favoriteTeam: team,
    },
    { merge: true }
  );
};

export const calculateUserStats = async (userId) => {
  const userSnap = await getDoc(doc(db, 'users', userId));
  const userProfile = userSnap.exists() ? userSnap.data() : {};
  const rooms = await getUserRoomsFromProfile(userProfile);
  
  const history = await calculatePredictionHistory(userId, null, rooms);
  
  // Calculate Streaks & stats overall
  const finishedHistory = history.filter((p) => p.isFinished);
  const { currentStreak, bestStreak } = calculateStreaks(finishedHistory);

  // Group history by sport
  const footballHistory = finishedHistory.filter((p) => p.sport === 'football');
  const cricketHistory = finishedHistory.filter((p) => p.sport === 'cricket');

  const { currentStreak: fStreak, bestStreak: fBest } = calculateStreaks(footballHistory);
  const { currentStreak: cStreak, bestStreak: cBest } = calculateStreaks(cricketHistory);

  const hasLeaderboardTop = await rooms.reduce(async (previous, room) => {
    if (await previous) return true;
    const leaderboard = await getRoomLeaderboard(room.id, room.sport || 'football');
    return leaderboard[0]?.userId === userId;
  }, Promise.resolve(false));

  const totalPoints = finishedHistory.reduce((sum, p) => sum + p.points, 0);
  const fPoints = footballHistory.reduce((sum, p) => sum + p.points, 0);
  const cPoints = cricketHistory.reduce((sum, p) => sum + p.points, 0);

  const correctWinnerPredictions = finishedHistory.filter((p) => p.correctWinner).length;
  const fCorrectWinners = footballHistory.filter((p) => p.correctWinner).length;
  const cCorrectWinners = cricketHistory.filter((p) => p.correctWinner).length;

  const exactScorePredictions = finishedHistory.filter((p) => p.exactScore).length;

  const stats = {
    joinDate: toDate(userProfile.createdAt),
    totalRoomsJoined: rooms.length,
    totalPredictions: history.length,
    scoredPredictions: finishedHistory.length,
    correctWinnerPredictions,
    exactScorePredictions,
    accuracy: calculateAccuracy(correctWinnerPredictions, finishedHistory.length),
    exactScoreAccuracy: calculateAccuracy(exactScorePredictions, finishedHistory.length),
    totalPoints,
    currentStreak,
    bestStreak,
    hasLeaderboardTop,
    favoriteTeam: userProfile.favoriteTeam || null,
  };

  const footballStats = {
    totalPredictions: history.filter(p => p.sport === 'football').length,
    scoredPredictions: footballHistory.length,
    correctWinnerPredictions: fCorrectWinners,
    exactScorePredictions,
    accuracy: calculateAccuracy(fCorrectWinners, footballHistory.length),
    exactScoreAccuracy: calculateAccuracy(exactScorePredictions, footballHistory.length),
    totalPoints: fPoints,
    currentStreak: fStreak,
    bestStreak: fBest,
  };

  const cricketStats = {
    totalPredictions: history.filter(p => p.sport === 'cricket').length,
    scoredPredictions: cricketHistory.length,
    correctWinnerPredictions: cCorrectWinners,
    exactScorePredictions: 0,
    accuracy: calculateAccuracy(cCorrectWinners, cricketHistory.length),
    exactScoreAccuracy: 0,
    totalPoints: cPoints,
    currentStreak: cStreak,
    bestStreak: cBest,
  };

  const achievements = calculateAchievements(stats, userProfile.achievements || []);

  const currentAchievementIds = userProfile.achievements || [];
  const achievementsChanged =
    achievements.unlockedIds.length !== currentAchievementIds.length ||
    achievements.unlockedIds.some((achievementId) => !currentAchievementIds.includes(achievementId));

  if (achievementsChanged) {
    await setDoc(
      doc(db, 'users', userId),
      {
        achievements: achievements.unlockedIds,
      },
      { merge: true }
    );
  }

  return {
    profile: userProfile,
    stats,
    footballStats,
    cricketStats,
    history,
    achievements,
  };
};
