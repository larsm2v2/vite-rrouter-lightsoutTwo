// src/types/User.ts
export interface User {
	id: number;
	googleId: string;
	displayName: string;
	email: string;
}

export interface GameStats {
	id: number;
	currentLevel: number;
	buttonsPressed: string;
	savedMaps: string;
}
