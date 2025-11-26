# OAuth Authentication Issues - Root Cause Analysis

## 🔴 Problem Summary

The `/api/auth/check` endpoint returns `{authenticated: false}` even after successful OAuth login.

## 🚨 **PRODUCTION ISSUE - CRITICAL**

**Log Analysis from Cloud Run (Nov 26, 2025 03:40:32 UTC):**

```
=== AUTH CHECK DEBUG ===
Cookies: [Object: null prototype] {}    ← NO COOKIE RECEIVED!
SessionID: Qrk7fKr7_PlN3B-yoxXCMjpP-jinFG0j
Session: Session { cookie: { domain: '.ttlo-two.web.app' } }
User: undefined
IsAuthenticated: false
========================
```

**Root Cause:** Firebase Hosting is **NOT forwarding session cookies** to Cloud Run backend!

## 🔍 Root Causes Identified

### 1. **Cookie Domain Mismatch in Development** ✅ FIXED

**Issue:** Your local `.env` had `COOKIE_DOMAIN=.ttlo-two.web.app` which prevented cookies from being set on `localhost`.

**Why it failed:**

- Browser won't set a cookie for domain `.ttlo-two.web.app` when the page is on `localhost`
- Session cookie was never stored, so subsequent requests had no session

**Fix Applied:** Removed `COOKIE_DOMAIN` from development `.env` file.

---

### 2. **SameSite Cookie Policy** ✅ FIXED

**Issue:** Session cookie had `sameSite: "lax"` which doesn't work for cross-origin OAuth flows.

**Why it failed:**

- OAuth redirect from Google → Your server creates session
- Server redirects to client app
- Client makes API request → Cookie not sent due to `sameSite: lax` on cross-site request

**Fix Applied:**

- Production: `sameSite: "none"` (with `secure: true`)
- Development: `sameSite: "lax"` (same-origin on localhost)

---

### 3. **Incorrect Cookie Name in Logout** ✅ FIXED

**Issue:** Logout route tried to clear `sessionId` but actual cookie name is `connect.sid`.

**Fix Applied:** Updated both logout endpoints to clear `connect.sid` with proper options.

---

### 4. **OAuth Callback URL Mismatch** ✅ FIXED

**Issue:** Google callback was set to `/auth/google/callback` but your app routes everything through `/api/*`.

**Why it matters:**

- Must match exactly what's configured in Google Console
- Changed to `/api/auth/google/callback`

**Action Required:** Update your Google Cloud Console OAuth settings:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to APIs & Services → Credentials
3. Edit your OAuth 2.0 Client ID
4. Update Authorized redirect URIs:
   - Development: `http://localhost:8080/api/auth/google/callback`
   - Production: `https://ttlo-two.web.app/api/auth/google/callback`

---

### 5. **Firebase Hosting Cookie Forwarding Issue** 🔴 **CRITICAL - IN PRODUCTION**

**Issue:** Firebase Hosting does NOT forward cookies to Cloud Run by default!

**Evidence from logs:**

- Request comes through Firebase Hosting (`via: '1.1 Firebase Hosting'`)
- `cookie header: undefined`
- `Cookies: [Object: null prototype] {}` (completely empty!)
- Session created with `domain: '.ttlo-two.web.app'`
- But browser never receives or sends the cookie

**Why this happens:**
Firebase Hosting → Cloud Run proxy strips cookies for security. This is a **known Firebase limitation**.

**SOLUTION:** Remove `COOKIE_DOMAIN` from production environment!

For production (Cloud Run), set these environment variables:

```bash
# DO NOT SET COOKIE_DOMAIN - let it default to the request origin
NODE_ENV=production
SESSION_SECRET=<your-secret>
GOOGLE_CALLBACK_URL=https://ttlo-two.web.app/api/auth/google/callback
CLIENT_URL=https://ttlo-two.web.app
```

The session cookie will be set for `ttlo-two.web.app` (no leading dot), which works with Firebase Hosting proxy.

