import { useMemo } from 'react';
import './MatchDetailsPanel.css';

const SCORE_STATUSES = new Set(['FT', 'AET', 'PEN']);
const LIVE_STATUSES = new Set(['LIVE', '1H', 'HT', '2H', 'ET', 'BT', 'P']);

const toScoreNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const hasScore = (score) =>
  score &&
  toScoreNumber(score.home) !== null &&
  toScoreNumber(score.away) !== null;

const getScoreWinner = (score) => {
  if (!hasScore(score)) return null;

  const home = toScoreNumber(score.home);
  const away = toScoreNumber(score.away);

  if (home > away) return 'home';
  if (away > home) return 'away';
  return 'draw';
};

const getWinnerName = (winner, fixture) => {
  if (winner === 'home') return fixture?.teams?.home?.name || 'Home';
  if (winner === 'away') return fixture?.teams?.away?.name || 'Away';
  return 'Draw';
};

const getTeamName = (fixture, side) => fixture?.teams?.[side]?.name || (side === 'home' ? 'Home' : 'Away');

const getMatchBreakdown = (fixture) => {
  const fullTime =
    fixture?.displayScore?.fullTime ||
    fixture?.score?.regularTime ||
    fixture?.goals ||
    fixture?.score?.fullTime;
  const extraTime = fixture?.displayScore?.afterExtraTime || fixture?.score?.extraTime;
  const penalties = fixture?.displayScore?.penalties || fixture?.score?.penalties;

  const ft = hasScore(fullTime)
    ? { home: toScoreNumber(fullTime.home), away: toScoreNumber(fullTime.away) }
    : null;
  const et = hasScore(extraTime)
    ? { home: toScoreNumber(extraTime.home), away: toScoreNumber(extraTime.away) }
    : null;
  const pens = hasScore(penalties)
    ? { home: toScoreNumber(penalties.home), away: toScoreNumber(penalties.away) }
    : null;

  const decisiveWinner =
    getScoreWinner(ft) !== 'draw'
      ? getScoreWinner(ft)
      : [getScoreWinner(pens), getScoreWinner(et), getScoreWinner(fixture?.score?.fullTime)]
          .find((winner) => winner && winner !== 'draw') || 'draw';

  return { ft, et, pens, decisiveWinner };
};

