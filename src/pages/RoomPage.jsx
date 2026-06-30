import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getRoom, getRoomMembers, leaveRoom } from '../services/roomService';
import { getTournamentMatches } from '../services/matchService';
import { getRoomPredictions, getUserPredictions, savePrediction } from '../services/predictionService';
import { getRoomLeaderboard } from '../services/leaderboardService';
import HeroMatch from '../components/HeroMatch';
import PredictionCard from '../components/PredictionCard';
import MiniLeaderboard from '../components/MiniLeaderboard';
import ProgressCard from '../components/ProgressCard';
import RoomInfoSheet from '../components/RoomInfoSheet';
import ChatWindow from '../components/Chat/ChatWindow';
import './RoomPage.css';

const TABS = ['Predict', 'Standings', 'Results', 'Members', 'Chat'];

export default function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [room,        setRoom]        = useState(null);
  const [fixtures,    setFixtures]    = useState([]);
  const [predictions, setPredictions] = useState({});
  const [roomPredictions, setRoomPredictions] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);
  const [members,     setMembers]     = useState([]);
  const [liveMatch,   setLiveMatch]   = useState(null);
  const [nextMatch,   setNextMatch]   = useState(null);
  const [tab,         setTab]         = useState('Predict');
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState({});
  const [infoOpen,    setInfoOpen]    = useState(false);

  // ── Load all room data ──────────────────────────────
  useEffect(() => {
    if (!roomId || !user) return;
    let cancelled = false;
    let firstLoad = true;

    const load = async () => {
      if (firstLoad) setLoading(true);
      try {
        const [roomData, fixtureData, predData, roomPredData, lbData, memberData] = await Promise.all([
          getRoom(roomId),
          getTournamentMatches(roomId),
          getUserPredictions(user.uid, roomId),
          getRoomPredictions(roomId),
          getRoomLeaderboard(roomId),
          getRoomMembers(roomId),
        ]);

        if (cancelled) return;

        setRoom(roomData);
        setLeaderboard(lbData || []);
        setMembers(memberData || []);

        const predMap = {};
        (predData || []).forEach((p) => {
          predMap[p.fixtureId] = {
            winner: p.prediction,
            homeGoals: p.predictedHomeGoals ?? 0,
            awayGoals: p.predictedAwayGoals ?? 0,
          };
        });
        setPredictions(predMap);

        const memberNameById = {};
        (memberData || []).forEach((member) => {
          memberNameById[member.uid] = member.displayName || member.name || 'Player';
        });

        const roomPredMap = {};
        (roomPredData || []).forEach((prediction) => {
          const fixtureKey = String(prediction.fixtureId);

          if (!roomPredMap[fixtureKey]) {
            roomPredMap[fixtureKey] = [];
          }

          roomPredMap[fixtureKey].push({
            userId: prediction.userId,
            displayName: memberNameById[prediction.userId] || 'Player',
            winner: prediction.prediction,
            homeGoals: prediction.predictedHomeGoals ?? 0,
            awayGoals: prediction.predictedAwayGoals ?? 0,
          });
        });
        setRoomPredictions(roomPredMap);

        const now = new Date();
        const predictionCutoff = new Date(now.getTime() + 34 * 60 * 60 * 1000);
        const matches = (fixtureData || []).slice().sort(
          (a, b) => new Date(a.fixture?.date) - new Date(b.fixture?.date)
        );
        const liveStatuses = ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE'];
        const liveMatches = matches.filter(f => liveStatuses.includes(f.fixture?.status?.short));
        const live = liveMatches[0] || null;
        const upcoming = matches.filter(f => {
          const kickoff = new Date(f.fixture?.date);
          return (
            f.fixture?.status?.short === 'NS' &&
            kickoff >= now &&
            kickoff <= predictionCutoff
          );
        });
        const next = upcoming[0] || matches.find(f => {
          const kickoff = new Date(f.fixture?.date);
          return f.fixture?.status?.short === 'NS' && kickoff >= now;
        });
        const activeFixtures = [...liveMatches, ...upcoming].filter(
          (fixture, index, allFixtures) =>
            allFixtures.findIndex(f => f.fixture?.id === fixture.fixture?.id) === index
        );

        setLiveMatch(live || null);
        setNextMatch(next || null);
        setFixtures(activeFixtures);
      } finally {
        if (!cancelled) {
          setLoading(false);
          firstLoad = false;
        }
      }
    };

    load();
    const refreshId = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(refreshId);
    };
  }, [roomId, user]);

  // ── Predict ─────────────────────────────────────────
