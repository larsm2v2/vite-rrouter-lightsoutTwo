import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");

    if (token) {
      // Store the JWT token in localStorage
      localStorage.setItem("authToken", token);

      // Redirect to profile
      navigate("/profile", { replace: true });
    } else {
      // No token - redirect to login with error
      navigate("/login?error=auth_failed", { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div className="loading">
      <p>Completing authentication...</p>
    </div>
  );
};

export default AuthCallback;
