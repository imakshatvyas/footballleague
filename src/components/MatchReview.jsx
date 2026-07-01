import { useEffect, useState } from 'react';
import { getMatchReview } from '../services/matchReviewService';

const formatPoints = (points) => {
  if (!points) return '0 pts';
  return `+${Number(points).toFixed(points % 1 ? 1 : 0)} pts`;
};

const getStatusLabel = (prediction, hasExactScore) => {
  if (prediction.exactScore && hasExactScore) return 'Exact Score';
  if (prediction.correctWinner) return 'Correct Winner';
  return 'Wrong Prediction';
};

const getStatusIcon = (prediction, hasExactScore) => {
  if (prediction.exactScore && hasExactScore) return 'TARGET';
  if (prediction.correctWinner) return 'OK';
  return 'NO';
};

export default function MatchReview({ fixture, roomId, currentUserId, sport = 'football' }) {
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadReview = async () => {
      setLoading(true);
      try {
        const data = await getMatchReview({ fixture, roomId, currentUserId, sport });
        if (!cancelled) setReview(data);
      } catch (error) {
        console.error('Match review failed:', error);
        if (!cancelled) setReview(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadReview();

    return () => {
      cancelled = true;
    };
  }, [fixture, roomId, currentUserId, sport]);

  if (loading) {
    return (
      <div className="match-review match-review--loading">
        <ReviewStyles />
        <div className="match-review-skeleton" />
        <div className="match-review-skeleton match-review-skeleton--short" />
      </div>
    );
  }

  if (!review) return null;

  const { teams, finalResult, summary, currentUserPrediction, predictions, hasExactScore } = review;

  return (
    <section className="match-review">
      <ReviewStyles />

      <div className="match-review-header">
        <span>Match Review</span>
        <strong>Final Result</strong>
        <p>
          {teams.home}{' '}
          {sport === 'cricket'
            ? finalResult.label
            : `${finalResult.homeScore}-${finalResult.awayScore}`}{' '}
          {teams.away}
        </p>
      </div>

      <div className="match-review-summary">
        <strong>Prediction Summary</strong>
        <div className="match-review-count">{summary.totalPredictions} Predictions</div>
        <div className="match-review-summary-row">
          <span>{teams.home} Win</span>
          <b>{summary.homePredictions}</b>
        </div>
        {sport !== 'cricket' && (
          <div className="match-review-summary-row">
            <span>Draw</span>
            <b>{summary.drawPredictions}</b>
          </div>
        )}
        <div className="match-review-summary-row">
          <span>{teams.away} Win</span>
          <b>{summary.awayPredictions}</b>
        </div>
        {hasExactScore && (
          <div className="match-review-summary-row">
            <span>Exact score predictions</span>
            <b>{summary.exactScorePredictions}</b>
          </div>
        )}
      </div>

      <div className="match-review-section">
        <strong>Your Prediction</strong>
        {currentUserPrediction ? (
          <PredictionReviewCard
            prediction={currentUserPrediction}
            hasExactScore={hasExactScore}
            isFeatured
          />
        ) : (
          <div className="match-review-empty">You did not predict this match.</div>
        )}
      </div>

      <div className="match-review-section">
        <strong>Everyone's Predictions</strong>
        {predictions.length ? (
          <div className="match-review-list">
            {predictions.map((prediction) => (
              <PredictionReviewCard
                key={prediction.id}
                prediction={prediction}
                hasExactScore={hasExactScore}
              />
            ))}
          </div>
        ) : (
          <div className="match-review-empty">No predictions were submitted.</div>
        )}
      </div>
    </section>
  );
}

function PredictionReviewCard({ prediction, hasExactScore, isFeatured = false }) {
  return (
    <div
      className={`match-review-card match-review-card--${prediction.status} ${
        prediction.isCurrentUser ? 'match-review-card--you' : ''
      } ${isFeatured ? 'match-review-card--featured' : ''}`}
    >
      <div>
        <strong>{prediction.isCurrentUser ? 'You' : prediction.displayName}</strong>
        <span>{prediction.scoreLabel}</span>
      </div>
      <div className="match-review-result">
        <span>{getStatusIcon(prediction, hasExactScore)} {getStatusLabel(prediction, hasExactScore)}</span>
        <b>{formatPoints(prediction.points)}</b>
      </div>
    </div>
  );
}

function ReviewStyles() {
  return (
    <style>{`
      .match-review {
        margin-top: 14px;
        padding-top: 14px;
        border-top: 0.5px solid rgba(255, 255, 255, 0.08);
      }

      .match-review-header,
      .match-review-summary,
      .match-review-section {
        padding: 12px;
        border: 0.5px solid rgba(255, 255, 255, 0.08);
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.035);
      }

      .match-review-header {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }

      .match-review-header span,
      .match-review-summary > strong,
      .match-review-section > strong {
        color: var(--text-accent);
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 0.8px;
        text-transform: uppercase;
      }

      .match-review-header strong {
        color: var(--text-secondary);
        font-size: 12px;
      }

      .match-review-header p {
        color: var(--text-primary);
        font-size: 15px;
        font-weight: 900;
      }

      .match-review-summary,
      .match-review-section {
        margin-top: 10px;
      }

      .match-review-count {
        margin: 8px 0;
        color: var(--text-primary);
        font-size: 16px;
        font-weight: 900;
      }

      .match-review-summary-row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 6px 0;
        color: var(--text-secondary);
        font-size: 12px;
        font-weight: 700;
      }

      .match-review-summary-row b {
        color: var(--text-primary);
      }

      .match-review-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 10px;
      }

      .match-review-card {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
        padding: 11px 12px;
        border: 0.5px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        background: rgba(0, 0, 0, 0.16);
      }

      .match-review-card--featured,
      .match-review-card--you {
        border-color: rgba(255, 90, 0, 0.34);
        background: rgba(255, 90, 0, 0.08);
      }

      .match-review-card--exact {
        border-color: rgba(255, 149, 0, 0.34);
      }

      .match-review-card--correct {
        border-color: rgba(34, 197, 94, 0.26);
      }

      .match-review-card--wrong {
        border-color: rgba(239, 68, 68, 0.22);
      }

      .match-review-card strong {
        display: block;
        color: var(--text-primary);
        font-size: 13px;
      }

      .match-review-card span {
        display: block;
        margin-top: 2px;
        color: var(--text-muted);
        font-size: 12px;
        font-weight: 700;
      }

      .match-review-result {
        text-align: right;
        flex-shrink: 0;
      }

      .match-review-result b {
        display: block;
        margin-top: 2px;
        color: var(--text-accent);
        font-size: 13px;
      }

      .match-review-empty {
        margin-top: 10px;
        color: var(--text-muted);
        font-size: 12px;
        font-weight: 700;
      }

      .match-review-skeleton {
        height: 48px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.055);
      }

      .match-review-skeleton--short {
        width: 64%;
        height: 34px;
        margin-top: 8px;
      }

      @media (max-width: 520px) {
        .match-review-card {
          flex-direction: column;
        }

        .match-review-result {
          text-align: left;
        }
      }
    `}</style>
  );
}
