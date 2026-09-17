# GD_PROJECT: 3D Maze Game (Unity)

A 3D maze game built in Unity with C#. You move through generated mazes, collect coins
and power-ups, avoid traps and enemies, and reach the exit to clear the level.

## Features

- **Procedural mazes:** `MazeGenerator.cs` builds walls, paths, obstacles and traps at runtime
- **Enemies:** NavMesh-driven enemies that shoot at the player (`EnemyController.cs`, `Bullet.cs`)
- **Player:** physics-based movement and health (`PlayerController.cs`, `PlayerHealth.cs`)
- **Collectibles:** coins (`CoinManager.cs`) and power-ups (`PowerUpManager.cs`)
- **Game flow:** singleton `GameManager` for start, pause, game over, victory and level transitions
- **UI:** HUD, pause, game-over and victory panels (`UIManager.cs`)
- **Audio:** persistent background music and sound effects (`AudioManager.cs`)
- **Levels:** main menu plus 5 level scenes

## Repository layout

This repository contains the contents of the Unity project's `Assets/` folder:

| Folder | Contents |
|---|---|
| `Core/` | Gameplay scripts (player, enemies, coins, power-ups, levels, menu) |
| `Environment/` | Maze generation and obstacles |
| `UI/` | UI manager and panel prefabs |
| `Audio/` | Audio manager |
| `Scenes/` | `MainMenu` and `Level1`–`Level5` |
| `Materials/` | Materials, physics material and textures |
| `GameManager.cs` | Top-level game state |

Design notes: [Project Structure](Project%20Structure.md) · [Hierarchy Structure](Hierarchy%20Structure.md) · [Core scripts](Core/Scripts%20Details.md)

## Running it

1. Create a new 3D project in Unity Hub.
2. Copy this repository's contents into the project's `Assets/` folder.
3. Install **TextMesh Pro** when Unity prompts you.
4. Install **Cinemachine** from the Package Manager (the player camera uses it).
5. Add `MainMenu` and `Level1`–`Level5` to **File → Build Settings** in that order.
6. Open `Scenes/MainMenu.unity` and press Play.

## Controls

| Key | Action |
|---|---|
| WASD / arrow keys | Move |
| Esc | Pause / resume |

Collect every coin to open the exit door, then reach the exit to finish the level.

> Some third-party asset packs referenced by `.meta` files (for example `JMO Assets`,
> `ManNeko_Assets`, `VolumetricLines`, `Laser Weapons Sound Pack`) are not included.
> Re-import them from the Unity Asset Store for the full visuals and sound.