---

## 🧪 Testing Steps

### Local Development Test:

1. Restart your server (to pick up new .env changes)

   ```powershell
   cd server
   npm run dev
   ```

2. Restart your client

   ```powershell
   cd client/lightsoutTwo
   npm run dev
   ```

3. Open browser DevTools → Application → Cookies
4. Navigate to `http://localhost:5173/login`
5. Click "Continue with Google"
6. After redirect, check for `connect.sid` cookie on `localhost`
7. Try accessing `/profile` - should stay authenticated

### Debug Commands:

```powershell
# Check what cookies are being set
curl -i http://localhost:8080/api/auth/check

# With cookie (replace <session-cookie> with actual value)
curl -i -H "Cookie: connect.sid=<session-cookie>" http://localhost:8080/api/auth/check
```

---

## 📊 Architecture Flow

### Current Setup (Development):

```
Browser (localhost:5173)
    ↓ Click "Login with Google"
Server (localhost:8080/api/auth/google)
    ↓ Redirect to Google
Google OAuth
    ↓ Redirect back with code
Server (/api/auth/google/callback)
    ↓ Creates session, sets cookie
    ↓ Redirect to CLIENT_URL/profile
Browser (localhost:5173/profile)
    ↓ ProtectedRoute checks auth
    ↓ GET /api/auth/check (with cookie)
Server validates session
    ↓ Returns {authenticated: true, user: {...}}
```

### Production Setup:

```
Browser (ttlo-two.web.app)
    ↓ All requests proxied through Firebase Hosting
Firebase Hosting
    ↓ /api/* → Cloud Run
Cloud Run (backend)
    ↓ Same origin = cookies work!
```

---

## 🔧 Configuration Summary

### Development (.env files):

**server/.env:**

```env
CLIENT_URL=http://localhost:5173
NODE_ENV=development
GOOGLE_CALLBACK_URL=http://localhost:8080/api/auth/google/callback
# NO COOKIE_DOMAIN in development
```

**client/lightsoutTwo/.env:**

```env
VITE_API_URL=http://localhost:8080/api
# NO COOKIE_DOMAIN in development
```

### Production (Environment Variables):

**Cloud Run Environment:**

```env
COOKIE_DOMAIN=.ttlo-two.web.app
NODE_ENV=production
GOOGLE_CALLBACK_URL=https://ttlo-two.web.app/api/auth/google/callback
CLIENT_URL=https://ttlo-two.web.app
SESSION_SECRET=<64-char-hex>
```

**Firebase Hosting (.env.production):**

```env
VITE_API_URL=/api  # Same-origin via proxy
```

---

## 🎯 Next Steps

1. ✅ Restart both server and client
2. ✅ Test local OAuth flow
3. ⚠️ Update Google Console OAuth redirect URIs
4. ⚠️ Verify Cloud Run environment variables
5. ⚠️ Test production deployment

---

## 🐛 Enhanced Debugging

I've added comprehensive logging to `/api/auth/check`. Check your server console for:

```
=== AUTH CHECK DEBUG ===
Headers: {...}
Cookies: {...}
SessionID: ...
Session: {...}
User: {...}
IsAuthenticated: true/false
========================
```

This will show exactly what the server receives on each request.

---

## 📝 Additional Notes

### Why Same-Origin Matters:

- Browsers are **very strict** about cross-origin cookies
- Even with `credentials: 'include'` and `sameSite: 'none'`, some browsers block third-party cookies
- Firebase Hosting proxy makes everything same-origin = no cookie issues!

### Cookie Security Levels:

- **Development:** `secure: false`, `sameSite: 'lax'` (localhost)
- **Production:** `secure: true`, `sameSite: 'none'` (HTTPS required)

### Session Store:

- **Development:** PostgreSQL (persist across restarts)
- **Test:** MemoryStore (faster, isolated)
- **Production:** PostgreSQL (persistent, scalable)
