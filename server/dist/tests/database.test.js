"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// tests/database.test.ts
process.env.NODE_ENV = "test";
const database_1 = __importDefault(require("../config/database"));
describe("Database Operations", () => {
    let userId;
    beforeAll(() => {
        // Seed the database with a test user
        const result = database_1.default
            .prepare("INSERT INTO users (googleId, displayName, email) VALUES (?, ?, ?)")
            .run("test-google-id", "Test User", "test@example.com");
        userId = result.lastInsertRowid; // Store the user ID for later use
    });
    afterAll(() => {
        // Clean up the database after tests
        database_1.default.prepare("DELETE FROM game_stats").run();
        database_1.default.prepare("DELETE FROM users").run();
    });
    it("should retrieve a user by googleId", () => {
        const user = database_1.default
            .prepare("SELECT * FROM users WHERE googleId = ?")
            .get("test-google-id");
        expect(user).toBeDefined(); // Ensure user is not undefined
        if (user) {
            expect(user.displayName).toBe("Test User");
            expect(user.email).toBe("test@example.com");
        }
    });
    it("should create a new user", () => {
        const result = database_1.default
            .prepare("INSERT INTO users (googleId, displayName, email) VALUES (?, ?, ?)")
            .run("new-google-id", "New User", "new@example.com");
        const user = database_1.default
            .prepare("SELECT * FROM users WHERE id = ?")
            .get(result.lastInsertRowid);
        expect(user).toBeDefined(); // Ensure user is not undefined
        if (user) {
            expect(user.email).toBe("new@example.com");
        }
    });
    it("should insert and retrieve game stats for a user", () => {
        // Insert a new game stat record
        const buttonsPressed = JSON.stringify(["button1", "button2"]);
        const savedMaps = JSON.stringify(["map1", "map2"]);
        const result = database_1.default
            .prepare("INSERT INTO game_stats (userId, currentLevel, buttonsPressed, savedMaps) VALUES (?, ?, ?, ?)")
            .run(userId, 5, buttonsPressed, savedMaps);
        // Retrieve the inserted game stat record
        const gameStats = database_1.default
            .prepare("SELECT * FROM game_stats WHERE id = ?")
            .get(result.lastInsertRowid);
        expect(gameStats).toBeDefined(); // Ensure gameStats is not undefined
        if (gameStats) {
            expect(gameStats.id).toBe(userId);
            expect(gameStats.currentLevel).toBe(5);
            expect(JSON.parse(gameStats.buttonsPressed)).toEqual([
                "button1",
                "button2",
            ]);
            expect(JSON.parse(gameStats.savedMaps)).toEqual(["map1", "map2"]);
        }
    });
});
