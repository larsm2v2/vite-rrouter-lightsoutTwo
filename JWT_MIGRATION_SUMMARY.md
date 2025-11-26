# JWT Authentication Implementation Summary

## 🎯 Changes Made

Successfully migrated from cookie-based sessions to JWT (JSON Web Token) authentication to fix Firebase Hosting → Cloud Run cookie forwarding issues.

## 📁 New Files Created

### Server:

1. **`server/src/utils/jwt.ts`** - JWT token generation and verification utilities
2. **`server/src/middleware/auth.ts`** - JWT authentication middleware

### Client:

1. **`client/lightsoutTwo/src/components/auth/AuthCallback.tsx`** - OAuth callback handler

## 🔧 Modified Files

### Server (`server/src/`):

1. **`routes/auth.routes.ts`**

   - Google OAuth callback now returns JWT token in redirect URL
   - Login endpoint returns JWT token in response
   - Register endpoint returns JWT token in response
   - Demo login returns JWT token in response
   - Logout simplified (client-side token removal)

2. **`app.ts`**

   - Added `authenticateJWT` middleware globally
   - Added `requireAuth` middleware to protected routes
   - Removed session-based auth checks
   - Simplified auth check endpoint (uses JWT)
   - Updated all protected routes to use `requireAuth`

3. **`.env`**
   - Added `JWT_SECRET` environment variable

### Client (`client/lightsoutTwo/src/`):

1. **`components/pages/Client.tsx`**

   - Added JWT token to Authorization header in all requests
   - Clear token on 401 responses

2. **`components/pages/Login.tsx`**

   - Store JWT token from login response
   - Store JWT token from register response
   - Store JWT token from demo login response

3. **`components/pages/Profile.tsx`**

   - Clear JWT token on logout

4. **`App.tsx`**
   - Added `/auth/callback` route for OAuth redirects

## 🔄 Authentication Flow

### Before (Cookie-based):

```
1. User logs in → Server creates session → Sets cookie
2. Client makes request → Browser sends cookie
3. Server validates session from cookie
❌ Problem: Firebase Hosting doesn't forward cookies to Cloud Run
```

### After (JWT-based):

```
1. User logs in → Server generates JWT token → Returns in response
2. Client stores token in localStorage
3. Client adds token to Authorization header on each request
4. Server validates JWT token from header
✅ Works: Headers are properly forwarded through Firebase Hosting
```

## 🔐 Security Notes

- JWT tokens expire after 7 days
- Tokens are signed with `JWT_SECRET`
- Tokens include: userId, email, displayName
- Server validates token signature and expiry
- Invalid tokens are rejected (user must re-login)

## 📋 Deployment Checklist

### Cloud Run Environment Variables:

```bash
JWT_SECRET=<64-char-hex-secret>  # Add this!
SESSION_SECRET=<existing>
NODE_ENV=production
GOOGLE_CALLBACK_URL=https://ttlo-two.web.app/api/auth/google/callback
CLIENT_URL=https://ttlo-two.web.app
# DO NOT set COOKIE_DOMAIN
```

### Testing Steps:

1. **Test Local Development:**

   ```powershell
   # Server
   cd server
   npm run dev

   # Client (new terminal)
   cd client/lightsoutTwo
   npm run dev
   ```

2. **Test OAuth Flow:**

   - Click "Continue with Google"
   - Should redirect to `/auth/callback?token=<jwt>`
   - Token stored in localStorage
   - Redirected to `/profile`

3. **Test Local Login:**

   - Enter email/password
   - Should receive token in response
   - Navigate to `/profile`

4. **Test Demo Mode:**

   - Click "Try Demo"
   - Should receive token
   - Navigate to `/profile`

5. **Test Protected Routes:**

   - All `/api/*` calls should include `Authorization: Bearer <token>` header
   - Check browser DevTools → Network → Request Headers

6. **Test Logout:**
   - Click logout
   - Token removed from localStorage
   - Redirected to `/login`
   - Can't access protected routes

## 🚀 Production Deployment

1. **Deploy Backend:**

   ```powershell
   cd server
   npm run build
   # Deploy to Cloud Run with JWT_SECRET env var
   ```

2. **Deploy Frontend:**

   ```powershell
   cd client/lightsoutTwo
   npm run build
   npx firebase-tools deploy --project "ttlo-two" --only hosting
   ```

3. **Verify:**
   - Test Google OAuth login
   - Check Cloud Run logs for "User from JWT" in auth check debug
   - Verify token in browser localStorage
   - Test protected routes work

## 🐛 Debug Commands

### Check if token is being sent:

```javascript
// In browser console
console.log("Token:", localStorage.getItem("authToken"));
```

### Check Cloud Run logs:

```powershell
gcloud logging read 'resource.type=cloud_run_revision AND resource.labels.service_name=ttlotwopointzero' --limit=50 --project=ttlo-two
```

Look for:

```
=== AUTH CHECK DEBUG ===
Authorization header: Bearer eyJhbG...
User from JWT: { id: 1, email: '...', display_name: '...' }
========================
```

## ✅ Benefits of JWT

1. **Works with Firebase Hosting** - Headers are properly forwarded
2. **Stateless** - No server-side session storage needed
3. **Scalable** - Works across multiple server instances
4. **Mobile-friendly** - Easy to use in mobile apps
5. **Modern** - Industry standard for API authentication

## 🔄 Backward Compatibility

- Session middleware still active for Passport OAuth flow
- OAuth callback still uses sessions temporarily (during Google redirect)
- After OAuth completes, switches to JWT
- All other endpoints use JWT exclusively
