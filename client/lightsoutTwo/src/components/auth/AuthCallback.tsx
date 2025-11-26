import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { exchangeCodeForTokens } from "../../utils/authService";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Get code and state from URL
        const code = searchParams.get("code");
        const returnedState = searchParams.get("state");
        const storedState = sessionStorage.getItem("oauth_state");
        const verifier = sessionStorage.getItem("pkce_code_verifier");

        // Validate state and code
        if (!code) {
          navigate("/login?error=no_code", { replace: true });
          return;
        }

        if (!verifier) {
          navigate("/login?error=no_verifier", { replace: true });
          return;
        }

        if (returnedState !== storedState) {
          navigate("/login?error=state_mismatch", { replace: true });
          return;
        }

        // Exchange code for tokens with Google
        const tokenResponse = await exchangeCodeForTokens(code, verifier);
        const { id_token, access_token } = tokenResponse;

        if (!id_token) {
          throw new Error("No id_token received from Google");
        }

        // Send id_token to backend for verification and JWT generation
        const backendResp = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_token, access_token }),
        });

        if (!backendResp.ok) {
          const errorData = await backendResp
            .json()
            .catch(() => ({ error: "Backend verification failed" }));
          throw new Error(errorData.error || "Backend verification failed");
        }

        const { token: appJwt } = await backendResp.json();

        // Store app JWT token
        localStorage.setItem("authToken", appJwt);

        // Cleanup session storage
        sessionStorage.removeItem("pkce_code_verifier");
        sessionStorage.removeItem("oauth_state");

        // Redirect to profile
        navigate("/profile", { replace: true });
      } catch (err) {
        console.error("OAuth callback error:", err);
        const errorMsg =
          err instanceof Error ? err.message : "token_exchange_failed";
        setError(errorMsg);
        setTimeout(() => {
          navigate(`/login?error=${encodeURIComponent(errorMsg)}`, {
            replace: true,
          });
        }, 2000);
      }
    })();
  }, [navigate, searchParams]);

  return (
    <div className="loading">
      {error ? (
        <>
          <p style={{ color: "red" }}>Authentication failed: {error}</p>
          <p>Redirecting to login...</p>
        </>
      ) : (
        <p>Completing authentication...</p>
      )}
    </div>
  );
};

export default AuthCallback;
