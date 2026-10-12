export const CELL = 32;
const COLS = 40, ROWS = 25;
export function makeGrid(obstacles) {
  return Array.from({ length: ROWS }, (_, y) => Array.from({ length: COLS }, (_, x) => {
    const px = x * CELL + CELL / 2, py = y * CELL + CELL / 2;
    return px < 112 || px > 1168 || py < 128 || py > 712 || obstacles.some(o => Math.abs(px - o.x) < o.w / 2 + 23 && Math.abs(py - o.y) < o.h / 2 + 23);
  }));
}
export function findPath(grid, from, to) {
  const cell = p => ({ x: Math.max(0, Math.min(COLS - 1, Math.floor(p.x / CELL))), y: Math.max(0, Math.min(ROWS - 1, Math.floor(p.y / CELL))) });
  const start = cell(from), end = cell(to);
  const key = p => p.y * COLS + p.x;
  const queue = [start], visited = new Set([key(start)]), parents = new Map();
  let found;
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    if (current.x === end.x && current.y === end.y) { found = current; break; }
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const next = { x: current.x + dx, y: current.y + dy };
      if (next.x < 0 || next.y < 0 || next.x >= COLS || next.y >= ROWS || grid[next.y][next.x] || visited.has(key(next))) continue;
      visited.add(key(next)); parents.set(key(next), current); queue.push(next);
    }
  }
  if (!found) return [];
  const path = [];
  while (key(found) !== key(start)) { path.push({ x: found.x * CELL + CELL / 2, y: found.y * CELL + CELL / 2 }); found = parents.get(key(found)); }
  return path.reverse();
}
