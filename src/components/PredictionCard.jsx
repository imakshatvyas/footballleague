import { useState, useEffect } from "react";
import "./PredictionCard.css";

/* ---------------- Helpers ---------------- */

function formatKickoff(dateStr) {
  if (!dateStr) return "";

  const date = new Date(dateStr);
  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();
  const isTomorrow =
    date.toDateString() ===
    new Date(now.getTime() + 86400000).toDateString();

  const time = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isToday) return `Today • ${time}`;
  if (isTomorrow) return `Tomorrow • ${time}`;

  return (
    date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }) + ` • ${time}`
  );
}

function TeamLogo({ team, size = 48 }) {
  const [error, setError] = useState(false);

  const initials = team?.name
    ? team.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  if (!team?.logo || error) {
    return (
      <div
        className="pred-team-fallback"
        style={{ width: size, height: size }}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={team.logo}
      alt={team.name}
      width={size}
      height={size}
      className="pred-team-logo"
      onError={() => setError(true)}
    />
  );
}

function isLocked(date) {
  return new Date(date) <= new Date();
}

/* ---------------- Component ---------------- */

export default function PredictionCard({
  fixture,
  selected,
  saving,
  onPredict,
  animationDelay = 0,
}) {
  const fixtureId = fixture?.fixture?.id;

  const home = fixture?.teams?.home;
  const away = fixture?.teams?.away;

  const kickoff = fixture?.fixture?.date;

  const locked = isLocked(kickoff);

  // Local prediction state
  const [selectedWinner, setSelectedWinner] = useState(selected?.winner || null);
  const [homeGoals, setHomeGoals] = useState(selected?.homeGoals ?? 0);
  const [awayGoals, setAwayGoals] = useState(selected?.awayGoals ?? 0);

  // Sync with parent when selected changes
  useEffect(() => {
    if (selected) {
      // Handle both old format (string) and new format (object with winner/homeGoals/awayGoals)
      if (typeof selected === "string") {
        setSelectedWinner(selected);
        setHomeGoals(0);
        setAwayGoals(0);
      } else {
        setSelectedWinner(selected.winner || null);
        setHomeGoals(selected.homeGoals ?? 0);
        setAwayGoals(selected.awayGoals ?? 0);
      }
    } else {
      setSelectedWinner(null);
      setHomeGoals(0);
      setAwayGoals(0);
    }
  }, [selected]);

  const handleSelectWinner = (team) => {
    if (locked || saving) return;
    setSelectedWinner(selectedWinner === team ? null : team);
  };

  const handleGoalChange = (team, delta) => {
    if (locked || saving) return;

    if (team === "home") {
      setHomeGoals((prev) => Math.max(0, prev + delta));
    } else {
      setAwayGoals((prev) => Math.max(0, prev + delta));
    }
  };

  const handleSave = () => {
    if (!selectedWinner) return;
    onPredict(fixtureId, selectedWinner, homeGoals, awayGoals);
  };

  const isComplete = !!selectedWinner;
  const isSaved =
    typeof selected === "string"
      ? selected === selectedWinner && homeGoals === 0 && awayGoals === 0
      : selected?.winner === selectedWinner &&
        selected?.homeGoals === homeGoals &&
        selected?.awayGoals === awayGoals;

  return (
    <div
      className={`pred-card
        ${selectedWinner ? "pred-card--predicted" : ""}
        ${locked ? "pred-card--locked" : ""}
        ${isSaved ? "pred-card--saved" : ""}
        animate-fade-up`}
      style={{
        animationDelay: `${animationDelay}ms`,
      }}
    >
      {/* Header */}
      <div className="pred-header">
        <span className="pred-deadline">
          {formatKickoff(kickoff)}
        </span>

        <div className="pred-header-right">
          {saving && <div className="pred-saving-dot" />}

          {locked ? (
            <span className="badge badge-muted">
              🔒 Locked
            </span>
          ) : isSaved ? (
            <span className="badge badge-success">
              ✓ Saved
            </span>
          ) : null}
        </div>
      </div>

      {/* Winner Selection */}
      <div className="pred-teams-selector">
        {/* Home Team */}
        <button
          className={`pred-team-card
            ${selectedWinner === "home" ? "pred-team-card--selected" : ""}
            ${locked ? "pred-team-card--disabled" : ""}`}
          disabled={locked || saving}
          onClick={() => handleSelectWinner("home")}
          type="button"
        >
          <TeamLogo team={home} size={52} />
          <span className="pred-team-card-name">{home?.name}</span>
          {selectedWinner === "home" && (
            <span className="pred-team-card-check">✓</span>
          )}
        </button>

        {/* VS Divider */}
        <div className="pred-vs-divider">
          <span className="pred-vs-text">VS</span>
        </div>

        {/* Away Team */}
        <button
          className={`pred-team-card
            ${selectedWinner === "away" ? "pred-team-card--selected" : ""}
            ${locked ? "pred-team-card--disabled" : ""}`}
          disabled={locked || saving}
          onClick={() => handleSelectWinner("away")}
          type="button"
        >
          <TeamLogo team={away} size={52} />
          <span className="pred-team-card-name">{away?.name}</span>
          {selectedWinner === "away" && (
            <span className="pred-team-card-check">✓</span>
          )}
        </button>
      </div>

      {/* Score Prediction */}
      {selectedWinner && !locked && (
        <div className="pred-score-section">
          <div className="pred-score-label">
            Predict the Score
          </div>

          <div className="pred-score-inputs">
            {/* Home Goals */}
            <div className="pred-score-group">
              <div className="pred-score-team-label">
                {home?.name}
              </div>
              <div className="pred-score-control">
                <button
                  className="pred-score-btn pred-score-btn--minus"
                  disabled={homeGoals === 0}
                  onClick={() => handleGoalChange("home", -1)}
                  type="button"
                  aria-label="Decrease home goals"
                >
                  −
                </button>
                <div className="pred-score-display">
                  {homeGoals}
                </div>
                <button
                  className="pred-score-btn pred-score-btn--plus"
                  onClick={() => handleGoalChange("home", 1)}
                  type="button"
                  aria-label="Increase home goals"
                >
                  +
                </button>
              </div>
            </div>

            {/* Away Goals */}
            <div className="pred-score-group">
              <div className="pred-score-team-label">
                {away?.name}
              </div>
              <div className="pred-score-control">
                <button
                  className="pred-score-btn pred-score-btn--minus"
                  disabled={awayGoals === 0}
                  onClick={() => handleGoalChange("away", -1)}
                  type="button"
                  aria-label="Decrease away goals"
                >
                  −
                </button>
                <div className="pred-score-display">
                  {awayGoals}
                </div>
                <button
                  className="pred-score-btn pred-score-btn--plus"
                  onClick={() => handleGoalChange("away", 1)}
                  type="button"
                  aria-label="Increase away goals"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scoring Info */}
      <div className="pred-scoring-info">
        <div className="pred-scoring-row">
          <span className="pred-scoring-label">Winner Prediction</span>
          <span className="pred-scoring-points">+1 point</span>
        </div>
        <div className="pred-scoring-row">
          <span className="pred-scoring-label">Exact Score Bonus</span>
          <span className="pred-scoring-points">+0.5 point</span>
        </div>
      </div>

      {/* Save Button */}
      {!locked && selectedWinner && (
        <button
          className={`pred-save-btn
            ${isSaved ? "pred-save-btn--saved" : ""}
            ${saving ? "pred-save-btn--saving" : ""}`}
          disabled={saving || !isComplete}
          onClick={handleSave}
          type="button"
        >
          {saving ? (
            <span className="pred-save-spinner" />
          ) : isSaved ? (
            "Prediction Saved"
          ) : (
            "Save Prediction"
          )}
        </button>
      )}
    </div>
  );
}