import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import db from "./database";
import { User } from "../types/User";

// Google OAuth 2.0 Strategy
passport.use(
	new GoogleStrategy(
		{
			clientID: process.env.GOOGLE_CLIENT_ID!,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
			callbackURL: process.env.GOOGLE_CALLBACK_URL!,
		},
		async (
			accessToken: string,
			refreshToken: string,
			profile: any,
			done: (error: any, user?: User | false) => void
		) => {
			try {
				// Find or create the user in your database
				let user = db
					.prepare("SELECT * FROM users WHERE googleId = ?")
					.get(profile.id) as User | undefined;

				if (!user) {
					const result = db
						.prepare(
							"INSERT INTO users (googleId, displayName, email) VALUES (?, ?, ?)"
						)
						.run(
							profile.id,
							profile.displayName,
							profile.emails[0].value
						);

					user = db
						.prepare("SELECT * FROM users WHERE id = ?")
						.get(result.lastInsertRowid) as User;
				}

				return done(null, user);
			} catch (err) {
				return done(err, false);
			}
		}
	)
);

// Serialize and deserialize user
passport.serializeUser((user: User, done) => {
	done(null, user.id);
});

passport.deserializeUser((id: number, done) => {
	try {
		const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as
			| User
			| undefined;

		if (user) {
			done(null, user);
		} else {
			done(new Error("User not found"), null);
		}
	} catch (err) {
		done(err, null);
	}
});

export default passport;
