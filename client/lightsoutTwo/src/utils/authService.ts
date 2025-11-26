// Google OAuth service with PKCE flow
import { generateCodeVerifier, generateCodeChallenge } from "./pkce";

const CLIENT_ID =
  "31909128751-l9873ethj8n1412p60ips9qarp7km4fd.apps.googleusercontent.com";
const REDIRECT_URI = "https://ttlo-two.web.app/auth/callback";
const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";

export async function startGoogleLogin() {
  const code_verifier = generateCodeVerifier();
  const code_challenge = await generateCodeChallenge(code_verifier);
  const state = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Store verifier + state in sessionStorage (temporary, single-tab)
  sessionStorage.setItem("pkce_code_verifier", code_verifier);
  sessionStorage.setItem("oauth_state", state);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "openid profile email",
    state,
    code_challenge: code_challenge,
    code_challenge_method: "S256",
    access_type: "offline",
    prompt: "consent",
  });

  window.location.href = `${AUTH_ENDPOINT}?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
  code_verifier: string
) {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    code_verifier,
  });

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Token exchange failed: ${resp.status} ${text}`);
  }
  return resp.json();
}
