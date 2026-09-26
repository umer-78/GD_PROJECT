# GD_PROJECT: 3D Maze Game (Unity)

A 3D maze game built in Unity with C#. Collect coins, avoid guards, and reach the
exit (tag `END`) to clear each hand-authored level.

## Features

- **Hand-authored levels:** MainMenu + Level1–Level5 (not runtime-carved)
- **Enemies:** NavMesh-driven enemies that shoot at the player (`EnemyController.cs`, `Bullet.cs`)
- **Player:** physics-based movement and health (`PlayerController.cs`, `PlayerHealth.cs`)
- **Collectibles:** coins (`CoinManager.cs`) open the exit door when all are collected
- **Optional scripts (not attached in shipped scenes):** `PowerUpManager.cs`, `MazeGenerator.cs`, `ExitController.cs`
- **Game flow:** singleton `GameManager` for start, pause, game over, victory and level transitions
- **UI:** HUD, pause, game-over and victory panels (`UIManager.cs`)
- **Audio:** persistent background music and sound effects (`AudioManager.cs`)
- **Levels:** main menu plus 5 level scenes

## Repository layout

This folder is the Unity project's `Assets/` directory (see the
[root README](../README.md) for the full project):

| Folder | Contents |
|---|---|
| `Core/` | Gameplay scripts (player, enemies, coins, levels, menu; optional `PowerUpManager`) |
| `Environment/` | Obstacles (`ObstacleController.cs`) and the unused `MazeGenerator.cs` |
| `UI/` | UI manager and panel prefabs |
| `Audio/` | Audio manager |
| `Scenes/` | `MainMenu` and `Level1`–`Level5` |
| `Materials/` | Materials, physics material and textures |
| `GameManager.cs` | Top-level game state |

Design notes: [Project Structure](Project%20Structure.md) · [Hierarchy Structure](Hierarchy%20Structure.md) · [Core scripts](Core/Scripts%20Details.md) · [Full project tree](../Project%20Structure.md)

## Running it

1. Open the repository root as a Unity project (Unity 2019.4.x).
2. Let Package Manager resolve Cinemachine and TextMesh Pro.
3. Open `Scenes/MainMenu.unity` and press Play.

## Controls

| Key | Action |
|---|---|
| WASD / arrow keys | Move |
| Esc | Pause / resume |

Collect every coin to open the exit door, then reach the exit to finish the level.

> Some third-party asset packs referenced by `.meta` files (for example `JMO Assets`,
> `ManNeko_Assets`, `VolumetricLines`, `Laser Weapons Sound Pack`) are not included.
> Re-import them from the Unity Asset Store for the full visuals and sound.
