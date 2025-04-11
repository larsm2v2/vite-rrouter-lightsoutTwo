"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const passport_google_oidc_1 = require("passport-google-oidc");
const database_1 = __importDefault(require("../database"));
const crypto_1 = __importDefault(require("crypto"));
passport_1.default.use(new passport_google_oidc_1.Strategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    scope: ["openid", "profile", "email"],
    passReqToCallback: true,
}, (req, issuer, profile, done) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!profile._json.email_verified) {
            return done(new Error("Google email not verified"));
        }
        // Check for existing user
        const userResult = yield database_1.default.query(`SELECT id, google_sub, email, display_name 
           FROM users 
           WHERE google_sub = $1`, [profile._json.sub]);
        let user = userResult.rows[0];
        if (!user) {
            const tokenExpiry = new Date();
            tokenExpiry.setHours(tokenExpiry.getHours() + 1);
            const insertResult = yield database_1.default.query(`INSERT INTO users (
              google_sub, 
              email, 
              display_name, 
              avatar, 
              google_access_token,
              google_refresh_token,
              token_expiry
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id`, [
                profile._json.sub,
                profile._json.email,
                profile._json.name || profile.display_name,
                profile._json.picture,
                profile.accessToken ? encryptToken(profile.accessToken) : null,
                profile.refreshToken ? encryptToken(profile.refreshToken) : null,
                tokenExpiry.toISOString(),
            ]);
            const newUserResult = yield database_1.default.query(`SELECT id, email, display_name 
             FROM users 
             WHERE id = $1`, [insertResult.rows[0].id]);
            user = newUserResult.rows[0];
        }
        done(null, {
            id: user.id,
            email: user.email,
            display_name: user.display_name,
        });
    }
    catch (err) {
        done(err instanceof Error ? err : new Error("Authentication failed"));
    }
})));
function encryptToken(token) {
    const iv = crypto_1.default.randomBytes(16);
    const cipher = crypto_1.default.createCipheriv("aes-256-gcm", Buffer.from(process.env.DB_ENCRYPTION_KEY, "hex"), iv);
    return iv.toString("hex") + ":" + cipher.update(token, "utf8", "hex");
}
passport_1.default.serializeUser((user, done) => {
    done(null, user.id);
});
passport_1.default.deserializeUser((id, done) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield database_1.default.query(`SELECT id, email, display_name 
       FROM users 
       WHERE id = $1`, [id]);
        done(null, result.rows[0] || false);
    }
    catch (err) {
        done(err instanceof Error ? err : undefined);
    }
}));
exports.default = passport_1.default;
