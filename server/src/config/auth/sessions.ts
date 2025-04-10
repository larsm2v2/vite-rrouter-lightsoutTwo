import session from "express-session";
import SQLiteStore from "connect-sqlite3";
import path from "path";

const SQLiteSessionStore = SQLiteStore(session);

export const sessionStore = new SQLiteSessionStore({
  dir: path.join(__dirname, "../../sessions"),
  db: "sessions.db",
  concurrentDB: true,
  ttl: 86400, // 24h in seconds
});

export const sessionConfig: session.SessionOptions = {
  store: sessionStore,
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  },
  name: "__Secure-auth", // Secure cookie name
};
