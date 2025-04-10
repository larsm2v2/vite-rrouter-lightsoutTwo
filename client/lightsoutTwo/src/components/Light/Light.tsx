// LightComponent.tsx
import React, { useState, useEffect } from "react";
import "./Light.css";
import {
  Light,
  CreationLight,
  GameLight,
  FlashLight,
  LightMode,
  //   FlashSequence,
} from "./Light.model";

// type LightPosition = { row: number; col: number };

const LightComponent: React.FC = () => {
  const [gridSize, setGridSize] = useState<number>(4);
  const [lights, setLights] = useState<Light[][]>([]);
  const [currentMode, setCurrentMode] = useState<LightMode>("creationMode");
  //   const [flashSequence, setFlashSequence] = useState<FlashSequence>([]);

  // Initialize lights grid
  useEffect(() => {
    const newLights: Light[][] = [];
    for (let row = 0; row < gridSize; row++) {
      const rowLights: Light[] = [];
      for (let col = 0; col < gridSize; col++) {
        const id = gridSize * row + col;
        switch (currentMode) {
          case "creationMode":
            rowLights.push(new CreationLight(id));
            break;
          case "gameMode":
            rowLights.push(new GameLight(id));
            break;
          case "lightMode":
            rowLights.push(new FlashLight(id));
            break;
        }
      }
      newLights.push(rowLights);
    }
    setLights(newLights);
  }, [gridSize, currentMode]);

  const toggleLight = (row: number, col: number) => {
    setLights((prev) => {
      const newLights = [...prev];
      newLights[row][col].toggleLight();
      return newLights;
    });
  };

  const saveAll = async () => {
    try {
      await Promise.all(
        lights.flatMap((row) =>
          row.filter((light) => light.isOn).map((light) => light.save())
        )
      );
      console.log("All lights saved successfully");
    } catch (error) {
      console.error("Error saving lights:", error);
    }
  };

  const toggleMode = () => {
    const modes: LightMode[] = ["creationMode", "gameMode", "lightMode"];
    setCurrentMode(modes[(modes.indexOf(currentMode) + 1) % modes.length]);
  };

  const resetGrid = () => {
    setLights((prev) =>
      prev.map((row) =>
        row.map((light) => {
          light.isOn = false;
          return light;
        })
      )
    );
  };

  // Render method
  return (
    <div>
      <div className="light-grid">
        {lights.map((row, rowIndex) => (
          <div key={rowIndex} className="light-row">
            {row.map((light, colIndex) => (
              <button
                key={light.id}
                className={`light-button ${light.isOn ? "on" : "off"}`}
                onClick={() => toggleLight(rowIndex, colIndex)}
              >
                {rowIndex},{colIndex}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="controls">
        <button onClick={toggleMode}>Toggle Mode: {currentMode}</button>
        <button onClick={saveAll}>Save</button>
        <button onClick={resetGrid}>Reset</button>

        <input
          type="number"
          min="3"
          max="10"
          value={gridSize}
          onChange={(e) => setGridSize(Number(e.target.value))}
        />
      </div>
    </div>
  );
};

export default LightComponent;
