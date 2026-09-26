// Plays the browser version in headless Chromium: controls, collision, the camera, pick-ups,
// named damage, the win and lose screens, pause, and the phone layout.
// Needs Playwright:  npm install --prefix tests && tests/node_modules/.bin/playwright install chromium
// Run:               node --test tests/play.browser.mjs
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = fileURLToPath(new URL('../docs/', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.txt': 'text/plain', '.json': 'application/json' };
let server, browser, page, base;
const errors = [];

before(async () => {
  server = createServer(async (req, res) => {
    let path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
    if (path === '' || path.endsWith('/')) path += 'index.html';
    try {
      const body = await readFile(join(ROOT, path));
      res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  page = await open({ width: 640, height: 400 });
});

after(async () => {
  await browser?.close();
  server?.close();
});

async function open(viewport, extra = {}) {
  const p = await browser.newPage({ viewport, ...extra });
  p.on('pageerror', (e) => errors.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  p.setDefaultTimeout(30000);
  await p.goto(`${base}/play/?test`, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__game && document.getElementById('loading').hidden, null, { timeout: 60000 });
  return p;
}
const game = (fn, arg) => page.evaluate(fn, arg);

// stand a couple of tiles in front of a level's first sentry, inside its sight cone
function standInView(levelIndex) {
  return game((li) => {
    const g = window.__game;
    g.start(li);
    g.peaceful(false);
    const S = g.S, grid = g.grid(), s = g.info().sentries[0];
    const at = [Math.floor(s.x / S), Math.floor(s.z / S)];
    const dir = [Math.round(Math.sin(s.facing)), Math.round(Math.cos(s.facing))];
    let spot = at;
    for (let k = 1; k <= 3; k++) {
      const t = [at[0] + dir[0] * k, at[1] + dir[1] * k];
      if (grid[t[1]]?.[t[0]] === false) spot = t; else break;
    }
    g.teleport(...spot);
  }, levelIndex);
}

test('the menu lists the levels and Play starts level 1', async () => {
  assert.ok(await page.isVisible('#screenMenu'));
  assert.match(await page.textContent('#levels'), /The Courtyard/);
  await page.click('#btnPlay');
  const info = await game(() => window.__game.info());
  assert.equal(info.mode, 'play');
  assert.equal(info.level, 0);
  assert.equal(await page.textContent('#coins'), `0/${info.coins}`);
});

test('W walks away from the camera, and real key presses reach the game', async () => {
  await game(() => window.__game.peaceful(true));
  const a = await game(() => window.__game.step(0));
  await game(() => window.__game.key('KeyW', true));
  const b = await game(() => window.__game.step(0.6));
  await game(() => window.__game.key('KeyW', false));
  const moved = Math.hypot(b.player.x - a.player.x, b.player.z - a.player.z);
  const fx = a.player.x - a.camera.x, fz = a.player.z - a.camera.z;
  const along = ((b.player.x - a.player.x) * fx + (b.player.z - a.player.z) * fz) / Math.hypot(fx, fz);
  assert.ok(moved > 1.5, `moved ${moved}`);
  assert.ok(along > 0.9 * moved, `moved ${along} of ${moved} away from the camera`);
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(1500);
  await page.keyboard.up('KeyD');
  const c = await game(() => window.__game.info());
  assert.ok(Math.hypot(c.player.x - b.player.x, c.player.z - b.player.z) > 0.05, 'a held key moves the explorer');
});

test('the explorer never ends up in a wall, and the camera stays above the walls', async () => {
  const r = await game(() => {
    const g = window.__game, S = g.S, grid = g.grid();
    const inWall = [];
    let lowest = Infinity;
    for (const code of ['KeyW', 'KeyD', 'KeyS', 'KeyA', 'KeyW', 'KeyA']) {
      g.key(code, true);
      g.key('ShiftLeft', true);
      for (let i = 0; i < 40; i++) {
        const s = g.step(0.05);
        if (grid[Math.floor(s.player.z / S)][Math.floor(s.player.x / S)]) inWall.push(s.player);
        lowest = Math.min(lowest, s.camera.y);
      }
      g.key(code, false);
      g.key('ShiftLeft', false);
    }
    return { inWall, lowest, wall: g.WALL_H };
  });
  assert.equal(r.inWall.length, 0);
  assert.ok(r.lowest > r.wall + 0.5, `camera went down to ${r.lowest}`);
});

test('Q turns the camera a quarter turn', async () => {
  const turn = await game(() => {
    const g = window.__game;
    const a = g.info().camera;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyQ' }));
    const s = g.step(1);
    const ang = (c) => Math.atan2(c.x - s.player.x, c.z - s.player.z);
    const d = ang(s.camera) - ang(a);
    return Math.atan2(Math.sin(d), Math.cos(d));
  });
  assert.ok(Math.abs(Math.abs(turn) - Math.PI / 2) < 0.25, `turned ${turn} rad`);
});

test('every coin opens the exit, the exit wins the level, and progress is saved', async () => {
  const r = await game(() => {
    const g = window.__game, plan = g.plan();
    const counts = plan.coins.map(([tx, tz]) => { g.teleport(tx, tz); return g.step(0.1).collected; });
    const open = g.info().open;
    g.teleport(...plan.exit);
    return { counts, open, mode: g.step(0.2).mode };
  });
  assert.deepEqual(r.counts, r.counts.map((_, i) => i + 1));
  assert.ok(r.open);
  assert.equal(r.mode, 'won');
  assert.ok(await page.isVisible('#screenWin'));
  assert.match(await page.textContent('#statTime'), /^\d+:\d\d$/);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('treasure-hunt-progress')));
  assert.equal(saved.unlocked, 2);
  assert.ok(saved.best['0'] > 0);
});

test('a sentry that sees you hits for 15, and the hit is named and pointed at', async () => {
  await standInView(0);
  const r = await game(() => {
    const g = window.__game;
    let s = g.info();
    for (let i = 0; i < 60 && s.hp === 100; i++) s = g.step(0.1);
    return { hp: s.hp, state: s.sentries[0].state, events: s.events.map((e) => e.text) };
  });
  assert.equal(r.hp, 85);
  assert.ok(r.events.includes('Sentry orb −15'), JSON.stringify(r.events));
  assert.notEqual(r.state, 'patrol');
  assert.ok(await page.evaluate(() => document.getElementById('hitArrow').classList.contains('show')));
});

test('a spike trap warns, then rises and hits for 10', async () => {
  const r = await game(() => {
    const g = window.__game;
    g.start(1);
    g.peaceful(true);
    g.teleport(...g.plan().traps[0]);
    const phases = [];
    let s = g.info();
    for (let i = 0; i < 90 && s.hp === 100; i++) {
      s = g.step(0.05);
      if (phases.at(-1) !== s.traps[0].phase) phases.push(s.traps[0].phase);
    }
    return { hp: s.hp, phases, events: s.events.map((e) => e.text) };
  });
  assert.equal(r.hp, 90);
  assert.ok(r.events.includes('Spike trap −10'));
  assert.ok(r.phases.indexOf('warn') !== -1 && r.phases.indexOf('warn') < r.phases.lastIndexOf('up'), r.phases.join(' > '));
});

test('P pauses and resumes', async () => {
  await page.keyboard.press('KeyP');
  assert.equal(await game(() => window.__game.info().mode), 'paused');
  assert.ok(await page.isVisible('#screenPause'));
  await page.keyboard.press('KeyP');
  assert.equal(await game(() => window.__game.info().mode), 'play');
});

test('the lose screen says what hit you, and Try again restarts', async () => {
  await standInView(0);
  const mode = await game(() => {
    const g = window.__game;
    g.setHp(10);
    let s = g.info();
    for (let i = 0; i < 60 && s.mode === 'play'; i++) s = g.step(0.1);
    return s.mode;
  });
  assert.equal(mode, 'lost');
  assert.match(await page.textContent('#loseCause'), /sentry's orb/);
  await page.click('#btnRetry');
  assert.equal((await game(() => window.__game.info())).hp, 100);
});

test('a phone gets the touch controls, with the health bar clear of the left thumb', async () => {
  const phone = await open({ width: 844, height: 390 }, { hasTouch: true, isMobile: true });
  await phone.click('#btnPlay');
  assert.ok(await phone.isVisible('#btnDash'));
  const box = await phone.locator('.hud-bl').boundingBox();
  assert.ok(box.x > 200, JSON.stringify(box));
  await phone.close();
});

test('nothing went wrong in the console', () => {
  assert.deepEqual(errors, []);
});
