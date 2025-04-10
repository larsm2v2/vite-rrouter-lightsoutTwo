// src/types/entities/User.ts
import { EntitySchema } from "typeorm";

export interface User {
  id: number;
  googleSub?: string;
  email: string;
  displayName: string;
  avatar?: string;
}

export const UserSchema = new EntitySchema<User>({
  name: "User",
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true,
    },
    googleSub: {
      type: String,
      unique: true,
    },
    email: {
      type: String,
      unique: true,
    },
    displayName: {
      type: String,
    },
    avatar: {
      type: String,
      nullable: true,
    },
  },
});

export interface GameStats {
  id: number;
  currentLevel: number;
  buttonsPressed: string;
  savedMaps: string;
}
