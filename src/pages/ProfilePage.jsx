import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { logoutUser } from '../services/authService';
import { calculateUserStats, saveFavoriteTeam } from '../services/statisticsService';
import './ProfilePage.css';

const FAVORITE_TEAMS = [
  { name: 'Brazil', logo: 'https://crests.football-data.org/764.svg' },
  { name: 'Argentina', logo: 'https://crests.football-data.org/762.png' },
  { name: 'France', logo: 'https://crests.football-data.org/773.svg' },
  { name: 'Germany', logo: 'https://crests.football-data.org/759.svg' },
  { name: 'Spain', logo: 'https://crests.football-data.org/760.svg' },
  { name: 'England', logo: 'https://crests.football-data.org/770.svg' },
  { name: 'Portugal', logo: 'https://crests.football-data.org/765.png' },
  { name: 'Netherlands', logo: 'https://crests.football-data.org/8601.svg' },
  { name: 'Japan', logo: 'https://crests.football-data.org/766.svg' },
  { name: 'India', logo: '' },
];

const UPI_URI = 'upi://pay?pa=8079073389@pthdfc&pn=Akshat%20Vyas&cu=INR';
const PAYTM_UPI_URI = 'paytmmp://pay?pa=8079073389@pthdfc&pn=Akshat%20Vyas&cu=INR';

