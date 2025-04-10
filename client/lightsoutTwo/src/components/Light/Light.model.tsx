// Light.ts (new file for the class definitions)
export type LightMode = "creationMode" | "gameMode" | "lightMode";
export type FlashSequence = (number | number[])[];

export abstract class Light {
  constructor(
    public id: number,
    public isOn: boolean,
    public mode: LightMode
  ) {}

  toggleLight(): void {
    this.isOn = !this.isOn;
  }

  abstract save(): Promise<void>;
}

export class CreationLight extends Light {
  constructor(id: number, isOn: boolean = false) {
    super(id, isOn, "creationMode");
  }

  async save(): Promise<void> {
    // Implementation moved from old saveMap function
    const json = JSON.stringify({ gridSize: 0, keys: [this.id] });
    try {
      const response = await fetch("http://localhost:3001/save-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: json,
      });
      if (!response.ok) throw new Error("Failed to save map");
    } catch (error) {
      console.error("Error saving map:", error);
      throw error;
    }
  }
}

export class GameLight extends Light {
  constructor(id: number, isOn: boolean = false) {
    super(id, isOn, "gameMode");
  }

  async save(): Promise<void> {
    // Game-specific save logic
    console.log("Saving game progress for light", this.id);
  }
}

export class FlashLight extends Light {
  constructor(id: number, isOn: boolean = false) {
    super(id, isOn, "lightMode");
  }

  async save(): Promise<void> {
    throw new Error("Flash mode doesn't support saving");
  }
}
