import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Profile.css";

interface User {
  id: number;
  displayName: string;
  email: string;
  createdAt?: string;
}

interface Stats {
  currentLevel: number;
  bestTime: string;
  averageMoves: number;
  winRate: number;
}

const Profile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userRes = await axios.get("http://localhost:8000/api/user");
        setUser(userRes.data);

        const statsRes = await axios.get(
          `http://localhost:8000/api/stats/${userRes.data.id}`
        );
        setStats(statsRes.data);
      } catch (error) {
        console.log(error);
        navigate("/login");
      }
    };

    fetchData();
  }, [navigate]);

  const handleLogout = async () => {
    await axios.post("http://localhost:8000/auth/logout");
    navigate("/login");
  };

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <div className="avatar">
            {user?.displayName.charAt(0).toUpperCase()}
          </div>
          <h1>{user?.displayName}</h1>
          <p className="email">{user?.email}</p>
          <button onClick={handleLogout} className="logout-button">
            Sign out
          </button>
        </div>

        <div className="stats-section">
          <h2>Game Statistics</h2>
          <div className="stats-grid">
            <StatCard
              title="Current Level"
              value={stats?.currentLevel || 1}
              icon="🏆"
            />
            <StatCard
              title="Best Time"
              value={stats?.bestTime || "0:00"}
              icon="⏱️"
            />
            <StatCard
              title="Avg Moves"
              value={stats?.averageMoves || 0}
              icon="🔢"
            />
            <StatCard
              title="Win Rate"
              value={`${stats?.winRate || 0}%`}
              icon="📈"
            />
          </div>
        </div>

        <div className="game-actions">
          <button className="action-button primary">Continue Game</button>
          <button className="action-button secondary">New Game</button>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: string;
}) => (
  <div className="stat-card">
    <div className="stat-icon">{icon}</div>
    <h3>{title}</h3>
    <p>{value}</p>
  </div>
);

export default Profile;
