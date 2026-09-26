# GD_PROJECT: Treasure Hunt, a 3D maze game (Unity)

[![CI](https://github.com/umer-78/GD_PROJECT/actions/workflows/ci.yml/badge.svg)](https://github.com/umer-78/GD_PROJECT/actions/workflows/ci.yml)

**Live demo:** https://umer-78.github.io/GD_PROJECT/ · **Play in the browser:** https://umer-78.github.io/GD_PROJECT/play/

A 3D maze game built in Unity 2019.4 with C#. Collect every coin to open the
exit door, avoid the guards, and walk into the exit to clear the level.

The playable browser version is a port in three.js ([`docs/play/`](docs/play/)), because the
Unity project's 3D models were never committed to this repository (see the note at the end).

## Browser version

- **Five temple levels**, each a seeded maze (recursive backtracker, with some dead ends opened
  into loops so there is always a way around a sentry), with its own stone and light
- **Sentries** patrol set routes. What they can see is drawn on the floor as a lit cone, cut off
  by walls; they turn red when they spot you, charge for 0.75 s, then fire a slow orb (15 damage)
- **Spike traps** glow orange for 0.7 s before they rise (10 damage)
- **Every hit is named on screen**, with an arrow pointing to where it came from
- **Third-person camera** that turns in quarter turns (Q/E) or freely (drag), and always stays
  above the wall tops, so it never ends up inside a wall; the explorer shows through walls as
  a silhouette
- **Keyboard and mouse, touch, or gamepad**; a map that fills in as you explore; best times
  and unlocked levels saved in the browser; synthesised sound, no audio files
- About 220 KB to download, compressed

| Key | Action |
|---|---|
| WASD / arrow keys | Move (relative to the camera) |
| Shift | Run |
| Space | Dash (you cannot be hit mid-dash) |
| Q / E, or drag | Turn the camera |
| Mouse wheel | Zoom |
| P / Esc | Pause |
| M | Sound on or off |

On a phone, the left thumb moves, the right thumb turns the camera, and the Dash button dashes.

### Tests

```bash
node --test tests/*.test.mjs                  # the maze, layout, collision and sight (7 tests)
npm install --prefix tests && tests/node_modules/.bin/playwright install chromium
node --test tests/play.browser.mjs            # plays the game in headless Chromium (11 tests)
```

The browser tests start a level and check that W walks away from the camera, the explorer
never ends up inside a wall, the camera stays above the walls, coins open the exit, a sentry's
hit is named and pointed at, traps warn before they rise, and the lose screen names the cause.
CI runs both.

## Unity project

### Features

- **5 hand-authored levels** plus a main menu (Level1–Level5 are in Build Settings)
- **Enemies:** NavMesh-driven guards that patrol and shoot (`EnemyController.cs`, `Bullet.prefab`)
- **Player:** physics-based movement and health (`PlayerController.cs`, `PlayerHealth.cs`)
- **Collectibles:** coins open the exit door when all are collected (`CoinManager.cs`)
- **Obstacles:** each level has moving and rotating obstacles that damage the player on contact (`ObstacleController.cs`)
- **Game flow:** `GameManager` for pause / game over / victory; `LevelManager` for level progression
- **UI:** HUD, pause, game-over and victory panels (`UIManager.cs`)
- **Audio:** persistent background music and sound effects (`AudioManager.cs`)
- **Exit:** walk into the exit zone (tag `END`) to complete the level
- **Optional / unused scripts (not wired in shipped scenes):** `PowerUpManager.cs`,
  `MazeGenerator.cs`, `ExitController.cs` — present for experimentation only

### Repository layout

| Folder | Contents |
|---|---|
| `Assets/Core/` | Gameplay scripts |
| `Assets/Environment/` | Obstacles (`ObstacleController.cs`) and the unused `MazeGenerator.cs` |
| `Assets/UI/` | UI manager and panel prefabs |
| `Assets/Audio/` | Audio manager |
| `Assets/Prefabs/` | Wall, Coin, Guard, door, Floor, Bullet, Player model |
| `Assets/Scenes/` | `MainMenu` and `Level1`–`Level5` |
| `Assets/Materials/` | Materials, physics material and textures |
| `docs/` | The project page, the three.js browser version (`docs/play/`) and the Unity WebGL build (`docs/unity/`) |
| `tests/` | Tests for the browser version |

Design notes: [Project Structure](<Project Structure.md>) · [Hierarchy Structure](<Assets/Hierarchy Structure.md>) · [Core scripts](<Assets/Core/Scripts Details.md>)

### Running it

1. Open this folder as a Unity project (Unity 2019.4.x).
2. Let the Package Manager resolve Cinemachine and TextMesh Pro.
3. Open `Assets/Scenes/MainMenu.unity` and press Play.

Build Settings already list MainMenu and Level1–Level5 in order.

To rebuild the browser version, run the `WebGLBuild.Build` editor script in batch mode:

```bash
Unity -batchmode -quit -projectPath . -executeMethod WebGLBuild.Build -buildPath build/WebGL
```

then copy `build/WebGL/Build/` into `docs/unity/Build/`. On macOS 12.3 and later, Unity 2019 needs
`EMSDK_PYTHON` set to a Python 3 (3.11 or older), because `/usr/bin/python` no longer exists.

### Controls

| Key | Action |
|---|---|
| WASD / arrow keys | Move |
| Esc or P | Pause / resume |

Collect every coin to open the exit door, then walk into the exit to finish the level.

> Audio clips, particle effects and the third-party art packs (the 3D models and most
> textures) are not shipped in this repository. Null references are handled at runtime;
> re-import the packs from the Asset Store for full visuals and sound. Without them the
> Unity build runs without its art, which is why the browser version is a separate port.
