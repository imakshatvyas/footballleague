import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserRooms } from '../services/roomService';
import './DashboardPage.css';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rooms,   setRooms]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getUserRooms(user.uid)
      .then(r => {
        setRooms(r);
        if (r.length === 1) navigate(`/room/${r[0].id}`, { replace: true });
      })
      .finally(() => setLoading(false));
  }, [user, navigate]);

  if (loading) return <DashboardSkeleton />;

  if (rooms.length === 0) return <EmptyDashboard />;

  return (
    <div className="dash-root">
      <div className="dash-header">
        <div>
          <p className="dash-greeting">Welcome back</p>
          <h1 className="dash-name">{user?.displayName?.split(' ')[0] || 'Player'} 👋</h1>
        </div>
      </div>

      <p className="section-label" style={{ padding: '0 16px', marginBottom: 12 }}>Your rooms</p>

      <div className="dash-rooms">
        {rooms.map((room, i) => (
          <div
            key={room.id}
            className="room-card animate-fade-up"
            style={{ animationDelay: `${i * 60}ms` }}
            onClick={() => navigate(`/room/${room.id}`)}
          >
            <div className="room-card-icon">{room.sport === 'cricket' ? '🏏' : '⚽'}</div>
            <div className="room-card-info">
              <div className="room-card-name">
                {room.name}
                <span className={`room-sport-badge room-sport-badge--${room.sport || 'football'}`}>
                  {room.sport === 'cricket' ? 'Cricket' : 'Football'}
                </span>
              </div>
              <div className="room-card-meta">{room.memberIds?.length || 1} members · Code: {room.code}</div>
            </div>
            <div className="room-card-arrow">›</div>
          </div>
        ))}
      </div>

      <div className="dash-actions">
        <button className="btn btn-primary" onClick={() => navigate('/create')}>+ Create room</button>
        <button className="btn btn-secondary" onClick={() => navigate('/join')}>Join room</button>
      </div>
    </div>
  );
}

function EmptyDashboard() {
  const navigate = useNavigate();
  return (
    <div className="dash-root">
      <div className="dash-empty">
        <div className="dash-empty-ball">🏆</div>
        <h2 className="dash-empty-title">Start your league</h2>
        <p className="dash-empty-sub">Create a room and invite friends to compete on every match.</p>
        <div className="dash-actions" style={{ marginTop: 0 }}>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/create')}>Create a room</button>
          <button className="btn btn-secondary btn-lg" onClick={() => navigate('/join')}>Join a room</button>
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="dash-root" style={{ padding: 16 }}>
      <div className="skeleton" style={{ height: 22, width: '40%', marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 32, width: '60%', marginBottom: 24 }} />
      {[1,2].map(i => (
        <div key={i} className="skeleton" style={{ height: 68, borderRadius: 14, marginBottom: 10 }} />
      ))}
    </div>
  );
}
