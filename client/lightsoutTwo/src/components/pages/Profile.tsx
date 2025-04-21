import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "./Client";
import Thumbnail from "../Thumbnail/Thumbnail";
import "./Profile.css";

interface User {
  id: number;
  display_name: string;
  email: string;
  avatar?: string;
}

interface GameStats {
  current_level: number;
  best_combination: number[];
  saved_maps: string[];
  min_moves?: { [level: number]: number };
}

const Profile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<GameStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true; // Flag to track if effect is still active

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get("/profile", {
          withCredentials: true,
          signal: controller.signal
        });
        
        // Only update state if component is still mounted
        if (isActive) {
          // Log the actual response to help with debugging
          console.log("Profile response:", response.data);
          
          // Match the server response structure
          if (response.data.user) {
            setUser(response.data.user);
          }
          
          if (response.data.stats) {
            setStats(response.data.stats);
          }
          
          setLoading(false);
        }
      } catch (error: any) {
        // Only handle errors if component is still mounted and error isn't from cancellation
        if (isActive && error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') {
          console.error("Failed to fetch profile:", error);
          navigate("/login");
        }
      }
    };

    fetchProfile();

    // Cleanup function
    return () => {
      isActive = false; // Mark effect as inactive
      controller.abort(); // Abort any in-flight requests
    };
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await apiClient.post("/auth/logout");
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Get the last 5 completed levels based on best_combination
  const getLastFiveCompletedLevels = () => {
    if (!stats?.best_combination) return [];
    
    // Filter out levels with no completion data
    const completedLevels = stats.best_combination
      .map((moves, index) => ({ level: index + 1, moves }))
      .filter(item => item.moves !== null && item.moves > 0);
    
    // Return the last 5 levels
    return completedLevels.slice(-5);
  };

  // Calculate progress percent with base and bonuses
  const calculateProgress = (): string => {
    if (!stats) return '0%';
    // Fallback to original level-based if no min_moves data
    if (!stats.min_moves) {
      return `${Math.min(100, ((stats.current_level || 1) / 25) * 100)}%`;
    }
    let percent = 0;
    stats.best_combination.forEach((moves, idx) => {
      if (moves != null && moves > 0) {
        const level = idx + 1;
        // 1% for completion
        percent += 1;
        const minMove = stats.min_moves?.[level];
        if (minMove != null) {
          const diff = moves - minMove;
          if (diff === 0) percent += 3;
          else if (diff <= 2) percent += 2;
          else if (diff <= 4) percent += 1;
        }
      }
    });
    return `${Math.min(percent, 100)}%`;
  };

  if (loading) {
    return <div className="loading">Loading profile...</div>;
  }

  const lastFiveLevels = getLastFiveCompletedLevels();

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
              title="Completed Levels"
              value={lastFiveLevels.length}
              icon="🎮"
            />
            <button
              className="stat-card saved-maps-button"
              onClick={() => navigate('/saved-maps')}
            >
              <div className="stat-icon">🗺️</div>
              <h3>Saved Maps</h3>
              <p>{stats?.saved_maps?.length || 0}</p>
            </button>
            <StatCard
              title="Progress"
              value={calculateProgress()}
              icon="📈"
            />
          </div>
        </div>

        <div className="recent-levels-section">
          <h2>Recent Level Completions</h2>
          {lastFiveLevels.length > 0 ? (
            <div className="levels-table">
              <div className="levels-header">
                <div className="level-cell">Level</div>
                <div className="level-cell">Moves</div>
                <div className="level-cell">Action</div>
              </div>
              {lastFiveLevels.map((levelData) => (
                <div key={levelData.level} className="level-row">
                  <div className="level-cell">Level {levelData.level}</div>
                  <div className="level-cell">{levelData.moves} moves</div>
                  <div className="level-cell">
                    <button 
                      className="level-action-button"
                      onClick={() => navigate(`/game/${levelData.level}`)}
                    >
                      Replay
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No completed levels yet. Start playing to see your stats!</p>
          )}
        </div>

        <div className="saved-maps-section">
          <h2>Saved Maps</h2>
          {stats?.saved_maps?.length ? (
            <div className="saved-maps-grid">
              {stats.saved_maps.map((map: any, idx: number) => (
                <Thumbnail
                  key={idx}
                  pattern={map.pattern}
                  onClick={() => navigate(`/game/custom/${map.level}`)}
                />
              ))}
            </div>
          ) : (
            <p>No saved maps yet.</p>
          )}
        </div>

        <div className="game-actions">
          <button 
            className="action-button primary" 
            onClick={() => navigate(`/game/${stats?.current_level || 1}`, { 
              state: { level: stats?.current_level || 1 }
            })}
          >
            Continue Game
          </button>
          <button 
            className="action-button secondary"
            onClick={() => navigate('/game/1', { state: { level: 1 }})}
          >
            New Game
          </button>
          <button 
            className="action-button create"
            onClick={() => navigate('/create-puzzle')}
          >
            Create Puzzle
          </button>
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
