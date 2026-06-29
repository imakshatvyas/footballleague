import { useEffect, useMemo, useState } from "react";
import "./PredictionCard.css";

const LIVE_STATUSES = ["LIVE", "1H", "HT", "2H", "ET", "BT", "P"];

function formatKickoff(dateStr) {
  if (!dateStr) return "";

  const date = new Date(dateStr);
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 86400000);
  const time = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (date.toDateString() === now.toDateString()) return `Today - ${time}`;
  if (date.toDateString() === tomorrow.toDateString()) return `Tomorrow - ${time}`;

  return `${date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })} - ${time}`;
}

function formatUpdatedAt(updatedAt) {
  if (!updatedAt) return null;

  return new Date(updatedAt).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getMatchStatus(fixture) {
  const short = fixture?.fixture?.status?.short;
  const elapsed = fixture?.fixture?.status?.elapsed;
  const isLive = LIVE_STATUSES.includes(short);
  const isFinished = short === "FT";
  const isUpcoming = short === "NS";
  const updatedAt = formatUpdatedAt(fixture?.fixture?.status?.updatedAt);

  if (isLive) {
    if (short === "HT") return { short, isLive, isFinished, isUpcoming, label: "Half time" };
    if (short === "ET") return { short, isLive, isFinished, isUpcoming, label: `${elapsed ?? ""}' ET` };
    if (short === "P") return { short, isLive, isFinished, isUpcoming, label: "Penalties" };
    return {
      short,
      isLive,
      isFinished,
      isUpcoming,
      label: elapsed ? `${elapsed}'` : updatedAt ? `Live now - updated ${updatedAt}` : "Live now",
    };
  }

  if (isFinished) return { short, isLive, isFinished, isUpcoming, label: "Finished" };
  if (isUpcoming) return { short, isLive, isFinished, isUpcoming, label: formatKickoff(fixture?.fixture?.date) };
  return { short, isLive, isFinished, isUpcoming, label: short || "Match" };
}

function TeamLogo({ team, size = 52 }) {
  const [error, setError] = useState(false);
  const initials = team?.name
    ? team.name
        .split(" ")
        .map((word) => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  if (!team?.logo || error) {
    return (
      <span className="pred-logo-shell" style={{ width: size, height: size }}>
        <span className="pred-team-fallback">{initials}</span>
      </span>
    );
  }

  return (
    <span className="pred-logo-shell" style={{ width: size, height: size }}>
      <img
        src={team.logo}
        alt={team.name}
        width={size}
        height={size}
        className="pred-team-logo"
        onError={() => setError(true)}
      />
    </span>
  );
}

function getGoals(fixture) {
  return {
    home: fixture?.goals?.home ?? fixture?.score?.fullTime?.home ?? 0,
    away: fixture?.goals?.away ?? fixture?.score?.fullTime?.away ?? 0,
  };
}

function isLocked(fixture) {
  const status = getMatchStatus(fixture);
  const kickoff = fixture?.fixture?.date ? new Date(fixture.fixture.date) : null;

  return status.isLive || status.isFinished || (kickoff ? kickoff <= new Date() : false);
}

function getInitialScore(winner, currentHomeGoals = 0, currentAwayGoals = 0) {
  const homeGoals = Number(currentHomeGoals) || 0;
  const awayGoals = Number(currentAwayGoals) || 0;

  if (winner === "home" && homeGoals <= awayGoals) {
    return { homeGoals: awayGoals + 1, awayGoals };
  }

  if (winner === "away" && awayGoals <= homeGoals) {
    return { homeGoals, awayGoals: homeGoals + 1 };
  }

  return { homeGoals, awayGoals };
}

function getScoreWinner(homeGoals, awayGoals) {
  if (homeGoals > awayGoals) return "home";
  if (awayGoals > homeGoals) return "away";
  return null;
}

function getWinnerLabel(winner, homeName, awayName) {
  if (winner === "home") return homeName;
  if (winner === "away") return awayName;
  return "No pick";
}

export default function PredictionCard({
  fixture,
  selected,
  saving,
  onPredict,
  animationDelay = 0,
  roomPredictions = {},
}) {
  const fixtureId = fixture?.fixture?.id;
  const home = fixture?.teams?.home;
  const away = fixture?.teams?.away;
  const status = getMatchStatus(fixture);
  const locked = isLocked(fixture);
  const goals = getGoals(fixture);

  // Calculate community vote split
  const allPredictionsForFixture = Object.entries(roomPredictions)
    .filter(([key]) => String(key) === String(fixtureId))
    .map(([, pred]) => pred);

  const homeVotes = allPredictionsForFixture.filter(
    (pred) => pred?.winner === "home"
  ).length;

  const awayVotes = allPredictionsForFixture.filter(
    (pred) => pred?.winner === "away"
  ).length;

  const totalVotes = homeVotes + awayVotes;
  const homePercent = totalVotes > 0 ? (homeVotes / totalVotes) * 100 : 0;
  const awayPercent = totalVotes > 0 ? (awayVotes / totalVotes) * 100 : 0;

  const [selectedWinner, setSelectedWinner] = useState(null);
  const [homeGoals, setHomeGoals] = useState(0);
  const [awayGoals, setAwayGoals] = useState(0);

  useEffect(() => {
    if (!selected) {
      setSelectedWinner(null);
      setHomeGoals(0);
      setAwayGoals(0);
      return;
    }

    if (typeof selected === "string") {
      const score = getInitialScore(selected, 0, 0);
      setSelectedWinner(selected);
      setHomeGoals(score.homeGoals);
      setAwayGoals(score.awayGoals);
      return;
    }

    const score = getInitialScore(
      selected.winner,
      selected.homeGoals ?? 0,
      selected.awayGoals ?? 0
    );

    setSelectedWinner(selected.winner || null);
    setHomeGoals(score.homeGoals);
    setAwayGoals(score.awayGoals);
  }, [selected]);

  const scoreWinner = useMemo(
    () => getScoreWinner(homeGoals, awayGoals),
    [homeGoals, awayGoals]
  );

  const scoreMatchesWinner = selectedWinner && selectedWinner === scoreWinner;
  const canSave = Boolean(selectedWinner && scoreMatchesWinner && !locked && !saving);
  const isSaved =
    typeof selected === "string"
      ? false
      : selected?.winner === selectedWinner &&
        Number(selected?.homeGoals ?? 0) === homeGoals &&
        Number(selected?.awayGoals ?? 0) === awayGoals;

  const handleSelectWinner = (team) => {
    if (locked || saving) return;

    const nextWinner = selectedWinner === team ? null : team;
    setSelectedWinner(nextWinner);

    if (nextWinner) {
      const score = getInitialScore(nextWinner, homeGoals, awayGoals);
      setHomeGoals(score.homeGoals);
      setAwayGoals(score.awayGoals);
    }
  };

  const handleGoalChange = (team, delta) => {
    if (locked || saving) return;

    if (team === "home") {
      setHomeGoals((value) => Math.max(0, value + delta));
      return;
    }

    setAwayGoals((value) => Math.max(0, value + delta));
  };

  const handleSave = () => {
    if (!canSave) return;
    onPredict(fixtureId, selectedWinner, homeGoals, awayGoals);
  };

  return (
    <article
      className={`pred-card ${selectedWinner ? "pred-card--predicted" : ""} ${
        locked ? "pred-card--locked" : ""
      } ${status.isLive ? "pred-card--live" : ""} ${isSaved ? "pred-card--saved" : ""} animate-fade-up`}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="pred-header">
        <span className="pred-deadline">{status.label}</span>
        <div className="pred-header-right">
          {saving && <div className="pred-saving-dot" />}
          {status.isLive ? (
            <span className="badge badge-live">
              <span className="live-dot" />
              LIVE
            </span>
          ) : locked ? (
            <span className="badge badge-muted">Locked</span>
          ) : isSaved ? (
            <span className="badge badge-success">Saved</span>
          ) : (
            <span className="badge badge-muted">Open</span>
          )}
        </div>
      </div>

      {status.isLive && (
        <div className="pred-live-score">
          <span>{home?.name}</span>
          <strong>{goals.home} - {goals.away}</strong>
          <span>{away?.name}</span>
        </div>
      )}

      <div className="pred-teams-selector">
        <button
          className={`pred-team-card ${
            selectedWinner === "home" ? "pred-team-card--selected" : ""
          }`}
          disabled={locked || saving}
          onClick={() => handleSelectWinner("home")}
          type="button"
        >
          <TeamLogo team={home} />
          <span className="pred-team-card-name">{home?.name}</span>
          <span className="pred-team-card-meta">Home win</span>
          {selectedWinner === "home" && <span className="pred-team-card-check">OK</span>}
        </button>

        <div className="pred-vs-divider">
          <span className="pred-vs-text">VS</span>
        </div>

        <button
          className={`pred-team-card ${
            selectedWinner === "away" ? "pred-team-card--selected" : ""
          }`}
          disabled={locked || saving}
          onClick={() => handleSelectWinner("away")}
          type="button"
        >
          <TeamLogo team={away} />
          <span className="pred-team-card-name">{away?.name}</span>
          <span className="pred-team-card-meta">Away win</span>
          {selectedWinner === "away" && <span className="pred-team-card-check">OK</span>}
        </button>
      </div>

      {selectedWinner && !locked && (
        <div className="pred-score-section">
          <div className="pred-score-topline">
            <span className="pred-score-label">Scoreline</span>
            <span className="pred-score-preview">
              {homeGoals} - {awayGoals}
            </span>
          </div>

          <div className="pred-score-inputs">
            <div className="pred-score-group">
              <div className="pred-score-team-label">{home?.name}</div>
              <div className="pred-score-control">
                <button
                  className="pred-score-btn"
                  disabled={homeGoals === 0 || saving}
                  onClick={() => handleGoalChange("home", -1)}
                  type="button"
                  aria-label="Decrease home goals"
                >
                  -
                </button>
                <div className="pred-score-display">{homeGoals}</div>
                <button
                  className="pred-score-btn"
                  disabled={saving}
                  onClick={() => handleGoalChange("home", 1)}
                  type="button"
                  aria-label="Increase home goals"
                >
                  +
                </button>
              </div>
            </div>

            <div className="pred-score-group">
              <div className="pred-score-team-label">{away?.name}</div>
              <div className="pred-score-control">
                <button
                  className="pred-score-btn"
                  disabled={awayGoals === 0 || saving}
                  onClick={() => handleGoalChange("away", -1)}
                  type="button"
                  aria-label="Decrease away goals"
                >
                  -
                </button>
                <div className="pred-score-display">{awayGoals}</div>
                <button
                  className="pred-score-btn"
                  disabled={saving}
                  onClick={() => handleGoalChange("away", 1)}
                  type="button"
                  aria-label="Increase away goals"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {!scoreMatchesWinner && (
            <div className="pred-score-warning">
              Pick a scoreline where your selected team wins.
            </div>
          )}
        </div>
      )}

      {locked && selectedWinner && (
        <div className="pred-locked-pick">
          <span>Your prediction</span>
          <strong>
            {getWinnerLabel(selectedWinner, home?.name, away?.name)} - {homeGoals} : {awayGoals}
          </strong>
        </div>
      )}

      {locked && !selectedWinner && (
        <div className="pred-locked-pick pred-locked-pick--empty">
          Prediction closed after kickoff
        </div>
      )}

      <div className="pred-footer">
        <div className="pred-scoring-info">
          <span>Winner +1</span>
          <span>Exact score +0.5</span>
        </div>

        {!locked && selectedWinner && (
          <button
            className={`pred-save-btn ${isSaved ? "pred-save-btn--saved" : ""}`}
            disabled={!canSave}
            onClick={handleSave}
            type="button"
          >
            {saving ? <span className="pred-save-spinner" /> : isSaved ? "Saved" : "Save"}
          </button>
        )}
      </div>

      {/* Community Support Bar */}
      {totalVotes > 0 && (
        <div className="pred-support-section">
          <div className="pred-support-label">
            Community <span className="pred-support-count">({totalVotes})</span>
          </div>
          <div className="pred-support-bar">
            <div
              className="pred-support-segment pred-support-segment--home"
              style={{ width: `${homePercent}%` }}
              title={`${homePercent.toFixed(0)}% supporting ${home?.name}`}
            >
              {homePercent > 15 && (
                <span className="pred-support-text">
                  {homePercent.toFixed(0)}%
                </span>
              )}
            </div>
            <div
              className="pred-support-segment pred-support-segment--away"
              style={{ width: `${awayPercent}%` }}
              title={`${awayPercent.toFixed(0)}% supporting ${away?.name}`}
            >
              {awayPercent > 15 && (
                <span className="pred-support-text">
                  {awayPercent.toFixed(0)}%
                </span>
              )}
            </div>
          </div>
          <div className="pred-support-legend">
            <span className="pred-support-legend-item">
              <span className="pred-support-dot pred-support-dot--home"></span>
              {home?.name}
            </span>
            <span className="pred-support-legend-item">
              <span className="pred-support-dot pred-support-dot--away"></span>
              {away?.name}
            </span>
          </div>
        </div>
      )}
    </article>
  );
}