import { useEffect, useState, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import apiClient from "./Client";
import "./Game.css";
import "../Light/Light.css";
// Import patterns for legacy support
import { gridToPattern, arePatternsEqual } from "../../utils/puzzleChecker";

interface GameProps {
  // If you want to pass props directly instead of using URL params
}

// Define interfaces for pattern types
interface LevelPatternsType {
  [key: number]: number[];
}

interface ImportedPatternsType {
  [key: string]: (number | number[])[];
}

// Legacy level patterns as fallback
const legacyPatterns: LevelPatternsType = {
  1: [7, 8, 12, 17, 18], // Cross pattern
  2: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25], // Checkered pattern
  3: [2, 6, 8, 10, 12, 14, 16, 18, 20, 24], // Diamond pattern
  4: [1, 5, 21, 25, 13], // Corner pattern
  5: [3, 7, 9, 11, 13, 15, 17, 19, 23], // Z pattern
  // Add more patterns as needed
};


type GameMode = "classic" | "random" | "custom";

const Game = (props: GameProps) => {
  const { level } = useParams<{ level: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  // Determine mode from URL on mount: custom if path starts with /game/custom
  const initialCustom = location.pathname.startsWith("/game/custom");
  const [gameMode, setGameMode] = useState<GameMode>(initialCustom ? "custom" : "classic");
  // Ensure gameMode flips to custom when URL changes
  useEffect(() => {
    if (location.pathname.startsWith("/game/custom")) {
      setGameMode("custom");
    }
  }, [location.pathname]);
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [gridSize, setGridSize] = useState<number>(5); // Default to 5x5
  const [grid, setGrid] = useState<boolean[][]>([]);
  const [moveCount, setMoveCount] = useState<number>(0);
  const [won, setWon] = useState<boolean>(false);
  // Store initial grid state for resetting
  const [initialGrid, setInitialGrid] = useState<boolean[][]>([]);
  const [showIndices, setShowIndices] = useState<boolean>(false); // Show position indices by default
  
  // State to store fetched patterns
  const [classicPatterns, setClassicPatterns] = useState<{ [key: number]: number[] }>({});
  const [isLoadingPatterns, setIsLoadingPatterns] = useState<boolean>(false);
  const [patternError, setPatternError] = useState<string | null>(null);
  // Track minimum moves for random puzzles
  const [minMoves, setMinMoves] = useState<number | null>(null);

  // Fetch patterns only when in classic mode
  useEffect(() => {
    if (gameMode !== "classic") return;
    
    const fetchPatterns = async () => {
      setIsLoadingPatterns(true);
      setPatternError(null);
      
      console.log("Starting to fetch patterns for classic mode");
      
      try {
        // Use empty string as the difficulty value instead of 'classic'
        console.log("Making request to /puzzles/");
        const response = await apiClient.get(`/puzzles/`);
        console.log("Response from /puzzles/:", response.data);
        
        // The response will contain all difficulties, but we want the empty one
        let puzzlesData = {};
        if (response.data && response.data['']) {
          // Extract the levels from the empty difficulty
          const emptyDifficultyLevels = response.data[''];
          console.log("Found empty difficulty levels:", emptyDifficultyLevels);
          
          // Now fetch all puzzles with empty difficulty
          console.log("Making request to /puzzles/%20");
          const patternsResponse = await apiClient.get(`/puzzles/%20`);
          console.log("Response from /puzzles/%20:", patternsResponse.data);
          puzzlesData = patternsResponse.data;
        } else if (response.data && response.data['classic']) {
          // Fallback to try 'classic' difficulty if no empty difficulty found
          console.log("No empty difficulty found, using 'classic' instead");
          console.log("Found classic difficulty levels:", response.data['classic']);
          
          console.log("Making request to /puzzles/classic");
          const classicResponse = await apiClient.get(`/puzzles/classic`);
          console.log("Response from /puzzles/classic:", classicResponse.data);
          puzzlesData = classicResponse.data;
        } else {
          console.log("No empty or classic difficulties found in response:", response.data);
          throw new Error("No puzzle difficulties found");
        }
        
        // Convert from level based response to { 1: [...], 2: [...] }
        const patterns: { [key: number]: number[] } = {};
        
        // Process the puzzle data
        for (const [levelKey, pattern] of Object.entries(puzzlesData)) {
          // Parse level number from the response
          const levelNum = parseInt(levelKey.replace('level', ''));
          if (!isNaN(levelNum)) {
            patterns[levelNum] = pattern as number[];
            
          }
        }
        
        setClassicPatterns(patterns);
 
      } catch (error) {
        console.error("Failed to fetch patterns:", error);
        setPatternError("Failed to load puzzle patterns");
      } finally {
        setIsLoadingPatterns(false);
      }
    };
    
    fetchPatterns();
  }, [gameMode]);

  // Memoize the toggleCell function first since it's used by setupPuzzle
  const toggleCell = useCallback((currentGrid: boolean[][], row: number, col: number, countMove: boolean = true) => {
    // Toggle the clicked cell
    currentGrid[row][col] = !currentGrid[row][col];
    
    // Toggle adjacent cells (up, down, left, right)
    const directions = [
      [-1, 0], // up
      [1, 0],  // down
      [0, -1], // left
      [0, 1]   // right
    ];
    
    // Use the grid size from the currentGrid parameter
    const size = currentGrid.length;
    
    for (const [dx, dy] of directions) {
      const newRow = row + dx;
      const newCol = col + dy;
      
      // Check if the adjacent cell is within grid bounds
      if (newRow >= 0 && newRow < size && newCol >= 0 && newCol < size) {
        currentGrid[newRow][newCol] = !currentGrid[newRow][newCol];
      }
    }
    
    // If this is from a player move (not setup), increment move counter
    if (countMove) {
      setMoveCount(prev => prev + 1);
    }
    
    return currentGrid;
  }, []);

  // Convert linear index to row,col position
  const linearToRC = useCallback((linearIndex: number, size: number): [number, number] => {
    const row = Math.floor((linearIndex - 1) / size);
    const col = (linearIndex - 1) % size;
    return [row, col];
  }, []);

  // Convert row,col to linear index
  const rcToLinear = useCallback((row: number, col: number, size: number): number => {
    return row * size + col + 1;
  }, []);

  // Generate a random puzzle
  const generateRandomPuzzle = useCallback((grid: boolean[][], level: number) => {
    const size = grid.length;
    // Clear the grid first
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        grid[i][j] = false;
      }
    }
    
    // Number of moves increases with level
    const moves = 5 + level * 2;
    for (let i = 0; i < moves; i++) {
      const row = Math.floor(Math.random() * size);
      const col = Math.floor(Math.random() * size);
      toggleCell(grid, row, col, false);
    }
    return grid;
  }, [toggleCell]);

  // Setup puzzle depends on toggleCell
  const setupPuzzle = useCallback((newGrid: boolean[][], gameLevel: number) => {
    // Start with all lights off
    for (let i = 0; i < newGrid.length; i++) {
      for (let j = 0; j < newGrid[i].length; j++) {
        newGrid[i][j] = false;
      }
    }
    
    const size = newGrid.length;
    console.log(`Setting up puzzle for level ${gameLevel}, game mode: ${gameMode}`);
    console.log(`Available classic patterns:`, Object.keys(classicPatterns).map(Number));
    
    if (gameMode === "classic") {
      let pattern: number[] = [];
      
      // Try to get pattern from server-fetched patterns
      if (classicPatterns[gameLevel]) {
        console.log(`Found server pattern for level ${gameLevel}:`, classicPatterns[gameLevel]);
        pattern = classicPatterns[gameLevel];
      } 
      // Fallback to legacy patterns
      else if (legacyPatterns[gameLevel]) {
        console.log(`Using legacy pattern for level ${gameLevel}:`, legacyPatterns[gameLevel]);
        pattern = legacyPatterns[gameLevel];
      } else {
        console.log(`No pattern found for level ${gameLevel}`);
      }
      
      if (pattern.length > 0) {
        console.log(`Applying pattern with ${pattern.length} cells`);
        // Toggle each cell in the pattern
        pattern.forEach((linearIndex: number) => {
          // Convert linear index to row-col coordinates
          const [row, col] = linearToRC(linearIndex, size);
          
          // Only toggle if within grid bounds
          if (row >= 0 && row < size && col >= 0 && col < size) {
            newGrid[row][col] = true;
          }
        });
        return;
      }
    }
    
    console.log(`No pattern applied, generating random puzzle for level ${gameLevel}`);
    // Use random pattern generation if no classic pattern available or in random mode
    generateRandomPuzzle(newGrid, gameLevel);
  }, [toggleCell, linearToRC, gameMode, generateRandomPuzzle, classicPatterns]);

  // Initialize game depends on setupPuzzle
  const initializeGame = useCallback((size: number, gameLevel: number) => {
    console.log('initializeGame start:', { size, gameLevel, serverPattern: classicPatterns[gameLevel] });
    // Create a new grid
    const newGrid: boolean[][] = Array(size).fill(false).map(() => 
      Array(size).fill(false)
    );
    
    // Set up the puzzle based on level
    setupPuzzle(newGrid, gameLevel);
    console.log('initializeGame, newGrid after setup:', newGrid);
    
    // Reset game state
    setGrid(newGrid);
    setMoveCount(0);
    setWon(false);
    // Save this initial grid for reset
    setInitialGrid(JSON.parse(JSON.stringify(newGrid)));
  }, [setupPuzzle]);

  // Custom puzzle loader: fetch and set grid when in custom mode
  useEffect(() => {
    console.log("Game mode:", gameMode);
    if (gameMode !== "custom") return;
    let isMounted = true;
    setIsLoadingPatterns(true);
    apiClient.get(`/puzzles/custom/${level}`)
      .then(res => {
        if (!isMounted) return;
      
        const { pattern, gridSize: customSize = 5 } = res.data as {
          level: number;
          pattern: number[];
          minMoves: number;
          gridSize: number;
        };
        // Update grid size if provided
        setGridSize(customSize);
        // Build grid from pattern
        const newGrid = Array.from({length: gridSize}, () => 
          Array.from({length: gridSize}, () => false)
        );
         console.log("empty newGrid:", newGrid);
        console.log("pattern:", pattern);
        pattern.forEach(linear => {
          const [r, c] = linearToRC(linear, customSize);
          // toggle single cell
          newGrid[r][c] = !newGrid[r][c];
        });
        setGridSize(customSize);
        setGrid(newGrid);

        setInitialGrid(JSON.parse(JSON.stringify(newGrid)));
        setMoveCount(0);
        setWon(false);
        setPatternError(null);
      })
      .catch(err => {
        console.error('Failed to load custom puzzle:', err);
        if (isMounted) setPatternError('Failed to load custom puzzle');
      })
      .finally(() => { if (isMounted) setIsLoadingPatterns(false); });
    return () => { isMounted = false; };
  }, [gameMode, level, /* toggleCell */, linearToRC]);

  // Modified useEffect to use the new default grid size or skip for custom
  useEffect(() => {
    if (gameMode !== "classic") return;
    let isMounted = true;

    // Get level from URL params, location state, or default to 1
    const levelParam = level ? parseInt(level) : 1;
    const stateLevel = location.state?.level;
    const startLevel = stateLevel || levelParam;
    
    if (isMounted) {
      setCurrentLevel(startLevel);
      // Use fixed grid size of 5x5 for all levels
      const size = 5;
      setGridSize(size);
      
      // Initialize the game
      initializeGame(size, startLevel);
    }
    
    return () => {
      isMounted = false;
    };
  }, [level, location.state?.level, initializeGame, gameMode]);

  // Re-initialize when patterns are loaded for classic mode
  useEffect(() => {
    if (gameMode !== "classic") return;
    console.log('Patterns-loaded effect:', { isLoadingPatterns, classicPatterns, gameMode, gridSize, currentLevel });
    if (!isLoadingPatterns && Object.keys(classicPatterns).length > 0 && gameMode === "classic") {
      console.log('Calling initializeGame from patterns-loaded effect');
      initializeGame(gridSize, currentLevel);
    }
  }, [classicPatterns, isLoadingPatterns, gameMode, gridSize, currentLevel, initializeGame]);

  useEffect(() => {
    // only for classic mode
    if (gameMode !== "classic") return;
    if (!initialGrid.length) return;               // nothing to check yet
    const expected = classicPatterns[currentLevel]; // from your server fetch
    if (!expected) return;                         // no pattern yet

    const actual = gridToPattern(initialGrid);
    if (!arePatternsEqual(expected, actual)) {
      console.error(
        `Puzzle mismatch for level ${currentLevel}!`,
        "expected:", expected,
        "got     :", actual
      );
    } else {
      console.log(`Puzzle match verified for level ${currentLevel}`);
    }
  }, [initialGrid, classicPatterns, currentLevel, gameMode]);

  // Compute minimum moves for random puzzles using solver
  useEffect(() => {
    if (gameMode !== "random" || !initialGrid.length) return;
    const pattern = gridToPattern(initialGrid);
    setMinMoves(null);
    apiClient.post('/puzzles/validate', { pattern })
      .then(res => {
        console.log('Random puzzle minMoves:', res.data.minimumMoves);
        setMinMoves(res.data.minimumMoves);
      })
      .catch(err => console.error('Failed to validate random puzzle', err));
  }, [initialGrid, gameMode]);

  const handleCellClick = (row: number, col: number) => {
    if (won) return; // Don't allow moves after winning

    // Create a deep copy of the current grid to avoid mutation issues
    const newGrid = JSON.parse(JSON.stringify(grid));

    // Apply the toggle cell operation without auto-count
    toggleCell(newGrid, row, col, false);

    // Manually increment move count
    const newMoveCount = moveCount + 1;
    setMoveCount(newMoveCount);

    // Update the grid state with the new grid configuration
    setGrid(newGrid);

    // Check if all lights are off (win condition)
    const hasWon = newGrid.every((row: boolean[]) => row.every((cell: boolean) => !cell));
    if (hasWon) {
      setWon(true);
      // Save the win and best score with the accurate move count
      saveGameProgress(newMoveCount);
    }
  };

  const saveGameProgress = async (movesParam?: number) => {
    const movesToSend = movesParam !== undefined ? movesParam : moveCount;
    try {
      // Implement API call to save progress with accurate moves
      const response = await apiClient.post("/game/progress", {
        level: currentLevel,
        moves: movesToSend,
        completed: true
      });
      console.log("Game progress saved:", response.data);
    } catch (error: any) {
      // Don't log auth errors since they're handled by the client
      if (error.response?.status !== 401) {
        console.error("Failed to save game progress:", error);
      }
    }
  };

  const goToNextLevel = () => {
    const nextLevel = currentLevel + 1;
    setCurrentLevel(nextLevel);
    // Keep the grid size constant at 5x5
    initializeGame(gridSize, nextLevel);
    
    // Update URL
    navigate(`/game/${nextLevel}`);
  };

  // Toggle showing indices
  const toggleIndices = () => {
    setShowIndices(!showIndices);
  };

  // Toggle game mode
  const toggleGameMode = () => {
    const newMode = gameMode === "classic" ? "random" : "classic";
    setGameMode(newMode);
    // Reinitialize the game with the new mode
    initializeGame(gridSize, currentLevel);
  };

  // Reset the current puzzle to its initial state
  const handleResetPuzzle = () => {
    // Restore the initial grid state
    if (initialGrid.length) {
      const restored = JSON.parse(JSON.stringify(initialGrid));
      setGrid(restored);
      setMoveCount(0);
      setWon(false);
    }
  };

  return (
    <div className="game-container">
      <h1>Lights Out</h1>
      <br></br>
      <h1>Level {currentLevel}</h1>
      <div className="game-header">
        
        <div className="game-stats">
          <span>Moves: {moveCount}</span>
          {gameMode === "random" && minMoves !== null && (
            <span>Min Moves: {minMoves}</span>
          )}
          <button onClick={handleResetPuzzle} className="back-button">
            Reset Puzzle
          </button>
          <button onClick={toggleIndices} className="index-toggle-button">
            {showIndices ? "Hide Indices" : "Show Indices"}
          </button>
          <button onClick={toggleGameMode} className="mode-toggle-button">
            Mode: {gameMode === 'classic' ? 'Classic' : gameMode === 'random' ? 'Random' : 'Custom'}
          </button>
          
          <button onClick={() => navigate("/profile")} className="back-button">
            Back to Profile
          </button>
        </div>
      </div>

      {isLoadingPatterns && gameMode === "classic" ? (
        <div className="loading-message">Loading puzzles...</div>
      ) : patternError ? (
        <div className="error-message">{patternError}</div>
      ) : (
        <div className="light-grid-wrapper">
          <div className="light-grid">
            {grid.map((row, rowIndex) => (
              <div key={rowIndex} className="light-row">
                {row.map((isOn, colIndex) => {
                  const linearIndex = rcToLinear(rowIndex, colIndex, gridSize);
                  return (
                    <button
                      key={`${rowIndex}-${colIndex}`}
                      id={`light-${linearIndex}`}
                      className={`light-button ${isOn ? "on" : "off"}`}
                      onClick={() => handleCellClick(rowIndex, colIndex)}
                    >
                      {showIndices && linearIndex}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          {won && (
            <div className="win-message">
              <h2>Level Complete!</h2>
              <p>You completed level {currentLevel} in {moveCount} moves.</p>
              {gameMode === "custom" ? (
                <button onClick={() => navigate('/saved-maps')} className="next-level-button">
                  Back to Saved Maps
                </button>
              ) : (
                <button onClick={goToNextLevel} className="next-level-button">
                  Next Level
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Game; 