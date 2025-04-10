// types/GoogleProfile.ts
export interface GoogleProfile {
	id: string;
	displayName: string;
	emails: { value: string; verified: boolean }[];
}
