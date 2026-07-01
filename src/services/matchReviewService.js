import { getRoomMembers } from './roomService';
import { getRoomPredictions } from './predictionService';

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const hasScore = (score) =>
  score &&
  toNumber(score.home) !== null &&
  toNumber(score.away) !== null;

const getScoreWinner = (score) => {
  if (!hasScore(score)) return null;

  const homeGoals = toNumber(score.home);
  const awayGoals = toNumber(score.away);

  if (homeGoals > awayGoals) return 'home';
  if (awayGoals > homeGoals) return 'away';
  return 'draw';
};

const getDecisiveWinner = (score) => {
  const winner = getScoreWinner(score);
  return winner && winner !== 'draw' ? winner : null;
};

const mapApiWinner = (winner) => {
  if (winner === 'HOME_TEAM' || winner === 'HOME') return 'home';
  if (winner === 'AWAY_TEAM' || winner === 'AWAY') return 'away';
  return null;
};

const getFootballResult = (fixture) => {
  const fullTime =
    fixture?.displayScore?.fullTime ||
    fixture?.score?.regularTime ||
    fixture?.goals ||
    fixture?.score?.fullTime;
  const extraTime = fixture?.displayScore?.afterExtraTime || fixture?.score?.extraTime;
  const penalties = fixture?.displayScore?.penalties || fixture?.score?.penalties;

  const ft = hasScore(fullTime)
    ? {
        home: toNumber(fullTime.home),
        away: toNumber(fullTime.away),
      }
    : { home: 0, away: 0 };

  const fullTimeWinner = getScoreWinner(ft);
  const winner =
    fullTimeWinner !== 'draw'
      ? fullTimeWinner
      : getDecisiveWinner(penalties) ||
        getDecisiveWinner(extraTime) ||
        getDecisiveWinner(fixture?.score?.fullTime) ||
        mapApiWinner(fixture?.score?.winner) ||
        'draw';

  return {
    homeScore: ft.home,
    awayScore: ft.away,
    winner,
    label: `${ft.home}-${ft.away}`,
  };
};

const getCricketResult = (fixture) => {
  const winner =
    fixture?.fixture?.winner ||
    getDecisiveWinner(fixture?.displayScore?.fullTime) ||
    getDecisiveWinner(fixture?.goals) ||
    'draw';

  return {
    homeScore: null,
    awayScore: null,
    winner,
    label: fixture?.scoreDisplay?.statusLabel || fixture?.fixture?.status?.long || 'Final',
  };
};

const getResult = (fixture, sport) =>
  sport === 'cricket' ? getCricketResult(fixture) : getFootballResult(fixture);

const getPredictionScoreLabel = (prediction, fixture, sport) => {
  const homeName = fixture?.teams?.home?.name || 'Home';
  const awayName = fixture?.teams?.away?.name || 'Away';

  if (sport === 'cricket') {
    if (prediction.prediction === 'home') return `${homeName} win`;
    if (prediction.prediction === 'away') return `${awayName} win`;
    return 'Draw';
  }

  return `${homeName} ${toNumber(prediction.predictedHomeGoals) ?? 0}-${toNumber(prediction.predictedAwayGoals) ?? 0} ${awayName}`;
};

const scorePrediction = (prediction, fixture, result, sport) => {
  const predictedWinner = prediction.prediction;
  const correctWinner =
    (predictedWinner === 'home' || predictedWinner === 'away' || predictedWinner === 'draw') &&
    predictedWinner === result.winner;
  const exactScore =
    sport !== 'cricket' &&
    correctWinner &&
    toNumber(prediction.predictedHomeGoals) === result.homeScore &&
    toNumber(prediction.predictedAwayGoals) === result.awayScore;

  return {
    correctWinner,
    exactScore,
    wrongPrediction: !correctWinner,
    points: correctWinner ? (exactScore ? 1.5 : 1) : 0,
    status: exactScore ? 'exact' : correctWinner ? 'correct' : 'wrong',
    scoreLabel: getPredictionScoreLabel(prediction, fixture, sport),
  };
};

const sortReviewedPredictions = (predictions, currentUserId) => {
  const statusRank = {
    exact: 0,
    correct: 1,
    wrong: 2,
  };

  return predictions.slice().sort((a, b) => {
    const statusDifference = statusRank[a.status] - statusRank[b.status];
    if (statusDifference !== 0) return statusDifference;
    if (a.userId === currentUserId) return -1;
    if (b.userId === currentUserId) return 1;
    return a.displayName.localeCompare(b.displayName);
  });
};

export const getMatchReview = async ({ fixture, roomId, currentUserId, sport = 'football' }) => {
  if (!fixture || !roomId) {
    return null;
  }

  const fixtureId = String(fixture.fixture?.id);
  const [roomPredictions, members] = await Promise.all([
    getRoomPredictions(roomId, sport),
    getRoomMembers(roomId),
  ]);

  const memberNameById = {};
  (members || []).forEach((member) => {
    memberNameById[member.uid] = member.displayName || member.name || 'Player';
  });

  const fixturePredictions = (roomPredictions || []).filter(
    (prediction) => String(prediction.fixtureId) === fixtureId
  );
  const result = getResult(fixture, sport);

  const predictions = fixturePredictions.map((prediction) => {
    const scored = scorePrediction(prediction, fixture, result, sport);

    return {
      id: prediction.id || `${prediction.userId}_${fixtureId}`,
      userId: prediction.userId,
      displayName:
        prediction.displayName ||
        memberNameById[prediction.userId] ||
        (prediction.userId === currentUserId ? 'You' : 'Player'),
      prediction: prediction.prediction,
      predictedHomeGoals: toNumber(prediction.predictedHomeGoals) ?? 0,
      predictedAwayGoals: toNumber(prediction.predictedAwayGoals) ?? 0,
      isCurrentUser: prediction.userId === currentUserId,
      ...scored,
    };
  });

  const summary = predictions.reduce(
    (counts, prediction) => {
      if (prediction.prediction === 'home') counts.homePredictions += 1;
      if (prediction.prediction === 'away') counts.awayPredictions += 1;
      if (prediction.prediction === 'draw') counts.drawPredictions += 1;
      if (prediction.exactScore) counts.exactScorePredictions += 1;
      return counts;
    },
    {
      totalPredictions: predictions.length,
      homePredictions: 0,
      awayPredictions: 0,
      drawPredictions: 0,
      exactScorePredictions: 0,
    }
  );

  const sortedPredictions = sortReviewedPredictions(predictions, currentUserId);

  return {
    fixtureId,
    sport,
    teams: {
      home: fixture.teams?.home?.name || 'Home',
      away: fixture.teams?.away?.name || 'Away',
    },
    finalResult: result,
    summary,
    currentUserPrediction:
      sortedPredictions.find((prediction) => prediction.userId === currentUserId) || null,
    predictions: sortedPredictions,
    hasExactScore: sport !== 'cricket',
  };
};
