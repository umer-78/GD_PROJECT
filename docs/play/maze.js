// Maze generation and grid geometry for Treasure Hunt. Pure functions and no three.js,
// so the same code runs, and is tested, in Node as well as in the browser.
//
// A maze of w x h cells is a (2w + 1) x (2h + 1) grid of square tiles: cells sit on odd
// tiles, walls fill everything else, and carving a passage clears the tile between two
// cells. Tile (tx, tz) covers world x in [tx*S, (tx+1)*S] and z in [tz*S, (tz+1)*S].

export const LEVELS = [
  { name: 'The Courtyard', seed: 3, cells: 6, coins: 6, enemies: 1, traps: 0, potions: 1, fireEvery: 2.8 },
  { name: 'Mossy Halls', seed: 5, cells: 7, coins: 8, enemies: 2, traps: 2, potions: 1, fireEvery: 2.5 },
  { name: 'Sunken Gallery', seed: 8, cells: 8, coins: 9, enemies: 3, traps: 3, potions: 2, fireEvery: 2.2 },
  { name: 'Idol Vault', seed: 13, cells: 9, coins: 10, enemies: 4, traps: 4, potions: 2, fireEvery: 2.0 },
  { name: 'Heart of the Temple', seed: 21, cells: 10, coins: 12, enemies: 5, traps: 6, potions: 2, fireEvery: 1.8 },
];

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STEPS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** Recursive-backtracker maze; `braid` is the share of dead ends opened into loops, so there is always a way around a guard. */
export function generate(w, h, random, braid = 0.3) {
  const grid = Array.from({ length: 2 * h + 1 }, () => new Array(2 * w + 1).fill(true));
  const seen = new Set(['0,0']);
  const stack = [[0, 0]];
  grid[1][1] = false;
  while (stack.length) {
    const [cx, cz] = stack[stack.length - 1];
    const next = STEPS.map(([dx, dz]) => [cx + dx, cz + dz])
      .filter(([x, z]) => x >= 0 && z >= 0 && x < w && z < h && !seen.has(`${x},${z}`));
    if (!next.length) {
      stack.pop();
      continue;
    }
    const [nx, nz] = next[Math.floor(random() * next.length)];
    grid[cz + nz + 1][cx + nx + 1] = false;
    grid[2 * nz + 1][2 * nx + 1] = false;
    seen.add(`${nx},${nz}`);
    stack.push([nx, nz]);
  }
  for (const [tx, tz] of deadEnds(grid)) {
    if (random() >= braid) continue;
    const walls = STEPS.filter(([dx, dz]) => {
      const wx = tx + dx, wz = tz + dz, bx = tx + 2 * dx, bz = tz + 2 * dz;
      return grid[wz][wx] && bz > 0 && bx > 0 && bz < grid.length - 1 && bx < grid[0].length - 1;
    });
    if (walls.length) {
      const [dx, dz] = walls[Math.floor(random() * walls.length)];
      grid[tz + dz][tx + dx] = false;
    }
  }
  return grid;
}

export const isWall = (grid, tx, tz) => tz < 0 || tx < 0 || tz >= grid.length || tx >= grid[0].length || grid[tz][tx];

export function cells(grid) {
  const out = [];
  for (let tz = 1; tz < grid.length; tz += 2) for (let tx = 1; tx < grid[0].length; tx += 2) out.push([tx, tz]);
  return out;
}

export function deadEnds(grid) {
  return cells(grid).filter(([tx, tz]) => STEPS.filter(([dx, dz]) => !grid[tz + dz][tx + dx]).length === 1);
}

/** Steps from (tx, tz) to every open tile. */
export function distances(grid, tx, tz) {
  const dist = new Map([[`${tx},${tz}`, 0]]);
  const queue = [[tx, tz]];
  while (queue.length) {
    const [x, z] = queue.shift();
    for (const [dx, dz] of STEPS) {
      const key = `${x + dx},${z + dz}`;
      if (!isWall(grid, x + dx, z + dz) && !dist.has(key)) {
        dist.set(key, dist.get(`${x},${z}`) + 1);
        queue.push([x + dx, z + dz]);
      }
    }
  }
  return dist;
}

/** The open tiles on a shortest path from a to b, both ends included. */
export function path(grid, [ax, az], [bx, bz]) {
  const dist = distances(grid, bx, bz);
  if (!dist.has(`${ax},${az}`)) return [];
  const out = [[ax, az]];
  let [x, z] = [ax, az];
  while (x !== bx || z !== bz) {
    const d = dist.get(`${x},${z}`);
    [x, z] = STEPS.map(([dx, dz]) => [x + dx, z + dz]).find(([nx, nz]) => dist.get(`${nx},${nz}`) === d - 1);
    out.push([x, z]);
  }
  return out;
}

export const tileOf = (S, x, z) => [Math.floor(x / S), Math.floor(z / S)];
export const centre = (S, tx, tz) => [(tx + 0.5) * S, (tz + 0.5) * S];