const formatKickoff = (dateValue) => {
  if (!dateValue) return 'Kickoff unavailable';

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Kickoff unavailable';

  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatScore = (score) => (score ? `${score.home}-${score.away}` : '-');

const getPredictionSummary = (fixture, predictions = []) => {
  const fixtureId = String(fixture?.fixture?.id || '');
  const list = (predictions || []).filter((prediction) => {
    const predictionFixtureId = String(prediction.fixtureId || prediction.fixtureID || '');
    return !predictionFixtureId || predictionFixtureId === fixtureId;
  });

  const home = list.filter((prediction) => (prediction.winner || prediction.prediction) === 'home').length;
  const away = list.filter((prediction) => (prediction.winner || prediction.prediction) === 'away').length;
  const draw = list.filter((prediction) => (prediction.winner || prediction.prediction) === 'draw').length;
  const exact = list.filter((prediction) => prediction.homeGoals !== undefined || prediction.predictedHomeGoals !== undefined).length;
  const total = home + away + draw;

  return { home, away, draw, exact, total };
};

const getFixtureWinner = (fixture) => getMatchBreakdown(fixture).decisiveWinner;

const getTeamForm = (teamId, fixtures = []) => {
  if (!teamId) return [];

  return (fixtures || [])
    .filter((match) => SCORE_STATUSES.has(match?.fixture?.status?.short))
    .filter((match) => match?.teams?.home?.id === teamId || match?.teams?.away?.id === teamId)
    .sort((a, b) => new Date(b.fixture?.date) - new Date(a.fixture?.date))
    .slice(0, 5)
    .map((match) => {
      const isHome = match?.teams?.home?.id === teamId;
      const winner = getFixtureWinner(match);
      const result = winner === 'draw' ? 'D' : (winner === (isHome ? 'home' : 'away') ? 'W' : 'L');
      const score = getMatchBreakdown(match).ft;
      return {
        result,
        opponent: isHome ? match?.teams?.away?.name : match?.teams?.home?.name,
        score: formatScore(score),
      };
    });
};

const buildTimeline = (fixture, breakdown) => {
  const status = fixture?.fixture?.status;
  const rows = [];

  rows.push({
    label: 'Kickoff',
    value: formatKickoff(fixture?.fixture?.date),
  });

  if (LIVE_STATUSES.has(status?.short)) {
    rows.push({
      label: 'Live status',
      value: status?.elapsed ? `${status.elapsed}'` : status?.long || status?.short || 'Live',
    });
  }

  if (breakdown.ft) {
    rows.push({ label: 'Full time', value: formatScore(breakdown.ft) });
  }
  if (breakdown.et) {
    rows.push({ label: 'Extra time', value: formatScore(breakdown.et) });
  }
  if (breakdown.pens) {
    rows.push({ label: 'Penalties', value: formatScore(breakdown.pens) });
  }

  return rows;
};

function FormPills({ title, form }) {
  return (
    <div className="hub-form-card">
      <strong>{title}</strong>
      {form.length ? (
        <div className="hub-form-list">
          {form.map((item, index) => (
            <span className={`hub-form-pill hub-form-pill--${item.result.toLowerCase()}`} key={`${item.opponent}-${index}`}>
              {item.result}
              <small>{item.score}</small>
            </span>
          ))}
        </div>
      ) : (
        <span className="hub-muted">No completed form yet</span>
      )}
    </div>
  );
}

export default function MatchDetailsPanel({
  fixture,
  compact = false,
  roomPredictions = [],
  fixtures = [],
}) {
  const status = fixture?.fixture?.status?.short || 'NS';
  const isFinished = SCORE_STATUSES.has(status);
  const isKnockout = Boolean(
    fixture?.displayScore?.afterExtraTime ||
      fixture?.score?.extraTime ||
      fixture?.displayScore?.penalties ||
      fixture?.score?.penalties
  );
  const breakdown = useMemo(() => getMatchBreakdown(fixture), [fixture]);
  const summary = useMemo(() => getPredictionSummary(fixture, roomPredictions), [fixture, roomPredictions]);
  const homeForm = useMemo(() => getTeamForm(fixture?.teams?.home?.id, fixtures), [fixture, fixtures]);
  const awayForm = useMemo(() => getTeamForm(fixture?.teams?.away?.id, fixtures), [fixture, fixtures]);
  const timeline = useMemo(() => buildTimeline(fixture, breakdown), [fixture, breakdown]);

  if (!fixture) return null;

  const homeName = getTeamName(fixture, 'home');
  const awayName = getTeamName(fixture, 'away');

  return (
    <details className={`match-details-panel ${compact ? 'match-details-panel--compact' : ''}`}>
      <summary>
        <span>Match hub</span>
        <b>Details · Form · Predictions</b>
      </summary>

      <div className="match-details-body">
        <div className="match-detail-grid">
          <div>
            <span>Competition</span>
            <strong>{fixture?.league?.name || 'Football'}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>{fixture?.fixture?.status?.long || status}</strong>
          </div>
          <div>
            <span>Kickoff</span>
            <strong>{formatKickoff(fixture?.fixture?.date)}</strong>
          </div>
          <div>
            <span>Winner</span>
            <strong>{isFinished ? getWinnerName(breakdown.decisiveWinner, fixture) : 'Pending'}</strong>
          </div>
        </div>

        <div className="match-knockout-card">
          <div className="match-knockout-title">
            <span>Score detail</span>
            <strong>{isKnockout ? 'Knockout match' : 'Regular-time match'}</strong>
          </div>
          <div className="match-knockout-row">
            <span>Full time</span>
            <b>{formatScore(breakdown.ft)}</b>
          </div>
          {breakdown.et && (
            <div className="match-knockout-row">
              <span>After extra time</span>
              <b>{formatScore(breakdown.et)}</b>
            </div>
          )}
          {breakdown.pens && (
            <div className="match-knockout-row">
              <span>Penalties</span>
              <b>{formatScore(breakdown.pens)}</b>
            </div>
          )}
        </div>

        <section className="sofa-section">
          <div className="sofa-section-title">Prediction pulse</div>
          <div className="hub-prediction-grid">
            <div>
              <span>{homeName}</span>
              <strong>{summary.home}</strong>
            </div>
            <div>
              <span>Draw</span>
              <strong>{summary.draw}</strong>
            </div>
            <div>
              <span>{awayName}</span>
              <strong>{summary.away}</strong>
            </div>
          </div>
          <div className="hub-muted">{summary.total} room picks tracked for this fixture</div>
        </section>

        <section className="sofa-section">
          <div className="sofa-section-title">Team form</div>
          <div className="hub-form-grid">
            <FormPills title={homeName} form={homeForm} />
            <FormPills title={awayName} form={awayForm} />
          </div>
        </section>

        <section className="sofa-section">
          <div className="sofa-section-title">Match timeline</div>
          <div className="sofa-timeline">
            {timeline.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <b>{item.value}</b>
              </div>
            ))}
          </div>
        </section>

        <div className="match-detail-note">
          SofaScore has been replaced with a reliable Football Talks match hub using your own fixture, score, form and prediction data. This avoids blocked APIs and broken third-party pages.
        </div>
      </div>
    </details>
  );
}
