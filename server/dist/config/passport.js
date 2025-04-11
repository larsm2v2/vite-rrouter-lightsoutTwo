"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const database_1 = __importDefault(require("./database"));
// Google OAuth 2.0 Strategy
passport_1.default.use(
  new passport_google_oauth20_1.Strategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    (accessToken, refreshToken, profile, done) =>
      __awaiter(void 0, void 0, void 0, function* () {
        try {
          // Find or create the user in your database
          let user = database_1.default
            .prepare("SELECT * FROM users WHERE googleId = ?")
            .get(profile.id);
          if (!user) {
            const result = database_1.default
              .prepare(
                "INSERT INTO users (googleId, display_name, email) VALUES (?, ?, ?)"
              )
              .run(profile.id, profile.display_name, profile.emails[0].value);
            user = database_1.default
              .prepare("SELECT * FROM users WHERE id = ?")
              .get(result.lastInsertRowid);
          }
          return done(null, user);
        } catch (err) {
          return done(err, false);
        }
      })
  )
);
// Serialize and deserialize user
passport_1.default.serializeUser((user, done) => {
  done(null, user.id);
});
passport_1.default.deserializeUser((id, done) => {
  try {
    const user = database_1.default
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(id);
    if (user) {
      done(null, user);
    } else {
      done(new Error("User not found"), null);
    }
  } catch (err) {
    done(err, null);
  }
});
exports.default = passport_1.default;
