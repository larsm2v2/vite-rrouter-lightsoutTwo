# TTLO (Lights Out) - Application Architecture Documentation

**Project:** TTLO Two (Lights Out Game)  
**Version:** 2.0  
**Last Updated:** November 26, 2025  
**Production URL:** https://ttlo-two.web.app  
**Cloud Run Service:** ttlotwopointzero (us-central1)

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Infrastructure Architecture](#infrastructure-architecture)
4. [Application Architecture](#application-architecture)
5. [Authentication Flow](#authentication-flow)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Deployment Pipeline](#deployment-pipeline)
9. [Security Considerations](#security-considerations)
10. [Environment Variables](#environment-variables)

---

## System Overview

TTLO Two is a full-stack web application implementing the classic "Lights Out" puzzle game with multiplayer capabilities, user authentication, and persistent game progress. The application uses a modern React frontend deployed on Firebase Hosting and a Node.js/Express backend running on Google Cloud Run with PostgreSQL database storage.

### Key Features

- Google OAuth 2.0 authentication
- Local email/password registration and login
- Demo mode for quick access
- Classic puzzle levels with minimum move tracking
- Custom puzzle creation and sharing
- User progress persistence
- Game statistics and leaderboards

---

## Technology Stack

### Frontend

```json
{
  "framework": "React 19.0.0",
  "router": "React Router 7.4.0",
  "http-client": "Axios 1.8.4",
  "build-tool": "Vite 6.2.0",
  "language": "TypeScript 5.7.2",
  "testing": "Playwright 1.52.0"
}
```

**Key Libraries:**

- `@vitejs/plugin-react-swc` - Fast React refresh with SWC
- `eslint` - Code linting
- `playwright` - E2E testing

### Backend

```json
{
  "runtime": "Node.js 20 (Alpine)",
  "framework": "Express 4.18.2",
  "language": "TypeScript 5.3.3",
  "database": "PostgreSQL (Neon)",
  "orm": "TypeORM 0.3.22"
}
```

**Key Libraries:**

- **Authentication:** `passport 0.7.0`, `passport-google-oidc 0.1.0`, `jsonwebtoken 9.0.2`
- **Session Management:** `express-session 1.18.1`, `connect-pg-simple 10.0.0`
- **Security:** `helmet 7.1.0`, `cors 2.8.5`, `express-rate-limit 7.0.0`
- **Database:** `pg 8.14.1`
- **Testing:** `jest 29.7.0`, `supertest 6.3.4`

### Infrastructure

- **Hosting:** Firebase Hosting
- **Backend:** Google Cloud Run (containerized)
- **Database:** Neon PostgreSQL (serverless)
- **CI/CD:** Google Cloud Build
- **Containerization:** Docker (multi-stage builds)

---

## Infrastructure Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         End Users                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTPS
                             │
                    ┌────────▼─────────┐
                    │  Firebase Hosting │
                    │  (ttlo-two.web.app)│
                    └────────┬──────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
         Static Files    /api/**       Fallback
              │          Rewrite        to /index.html
              │              │              │
              ▼              │              ▼
       React SPA             │         Client-Side
       (dist/)               │           Routing
                             │
                    ┌────────▼─────────────────────┐
                    │   Google Cloud Run            │
                    │   Service: ttlotwopointzero   │
                    │   Region: us-central1         │
                    │   Runtime: Node.js 20 Alpine  │
                    └────────┬─────────────────────┘
                             │
                ┌────────────┼────────────┐
                │            │            │
                │            │            │
         ┌──────▼──────┐ ┌──▼────┐ ┌────▼─────┐
         │   Session    │ │ Google │ │   Neon   │
         │   Store      │ │ OAuth  │ │PostgreSQL│
         │ (PostgreSQL) │ │  API   │ │ Database │
         └──────────────┘ └────────┘ └──────────┘
                │                          │
                └──────────────┬───────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Database Pool     │
                    │   Connection: PG    │
                    │   SSL: Required     │
                    └─────────────────────┘
```

### Request Flow

1. **Client Request** → User accesses `https://ttlo-two.web.app`
2. **Firebase Hosting** → Serves static React app from `dist/` folder
3. **Client-Side Routing** → React Router handles `/login`, `/profile`, `/game` routes
4. **API Requests** → All `/api/**` requests proxied to Cloud Run
5. **Cloud Run** → Express server processes requests
6. **Database** → PostgreSQL queries via connection pool
7. **Response** → JSON data sent back through the chain

---

## Application Architecture

### Frontend Structure

```
client/lightsoutTwo/
├── src/
│   ├── App.tsx                    # Root component with routing
│   ├── main.tsx                   # Application entry point
│   ├── components/
│   │   ├── auth/
│   │   │   ├── AuthCallback.tsx   # OAuth callback handler
│   │   │   └── ProtectedRoute.tsx # Route authentication wrapper
│   │   ├── pages/
│   │   │   ├── Login.tsx          # Login/register page
│   │   │   ├── Profile.tsx        # User profile & stats
│   │   │   ├── Game.tsx           # Main game interface
│   │   │   ├── CreatePuzzle.tsx   # Custom puzzle creator
│   │   │   ├── SavedMaps.tsx      # Saved puzzles list
│   │   │   └── Client.tsx         # Axios client configuration
│   │   └── utils/                 # Utility functions
│   └── vite-env.d.ts              # TypeScript declarations
├── public/                        # Static assets
├── firebase.json                  # Firebase Hosting config
├── vite.config.ts                 # Vite build config
└── package.json
```

### Backend Structure

```
server/
├── src/
│   ├── app.ts                     # Main Express application
│   ├── config/
│   │   ├── database.ts            # PostgreSQL connection pool
│   │   ├── schema.ts              # Database schema initialization
│   │   └── auth/
│   │       ├── passport.ts        # Passport.js OAuth config
│   │       ├── sessions.ts        # Session middleware config
│   │       └── password.ts        # Password hashing utilities
│   ├── middleware/
│   │   └── auth.ts                # JWT authentication middleware
│   ├── routes/
│   │   ├── auth.routes.ts         # Authentication endpoints
│   │   ├── puzzles.routes.ts      # Puzzle CRUD operations
│   │   └── profile.ts             # User profile endpoints
│   ├── types/
│   │   └── entities/
│   │       └── User.ts            # TypeScript type definitions
│   ├── utils/
│   │   └── jwt.ts                 # JWT token utilities
│   └── tests/                     # Jest test files
├── Dockerfile                     # Multi-stage Docker build
├── tsconfig.json                  # TypeScript config
└── package.json
```

---

## Authentication Flow

### Current Implementation: Hybrid JWT + Session

The application uses a **hybrid authentication approach**:

- **Sessions** for OAuth flow only (temporary)
- **JWT tokens** for all API requests after authentication

#### Google OAuth Flow

```
1. User clicks "Login with Google"
   ↓
2. Frontend redirects to: /api/auth/google
   ↓
3. Passport.js redirects to: https://accounts.google.com
   ↓
4. User authenticates with Google
   ↓
5. Google redirects to: https://ttlo-two.web.app/api/auth/google/callback
   ↓
6. Backend (passport.authenticate):
   - Exchanges code for access token
   - Fetches user profile from Google
   - Creates/updates user in database
   - Creates session (temporary)
   - Generates JWT token
   ↓
7. Backend redirects to: /auth/callback?token=<JWT>
   ↓
8. Frontend (AuthCallback.tsx):
   - Extracts token from URL
   - Stores in localStorage
   - Redirects to /profile
   ↓
9. All subsequent API requests:
   - Include: Authorization: Bearer <JWT>
   - Backend validates JWT
   - Session is destroyed after OAuth
```

#### Local Login Flow

```
1. User submits email/password
   ↓
2. POST /api/auth/login
   ↓
3. Backend:
   - Queries database for user
   - Verifies password hash
   - Generates JWT token
   ↓
4. Response: { token: "<JWT>", user: {...} }
   ↓
5. Frontend stores token in localStorage
   ↓
6. Subsequent requests include Authorization header
```

#### Demo Mode Flow

```
1. User clicks "Demo Mode"
   ↓
2. POST /api/auth/demo
   ↓
3. Backend:
   - Finds/creates demo@portfolio.local user
   - Generates JWT token
   ↓
4. Response: { token: "<JWT>", user: {..., isDemo: true} }
   ↓
5. Frontend stores token and redirects to /game
```

### JWT Token Structure

```json
{
  "userId": 123,
  "email": "user@example.com",
  "displayName": "John Doe",
  "iat": 1700000000,
  "exp": 1700604800,
  "iss": "ttlo-backend"
}
```

**Token Expiry:** 7 days  
**Storage:** localStorage (client)  
**Transport:** Authorization header (Bearer scheme)

---

## Database Schema

### Tables

#### `users`

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  google_sub VARCHAR(255) UNIQUE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password TEXT,                    -- bcrypt hash (for local auth)
  password_salt TEXT,
  display_name VARCHAR(255) NOT NULL,
  avatar TEXT,
  google_access_token TEXT,         -- encrypted
  google_refresh_token TEXT,        -- encrypted
  token_expiry TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `game_stats`

```sql
CREATE TABLE game_stats (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  current_level INTEGER DEFAULT 1,
  best_combination JSONB DEFAULT '[]',  -- Array of best moves per level
  saved_maps JSONB DEFAULT '[]',        -- Custom puzzles
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `classic_puzzles`

```sql
CREATE TABLE classic_puzzles (
  id SERIAL PRIMARY KEY,
  level INTEGER UNIQUE NOT NULL,
  difficulty VARCHAR(50),           -- 'classic', 'hard', 'expert'
  initial_state JSONB NOT NULL,     -- Grid initial state
  min_moves INTEGER NOT NULL,       -- Optimal solution move count
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `session` (connect-pg-simple)

```sql
CREATE TABLE session (
  sid VARCHAR NOT NULL PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX IDX_session_expire ON session (expire);
```

#### `audit_log`

```sql
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(10) NOT NULL,      -- HTTP method
  endpoint TEXT NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  status_code INTEGER,
  metadata JSONB,                   -- params, query, durationMs
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## API Endpoints

### Authentication Routes (`/api/auth`)

| Method | Endpoint           | Auth Required | Description                        |
| ------ | ------------------ | ------------- | ---------------------------------- |
| GET    | `/google`          | No            | Initiate Google OAuth flow         |
| GET    | `/google/callback` | No            | OAuth callback handler             |
| POST   | `/login`           | No            | Email/password login               |
| POST   | `/register`        | No            | Create new account                 |
| POST   | `/demo`            | No            | Demo mode login                    |
| POST   | `/logout`          | No            | Logout (client-side token removal) |
| GET    | `/check`           | No            | Verify authentication status       |

### Profile Routes (`/api/profile`)

| Method | Endpoint | Auth Required | Description                |
| ------ | -------- | ------------- | -------------------------- |
| GET    | `/`      | Yes (JWT)     | Get user profile and stats |

### Game Routes (`/api`)

| Method | Endpoint         | Auth Required | Description              |
| ------ | ---------------- | ------------- | ------------------------ |
| GET    | `/stats/:userId` | Yes           | Get user game statistics |
| POST   | `/game/progress` | Yes           | Update game progress     |
| GET    | `/sample-stats`  | Yes           | Get sample statistics    |

### Puzzle Routes (`/api/puzzles`)

| Method | Endpoint        | Auth Required | Description              |
| ------ | --------------- | ------------- | ------------------------ |
| GET    | `/:level`       | Yes           | Get puzzle by level      |
| POST   | `/`             | Yes           | Create custom puzzle     |
| GET    | `/user/:userId` | Yes           | Get user's saved puzzles |

### System Routes

| Method | Endpoint        | Auth Required | Description           |
| ------ | --------------- | ------------- | --------------------- |
| GET    | `/api/health`   | No            | Health check          |
| GET    | `/api/__routes` | No            | List all routes (dev) |

---

## Deployment Pipeline

### Frontend (Firebase Hosting)

```bash
# Build
cd client/lightsoutTwo
npm run build              # Outputs to dist/

# Deploy
firebase deploy --only hosting --project ttlo-two
```

**Build Process:**

1. TypeScript compilation (`tsc -b`)
2. Vite bundles React app
3. Output: `client/lightsoutTwo/dist/`
4. Firebase uploads to CDN
5. Rewrites configured in `firebase.json`

### Backend (Google Cloud Run)

```bash
# Build & Deploy (from server/)
gcloud run deploy ttlotwopointzero \
  --source . \
  --region=us-central1 \
  --project=ttlo-two \
  --allow-unauthenticated
```

**Build Process:**

1. Cloud Build uses `Dockerfile`
2. Multi-stage build:
   - Stage 1 (builder): `npm ci`, `npm run build`
   - Stage 2 (production): Copy `dist/`, production deps only
3. Container pushed to Artifact Registry
4. Cloud Run deploys new revision
5. Traffic routed to new revision

**Dockerfile Stages:**

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci --no-cache
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app
USER node
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
RUN npm ci --no-cache --omit=dev
EXPOSE 8080
CMD ["node", "dist/app.js"]
```

---

## Security Considerations

### 1. Authentication

- **JWT Tokens:** 7-day expiry, signed with `JWT_SECRET`
- **Password Storage:** bcrypt hashing with salt
- **OAuth:** Secure token exchange with Google
- **Demo Mode:** Isolated account with limited privileges

### 2. Network Security

- **CORS:** Restricted to allowed origins
  - `https://ttlo-two.web.app`
  - `http://localhost:5173` (dev)
  - `http://localhost:5174` (dev)
- **Helmet:** Security headers enabled
  - CSP (Content Security Policy)
  - XSS protection
  - HSTS (HTTPS enforcement)
- **HTTPS:** Enforced in production
- **Rate Limiting:** 60 requests per 15 minutes

### 3. Session Management

- **Storage:** PostgreSQL (connect-pg-simple)
- **Cookies:**
  - `httpOnly: true`
  - `secure: true` (production)
  - `sameSite: 'none'` (production)
  - Domain: Not set (allows cross-domain)
- **Session Duration:** 24 hours

### 4. Database Security

- **Connection:** SSL required (Neon)
- **Connection Pool:** Managed by `pg` library
- **SQL Injection:** Parameterized queries
- **Encryption:** Access tokens encrypted with `DB_ENCRYPTION_KEY`

### 5. API Security

- **Authorization:** JWT validation on protected routes
- **Input Validation:** `express-validator` on endpoints
- **Audit Logging:** All requests logged to `audit_log` table

---

## Environment Variables

### Backend (Cloud Run Secrets)

| Variable                  | Description                  | Example                                             |
| ------------------------- | ---------------------------- | --------------------------------------------------- |
| `NODE_ENV`                | Environment mode             | `production`                                        |
| `PORT`                    | Server port                  | `8080`                                              |
| `CLIENT_URL`              | Frontend URL                 | `https://ttlo-two.web.app`                          |
| `PG_URL`                  | PostgreSQL connection string | `postgresql://user:pass@host/db`                    |
| `SESSION_SECRET`          | Session encryption key       | (64-char hex)                                       |
| `JWT_SECRET`              | JWT signing key              | (64-char hex)                                       |
| `CSRF_SECRET`             | CSRF token key               | (64-char hex)                                       |
| `DB_ENCRYPTION_KEY`       | Token encryption key         | (64-char hex)                                       |
| `GOOGLE_CLIENT_ID`        | OAuth client ID              | `xxx.apps.googleusercontent.com`                    |
| `GOOGLE_CLIENT_SECRET`    | OAuth client secret          | (from Google Console)                               |
| `GOOGLE_CALLBACK_URL`     | OAuth redirect URI           | `https://ttlo-two.web.app/api/auth/google/callback` |
| `GOOGLE_OAUTH_URL`        | Google auth endpoint         | `https://accounts.google.com/o/oauth2/v2/auth`      |
| `GOOGLE_ACCESS_TOKEN_URL` | Google token endpoint        | `https://oauth2.googleapis.com/token`               |
| `GOOGLE_TOKEN_INFO_URL`   | Google token info            | `https://oauth2.googleapis.com/tokeninfo`           |

### Frontend (Vite)

Environment variables are **not used** in production. The frontend communicates with the backend via relative URLs (`/api/**`), which Firebase Hosting rewrites to Cloud Run.

For local development:

```env
VITE_API_URL=http://localhost:8080
```

---

## Firebase Hosting Configuration

**File:** `client/lightsoutTwo/firebase.json`

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "/api/**",
        "run": {
          "serviceId": "ttlotwopointzero",
          "region": "us-central1"
        }
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

**Key Points:**

- All `/api/**` requests proxied to Cloud Run
- All other requests serve `/index.html` (SPA routing)
- Firebase Hosting acts as CDN and reverse proxy

---

## Known Issues & Limitations

### 1. OAuth Cookie Forwarding

**Issue:** Firebase Hosting → Cloud Run proxy strips cookies  
**Impact:** Session-based auth doesn't work  
**Solution:** Implemented JWT authentication (current)

### 2. Google OAuth Redirect URI

**Current Configuration:**

- Callback URL: `https://ttlo-two.web.app/api/auth/google/callback`
- Must match Google Console exactly
- Change requires updating both Cloud Run env and Google Console

### 3. Session Storage

**Status:** Still configured but only used during OAuth flow  
**Future:** Consider removing session storage entirely for fully stateless auth

---

## Development Workflow

### Local Development

```bash
# Terminal 1: Start backend
cd server
npm run dev              # ts-node src/app.ts (port 8080)

# Terminal 2: Start frontend
cd client/lightsoutTwo
npm run dev              # Vite dev server (port 5173)
```

### Testing

```bash
# Backend tests
cd server
npm test                 # Jest

# Frontend E2E tests
cd client/lightsoutTwo
npx playwright test
```

### Database Migrations

```bash
cd server
npm run migrate          # Run db-migration.ts
```

---

## Monitoring & Debugging

### Cloud Run Logs

```bash
# Recent logs
gcloud logging read \
  'resource.type=cloud_run_revision AND resource.labels.service_name=ttlotwopointzero' \
  --limit=100 \
  --project=ttlo-two

# Error logs only
gcloud logging read \
  'resource.type=cloud_run_revision AND resource.labels.service_name=ttlotwopointzero AND severity>=ERROR' \
  --limit=50 \
  --project=ttlo-two
```

### Health Checks

```bash
# Backend health
curl https://ttlotwopointzero-wzvm4gl4aa-uc.a.run.app/api/health

# Frontend
curl https://ttlo-two.web.app
```

---

## Future Improvements

1. **Auth Enhancements**

   - Add refresh token rotation
   - Implement Auth0 or similar OAuth provider
   - Add multi-factor authentication

2. **Performance**

   - Implement Redis for session caching
   - Add CDN caching for static puzzles
   - Optimize database queries with indexes

3. **Features**

   - Real-time multiplayer
   - Puzzle sharing via links
   - Leaderboards and achievements
   - Social features (friends, challenges)

4. **DevOps**
   - Automated testing in CI/CD
   - Blue/green deployments
   - Database backup automation
   - Performance monitoring (APM)

---

## Contact & Support

**Project Repository:** https://github.com/larsm2v2/vite-rrouter-lightsoutTwo  
**Production Site:** https://ttlo-two.web.app  
**Cloud Project:** ttlo-two (GCP Project ID: 31909128751)

---

_Document Version: 1.0_  
_Last Updated: November 26, 2025_
