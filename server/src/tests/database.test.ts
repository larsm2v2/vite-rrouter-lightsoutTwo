// tests/database.test.ts
process.env.NODE_ENV = "test";

import db from "../config/database";
import { User, GameStats } from "../types/User"; // Assuming you have a GameStats type defined

describe("Database Operations", () => {
	let userId: number;

	beforeAll(() => {
		// Seed the database with a test user
		const result = db
			.prepare(
				"INSERT INTO users (googleId, displayName, email) VALUES (?, ?, ?)"
			)
			.run("test-google-id", "Test User", "test@example.com");

		userId = result.lastInsertRowid as number; // Store the user ID for later use
	});

	afterAll(() => {
		// Clean up the database after tests
		db.prepare("DELETE FROM game_stats").run();
		db.prepare("DELETE FROM users").run();
	});

	it("should retrieve a user by googleId", () => {
		const user = db
			.prepare("SELECT * FROM users WHERE googleId = ?")
			.get("test-google-id") as User | undefined;

		expect(user).toBeDefined(); // Ensure user is not undefined
		if (user) {
			expect(user.displayName).toBe("Test User");
			expect(user.email).toBe("test@example.com");
		}
	});

	it("should create a new user", () => {
		const result = db
			.prepare(
				"INSERT INTO users (googleId, displayName, email) VALUES (?, ?, ?)"
			)
			.run("new-google-id", "New User", "new@example.com");

		const user = db
			.prepare("SELECT * FROM users WHERE id = ?")
			.get(result.lastInsertRowid) as User | undefined;

		expect(user).toBeDefined(); // Ensure user is not undefined
		if (user) {
			expect(user.email).toBe("new@example.com");
		}
	});

	it("should insert and retrieve game stats for a user", () => {
		// Insert a new game stat record
		const buttonsPressed = JSON.stringify(["button1", "button2"]);
		const savedMaps = JSON.stringify(["map1", "map2"]);

		const result = db
			.prepare(
				"INSERT INTO game_stats (userId, currentLevel, buttonsPressed, savedMaps) VALUES (?, ?, ?, ?)"
			)
			.run(userId, 5, buttonsPressed, savedMaps);

		// Retrieve the inserted game stat record
		const gameStats = db
			.prepare("SELECT * FROM game_stats WHERE id = ?")
			.get(result.lastInsertRowid) as GameStats | undefined;

		expect(gameStats).toBeDefined(); // Ensure gameStats is not undefined
		if (gameStats) {
			expect(gameStats.userId).toBe(userId);
			expect(gameStats.currentLevel).toBe(5);
			expect(JSON.parse(gameStats.buttonsPressed)).toEqual([
				"button1",
				"button2",
			]);
			expect(JSON.parse(gameStats.savedMaps)).toEqual(["map1", "map2"]);
		}
	});
});