const formatDate = (date) => {
  if (!date) return 'Not available';
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatPoints = (points) => Number(points || 0).toFixed(points % 1 ? 1 : 0);

const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingTeam, setSavingTeam] = useState(false);
  const [activeTab, setActiveTab] = useState('football');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [modalSportFilter, setModalSportFilter] = useState('all');
  const [modalPage, setModalPage] = useState(1);
  const modalPageSize = 10;

  useEffect(() => {
    if (!user?.uid) return;

    let cancelled = false;

    const loadProfile = async () => {
      setLoading(true);
      try {
        const data = await calculateUserStats(user.uid);
        if (!cancelled) setProfileData(data);
      } catch (error) {
        console.error('Profile stats failed:', error);
        toast.error('Could not load profile stats');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const initials = useMemo(
    () => getInitials(user?.displayName || user?.email),
    [user?.displayName, user?.email]
  );

  const stats = profileData?.stats;
  const achievements = profileData?.achievements;
  const history = profileData?.history || [];
  const favoriteTeam = stats?.favoriteTeam;

  const activeStats = useMemo(() => {
    if (activeTab === 'football') return profileData?.footballStats;
    if (activeTab === 'cricket') return profileData?.cricketStats;
    return profileData?.stats;
  }, [activeTab, profileData]);

  const statCards = useMemo(() => {
    const cards = [
      { label: 'Completed Predictions', value: activeStats?.scoredPredictions ?? 0 },
      { label: 'Correct Winners', value: activeStats?.correctWinnerPredictions ?? 0 },
    ];
    if (activeTab !== 'cricket') {
      cards.push({ label: 'Exact Scores', value: activeStats?.exactScorePredictions ?? 0 });
    }
    cards.push(
      { label: 'Accuracy', value: `${activeStats?.accuracy ?? 0}%` },
      { label: 'Total Points', value: formatPoints(activeStats?.totalPoints ?? 0) },
      { label: 'Current Streak', value: activeStats?.currentStreak ?? 0 },
      { label: 'Best Streak', value: activeStats?.bestStreak ?? 0 }
    );
    return cards;
  }, [activeStats, activeTab]);

  const completedHistory = useMemo(() => {
    return history.filter((p) => p.isFinished);
  }, [history]);

  const displayedHistory = useMemo(() => {
    return completedHistory.slice(0, 4);
  }, [completedHistory]);

  const filteredModalHistory = useMemo(() => {
    if (modalSportFilter === 'all') return completedHistory;
    return completedHistory.filter((p) => p.sport === modalSportFilter);
  }, [completedHistory, modalSportFilter]);

  const paginatedModalHistory = useMemo(() => {
    const start = (modalPage - 1) * modalPageSize;
    return filteredModalHistory.slice(start, start + modalPageSize);
  }, [filteredModalHistory, modalPage]);

  const totalModalPages = useMemo(() => {
    return Math.ceil(filteredModalHistory.length / modalPageSize) || 1;
  }, [filteredModalHistory]);

  const handleLogout = async () => {
    await logoutUser();
    toast.success('Signed out');
    navigate('/login');
  };

  const handleDownloadApk = () => {
    toast.success('Android APK download started');
  };

  const handleFavoriteTeamChange = async (event) => {
    const selected = FAVORITE_TEAMS.find((team) => team.name === event.target.value);
    if (!selected || !user?.uid) return;

    setSavingTeam(true);
    try {
      await saveFavoriteTeam(user.uid, selected);
      setProfileData((current) => ({
        ...current,
        stats: {
          ...current.stats,
          favoriteTeam: selected,
        },
      }));
      toast.success('Favorite team saved');
    } catch (error) {
      console.error('Favorite team failed:', error);
      toast.error('Could not save favorite team');
    } finally {
      setSavingTeam(false);
    }
  };

  const handleSupportClick = () => {
    window.location.href = PAYTM_UPI_URI;

    setTimeout(() => {
      window.location.href = UPI_URI;
      toast('Opening payment for 8079073389@pthdfc.');
    }, Capacitor.isNativePlatform() ? 900 : 500);
  };

  if (loading) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="profile-root">
      <section className="profile-hero-card animate-fade-up">
        <div className="profile-avatar-xl">
          {user?.photoURL ? <img src={user.photoURL} alt="" /> : <span>{initials}</span>}
        </div>
        <div className="profile-hero-info">
          <p className="section-label">Player profile</p>
          <h1>{user?.displayName || 'Player'}</h1>
          <p>{user?.email}</p>
        </div>
        <div className="profile-hero-meta">
          <div>
            <span>Joined</span>
            <strong>{formatDate(stats?.joinDate)}</strong>
          </div>
          <div>
            <span>Rooms</span>
            <strong>{stats?.totalRoomsJoined ?? 0}</strong>
          </div>
        </div>
      </section>

      <section className="profile-section">
        <div className="profile-stats-header">
          <p className="section-label">Prediction statistics</p>
          <div className="stats-tabs">
            <button
              className={`stats-tab ${activeTab === 'football' ? 'stats-tab--active' : ''}`}
              onClick={() => setActiveTab('football')}
              type="button"
            >
              Football
            </button>
            <button
              className={`stats-tab ${activeTab === 'cricket' ? 'stats-tab--active' : ''}`}
              onClick={() => setActiveTab('cricket')}
              type="button"
            >
              Cricket
            </button>
          </div>
        </div>
        <div className="profile-stat-grid">
          {statCards.map((card, index) => (
            <div
              className="profile-stat-card animate-fade-up"
              key={card.label}
              style={{ animationDelay: `${index * 35}ms` }}
            >
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="profile-section">
        <p className="section-label">Favorite team</p>
        <div className="profile-favorite-card">
          <div className="profile-team-preview">
            <div className="profile-team-logo">
              {favoriteTeam?.logo ? <img src={favoriteTeam.logo} alt="" /> : <span>FT</span>}
            </div>
            <div>
              <strong>{favoriteTeam?.name || 'Choose your team'}</strong>
              <span>{savingTeam ? 'Saving...' : 'Club or national team'}</span>
            </div>
          </div>
          <select
            value={favoriteTeam?.name || ''}
            onChange={handleFavoriteTeamChange}
            disabled={savingTeam}
            aria-label="Choose favorite team"
          >
            <option value="" disabled>
              Select team
            </option>
            {FAVORITE_TEAMS.map((team) => (
              <option key={team.name} value={team.name}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="profile-section">
        <div className="profile-section-title">
          <p className="section-label">Achievements</p>
          <span>
            {achievements?.unlockedCount ?? 0}/{achievements?.totalCount ?? 0} unlocked
          </span>
        </div>
        <div className="profile-progress">
          <div style={{ width: `${achievements?.completionPercentage ?? 0}%` }} />
        </div>
        <div className="achievement-grid">
          {(achievements?.all || []).map((achievement) => (
            <div
              key={achievement.id}
              className={`achievement-card ${achievement.unlocked ? 'achievement-card--unlocked' : ''}`}
            >
              <div className="achievement-icon">{achievement.icon}</div>
              <div>
                <strong>{achievement.title}</strong>
                <span>{achievement.description}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="profile-section">
        <p className="section-label">Prediction history</p>
        <div className="history-list">
          {displayedHistory.length === 0 ? (
            <div className="profile-empty">No completed predictions yet</div>
          ) : (
            displayedHistory.map((prediction) => (
              <div className="history-card" key={prediction.id}>
                <div className="history-top">
                  <strong>{prediction.fixture}</strong>
                  <span>{formatDate(prediction.date)}</span>
                </div>
                <div className="history-score">
                  <span>
                    Predicted {prediction.predictedHomeGoals}-{prediction.predictedAwayGoals}
                  </span>
                  <span>
                    Actual{' '}
                    {prediction.isFinished
                      ? `${prediction.actualHomeGoals}-${prediction.actualAwayGoals}`
                      : 'Pending'}
                  </span>
                </div>
                <div className="history-bottom">
                  <span
                    className={`history-badge ${
                      prediction.correctWinner
                        ? 'history-badge--correct'
                        : 'history-badge--wrong'
                    }`}
                  >
                    {prediction.correctWinner
                      ? prediction.exactScore
                        ? 'Exact score'
                        : 'Winner correct'
                      : 'Incorrect'}
                  </span>
                  <strong>{formatPoints(prediction.points)} pts</strong>
                </div>
              </div>
            ))
          )}
        </div>
        {completedHistory.length > 4 && (
          <button
            className="view-all-predictions-btn"
            onClick={() => {
              setModalSportFilter('all');
              setModalPage(1);
              setShowHistoryModal(true);
            }}
          >
            View All Predictions →
          </button>
        )}
      </section>

      {showHistoryModal && (
        <div className="history-modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="history-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="history-modal-header">
              <h2>Prediction History</h2>
              <button className="history-modal-close" onClick={() => setShowHistoryModal(false)}>×</button>
            </div>
            
            <div className="history-modal-filters">
              <button
                className={`modal-filter-btn ${modalSportFilter === 'all' ? 'active' : ''}`}
                onClick={() => { setModalSportFilter('all'); setModalPage(1); }}
              >
                All
              </button>
              <button
                className={`modal-filter-btn ${modalSportFilter === 'football' ? 'active' : ''}`}
                onClick={() => { setModalSportFilter('football'); setModalPage(1); }}
              >
                ⚽ Football
              </button>
              <button
                className={`modal-filter-btn ${modalSportFilter === 'cricket' ? 'active' : ''}`}
                onClick={() => { setModalSportFilter('cricket'); setModalPage(1); }}
              >
                🏏 Cricket
              </button>
            </div>

            <div className="history-modal-list">
              {paginatedModalHistory.length === 0 ? (
                <div className="profile-empty">No predictions found</div>
              ) : (
                paginatedModalHistory.map((prediction) => (
                  <div className="history-card" key={prediction.id}>
                    <div className="history-top">
                      <strong>{prediction.fixture}</strong>
                      <span className="history-sport-badge">{prediction.sport}</span>
                      <span>{formatDate(prediction.date)}</span>
                    </div>
                    <div className="history-score">
                      <span>
                        Predicted {prediction.predictedHomeGoals}-{prediction.predictedAwayGoals}
                      </span>
                      <span>
                        Actual {prediction.actualHomeGoals}-{prediction.actualAwayGoals}
                      </span>
                    </div>
                    <div className="history-bottom">
                      <span
                        className={`history-badge ${
                          prediction.correctWinner
                            ? 'history-badge--correct'
                            : 'history-badge--wrong'
                        }`}
                      >
                        {prediction.correctWinner
                          ? prediction.exactScore
                            ? 'Exact score'
                            : 'Winner correct'
                          : 'Incorrect'}
                      </span>
                      <strong>{formatPoints(prediction.points)} pts</strong>
                    </div>
                  </div>
                ))
              )}
            </div>

            {totalModalPages > 1 && (
              <div className="history-modal-pagination">
                <button
                  disabled={modalPage === 1}
                  onClick={() => setModalPage((p) => Math.max(1, p - 1))}
                >
                  ← Prev
                </button>
                <span>Page {modalPage} of {totalModalPages}</span>
                <button
                  disabled={modalPage === totalModalPages}
                  onClick={() => setModalPage((p) => Math.min(totalModalPages, p + 1))}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <section className="profile-section">
        <p className="section-label">Account</p>
        <div className="profile-list">
          <div className="profile-row" onClick={() => navigate('/create')}>
            <span className="profile-row-icon">+</span>
            <span className="profile-row-label">Create a room</span>
            <span className="profile-row-arrow">&gt;</span>
          </div>

          <div className="profile-row" onClick={() => navigate('/join')}>
            <span className="profile-row-icon">#</span>
            <span className="profile-row-label">Join a room</span>
            <span className="profile-row-arrow">&gt;</span>
          </div>

          <a
            className="profile-row profile-row--download"
            href="/downloads/football-talks.apk"
            download="Football Talks.apk"
            onClick={handleDownloadApk}
          >
            <span className="profile-row-icon">APK</span>
            <span className="profile-row-label">
              <span>Download Android app</span>
              <small>Install Football Talks on your phone</small>
            </span>
            <span className="profile-row-pill">Android</span>
          </a>

          <div className="profile-row profile-row--danger" onClick={handleLogout}>
            <span className="profile-row-icon">!</span>
            <span className="profile-row-label">Sign out</span>
          </div>
        </div>
      </section>

      <section className="profile-section">
        <div className="support-card">
          <p className="section-label">Support</p>
          <h2>Support Football Talks</h2>
          <p>If this app made your matchdays more fun, you can support future development.</p>
          <button type="button" onClick={handleSupportClick}>
            Buy Me a Coffee
          </button>
        </div>
      </section>

      <p className="profile-version">Football Talks v1.0</p>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="profile-root">
      <section className="profile-hero-card">
        <div className="skeleton profile-avatar-xl" />
        <div className="profile-hero-info">
          <div className="skeleton" style={{ width: 110, height: 12, marginBottom: 10 }} />
          <div className="skeleton" style={{ width: 180, height: 26, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: 220, height: 14 }} />
        </div>
      </section>
      <section className="profile-section">
        <div className="profile-stat-grid">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div className="profile-stat-card" key={item}>
              <div className="skeleton" style={{ width: '70%', height: 12 }} />
              <div className="skeleton" style={{ width: 46, height: 28, marginTop: 12 }} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
