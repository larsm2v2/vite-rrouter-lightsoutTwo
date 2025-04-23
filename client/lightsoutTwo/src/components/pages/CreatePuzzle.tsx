import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "./Client";
import "./CreatePuzzle.css";

const CreatePuzzle = () => {
  const navigate = useNavigate();
  const [gridSize] = useState<number>(5); // Fixed at 5x5
  const [grid, setGrid] = useState<boolean[][]>(
    Array(5).fill(false).map(() => Array(5).fill(false))
  );
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [solution, setSolution] = useState<number | null>(null);
  const [toggleAdjacent, setToggleAdjacent] = useState<boolean>(false);

  // Handle cell click to toggle the light on/off
  const handleCellClick = (row: number, col: number) => {
    // Copy grid
    const newGrid = grid.map(r => [...r]);
    // Toggle clicked cell
    newGrid[row][col] = !newGrid[row][col];
    // Toggle neighbors if enabled
    if (toggleAdjacent) {
      if (row > 0) newGrid[row - 1][col] = !newGrid[row - 1][col];
      if (row < gridSize - 1) newGrid[row + 1][col] = !newGrid[row + 1][col];
      if (col > 0) newGrid[row][col - 1] = !newGrid[row][col - 1];
      if (col < gridSize - 1) newGrid[row][col + 1] = !newGrid[row][col + 1];
    }
    // Commit changes
    setGrid(newGrid);
    setValidationError(null);
    setSolution(null);
  };

  // Convert grid to pattern (array of linear indices)
  const gridToPattern = useCallback(() => {
    const pattern: number[] = [];
    
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        if (grid[row][col]) {
          // Convert to linear index (1-based)
          const linearIndex = row * gridSize + col + 1;
          pattern.push(linearIndex);
        }
      }
    }
    
    return pattern;
  }, [grid, gridSize]);

  // Validate the puzzle by sending it to the server
  const validatePuzzle = async () => {
    const pattern = gridToPattern();
    
    if (pattern.length === 0) {
      setValidationError("Please select at least one light to create a puzzle.");
      return;
    }
    
    try {
      setIsValidating(true);
      setValidationError(null);
      
      // Send to server for validation and solution finding
      const response = await apiClient.post("/puzzles/validate", { pattern });
      
      if (response.data.solvable) {
        setSolution(response.data.minimumMoves);
        setValidationError(null);
      } else {
        setValidationError("This puzzle has no solution. Please modify it.");
      }
    } catch (error: any) {
      console.error("Validation error:", error);
      setValidationError(error.response?.data?.error || "Failed to validate puzzle");
    } finally {
      setIsValidating(false);
    }
  };

  // Save the puzzle to the server
  const savePuzzle = async () => {
    if (solution === null) {
      setValidationError("Please validate the puzzle before saving");
      return;
    }
    
    const pattern = gridToPattern();
    
    try {
      await apiClient.post("/puzzles/create", { 
        pattern,
        minimumMoves: solution
      });
      
      navigate("/profile", { state: { message: "Puzzle created successfully!" } });
    } catch (error: any) {
      console.error("Save error:", error);
      setValidationError(error.response?.data?.error || "Failed to save puzzle");
    }
  };

  // Reset the grid
  const resetGrid = () => {
    setGrid(Array(gridSize).fill(false).map(() => Array(gridSize).fill(false)));
    setValidationError(null);
    setSolution(null);
  };

  // Turn all lights on
  const selectAllLights = () => {
    setGrid(Array(gridSize).fill(true).map(() => Array(gridSize).fill(true)));
    setValidationError(null);
    setSolution(null);
  };

  // Determine if all lights are on
  const allOn = grid.every(row => row.every(cell => cell));

  // Convert row,col to linear index
  const rcToLinear = (row: number, col: number): number => {
    return row * gridSize + col + 1;
  };

  return (
    <div className="create-puzzle-container">
      <div className="create-puzzle-card">
        <button className="back-button" onClick={() => navigate('/profile')}>
          Back to Profile
        </button>
        <h1>Create Custom Puzzle</h1>
        <p className="instructions">
          Click on the lights to create your puzzle pattern. When you're done, click 
          "Validate" to check if the puzzle is solvable and find the minimum number of moves.
        </p>
        
        <div className="grid-container">
          <div className="light-grid">
            {grid.map((row, rowIndex) => (
              <div key={rowIndex} className="light-row">
                {row.map((isOn, colIndex) => {
                  const linearIndex = rcToLinear(rowIndex, colIndex);
                  return (
                    <button
                      key={`${rowIndex}-${colIndex}`}
                      id={`light-${linearIndex}`}
                      className={`light-button ${isOn ? "on" : "off"}`}
                      onClick={() => handleCellClick(rowIndex, colIndex)}
                    >
                      {linearIndex}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        
        {solution !== null && (
          <div className="validation-success">
            ✅ Valid puzzle! Solution requires minimum {solution} moves.
          </div>
        )}
        
        {validationError && (
          <div className="validation-error">
            ❌ {validationError}
          </div>
        )}
        <div className="button-group">
        <button 
            className="action-button validate"
            onClick={validatePuzzle}
            disabled={isValidating}
          >
            {isValidating ? "Validating..." : "Validate Puzzle"}
          </button>
          <button 
            className="action-button save"
            onClick={savePuzzle}
            disabled={solution === null}
          >
            Save Puzzle
          </button>
        </div>
        <div className="button-group">
        <button 
            className="action-button toggle-adjacent"
            onClick={() => setToggleAdjacent(!toggleAdjacent)}
          >
            {toggleAdjacent ? "Adjacent Enabled" : "Adjacent Disabled"}
          </button>
          {allOn ? (
            <button
              className="action-button all-on"
              onClick={resetGrid}
            >
              Reset
            </button>
          ) : (
            <>
              <button
                className="action-button all-on"
                onClick={selectAllLights}
              >
                All On
              </button>
              <button
                className="action-button reset"
                onClick={resetGrid}
              >
                Reset
              </button>
            </>
          )}
          <button 
            className="action-button cancel"
            onClick={() => navigate("/profile")}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePuzzle; 