import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
	testEnvironment: "node",
	testMatch: ["**/tests/**/*.test.ts"],
	transform: {
		"^.+\\.ts$": "ts-jest",
	},
	moduleFileExtensions: ["ts", "js"],
};

export default config;
