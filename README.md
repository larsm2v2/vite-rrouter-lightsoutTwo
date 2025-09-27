# Lights Out Game - Full Stack Web Application

[![Deploy to Firebase Hosting](https://github.com/larsm2v2/vite-rrouter-lightsoutTwo/actions/workflows/firebase-hosting-merge.yml/badge.svg)](https://github.com/larsm2v2/vite-rrouter-lightsoutTwo/actions/workflows/firebase-hosting-merge.yml)

## Project Overview

Lights Out is a classic puzzle game implemented as a modern full-stack web application. Players must turn off all the lights on the board by toggling them, with the challenge that toggling one light affects its adjacent tiles.

**Live Demo:** [https://ttlo-two.web.app](https://ttlo-two.web.app)

<!-- Optionally add a screenshot here -->
<!-- ![Lights Out Game Screenshot](relative/path/to/screenshot.png) -->

## Features

- **Progressive Levels:** 50+ carefully designed puzzle levels with increasing difficulty
- **User Authentication:** Google OAuth 2.0 integration
- **Game Progress Tracking:** Save your progress and stats
- **Custom Puzzle Creation:** Design and share your own Lights Out puzzles
- **Responsive Design:** Works on desktop and mobile devices
- **Dark Mode:** Eye-friendly interface

## Tech Stack

### Frontend

- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Routing:** React Router v6
- **Styling:** CSS Modules
- **Hosting:** Firebase Hosting

### Backend

- **Runtime:** Node.js with Express
- **Language:** TypeScript
- **Authentication:** Passport.js with Google OAuth
- **Database:** PostgreSQL (Neon.tech)
- **Hosting:** Google Cloud Run

## Getting Started

### Prerequisites

- Node.js 20.x or later
- npm 9.x or later
- Docker and Docker Compose (for development)
- PostgreSQL database

### Local Development Setup

Clone the repository:

```bash
git clone https://github.com/yourusername/vite-rrouter-lightsoutTwo.git
cd vite-rrouter-lightsoutTwo
```

#### Set up environment variables

- Create a `.env` file in the root directory based on the provided `.env.example`
- Create a `.env` file in `client/lightsoutTwo` directory

#### Using Docker (Recommended)

Start all services (client, server, and database):

```bash
docker-compose -f docker-compose.dev.yml up
```

#### Manual Setup

**Start the backend server:**

```bash
cd server
npm install
npm run dev
```

**In a new terminal, start the frontend:**

```bash
cd client/lightsoutTwo
npm install
npm run dev
```

**Access the application:**

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend API: [http://localhost:8000](http://localhost:8000)

## Deployment

### Frontend (Firebase)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Build the frontend
cd client/lightsoutTwo
npm run build

# Deploy to Firebase
firebase deploy
```

### Backend (Google Cloud Run)

```bash
# Build the Docker image
cd server
docker build -t lightsout-server .

# Deploy using Cloud Build
gcloud builds submit
```

## Project Structure

```
/
├── client/
│   └── lightsoutTwo/       # Frontend React application
│       ├── public/         # Static files
│       ├── src/            # Source code
│       │   ├── components/ # React components
│       │   ├── hooks/      # Custom React hooks
│       │   ├── pages/      # Page components
│       │   └── services/   # API services
│       └── firebase.json   # Firebase configuration
│
├── server/                 # Backend Express application
│   ├── src/                # Source code
│   │   ├── config/         # Configuration files
│   │   ├── controllers/    # Route controllers
│   │   ├── models/         # Data models
│   │   ├── routes/         # API routes
│   │   └── tests/          # Unit tests
│   └── Dockerfile          # Docker configuration
│
├── docker-compose.dev.yml  # Docker compose for development
└── docker-compose.prod.yml # Docker compose for production
```

## API Documentation

The backend provides a RESTful API with the following endpoints:

- `GET /auth/check` - Check authentication status
- `GET /auth/google` - Google OAuth login
- `POST /auth/logout` - Logout
- `GET /profile` - Get user profile
- `GET /game/levels` - Get available game levels
- `POST /game/progress` - Update game progress

For a complete API reference, see [API_DOCS.md](API_DOCS.md).

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Original Lights Out game by Tiger Electronics
- React documentation
- Vite documentation
- All contributors to this project

## Contact

Your Name - your.email@example.com

Project Link: [https://github.com/larsm2v2/vite-rrouter-lightsoutTwo](https://github.com/larsm2v2/vite-rrouter-lightsoutTwo)
