import { useEffect, useState } from "react";
import { getSportService } from "../services/sports/sportResolver";
import { PushNotifications } from "@capacitor/push-notifications";
import { initPushNotifications } from "../services/pushNotificationService";
import { toast } from "react-hot-toast";
import "./HeroMatch.css";

const LIVE_STATUSES = ["1H", "HT", "2H", "ET", "BT", "P", "LIVE"];

function getStatusInfo(fixture) {
  const short = fixture?.fixture?.status?.short;
  const elapsed = fixture?.fixture?.status?.elapsed;
  const updatedAt = formatUpdatedAt(fixture?.fixture?.status?.updatedAt);
  const isLive = LIVE_STATUSES.includes(short);

  if (isLive) {
    if (short === "HT") return { label: "Half time", isLive: true };
    if (short === "ET") return { label: `${elapsed ?? ""}' ET`, isLive: true };
    if (short === "P") return { label: "Penalties", isLive: true };
    return {
      label: elapsed ? `${elapsed}'` : updatedAt ? `Live now - updated ${updatedAt}` : "Live now",
      isLive: true,
    };
  }

  if (short === "NS") {
    const date = fixture?.fixture?.date;
    if (!date) return { label: "Upcoming", isLive: false };
    return { label: null, isLive: false, kickoff: new Date(date) };
  }

  if (short === "FT") return { label: "Full time", isLive: false };
  return { label: short || "Match", isLive: false };
}

function useCountdown(kickoff) {
  const [display, setDisplay] = useState("");

  useEffect(() => {
    if (!kickoff) return undefined;

    const tick = () => {
      const diff = kickoff - Date.now();
      if (diff <= 0) {
        setDisplay("Starting soon");
        return;
      }

      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);

      if (h > 24) {
        const d = Math.floor(h / 24);
        setDisplay(`${d}d ${h % 24}h`);
      } else if (h > 0) {
        setDisplay(`${h}h ${m}m`);
      } else {
        setDisplay(`${m}m ${s}s`);
      }
    };

    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [kickoff]);

  return display;
}

