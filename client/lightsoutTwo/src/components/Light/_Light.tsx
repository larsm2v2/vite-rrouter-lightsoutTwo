// imports
import React, { useState, useEffect } from "react";
import "./Light.css";

type LightPosition = { row: number; col: number };
type ValuePosition = number;
type LightSequence = string;
type LightMode = string;
type SingleSequence = string;
// type FlashSequence = (number | number[])[];
type GridSize = number;

const Light: React.FC = () => {
  const [gridSizeInput, setGridSizeInput] = useState<GridSize>(4);
  const [sequenceInput, setSequenceInput] = useState<SingleSequence>("");
  // const [flashSequence, setFlashSequence] = useState<FlashSequence>([]);
  const validSequences = [
    "seqOff",
    "flashEvery2s",
    "flashLong2sOff1s",
    "flashQuickly02s",
    "flashOncein3s",
  ];
  const validModes = ["creationMode", "gameMode", "lightMode"];
  const [selectedSequence, setSelectedSequence] = useState<LightSequence>(
    validSequences[0]
  );
  const [selectedMode, setSelectedMode] = useState<LightMode>(validModes[0]);
  // const [isOn, setIsOn] = useState(false);
  const [gridLights, setGridLights] = useState<boolean[][]>(
    Array(gridSizeInput)
      .fill(null)
      .map(() => Array(gridSizeInput).fill(false))
  );
  const [lightPositions, setLightPositions] = useState<LightPosition[][]>([]);

  useEffect(() => {
    generateLightPositions(gridSizeInput);
    setGridLights(
      Array(gridSizeInput)
        .fill(null)
        .map(() => Array(gridSizeInput).fill(false))
    );
  }, [gridSizeInput]);

  const generateLightPositions = (size: number) => {
    const positions: LightPosition[][] = [];
    for (let row = 0; row < size; row++) {
      const rowPositions: LightPosition[] = [];
      for (let col = 0; col < size; col++) {
        rowPositions.push({ row, col });
      }
      positions.push(rowPositions);
    }
    setLightPositions(positions);
  };

  const toggleLight = (position: LightPosition) => {
    console.log("Button clicked at:", position);
    if (selectedMode === "creationMode") {
      setGridLights((prevGrid) => {
        const newGrid = prevGrid.map((rowArray, rowIndex) =>
          rowArray.map((cell, colIndex) => {
            return rowIndex === position.row && colIndex === position.col
              ? !cell
              : cell;
          })
        );
        console.log(newGrid);
        return newGrid;
      });
    }
  };

  const generatePositionMap = (
    grid: boolean[][],
    gridSize: number
  ): Map<number, LightPosition> => {
    const positionMap = new Map<number, LightPosition>();
    if (lightPositions.length === gridSize) {
      for (let row = 0; row < grid.length; row++) {
        if (lightPositions[row]) {
          for (let col = 0; col < grid[row].length; col++) {
            const key = gridSize * row + col + 1;
            positionMap.set(key, lightPositions[row][col]);
          }
        }
      }
    }
    console.log("Position Map:", positionMap); // Log the positionMap
    return positionMap;
  };

  const getTrueLightPositions = (
    grid: boolean[][],
    gridSize: number
  ): { key: ValuePosition; position: LightPosition }[] => {
    if (lightPositions.length === gridSize) {
      const positionMap = generatePositionMap(grid, gridSize);
      const truePositions: { key: ValuePosition; position: LightPosition }[] =
        [];
      for (const [key, position] of positionMap.entries()) {
        if (grid[position.row][position.col]) {
          truePositions.push({ key: key, position });
        }
      }
      return truePositions;
    }
    return [];
  };

  const flashLights = (pattern: (number | number[])[]) => {
    let delay = 0;
    pattern.forEach((item) => {
      setTimeout(() => {
        if (Array.isArray(item)) {
          // Flash multiple lights simultaneously
          item.forEach((key) => {
            const button = document.getElementById(`light-${key}`);
            if (button) {
              button.classList.add("flashing");
              setTimeout(() => {
                button.classList.remove("flashing");
              }, 250);
            }
          });
        } else {
          // Flash a single light
          const button = document.getElementById(`light-${item}`);
          if (button) {
            button.classList.add("flashing");
            setTimeout(() => {
              button.classList.remove("flashing");
            }, 250);
          }
        }
      }, delay);
      delay += 500;
    });
  };

  const toggleSequence = () => {
    let i = validSequences.indexOf(selectedSequence);
    i = (i + 1) % validSequences.length;
    setSelectedSequence(validSequences[i]);
  };
  const toggleMode = () => {
    let i = validModes.indexOf(selectedMode);
    i = (i + 1) % validModes.length;
    setSelectedMode(validModes[i]);
  };

  const handleSequenceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSequenceInput(event.target.value);
  };
  const handleSetSequence = () => {
    const inputValues = sequenceInput
      .split(";")
      .map((group) => {
        if (group.includes(",")) {
          return group.split(",").map(Number);
        } else {
          return Number(group);
        }
      })
      .filter((item) => {
        if (Array.isArray(item)) {
          return item.every((num) => !isNaN(num));
        }
        return !isNaN(item);
      });
    // setFlashSequence(inputValues);
    flashLights(inputValues);
  };

  const handleSetGridSize = () => {
    setGridSizeInput(Number());
  };
  const handleGridSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputGridSizeValue = parseInt(event.target.value, 10);
    if (
      !isNaN(inputGridSizeValue) &&
      inputGridSizeValue >= 3 &&
      inputGridSizeValue <= 10
    ) {
      setGridSizeInput(inputGridSizeValue);
    }
  };
  const resetGrid = () => {
    setGridLights(
      Array(gridSizeInput)
        .fill(null)
        .map(() => Array(gridSizeInput).fill(false))
    );
  };
  const saveMap = async () => {
    const truePositions = getTrueLightPositions(gridLights, gridSizeInput);
    const keys = truePositions.map((item) => item.key);
    const gridSize = gridSizeInput;
    const json = JSON.stringify({ gridSize, keys });

    try {
      const response = await fetch("http://localhost:3001/save-map", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: json,
      });
      if (response.ok) {
        console.log("Map saved successfully!");
      } else {
        console.error("Failed to save map.");
      }
    } catch (error) {
      console.error("Error saving map:", error);
    }
  };
  return (
    <div>
      <div>
        {gridLights.map((row, rowIndex) => (
          <div key={rowIndex}>
            {row.map((light, colIndex) => {
              const key = gridSizeInput * rowIndex + colIndex + 1; // Calculate key
              const className =
                selectedMode === "creationMode"
                  ? light
                    ? "button lightsOut on"
                    : "button off"
                  : selectedMode === "lightMode"
                  ? `button lightsOut ${selectedSequence}`
                  : "button off";
              return (
                <button
                  id={`light-${key}`} // Use key as ID
                  key={colIndex}
                  className={className}
                  onClick={() =>
                    toggleLight(lightPositions[rowIndex][colIndex])
                  }
                >
                  {rowIndex},{colIndex}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div>
        <button className={`button long`} onClick={toggleMode}>
          {selectedMode}
        </button>
        {selectedMode === "creationMode" && (
          <>
            <button className={"button"} onClick={saveMap}>
              Save Map
            </button>
            <button className={"button"} onClick={resetGrid}>
              Clear Map
            </button>
          </>
        )}
        {selectedMode === "gameMode" && (
          <>
            <button className={"button"} onClick={saveMap}>
              Main Game
            </button>
            <button className={"button"} onClick={resetGrid}>
              Select Puzzle
            </button>
          </>
        )}
        {selectedMode === "lightMode" && (
          <button className={"button"} onClick={toggleSequence}>
            {selectedSequence}
          </button>
        )}
      </div>
      <div></div>
      <div>
        <input
          type="text"
          value={sequenceInput}
          onChange={handleSequenceChange}
          placeholder="Enter sequence (e.g., 2,1,3,4)"
        />
        <button onClick={handleSetSequence}>Set Sequence</button>
      </div>
      <div>
        <input
          type="number"
          min="3"
          max="10"
          value={gridSizeInput}
          onChange={handleGridSizeChange}
          placeholder="Enter grid size: (e.g. 5)"
        />
        <button onClick={handleSetGridSize}>Set Grid Size</button>
      </div>
      <div>
        {getTrueLightPositions(gridLights, gridSizeInput).map((item, index) => (
          <div key={index}>
            Position: {item.key} Row: {item.position.row}, Col:{" "}
            {item.position.col}
          </div>
        ))}
      </div>
    </div>
  );
};
export default Light;