/** Push a circle of radius r at (x, z) out of any wall tile it overlaps. */
export function collide(grid, S, x, z, r) {
  const [cx, cz] = tileOf(S, x, z);
  for (let pass = 0; pass < 2; pass++) {
    for (let tz = cz - 1; tz <= cz + 1; tz++) {
      for (let tx = cx - 1; tx <= cx + 1; tx++) {
        if (!isWall(grid, tx, tz)) continue;
        const nx = Math.max(tx * S, Math.min(x, (tx + 1) * S));
        const nz = Math.max(tz * S, Math.min(z, (tz + 1) * S));
        const dx = x - nx, dz = z - nz, d2 = dx * dx + dz * dz;
        if (d2 >= r * r) continue;
        if (d2 > 1e-9) {
          const d = Math.sqrt(d2);
          x = nx + (dx / d) * r;
          z = nz + (dz / d) * r;
        } else {
          // centre inside the tile: leave through the nearest face
          const faces = [[x - tx * S, -1, 0], [(tx + 1) * S - x, 1, 0], [z - tz * S, 0, -1], [(tz + 1) * S - z, 0, 1]];
          const [depth, fx, fz] = faces.sort((a, b) => a[0] - b[0])[0];
          x += fx * (depth + r);
          z += fz * (depth + r);
        }
      }
    }
  }
  return [x, z];
}

/** True when the straight segment from a to b crosses no wall tile (grid traversal, Amanatides and Woo). */
export function lineOfSight(grid, S, ax, az, bx, bz) {
  let [tx, tz] = tileOf(S, ax, az);
  const [ex, ez] = tileOf(S, bx, bz);
  const dx = bx - ax, dz = bz - az;
  const stepX = Math.sign(dx), stepZ = Math.sign(dz);
  const tDeltaX = stepX ? S / Math.abs(dx) : Infinity;   // in units of the whole segment
  const tDeltaZ = stepZ ? S / Math.abs(dz) : Infinity;
  let tMaxX = stepX ? ((stepX > 0 ? (tx + 1) * S : tx * S) - ax) / dx : Infinity;
  let tMaxZ = stepZ ? ((stepZ > 0 ? (tz + 1) * S : tz * S) - az) / dz : Infinity;
  for (;;) {
    if (isWall(grid, tx, tz)) return false;
    if ((tx === ex && tz === ez) || Math.min(tMaxX, tMaxZ) > 1) return true;
    if (tMaxX < tMaxZ) {
      tx += stepX;
      tMaxX += tDeltaX;
    } else {
      tz += stepZ;
      tMaxZ += tDeltaZ;
    }
  }
}

/** Distance from (x, z) along the unit vector (dx, dz) to the first wall, at most max. Sight cones are drawn with it. */
export function rayDistance(grid, S, x, z, dx, dz, max) {
  let [tx, tz] = tileOf(S, x, z);
  if (isWall(grid, tx, tz)) return 0;
  const stepX = Math.sign(dx), stepZ = Math.sign(dz);
  if (!stepX && !stepZ) return max;
  const tDeltaX = stepX ? S / Math.abs(dx) : Infinity;
  const tDeltaZ = stepZ ? S / Math.abs(dz) : Infinity;
  let tMaxX = stepX ? ((stepX > 0 ? (tx + 1) * S : tx * S) - x) / dx : Infinity;
  let tMaxZ = stepZ ? ((stepZ > 0 ? (tz + 1) * S : tz * S) - z) / dz : Infinity;
  for (;;) {
    let t;
    if (tMaxX < tMaxZ) {
      t = tMaxX;
      tx += stepX;
      tMaxX += tDeltaX;
    } else {
      t = tMaxZ;
      tz += stepZ;
      tMaxZ += tDeltaZ;
    }
    if (t >= max) return max;
    if (isWall(grid, tx, tz)) return t;
  }
}

/** Start, exit, coins, potions, guard posts and spike traps for a level, all on open tiles. */
export function layout(grid, level, random) {
  const start = [1, 1];
  const dist = distances(grid, ...start);
  const open = cells(grid).filter(([x, z]) => dist.has(`${x},${z}`));
  const byDistance = [...open].sort((a, b) => dist.get(`${b[0]},${b[1]}`) - dist.get(`${a[0]},${a[1]}`));
  const exit = byDistance[0];
  const taken = new Set([start.join(), exit.join()]);
  const take = (list, n, ok = () => true) => {
    const out = [];
    for (const c of list) {
      if (out.length === n) break;
      if (!taken.has(c.join()) && ok(c)) {
        out.push(c);
        taken.add(c.join());
      }
    }
    return out;
  };
  const shuffled = (list) => list.map((c) => [random(), c]).sort((a, b) => a[0] - b[0]).map(([, c]) => c);
  const ends = shuffled(deadEnds(grid));
  const coins = take(ends, level.coins);
  coins.push(...take(shuffled(open), level.coins - coins.length));
  const potions = take(ends, level.potions);
  potions.push(...take(shuffled(open), level.potions - potions.length));
  // guards start well away from the entrance, so the first seconds are safe
  const far = (c) => dist.get(c.join()) >= 8;
  const guards = take(shuffled(open), level.enemies, far).map((post) => {
    const reachable = open.filter((c) => {
      const d = Math.abs(c[0] - post[0]) + Math.abs(c[1] - post[1]);
      return d >= 4 && d <= 8 && far(c);
    });
    const end = reachable.length ? reachable[Math.floor(random() * reachable.length)] : post;
    return { post, route: path(grid, post, end) };
  });
  // traps sit in the passages between cells, away from the entrance and spread apart
  const passages = shuffled([...dist.keys()].map((k) => k.split(',').map(Number)))
    .filter(([x, z]) => (x + z) % 2 === 1 && dist.get(`${x},${z}`) >= 6);
  const traps = [];
  for (const t of passages) {
    if (traps.length === (level.traps || 0)) break;
    if (traps.every(([x, z]) => Math.abs(x - t[0]) + Math.abs(z - t[1]) > 4)) traps.push(t);
  }
  return { start, exit, coins, potions, guards, traps };
}
