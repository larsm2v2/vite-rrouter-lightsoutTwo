import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "./Client";
import "./Profile.css";

interface User {
  id: number;
  display_name: string;
  email: string;
  createdAt?: string;
}

interface Stats {
  current_level: number;
  bestTime: string;
  averageMoves: number;
  winRate: number;
}

const Profile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await apiClient.get("/profile");
        const { userData, statsData } = res.data;
        setUser(userData);
        setStats(statsData);
      } catch (error) {
        console.log(error);
        navigate("/login");
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await apiClient.post("/auth/logout");
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <div className="avatar">
            {user?.display_name.charAt(0).toUpperCase()}
          </div>
          <h1>{user?.display_name}</h1>
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
              value={stats?.current_level || 1}
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
