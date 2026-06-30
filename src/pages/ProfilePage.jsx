import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logoutUser } from '../services/authService';
import toast from 'react-hot-toast';
import './ProfilePage.css';

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const initials = user?.displayName
    ? user.displayName.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const handleLogout = async () => {
    await logoutUser();
    toast.success('Signed out');
    navigate('/login');
  };

  const handleDownloadApk = () => {
    toast.success('Android APK download started');
  };

  return (
    <div className="profile-root">
      <div className="profile-hero">
        <div className="profile-avatar">{initials}</div>
        <h1 className="profile-name">{user?.displayName || 'Player'}</h1>
        <p className="profile-email">{user?.email}</p>
      </div>

      <div className="profile-section">
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
      </div>

      <p className="profile-version">Football Prediction League v1.0</p>
    </div>
  );
}
