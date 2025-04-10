import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oidc";
import db from "../database";
import crypto from "crypto";
import { Request } from "express";
import { Database } from "better-sqlite3";
import { User } from "../../types/entities/User";

declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      displayName: string;
    }
  }
}
// Augment types with your custom fields
declare module "passport-google-oidc" {
  interface Profile {
    _json: {
      sub: string;
      email: string;
      email_verified: boolean;
      picture?: string;
      name?: string;
    };
    accessToken?: string;
    refreshToken?: string;
  }
}

// Type for the verify callback
type VerifyCallback = (
  error: Error | null,
  user?: Express.User | false,
  info?: unknown
) => void;

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
      scope: ["openid", "profile", "email"],
      passReqToCallback: true,
    },
    async (
      req: Request,
      issuer: string,
      profile: import("passport-google-oidc").Profile,
      done: VerifyCallback
    ) => {
      try {
        if (!profile._json.email_verified) {
          return done(new Error("Google email not verified"));
        }

        // Type-safe user interface
        interface User {
          id: number;
          google_sub: string;
          email: string;
          displayName: string;
        }
        interface DBUser {
          id: number;
          google_sub: string;
          email: string;
          displayName: string;
        }
        let user = db
          .prepare<[string]>(
            `
      SELECT * FROM users 
      WHERE google_sub = ?
    `
          )
          .get(profile._json.sub) as User | undefined;

        if (!user) {
          const tokenExpiry = new Date();
          tokenExpiry.setHours(tokenExpiry.getHours() + 1);

          const { lastInsertRowid } = db
            .prepare(
              `
        INSERT INTO users (
          google_sub, 
          email, 
          displayName, 
          avatar, 
          google_access_token,
          google_refresh_token,
          token_expiry
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `
            )
            .run(
              profile._json.sub,
              profile._json.email,
              profile._json.name || profile.displayName,
              profile._json.picture,
              profile.accessToken ? encryptToken(profile.accessToken) : null,
              profile.refreshToken ? encryptToken(profile.refreshToken) : null,
              tokenExpiry.toISOString()
            ) as { lastInsertRowid: number };

          user = db
            .prepare<[number]>(
              `
        SELECT * FROM users 
        WHERE id = ?
      `
            )
            .get(lastInsertRowid) as User;
        }

        done(null, user);
      } catch (err) {
        done(err instanceof Error ? err : new Error("Authentication failed"));
      }
    }
  )
);

// Encryption helper with proper typing
function encryptToken(token: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    Buffer.from(process.env.DB_ENCRYPTION_KEY!, "hex"),
    iv
  );
  return iv.toString("hex") + ":" + cipher.update(token, "utf8", "hex");
}

// Serialization types
passport.serializeUser<number>((user: Express.User, done) => {
  done(null, (user as any).id);
});

passport.deserializeUser<number>((id: number, done) => {
  try {
    interface SafeUser {
      id: number;
      email: string;
      displayName: string;
    }

    const user = db
      .prepare<[number]>(
        `
      SELECT id, email, displayName 
      FROM users 
      WHERE id = ?
    `
      )
      .get(id) as User | undefined;

    done(null, user || false);
  } catch (err) {
    done(err instanceof Error ? err : undefined);
  }
});

export default passport;
