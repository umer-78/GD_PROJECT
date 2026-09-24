# GD_PROJECT: 3D Maze Game (Unity)

[![CI](https://github.com/umer-78/GD_PROJECT/actions/workflows/ci.yml/badge.svg)](https://github.com/umer-78/GD_PROJECT/actions/workflows/ci.yml)

**Live demo:** https://umer-78.github.io/GD_PROJECT/

A 3D maze game built in Unity 2019.4 with C#. Collect every coin to open the
exit door, avoid the guards, and walk into the exit to clear the level.

## Features

- **5 hand-authored levels** plus a main menu (Level1–Level5 are in Build Settings)
- **Enemies:** NavMesh-driven guards that patrol and shoot (`EnemyController.cs`, `Bullet.prefab`)
- **Player:** physics-based movement and health (`PlayerController.cs`, `PlayerHealth.cs`)
- **Collectibles:** coins open the exit door when all are collected (`CoinManager.cs`)
- **Game flow:** `GameManager` for pause / game over / victory; `LevelManager` for level progression
- **UI:** HUD, pause, game-over and victory panels (`UIManager.cs`)
- **Audio:** persistent background music and sound effects (`AudioManager.cs`)
- **Exit:** walk into the exit zone (tag `END`) to complete the level
- **Optional / unused scripts (not wired in shipped scenes):** `PowerUpManager.cs`,
  `MazeGenerator.cs`, `ExitController.cs` — present for experimentation only

## Repository layout

| Folder | Contents |
|---|---|
| `Assets/Core/` | Gameplay scripts |
| `Assets/Environment/` | Maze generation and obstacles |
| `Assets/UI/` | UI manager and panel prefabs |
| `Assets/Audio/` | Audio manager |
| `Assets/Prefabs/` | Wall, Coin, Guard, door, Floor, Bullet, Player model |
| `Assets/Scenes/` | `MainMenu` and `Level1`–`Level5` |
| `Assets/Materials/` | Materials, physics material and textures |

Design notes: [Project Structure](<Project Structure.md>) · [Hierarchy Structure](<Assets/Hierarchy Structure.md>) · [Core scripts](<Assets/Core/Scripts Details.md>)

## Running it

1. Open this folder as a Unity project (Unity 2019.4.x).
2. Let the Package Manager resolve Cinemachine and TextMesh Pro.
3. Open `Assets/Scenes/MainMenu.unity` and press Play.

Build Settings already list MainMenu and Level1–Level5 in order.

## Controls

| Key | Action |
|---|---|
| WASD / arrow keys | Move |
| Esc | Pause / resume |

Collect every coin to open the exit door, then walk into the exit to finish the level.

> Audio clips, particle effects and some third-party art packs are not shipped in this
> repository. Null references are handled at runtime; re-import packs from the Asset Store
> for full visuals and sound.