const handlePredict = useCallback(
  async (
    fixtureId,
    outcome,
    predictedHomeGoals,
    predictedAwayGoals
  ) => {
    setSaving((s) => ({
      ...s,
      [fixtureId]: true,
    }));

    try {
      await savePrediction(
        user.uid,
        roomId,
        fixtureId,
        outcome,
        predictedHomeGoals,
        predictedAwayGoals
      );

      setPredictions((p) => ({
        ...p,
        [fixtureId]: {
          winner: outcome,
          homeGoals: predictedHomeGoals,
          awayGoals: predictedAwayGoals,
        },
      }));

      setRoomPredictions((current) => {
        const fixtureKey = String(fixtureId);
        const existing = current[fixtureKey] || [];
        const nextPrediction = {
          userId: user.uid,
          displayName: user.displayName || 'You',
          winner: outcome,
          homeGoals: predictedHomeGoals,
          awayGoals: predictedAwayGoals,
        };

        return {
          ...current,
          [fixtureKey]: [
            ...existing.filter((prediction) => prediction.userId !== user.uid),
            nextPrediction,
          ],
        };
      });
    } finally {
      setSaving((s) => ({
        ...s,
        [fixtureId]: false,
      }));
    }
  },
  [user, roomId]
);

  const handleLeaveRoom = useCallback(async () => {
    try {
      await leaveRoom(roomId, user.uid);
      toast.success('You left the room');
      navigate('/');
    } catch (error) {
      console.error('Leave room failed:', error);
      toast.error('Could not leave room');
    }
  }, [navigate, roomId, user]);

  // ── Hero fixture = live first, then next upcoming ──
  const heroFixture = liveMatch || nextMatch;
  const heroPrediction = heroFixture ? predictions[String(heroFixture.fixture.id)] : null;

  // ── Prediction count stats ──────────────────────────
  const openFixtures = fixtures.filter(f => f.fixture?.status?.short === 'NS' && new Date(f.fixture?.date) > new Date());
  const totalFixtures  = openFixtures.length;
  const predCount      = openFixtures.filter(f => predictions[String(f.fixture.id)]).length;

  // ── Loading skeletons ────────────────────────────────
  if (loading) return <RoomSkeleton />;

  return (
    <div className="room-root">
      {/* ── Hero ── */}
      <HeroMatch
        fixture={heroFixture}
        roomName={room?.name}
        memberCount={members.length}
        userPrediction={heroPrediction}
        onOpenRoomInfo={() => setInfoOpen(true)}
      />

      <RoomInfoSheet
        open={infoOpen}
        room={room}
        members={members}
        onClose={() => setInfoOpen(false)}
        onLeaveRoom={handleLeaveRoom}
      />

      {/* ── Tab bar ── */}
      <div className="room-tabs" role="tablist">
        {TABS.map(t => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={`room-tab ${tab === t ? 'room-tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="room-content">

        {tab === 'Predict' && (
          <div className="animate-fade-up">
            {liveMatch && (
              <div className="room-live-strip">Live now: {liveMatch.teams?.home?.name} vs {liveMatch.teams?.away?.name}</div>
            )}
            <ProgressCard completed={predCount} total={totalFixtures} />

            {fixtures.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon">📅</div>
                <div className="empty-state__title">No live or upcoming fixtures</div>
                <div className="empty-state__subtitle">Check back soon — new matches will appear here automatically.</div>
              </div>
            ) : (
              <>
                <p className="section-label" style={{ marginTop: 20 }}>
                  Live and upcoming matches
                </p>
                <div className="prediction-list">
                  {fixtures.map((fixture, i) => (
                    <PredictionCard
                      key={fixture.fixture.id}
                      fixture={fixture}
                      selected={predictions[String(fixture.fixture.id)]}
                      saving={saving[String(fixture.fixture.id)]}
                      onPredict={handlePredict}
                      animationDelay={i * 60}
                      roomPredictions={roomPredictions[String(fixture.fixture.id)] || []}
                    />
                  ))}
                </div>
              </>
            )}

            {leaderboard.length > 0 && (
              <>
                <p className="section-label" style={{ marginTop: 24 }}>
                  Room standings · top 5
                </p>
                <MiniLeaderboard entries={leaderboard.slice(0, 5)} currentUserId={user.uid} />
              </>
            )}
          </div>
        )}

        {tab === 'Standings' && (
          <FullLeaderboard entries={leaderboard} currentUserId={user.uid} />
        )}

        {tab === 'Results' && (
          <RecentResults roomId={roomId} currentUserId={user.uid} predictions={predictions} />
        )}

        {tab === 'Members' && (
          <MembersList members={members} leaderboard={leaderboard} currentUserId={user.uid} />
        )}

        {tab === 'Chat' && (
          <ChatWindow roomId={roomId} user={user} />
        )}
      </div>
    </div>
  );
}

/* ─── Full Leaderboard Tab ──────────────────────────────────────── */
function FullLeaderboard({ entries, currentUserId }) {
  if (!entries.length) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">🏆</div>
        <div className="empty-state__title">No scores yet</div>
        <div className="empty-state__subtitle">Make your predictions to climb the table.</div>
      </div>
    );
  }

  const top3 = entries.slice(0, 3);
  const totalPoints = entries.reduce((sum, entry) => sum + Number(entry.points || 0), 0);
  const totalPredictions = entries.reduce((sum, entry) => sum + Number(entry.totalPredictions || 0), 0);
  const roomAccuracy = entries.length
    ? Math.round(entries.reduce((sum, entry) => sum + Number(entry.accuracy || 0), 0) / entries.length)
    : 0;

  return (
    <div className="leaderboard-dashboard animate-fade-up">
      <div className="leaderboard-heading">
        <div>
          <p className="section-label">Standings</p>
          <h2>Leaderboard</h2>
        </div>
        <span>{entries.length} players</span>
      </div>

      <div className="leaderboard-summary">
        <div className="leaderboard-summary-card">
          <strong>{entries.length}</strong>
          <span>Total players</span>
        </div>
        <div className="leaderboard-summary-card">
          <strong>{totalPredictions}</strong>
          <span>Total predictions</span>
        </div>
        <div className="leaderboard-summary-card leaderboard-summary-card--wide">
          <strong>{totalPoints}</strong>
          <span>Room points · {roomAccuracy}% average accuracy</span>
        </div>
      </div>

      <div className="top-player-grid">
        {top3.map((entry, index) => (
          <div
            key={entry.userId}
            className={`top-player-card ${index === 0 ? 'top-player-card--first' : ''} ${entry.userId === currentUserId ? 'top-player-card--you' : ''}`}
          >
            <div className="top-player-rank">{index + 1}</div>
            <InitialsAvatar name={entry.displayName} size="md" />
            <div className="top-player-info">
              <strong className="truncate">{entry.displayName || 'Player'}</strong>
              <span>{entry.userId === currentUserId ? 'You' : `Player ${index + 1}`}</span>
            </div>
            <div className="top-player-stats">
              <div>
                <span>Correct</span>
                <strong>{entry.correctPredictions ?? 0}</strong>
              </div>
              <div>
                <span>Predictions</span>
                <strong>{entry.totalPredictions ?? 0}</strong>
              </div>
              <div>
                <span>Points</span>
                <strong>{entry.points ?? 0}</strong>
              </div>
            </div>
            <div className="top-player-chips">
              <span>{entry.currentStreak ?? 0} streak</span>
              <span>{entry.exactScoreAccuracy ?? 0}% exact</span>
            </div>
          </div>
        ))}
      </div>

      <div className="leaderboard-table">
        <div className="leaderboard-table-title">Global Ranking</div>
        {entries.map((entry, i) => (
          <div
            key={entry.userId}
            className={`lb-row ${entry.userId === currentUserId ? 'lb-row--you' : ''} animate-fade-up`}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className={`lb-rank ${i < 3 ? 'lb-rank--top' : ''}`}>{i + 1}</div>
            <InitialsAvatar name={entry.displayName} size="md" />
            <div className="lb-info">
              <div className="lb-name truncate">
                {entry.displayName || 'Player'}
                {entry.userId === currentUserId && <span className="lb-you-tag">You</span>}
              </div>
              <div className="lb-sub">
                {entry.currentStreak ?? 0} streak · {entry.accuracy ?? 0}% acc · {entry.exactScoreAccuracy ?? 0}% exact
              </div>
            </div>
            <div className="lb-pts-col">
              <div className="lb-pts">{entry.points ?? 0}</div>
              {entry.movement > 0  && <div className="lb-movement lb-movement--up">↑ {entry.movement}</div>}
              {entry.movement < 0  && <div className="lb-movement lb-movement--down">↓ {Math.abs(entry.movement)}</div>}
              {entry.movement === 0 && <div className="lb-movement lb-movement--same">—</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const toScoreNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const hasScore = (score) =>
  score &&
  toScoreNumber(score.home) !== null &&
  toScoreNumber(score.away) !== null;

const getFixtureScoreBreakdown = (fixture) => {
  const fullTime =
    fixture.displayScore?.fullTime ||
    fixture.score?.regularTime ||
    fixture.goals ||
    fixture.score?.fullTime;
  const extraTime = fixture.displayScore?.afterExtraTime || fixture.score?.extraTime;
  const penalties = fixture.displayScore?.penalties || fixture.score?.penalties;
  const duration = fixture.displayScore?.duration || fixture.score?.duration;

  const ft = hasScore(fullTime)
    ? {
        home: toScoreNumber(fullTime.home),
        away: toScoreNumber(fullTime.away),
      }
    : { home: 0, away: 0 };

  const extraTimeHome = hasScore(extraTime) ? toScoreNumber(extraTime.home) : 0;
  const extraTimeAway = hasScore(extraTime) ? toScoreNumber(extraTime.away) : 0;
  const extraTimeChangedScore = extraTimeHome !== 0 || extraTimeAway !== 0;
  const hasExtraTime =
    hasScore(extraTime) &&
    (duration === 'EXTRA_TIME' || (duration === 'PENALTY_SHOOTOUT' && extraTimeChangedScore));
  const afterEt = hasExtraTime
    ? {
        home: ft.home + extraTimeHome,
        away: ft.away + extraTimeAway,
      }
    : null;

  const pens = hasScore(penalties)
    ? {
        home: toScoreNumber(penalties.home),
        away: toScoreNumber(penalties.away),
      }
    : null;

  return { ft, afterEt, pens };
};

/* ─── Recent Results Tab ────────────────────────────────────────── */
function RecentResults({ roomId, currentUserId, predictions }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Import dynamically to avoid circular deps
    import('../services/matchService').then(({ getRecentResults }) => {
      if (!getRecentResults) { setLoading(false); return; }
      getRecentResults(roomId)
        .then(r => setResults(r || []))
        .finally(() => setLoading(false));
    });
  }, [roomId]);

  if (loading) return <ResultsSkeleton />;

  // Only finished matches, sorted newest first
  const finished = results
    .filter(f => f.fixture?.status?.short === 'FT')
    .slice()
    .sort((a, b) => new Date(b.fixture?.date) - new Date(a.fixture?.date));

  if (!finished.length) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">📊</div>
        <div className="empty-state__title">No results yet</div>
        <div className="empty-state__subtitle">Completed matches will appear here.</div>
      </div>
    );
  }

  return (
    <div className="results-list animate-fade-up">
      {finished.map(fixture => {
        const fid        = fixture.fixture?.id;
        const scoreBreakdown = getFixtureScoreBreakdown(fixture);
        const homeGoals  = scoreBreakdown.ft.home;
        const awayGoals  = scoreBreakdown.ft.away;
        const outcome    = homeGoals > awayGoals ? 'home' : awayGoals > homeGoals ? 'away' : 'draw';
        const homeName   = fixture.teams?.home?.name;
        const awayName   = fixture.teams?.away?.name;
        const myPred = predictions[fid];
        const hasVoted =
          myPred?.winner === 'home' ||
          myPred?.winner === 'away';

        const winnerCorrect =
          hasVoted &&
          myPred?.winner === outcome;

        const scoreCorrect =
          winnerCorrect &&
          Number(myPred?.homeGoals) === homeGoals &&
          Number(myPred?.awayGoals) === awayGoals;

        const earnedPoints =
          winnerCorrect
            ? scoreCorrect
              ? 1.5
              : 1
            : 0;

        let statusClass = 'result-card--novote';

        if (hasVoted) {
          statusClass = winnerCorrect
            ? 'result-card--correct'
            : 'result-card--wrong';
        }

        return (
          <div key={fid} className={`result-card ${statusClass}`}>
            <div className="result-comp">{fixture.league?.name}</div>
            <div className="result-teams">
              <span className="result-team truncate">{homeName}</span>
              <span className="result-score">
                {homeGoals} – {awayGoals}
                <small>FT</small>
              </span>
              <span className="result-team truncate" style={{ textAlign: 'right' }}>{awayName}</span>
            </div>

            {(scoreBreakdown.afterEt || scoreBreakdown.pens) && (
              <div className="result-score-details">
                {scoreBreakdown.afterEt && (
                  <span>
                    {scoreBreakdown.afterEt.home} – {scoreBreakdown.afterEt.away} after ET
                  </span>
                )}
                {scoreBreakdown.pens && (
                  <span>
                    {scoreBreakdown.pens.home} – {scoreBreakdown.pens.away} pens
                  </span>
                )}
              </div>
            )}

            <div className="result-vote">
              {hasVoted ? (
                <span className="result-vote-label">
                  You voted: {myPred?.winner === 'home' ? homeName : awayName}
                </span>
              ) : (
                <span className="result-vote-label result-vote-label--none">
                  You voted: —
                </span>
              )}
            </div>

            {hasVoted && (
              <div className="result-predicted-score">
                Predicted Score: {myPred?.homeGoals} – {myPred?.awayGoals}
              </div>
            )}

           <div className="result-footer">

  {!hasVoted ? (

    <span className="result-badge result-badge--none">
      ⚪ Not Voted
    </span>

  ) : winnerCorrect ? (

    <span className="result-badge result-badge--correct">

      ✅ Winner Correct

      {scoreCorrect && (
        <div className="result-score-bonus">
          🎯 Exact Score Bonus
        </div>
      )}

      <span className="result-badge-points">
        +{earnedPoints} Points
      </span>

    </span>

  ) : (

    <span className="result-badge result-badge--wrong">

      ❌ Wrong

      <span className="result-badge-points">
        0 Points
      </span>

    </span>

  )}

  <span className="result-date">
    {fixture.fixture?.date
      ? new Date(fixture.fixture.date).toLocaleDateString(
          "en-GB",
          {
            day: "numeric",
            month: "short",
          }
        )
      : ""}
  </span>

</div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Members Tab ───────────────────────────────────────────────── */
function MembersList({ members, leaderboard, currentUserId }) {
  const lbMap = {};
  leaderboard.forEach(e => { lbMap[e.userId] = e; });

  return (
    <div className="members-list animate-fade-up">
      {members.map((member, i) => {
        const lb = lbMap[member.uid];
        return (
          <div key={member.uid} className={`member-row ${member.uid === currentUserId ? 'member-row--you' : ''} animate-fade-up`} style={{ animationDelay: `${i * 40}ms` }}>
            <InitialsAvatar name={member.displayName} size="md" />
            <div className="member-info">
              <div className="member-name">
                {member.displayName || 'Player'}
                {member.uid === currentUserId && <span className="lb-you-tag">You</span>}
              </div>
              <div className="member-sub">Joined {member.joinedAt ? new Date(member.joinedAt?.toDate?.() || member.joinedAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '—'}</div>
            </div>
            {lb && (
              <div className="member-stats">
                <div className="member-pts">{lb.points ?? 0} pts</div>
                <div className="member-acc">{lb.accuracy ?? 0}% acc</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Initials Avatar ───────────────────────────────────────────── */
function InitialsAvatar({ name, size = 'md' }) {
  const initials = name
    ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';
  return <div className={`avatar avatar-${size}`}>{initials}</div>;
}

/* ─── Skeletons ─────────────────────────────────────────────────── */
function RoomSkeleton() {
  return (
    <div className="room-root">
      <div className="skeleton" style={{ height: 220, borderRadius: 0, margin: 0 }} />
      <div className="room-tabs">
        {TABS.map(t => <div key={t} className="room-tab">{t}</div>)}
      </div>
      <div className="room-content">
        {[1,2,3].map(i => (
          <div key={i} className="card" style={{ marginBottom: 12 }}>
            <div className="skeleton" style={{ height: 16, width: '40%', marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 56, marginBottom: 12 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <div className="skeleton" style={{ height: 36, flex: 1 }} />
              <div className="skeleton" style={{ height: 36, flex: 1 }} />
              <div className="skeleton" style={{ height: 36, flex: 1 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div>
      {[1,2,3].map(i => (
        <div key={i} className="card" style={{ marginBottom: 10 }}>
          <div className="skeleton" style={{ height: 14, width: '30%', marginBottom: 10 }} />
          <div className="skeleton" style={{ height: 20, marginBottom: 10 }} />
          <div className="skeleton" style={{ height: 12, width: '50%' }} />
        </div>
      ))}
    </div>
  );
}
