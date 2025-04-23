import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "./Client";
import Thumbnail from "../Thumbnail/Thumbnail";
import "./SavedMaps.css";

interface SavedMap {
  level: number;
  pattern: number[];
  minimumMoves: number;
}

const SavedMaps = () => {
  const [maps, setMaps] = useState<SavedMap[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMap, setSelectedMap] = useState<SavedMap | null>(null);
  const navigate = useNavigate();

  // Delete the currently selected saved map
  const handleDelete = async () => {
    if (!selectedMap) return;
    try {
      await apiClient.delete(`/profile/saved-maps/${selectedMap.level}`, { withCredentials: true });
      setMaps(maps.filter(m => m.level !== selectedMap.level));
      setSelectedMap(null);
    } catch (err: any) {
      console.error('Failed to delete saved map:', err);
      setError('Failed to delete puzzle');
    }
  };

  useEffect(() => {
    const fetchSavedMaps = async () => {
      try {
        const response = await apiClient.get("/profile", { withCredentials: true });
        setMaps(response.data.stats.saved_maps);
      } catch (err: any) {
        console.error("Failed to fetch saved maps:", err);
        setError("Failed to load saved maps.");
      } finally {
        setLoading(false);
      }
    };
    fetchSavedMaps();
  }, []);

  if (loading) {
    return <div className="loading">Loading saved maps...</div>;
  }
  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="saved-maps-container">
      <h1>Your Saved Maps</h1>
      {maps.length > 0 ? (
        <>
          <div className="saved-maps-grid">
            {maps.map((map, idx) => (
              <div
                key={idx}
                className={`saved-map-card ${selectedMap?.level === map.level ? 'selected' : ''}`}
                onClick={() => setSelectedMap(map)}
              >
                <Thumbnail pattern={map.pattern} />
                <div className="saved-map-level">Level {map.level}</div>
                <div className="saved-map-moves">Min Moves: {map.minimumMoves}</div>
              </div>
            ))}
          </div>

          <div className="map-actions">
            <button className="back-button" onClick={() => navigate('/profile')}>
              Back to Profile
            </button>
            <button
              className="play-button"
              disabled={!selectedMap}
              onClick={() => selectedMap && navigate(`/game/custom/${selectedMap.level}`)}
            >
              Play Selected Puzzle
            </button>
            <button
              className="delete-button"
              disabled={!selectedMap}
              onClick={handleDelete}
            >
              Delete Puzzle
            </button>
          </div>
        </>
      ) : (
        <p>No saved maps yet.</p>
      )}
    </div>
  );
};

export default SavedMaps; 