function TeamLogo({ team, size = 64 }) {
  const [imgError, setImgError] = useState(false);
  const initials = team?.name
    ? team.name
        .split(" ")
        .map((word) => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  if (!team?.logo || imgError) {
    return (
      <div className="hero-team-fallback" style={{ width: size, height: size }}>
        {initials}
      </div>
    );
  }

  return (
    <span className="hero-logo-shell" style={{ width: size, height: size }}>
      <img
        src={team.logo}
        alt={team.name}
        width={size}
        height={size}
        className="hero-team-logo"
        onError={() => setImgError(true)}
      />
    </span>
  );
}

function winnerLabel(prediction, homeName, awayName) {
  if (prediction?.winner === "home") return homeName;
  if (prediction?.winner === "away") return awayName;
  return "Not picked";
}

function formatUpdatedAt(updatedAt) {
  if (!updatedAt) return null;

  return new Date(updatedAt).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HeroMatch({ fixture, roomName, memberCount, userPrediction, onOpenRoomInfo, sport = "football", userId }) {
  const statusInfo = fixture ? getStatusInfo(fixture) : null;
  const countdown = useCountdown(statusInfo?.kickoff);

  const [showBell, setShowBell] = useState(false);

  useEffect(() => {
    const checkNotificationPermission = async () => {
      try {
        const perm = await PushNotifications.checkPermissions();
        if (perm.receive !== "granted") {
          setShowBell(true);
        } else {
          setShowBell(false);
        }
      } catch (e) {
        if (typeof window !== "undefined") {
          if ("Notification" in window) {
            if (Notification.permission !== "granted") {
              setShowBell(true);
            } else {
              setShowBell(false);
            }
          } else {
            // Show bell on mobile browsers where Notification API is not exposed yet (e.g. iOS Safari pre-PWA)
            setShowBell(true);
          }
        }
      }
    };
    checkNotificationPermission();
  }, [userId]);

  const [showNotificationModal, setShowNotificationModal] = useState(false);

  const handleRequestPermission = async () => {
    setShowNotificationModal(false);
    if (!userId) {
      toast.error("Please log in to enable notifications");
      return;
    }
    const success = await initPushNotifications(userId);
    if (success) {
      toast.success("Notifications successfully enabled!");
      setShowBell(false);
    } else {
      toast.error("Permission blocked. Please enable notifications in your browser/device settings!");
    }
  };

  const homeTeam = fixture?.teams?.home;
  const awayTeam = fixture?.teams?.away;
  const league = fixture?.league;

  const isLive = statusInfo?.isLive;
  const isNS = fixture?.fixture?.status?.short === "NS";
  const showScore = isLive || fixture?.fixture?.status?.short === "FT";
  const hasPrediction = userPrediction?.winner === "home" || userPrediction?.winner === "away";

  const { config } = getSportService(sport);
  const homeGoals = fixture?.goals?.home;
  const awayGoals = fixture?.goals?.away;

  return (
    <div className={`hero-root ${isLive ? "hero-root--live" : ""}`}>
      <div className="hero-bg">
        <div className="hero-bg-base" />
        <div className="hero-bg-glow hero-bg-glow--left" />
        <div className="hero-bg-glow hero-bg-glow--right" />
        {isLive && <div className="hero-bg-pulse" />}
      </div>

      <div className="hero-header">
        <div className="hero-room-info">
          <span className="hero-room-name">{roomName || "My Room"}</span>
          {memberCount > 0 && <span className="hero-member-count">{memberCount} members</span>}
        </div>

        <div className="hero-header-actions">
          {isLive ? (
            <div className="badge badge-live">
              <span className="live-dot" />
              LIVE
            </div>
          ) : isNS ? (
            <div className="badge badge-muted">Next match</div>
          ) : null}
          <button
            className="hero-menu-button"
            type="button"
            aria-label="Open room information"
            onClick={onOpenRoomInfo}
          >
            ⋮
          </button>
        </div>
      </div>

      {fixture ? (
        <>
          <div className="hero-match">
            <div className="hero-team">
              <TeamLogo team={homeTeam} />
              <span className="hero-team-name">{homeTeam?.name || "-"}</span>
            </div>

            <div className="hero-centre">
              {showScore ? (
                <>
                  <div className="hero-score">
                    {config.hasScorePrediction ? (
                      <>
                        <span
                          className={
                            homeGoals > awayGoals
                              ? "hero-score-num hero-score-num--winning"
                              : "hero-score-num"
                          }
                        >
                          {fixture.scoreDisplay?.homeScore || "0"}
                        </span>
                        <span className="hero-score-sep">:</span>
                        <span
                          className={
                            awayGoals > homeGoals
                              ? "hero-score-num hero-score-num--winning"
                              : "hero-score-num"
                          }
                        >
                          {fixture.scoreDisplay?.awayScore || "0"}
                        </span>
                      </>
                    ) : (
                      <div className="cricket-hero-score">
                        <div className={fixture.fixture?.winner === 'home' ? "cricket-team-row winning" : "cricket-team-row"}>
                          {fixture.scoreDisplay?.homeScore || "Yet to bat"}
                        </div>
                        <div className="hero-vs" style={{ margin: '2px 0' }}>VS</div>
                        <div className={fixture.fixture?.winner === 'away' ? "cricket-team-row winning" : "cricket-team-row"}>
                          {fixture.scoreDisplay?.awayScore || "Yet to bat"}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className={`hero-status ${isLive ? "hero-status--live" : ""}`}>
                    {config.hasScorePrediction ? statusInfo?.label : (fixture.scoreDisplay?.statusLabel || statusInfo?.label)}
                  </div>
                </>
              ) : (
                <>
                  <div className="hero-vs">VS</div>
                  {isNS && countdown && (
                    <div className="hero-countdown">
                      <span className="hero-countdown-label">Kicks off in</span>
                      <span className="hero-countdown-time">{countdown}</span>
                    </div>
                  )}
                </>
              )}
              {showBell && (
                <button
                  type="button"
                  className="hero-bell-button animate-pulse"
                  onClick={() => setShowNotificationModal(true)}
                  title="Enable Push Notifications"
                >
                  🔔 Get Notifications
                </button>
              )}
            </div>

            <div className="hero-team">
              <TeamLogo team={awayTeam} />
              <span className="hero-team-name">{awayTeam?.name || "-"}</span>
            </div>
          </div>

          <div className="hero-details">
            <div className="hero-detail">
              <span className="hero-detail-label">Your pick</span>
              <span className="hero-detail-value">
                {hasPrediction ? winnerLabel(userPrediction, homeTeam?.name, awayTeam?.name) : "No prediction"}
              </span>
            </div>

            {config.hasScorePrediction && (
              <div className="hero-detail hero-detail--score">
                <span className="hero-detail-label">Your score</span>
                <span className="hero-detail-value">
                  {hasPrediction
                    ? `${userPrediction.homeGoals ?? 0} - ${userPrediction.awayGoals ?? 0}`
                    : "-"}
                </span>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="hero-empty">
          <div className="hero-empty-icon">{sport === "cricket" ? "🏏" : "⚽"}</div>
          <div className="hero-empty-text">No upcoming matches</div>
        </div>
      )}

      {showNotificationModal && (
        <div className="hero-notif-overlay animate-fade-in" onClick={() => setShowNotificationModal(false)}>
          <div className="hero-notif-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hero-notif-header">
              <span className="hero-notif-icon">🔔</span>
              <h3>Enable Predictions Notifications</h3>
            </div>
            <div className="hero-notif-body">
              <p>Get the most out of Football Talks by staying updated in real time! Enabling notifications will let you know:</p>
              <ul>
                <li>⚡ <strong>Matchday Reminders:</strong> Never miss a prediction deadline.</li>
                <li>🏆 <strong>Leaderboard Updates:</strong> Know instantly when you climb to the top.</li>
                <li>🎯 <strong>Score Alerts:</strong> Live updates on matches you predicted.</li>
                <li>💬 <strong>Chat Mentions:</strong> Stay connected with room members.</li>
              </ul>
            </div>
            <div className="hero-notif-actions">
              <button className="hero-notif-btn hero-notif-btn--cancel" onClick={() => setShowNotificationModal(false)}>
                Not Now
              </button>
              <button className="hero-notif-btn hero-notif-btn--allow" onClick={handleRequestPermission}>
                Allow notifications
              </button>
            </div>
          </div>
        </div>
      )}

      {league && (
        <div className="hero-competition">
          {league.logo && (
            <img
              src={league.logo}
              alt={league.name}
              className="hero-comp-logo"
              width={16}
              height={16}
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          )}
          <span className="hero-comp-name">{league.name}</span>
          {league.round && <span className="hero-comp-round">- {league.round}</span>}
          {isNS && fixture?.fixture?.date && (
            <span className="hero-comp-time">
              -{" "}
              {new Date(fixture.fixture.date).toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
      )}

      <div className="hero-fade" />
    </div>
  );
}
