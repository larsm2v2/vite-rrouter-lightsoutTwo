"use strict";
/**
 * Game puzzle patterns for Lights Out game
 * Converted from row-column (r-c) format to linear index (1-25 for a 5x5 grid)
 * Linear index = (row * 5) + column + 1
 */
Object.defineProperty(exports, "__esModule", { value: true });
// Function to convert row-column (RC) notation to linear index
function rcToLinear(rc) {
    const [row, col] = rc.split('-').map(Number);
    return (row * 5) + col + 1;
}
// Original puzzle data in RC format
const rcPuzzles = {
    easy: {
        level1: ["0-0", "0-2", "0-4", "2-0", "2-2", "2-4", "4-0", "4-2", "4-4"],
        level2: ["0-1", "0-3", "1-0", "1-2", "1-4", "2-1", "2-3", "3-0", "3-2", "3-4", "4-1", "4-3"],
        level3: ["0-0", "0-1", "0-3", "0-4", "1-0", "1-4", "2-0", "2-4", "3-0", "3-4", "4-0", "4-1", "4-3", "4-4"],
        level4: ["0-1", "0-2", "0-3", "1-0", "1-4", "2-0", "2-4", "3-0", "3-4", "4-1", "4-2", "4-3"],
        level5: ["0-2", "1-1", "1-3", "2-0", "2-2", "2-4", "3-1", "3-3", "4-2"]
    },
    medium: {
        level1: ["0-0", "0-4", "1-1", "1-3", "2-2", "3-1", "3-3", "4-0", "4-4"],
        level2: ["0-1", "0-3", "1-0", "1-2", "1-4", "2-1", "2-3", "3-0", "3-2", "3-4", "4-1", "4-3"],
        level3: ["0-0", "0-2", "0-4", "1-1", "1-3", "2-0", "2-2", "2-4", "3-1", "3-3", "4-0", "4-2", "4-4"],
        level4: ["0-0", "0-1", "0-3", "0-4", "1-0", "1-4", "3-0", "3-4", "4-0", "4-1", "4-3", "4-4"],
        level5: ["0-1", "0-3", "1-0", "1-2", "1-4", "3-0", "3-2", "3-4", "4-1", "4-3"]
    },
    hard: {
        level1: ["0-1", "0-3", "1-0", "1-2", "1-4", "2-1", "2-3", "3-0", "3-2", "3-4", "4-1", "4-3"],
        level2: ["0-0", "0-1", "0-3", "0-4", "2-1", "2-3", "4-0", "4-1", "4-3", "4-4"],
        level3: ["0-0", "0-2", "0-4", "2-0", "2-2", "2-4", "4-0", "4-2", "4-4"],
        level4: ["0-0", "0-4", "1-1", "1-3", "2-0", "2-2", "2-4", "3-1", "3-3", "4-0", "4-4"],
        level5: ["0-1", "0-3", "1-0", "1-2", "1-4", "2-1", "2-3", "3-0", "3-2", "3-4", "4-1", "4-3"]
    },
    expert: {
        level1: ["0-0", "0-1", "0-3", "0-4", "1-0", "1-4", "2-0", "2-4", "3-0", "3-4", "4-0", "4-1", "4-3", "4-4"],
        level2: ["0-0", "0-2", "0-4", "1-1", "1-3", "2-0", "2-2", "2-4", "3-1", "3-3", "4-0", "4-2", "4-4"],
        level3: ["0-2", "1-1", "1-3", "2-0", "2-2", "2-4", "3-1", "3-3", "4-2"],
        level4: ["0-0", "0-4", "2-0", "2-2", "2-4", "4-0", "4-4"],
        level5: ["0-0", "0-1", "0-2", "0-3", "0-4", "1-0", "1-4", "2-0", "2-4", "3-0", "3-4", "4-0", "4-1", "4-2", "4-3", "4-4"]
    }
};
// Convert RC puzzles to linear indices
const puzzleCollections = {
    easy: {
        level1: [],
        level2: [],
        level3: [],
        level4: [],
        level5: []
    },
    medium: {
        level1: [],
        level2: [],
        level3: [],
        level4: [],
        level5: []
    },
    hard: {
        level1: [],
        level2: [],
        level3: [],
        level4: [],
        level5: []
    },
    expert: {
        level1: [],
        level2: [],
        level3: [],
        level4: [],
        level5: []
    }
};
Object.keys(rcPuzzles).forEach((difficulty) => {
    const diff = difficulty;
    Object.keys(rcPuzzles[difficulty]).forEach((level) => {
        const lvl = level;
        puzzleCollections[diff][lvl] = rcPuzzles[difficulty][level].map(rcToLinear);
    });
});
exports.default = puzzleCollections;
