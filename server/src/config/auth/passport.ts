import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oidc";
import pool from "../database";
import crypto from "crypto";
import { Request } from "express";
import { User } from "../../types/entities/User";

declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      display_name: string;
    }
  }
}

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

        // Check for existing user
        const userResult = await pool.query<{
          id: number;
          google_sub: string;
          email: string;
          display_name: string;
        }>(
          `SELECT id, google_sub, email, display_name 
           FROM users 
           WHERE google_sub = $1`,
          [profile._json.sub]
        );

        let user = userResult.rows[0];

        if (!user) {
          const tokenExpiry = new Date();
          tokenExpiry.setHours(tokenExpiry.getHours() + 1);

          const insertResult = await pool.query<{ id: number }>(
            `INSERT INTO users (
              google_sub, 
              email, 
              display_name, 
              avatar, 
              google_access_token,
              google_refresh_token,
              token_expiry
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id`,
            [
              profile._json.sub,
              profile._json.email,
              profile._json.name || profile.display_name,
              profile._json.picture,
              profile.accessToken ? encryptToken(profile.accessToken) : null,
              profile.refreshToken ? encryptToken(profile.refreshToken) : null,
              tokenExpiry.toISOString(),
            ]
          );

          const newUserResult = await pool.query(
            `SELECT id, email, display_name 
             FROM users 
             WHERE id = $1`,
            [insertResult.rows[0].id]
          );

          user = newUserResult.rows[0];
        }

        done(null, {
          id: user.id,
          email: user.email,
          display_name: user.display_name,
        });
      } catch (err) {
        done(err instanceof Error ? err : new Error("Authentication failed"));
      }
    }
  )
);

function encryptToken(token: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    Buffer.from(process.env.DB_ENCRYPTION_KEY!, "hex"),
    iv
  );
  return iv.toString("hex") + ":" + cipher.update(token, "utf8", "hex");
}

passport.serializeUser<number>((user: Express.User, done) => {
  done(null, user.id);
});

passport.deserializeUser<number>(async (id: number, done) => {
  try {
    const result = await pool.query<Express.User>(
      `SELECT id, email, display_name 
       FROM users 
       WHERE id = $1`,
      [id]
    );

    done(null, result.rows[0] || false);
  } catch (err) {
    done(err instanceof Error ? err : undefined);
  }
});

export default passport;
