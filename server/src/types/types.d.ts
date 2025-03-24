import { User as CustomUser } from "./User.ts";

declare global {
	namespace Express {
		interface User extends CustomUser {}
	}
}
