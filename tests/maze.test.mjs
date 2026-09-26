import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, cells, collide, distances, generate, isWall, layout, lineOfSight, path, rayDistance, rng } from '../docs/play/maze.js';

const S = 3;

test('every cell of every level is reachable, and the maze is the same for the same seed', () => {
  for (const [i, level] of LEVELS.entries()) {
    const grid = generate(level.cells, level.cells, rng(100 + i));
    const dist = distances(grid, 1, 1);
    assert.equal(cells(grid).filter(([x, z]) => !dist.has(`${x},${z}`)).length, 0, level.name);
    assert.deepEqual(generate(level.cells, level.cells, rng(100 + i)), grid);
    assert.ok(grid[0].every(Boolean) && grid.at(-1).every(Boolean), 'the outer wall is closed');
  }
});

test('the layout puts the exit furthest away, keeps guards off the entrance, and never stacks items', () => {
  for (const [i, level] of LEVELS.entries()) {
    const grid = generate(level.cells, level.cells, rng(7 + i));
    const plan = layout(grid, level, rng(9 + i));
    const dist = distances(grid, 1, 1);
    const d = (c) => dist.get(c.join());
    assert.equal(plan.coins.length, level.coins);
    assert.equal(plan.guards.length, level.enemies);
    assert.ok(cells(grid).every((c) => d(c) <= d(plan.exit)));
    assert.ok(plan.guards.every((g) => d(g.post) >= 8), 'no guard near the start');
    const all = [plan.start, plan.exit, ...plan.coins, ...plan.potions].map(String);
    assert.equal(new Set(all).size, all.length);
    for (const g of plan.guards) {
      assert.ok(g.route.every(([x, z]) => !isWall(grid, x, z)), 'patrol routes stay in the corridors');
    }
  }
});

test('collision keeps a circle out of walls and slides along them', () => {
  const grid = [[true, true, true], [true, false, true], [true, true, true]];
  const [x, z] = collide(grid, S, 3.1, 4.5, 0.4);
  assert.ok(x >= 3.4 - 1e-9, 'pushed off the left wall');
  assert.equal(z, 4.5, 'no change along the wall');
  const [cx, cz] = collide(grid, S, 4.5, 4.5, 0.4);
  assert.deepEqual([cx, cz], [4.5, 4.5], 'the middle of a room is untouched');
});

test('line of sight is blocked by walls, including at a corner', () => {
  const open = [[false, false, false], [false, true, false], [false, false, false]];
  assert.equal(lineOfSight(open, S, 1.5, 1.5, 7.5, 1.5), true, 'along the top row');
  assert.equal(lineOfSight(open, S, 1.5, 4.5, 7.5, 4.5), false, 'through the pillar');
  assert.equal(lineOfSight(open, S, 1.5, 1.5, 7.5, 7.5), false, 'diagonally through the pillar');
  const corner = [[false, true], [true, false]];
  assert.equal(lineOfSight(corner, S, 1.5, 1.5, 4.5, 4.5), false, 'no seeing through a corner gap');
});

test('a ray stops at the first wall face, or at its maximum length', () => {
  const corridor = [[true, true, true, true, true], [true, false, false, false, true], [true, true, true, true, true]];
  assert.equal(rayDistance(corridor, S, 4.5, 4.5, 1, 0, 20), 7.5, 'to the far end of the corridor');
  assert.equal(rayDistance(corridor, S, 4.5, 4.5, 1, 0, 5), 5, 'capped');
  assert.equal(rayDistance(corridor, S, 4.5, 4.5, 0, -1, 20), 1.5, 'the side wall');
  assert.equal(rayDistance(corridor, S, 4.5, 4.5, -1, 0, 20), 1.5, 'the end wall behind');
  assert.equal(rayDistance(corridor, S, 1, 1, 1, 0, 20), 0, 'starting inside a wall');
});

test('every shipped level has its coins, guards and spike traps, with traps in passages away from the entrance', () => {
  for (const level of LEVELS) {
    const grid = generate(level.cells, level.cells, rng(level.seed));
    const plan = layout(grid, level, rng(level.seed * 7919 + 1));
    const dist = distances(grid, 1, 1);
    assert.equal(plan.coins.length, level.coins, level.name);
    assert.equal(plan.guards.length, level.enemies, level.name);
    assert.equal(plan.traps.length, level.traps, level.name);
    for (const [x, z] of plan.traps) {
      assert.ok(!isWall(grid, x, z) && (x + z) % 2 === 1, 'a trap sits in a passage');
      assert.ok(dist.get(`${x},${z}`) >= 6, 'no trap next to the entrance');
    }
    for (const [i, a] of plan.traps.entries()) {
      for (const b of plan.traps.slice(i + 1)) assert.ok(Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) > 4, 'traps are spread out');
    }
  }
});

test('path follows open tiles between two cells', () => {
  const grid = generate(5, 5, rng(3));
  const p = path(grid, [1, 1], [9, 9]);
  assert.deepEqual(p[0], [1, 1]);
  assert.deepEqual(p.at(-1), [9, 9]);
  for (let i = 1; i < p.length; i++) {
    assert.equal(Math.abs(p[i][0] - p[i - 1][0]) + Math.abs(p[i][1] - p[i - 1][1]), 1);
  }
});
