import { Link } from "react-router-dom";
import "./DemoBanner.css";

interface DemoBannerProps {
  onDismiss?: () => void;
}

const DemoBanner = ({ onDismiss }: DemoBannerProps) => {
  return (
    <div className="demo-banner">
      <div className="demo-banner-content">
        <span className="demo-icon">🎮</span>
        <span className="demo-text">
          <strong>Demo Mode Active</strong> — Your progress won't be saved.{" "}
          <Link to="/login" className="demo-link">
            Sign in
          </Link>{" "}
          to keep your game data.
        </span>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="demo-dismiss"
            aria-label="Dismiss banner"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

export default DemoBanner;
