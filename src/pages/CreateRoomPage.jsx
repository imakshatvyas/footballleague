import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createRoom } from '../services/roomService';
import toast from 'react-hot-toast';
import './CreateJoinPage.css';

export default function CreateRoomPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [sport, setSport] = useState('football');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const { id, code } = await createRoom(user.uid, user.displayName, name.trim(), sport);
      toast.success(`Room created! Code: ${code}`);
      navigate(`/room/${id}`);
    } catch (err) {
      toast.error(err.message || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cj-root">
      <button className="cj-back" onClick={() => navigate(-1)}>← Back</button>
      <div className="cj-card">
        <div className="cj-icon">🏟️</div>
        <h1 className="cj-title">Create a room</h1>
        <p className="cj-sub">Give your league a name and share the code with friends.</p>
        <form onSubmit={handleCreate} className="cj-form">
          <input
            className="cj-input"
            type="text"
            placeholder="e.g. The Lads · 2026"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={40}
            required
            autoFocus
          />

          <div className="sport-selector">
            <label className="sport-title">Select Sport</label>
            <div className="sport-options">
              <button
                type="button"
                className={`sport-card ${sport === 'football' ? 'active' : ''}`}
                onClick={() => setSport('football')}
              >
                <div className="sport-emoji">⚽</div>
                <div className="sport-name">Football</div>
                <div className="sport-desc">Predict goals & winner</div>
              </button>
              <button
                type="button"
                className={`sport-card ${sport === 'cricket' ? 'active' : ''}`}
                onClick={() => setSport('cricket')}
              >
                <div className="sport-emoji">🏏</div>
                <div className="sport-name">Cricket</div>
                <div className="sport-desc">Predict match winner</div>
              </button>
            </div>
          </div>

          <button className="btn btn-primary btn-lg" type="submit" disabled={loading || !name.trim()}>
            {loading ? <span className="login-spinner" /> : 'Create room'}
          </button>
        </form>
      </div>
    </div>
  );
}
