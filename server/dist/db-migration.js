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
// Database migration to add password columns
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const database_1 = __importDefault(require("./config/database"));
function runMigration() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Starting database migration...");
        const client = yield database_1.default.connect();
        try {
            yield client.query("BEGIN");
            // Check if columns already exist
            const columnCheckResult = yield client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('password', 'password_salt');
    `);
            const existingColumns = columnCheckResult.rows.map(row => row.column_name);
            // Add password column if it doesn't exist
            if (!existingColumns.includes('password')) {
                console.log("Adding password column...");
                yield client.query(`
        ALTER TABLE users
        ADD COLUMN password TEXT;
      `);
            }
            else {
                console.log("Password column already exists.");
            }
            // Add password_salt column if it doesn't exist
            if (!existingColumns.includes('password_salt')) {
                console.log("Adding password_salt column...");
                yield client.query(`
        ALTER TABLE users
        ADD COLUMN password_salt TEXT;
      `);
            }
            else {
                console.log("Password salt column already exists.");
            }
            // Make google_sub column nullable
            console.log("Modifying google_sub column to allow NULL values...");
            yield client.query(`
      ALTER TABLE users
      ALTER COLUMN google_sub DROP NOT NULL;
    `);
            // Rename buttons_pressed to best_combination
            console.log("Renaming buttons_pressed column to best_combination...");
            yield client.query(`
      ALTER TABLE game_stats
      RENAME COLUMN buttons_pressed TO best_combination;
    `);
            yield client.query("COMMIT");
            console.log("✅ Migration completed successfully!");
        }
        catch (err) {
            yield client.query("ROLLBACK");
            console.error("❌ Migration failed:", err);
            throw err;
        }
        finally {
            client.release();
        }
    });
}
// Run the migration if this script is executed directly
if (require.main === module) {
    runMigration()
        .then(() => {
        console.log("Migration completed, exiting...");
        process.exit(0);
    })
        .catch(err => {
        console.error("Migration failed:", err);
        process.exit(1);
    });
}
exports.default = runMigration;
