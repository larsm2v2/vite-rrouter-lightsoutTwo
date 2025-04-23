// Utility to convert a Lights‑Out grid (boolean[][]) into a linear‑index pattern
export function gridToPattern(grid: boolean[][]): number[] {
  const size = grid.length;
  const pattern: number[] = [];
  grid.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell) pattern.push(r * size + c + 1);
    })
  );
  // sort so comparisons are order‑insensitive
  return pattern.sort((a, b) => a - b);
}

// Compare two linear patterns for exact match (ignores ordering)
export function arePatternsEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const [x, y] = [a.slice().sort((u, v) => u - v), b.slice().sort((u, v) => u - v)];
  return x.every((val, i) => val === y[i]);
} 