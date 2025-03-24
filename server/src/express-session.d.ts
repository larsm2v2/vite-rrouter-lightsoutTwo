import "express-session";

declare module "express-session" {
	interface SessionData {
		state: string; // Add your custom properties here
		user: {
			id: number;
			email: string;
		};
	}
}
