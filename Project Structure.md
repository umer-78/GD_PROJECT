# Project Structure

```
Assets/
├── Audio/
│   ├── AudioManager.cs
│   └── DontDestroyOnLoad.cs
├── Core/
│   ├── Bullet.cs
│   ├── CoinManager.cs
│   ├── EnemyController.cs
│   ├── ExitController.cs
│   ├── LevelManager.cs
│   ├── MenuManager.cs
│   ├── PlayerController.cs
│   ├── PlayerHealth.cs
│   ├── PowerUpManager.cs
│   └── Scripts Details.md
├── Environment/
│   ├── MazeGenerator.cs
│   └── ObstacleController.cs
├── Materials/
│   ├── Background.png
│   ├── *.mat, *.physicMaterial
│   └── (override materials for walls/floors)
├── Prefabs/
│   ├── Bullet.prefab
│   ├── Coin.prefab
│   ├── Floor.prefab
│   ├── Guard.prefab
│   ├── PlayerModel.prefab
│   ├── WallPrefab.prefab
│   ├── door.prefab
│   └── door_frame.prefab
├── Scenes/
│   ├── MainMenu.unity
│   ├── Level1.unity … Level5.unity
│   └── Level1/NavMesh.asset
├── UI/
│   ├── UIManager.cs
│   ├── HUD.prefab
│   ├── GameOverPanel.prefab
│   ├── PausePanel.prefab
│   └── VictoryPanel.prefab
└── GameManager.cs
```

**Build order** (File → Build Settings): MainMenu, Level1, Level2, Level3, Level4, Level5.

**Tags** (ProjectSettings → Tags and Layers): BackgroundMusic, Coin, END, Trap
(built-in: Player, MainCamera, Untagged, …).
