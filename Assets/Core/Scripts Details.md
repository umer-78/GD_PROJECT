# Core Script Overview

This document outlines the functionality and features of the Core scripts used in the game.

---

## **PlayerController.cs**
*Purpose:* This script is responsible for managing the player's movement, interactions with objects (like coins, power-ups, traps), and basic controls such as jumping and running.
### **Features of PlayerController.cs**
1. **Smooth Movement:**
   - Adjusts the player's movement speed and rotation dynamically.
   - Uses Rigidbody for physics-based movement, ensuring smooth navigation and natural handling of physics interactions.
2. **Jump Mechanic:**
   - Implements a simple jump mechanic that checks if the player is grounded using a layer mask.
   - The player can jump when on the ground, applying force through Rigidbody.
3. **Interaction:**
   - Handles interactions with various objects such as coins, power-ups, and traps.
   - When the player enters a trigger collider, the appropriate interaction is processed (coin collection, power-up activation, or trap activation).
4. **Animator Integration:**
   - Uses an `Animator` component to trigger the `isRunning` state for movement and the `jump` state when the player jumps.
   - This ensures smooth animation transitions based on the player's actions.
5. **Future Expandability:**
   - The script is designed with scalability in mind, making it easy to add new mechanics like crouching, dashing, or other interactive features without much modification.
---

## **EnemyController.cs**
*Purpose:* This script controls enemy behaviors, including patrolling, chasing the player, attacking, and returning to patrol when the player escapes detection.
### **Features of EnemyController.cs**
1. **Patrolling:**
   - The enemy moves between predefined patrol points, waiting at each one for a configurable amount of time.
   - Once the enemy reaches a patrol point, it waits for the set amount of time before moving to the next point.
2. **Chasing:**
   - The enemy can detect the player within a specific detection range.
   - If the player is detected, the enemy starts chasing the player. If the player moves outside of the enemy’s line of sight or beyond the detection range, the enemy stops chasing and returns to patrol.
3. **Attacking:**
   - When the enemy gets close enough to the player (within the attack range), it attacks the player.
   - A cooldown mechanism ensures that the enemy does not continuously attack, adding balance and avoiding overpowered behaviors.
4. **Animator Integration:**
   - The enemy uses an `Animator` to transition between walking and attacking states, ensuring smooth animation transitions based on the enemy's actions.
5. **Gizmos for Debugging:**
   - Visualizes the detection range, the "lose sight" range, and the attack range in the Unity editor using Gizmos.
   - This helps in visualizing the enemy's behavior during development and debugging.
---

## **CoinManager.cs**
*Purpose:* Manage coin collection, update the player's score, and trigger effects like UI updates or audio feedback.
### **Features of CoinManager.cs**
1. **Singleton Pattern:**
   - Makes the script globally accessible as CoinManager.Instance.
2. **Coin Collection Logic:**
   - Tracks coins collected and remaining in the level.
   - Updates the UI in real-time.
   - Plays audio and particle effects upon coin pickup.
3. **UI Integration:**
   - Calls the UIManager to update the coin counter on the screen.
4. **Level Completion Check:**
   - Detects when all coins are collected and triggers level completion logic.
5. **Extendable Effects:**
   - Easily add more effects like animations or custom messages on coin collection.
---

## **PowerUpManager.cs**
*Purpose:* Manage power-ups, apply their effects to the player, and handle expiration of temporary boosts.
### **Features of PowerUpManager.cs**
1. **Singleton Pattern:**
   - Allows global access via PowerUpManager.Instance.
2. **Types of Power-Ups:**
   - SpeedBoost: Temporarily increases the player's speed.
   - Shield: Temporarily makes the player invulnerable to traps or enemies.
3. **Timers for Temporary Effects:**
   - Uses coroutines to manage the duration of power-up effects.
4. **Effect Feedback:**
   - Plays particle and sound effects when a power-up is activated.
5. **Modular Design:**
   - New power-up types can be added easily by extending the ActivatePowerUp method.
--- 

## **LevelManager.cs**
*Purpose:* Handle level progression, transitions, and completion logic while coordinating with other managers.
### **Features of LevelManager.cs**
1. **Singleton Pattern:**
   - Makes the script globally accessible via LevelManager.Instance.
2. **Level Setup:**
   - Prepares the current level by resetting counters and initial states.
   - Tracks the current level index and ensures smooth transitions.
3. **Level Completion:**
   - Displays a completion UI and transitions to the next level after a delay.
   - Handles final level completion by loading the victory scene.
4. **Restart and Game Over Logic:**
   - Restarts the current level if the player fails.
   - Loads a game over scene when conditions are met (e.g., no lives).
5. **Extendable Design:**
   - Add additional logic for intermediate objectives or alternative level progression paths.
---

## **ExitController.cs**
*Purpose:* Handle logic for detecting when the player reaches the exit and signaling level completion.
### **Features of ExitController.cs**
1. **Player Detection:**
   - Detects when the player collides with the exit trigger using the OnTriggerEnter method.
2. **Exit Effects:**
   - Plays a sound effect and a visual effect (e.g., particles) when the exit is reached.
3. **Level Completion:**
   - Calls the CompleteLevel method from the LevelManager to proceed to the next level.
4. **One-Time Trigger:**
   - Ensures the exit logic is executed only once per level using the isExitReached flag.
### **How It Works**
1. **Trigger Detection:**
   - When the player enters the exit's trigger zone, the TriggerExit method is called.
2. **Feedback Effects:**
   - Plays an audio and visual effect to signify the exit is reached.
3. **Level Transition:**
   - Calls LevelManager.Instance.CompleteLevel() to transition to the next level or the victory screen.
---

## **PlayerHealth.cs**
*Purpose:* Manage the player’s health, provide feedback for damage/healing, and trigger game-over behavior when health is depleted.
### **Features of PlayerHealth.cs**
1. **Health System:**
Tracks currentHealth and ensures it remains within bounds (0 to maxHealth).
2. **Damage Handling:**
   - Reduces health on taking damage.
   -    - Prevents damage if the shield is active (integrated with PowerUpManager).
3. **Healing:**
Increases health up to the maximum limit when healed.
4. **Feedback Effects:**
   - Plays particle and audio effects for both damage and healing.
5. **Game Over Logic:**
   - Triggers the game-over screen via the LevelManager when health reaches zero.
6. **UI Integration:**
   - Updates the health bar dynamically using the UIManager.
---

## **UIManager.cs**
*Purpose:* Manage and update all UI components in the game.
### **Features of UIManager.cs**
1. **Health Bar Management:**
   - Dynamically updates the health bar when the player's health changes.
2. **Score Tracking:**
   - Displays the current score and updates it when points are added.
3. **Power-Up Display:**
   - Shows the name of the currently active power-up or clears it when no power-up is active.
4. **Damage Feedback:**
   - Provides a visual flash on the screen when the player takes damage.
5. **Level Display:**
   - Displays the current level to keep players informed of their progression.
### **How It Works**
1. **Health Bar:**
   - UpdateHealthBar(int currentHealth, int maxHealth) adjusts the slider's value proportionally.
2. **Score Tracking:**
   - UpdateScore(int points) increases the score and updates the display.
3. **Power-Up Feedback:**
   - UpdatePowerUpText(string powerUpName) shows or clears the power-up information.
4. **Damage Feedback:**
   - ShowDamageFlash() triggers a coroutine to briefly flash the damage overlay.
5. **Level Indicator:**
   - UpdateLevelText(int level) displays the current level number.
---

## **AudioManager.cs**
*Purpose:* Manage all audio in the game, including sound effects, background music, and UI feedback sounds.
### **Features of AudioManager.cs**
1. **Centralized Music Management:**
   - Plays, stops, and loops background music.
   - Automatically switches tracks based on game state (main menu, gameplay, victory, etc.).
2. **Sound Effects:**
   - Plays one-off sound effects for UI interactions, gameplay events, etc.
3. **Volume Control:**
   - Adjusts music and sound effect volumes independently.
4. **Singleton Pattern:**
   - Ensures only one instance of the AudioManager exists throughout the game, accessible from any other script.
### **How It Works**
1. **Music Playback:**
   - Call AudioManager.Instance.PlayMusic(AudioClip clip) to play music for any scene or game state.
   - Use AudioManager.Instance.StopMusic() to halt playback when needed.
2. **Sound Effects:**
   - Use AudioManager.Instance.PlaySoundEffect(AudioClip clip) for event-triggered sounds like coin collection or power-ups.
3. **Volume Control:**
   - Adjust music or effects volumes dynamically using sliders in your UI.
---

## **MazeGenerator.cs**
*Purpose:* Dynamically create a maze structure with varying difficulty by placing walls, paths, traps, and coins.
### **Features of MazeGenerator.cs**
1. **Dynamic Level Scaling:**
   - The maze size and the number of traps/coins increase with each level.
2. **Maze Initialization:**
   - The maze begins as a grid of walls, with paths created using a random walk algorithm.
3. **Prefab-Based Generation:**
   - Walls, floors, traps, coins, and exits are instantiated using prefabs.
   - Randomized Trap and Coin Placement:
   - Ensures no two mazes are identical.
4. **Exit Placement:**
   - Randomly places an exit point in the maze.
5. **Reusability:**
   - Can regenerate the maze for new levels or reset it during gameplay.
---

## **ObstacleController.cs**
*Purpose:* Handles the movement, interaction, and effects of obstacles placed in the maze.
### **Features of ObstacleController.cs**
1. **Moving Obstacles:**
   - Moves obstacles back and forth between two points (startPoint and endPoint).
   - Speed and positions are customizable via the Inspector.
2. **Rotating Obstacles:**
   - Rotates obstacles around a specified axis at a customizable speed.
   - Can be used for spinning hazards like blades or fire traps.
3. **Damage on Contact:**
   - Damages the player upon collision, interacting with the PlayerHealth script.
4. **Inspector Customization:**
   - Easily enable/disable movement and rotation.
   - Customize damage, speed, and behavior directly from the Inspector.
---

## **GameManager.cs**
*Purpose:* Manages the game's main loop, including starting, pausing, restarting, and transitioning between levels.
### **Features of GameManager.cs**
1. **Game State Management:**
   - Handles transitions between states like Game Over, Victory, and Pause.
   - Keeps track of the current level and handles level transitions.
2. **Singleton Pattern:**
   - Ensures only one instance of GameManager exists, and it persists across scenes.
3. **Level Management:**
   - Dynamically loads levels (Level1, Level2, etc.) and transitions to the next level or the victory screen.
4. **Integration with UIManager and AudioManager:**
   - Updates UI elements like level text and game over screens.
   - Plays appropriate audio for events like victory or game over.
5. **Pause and Resume Functionality:**
   - Pauses and resumes the game with Time.timeScale adjustments.
---

## **Summary**
- The **PlayerController.cs** script controls the player’s movement, jumping, and interactions with in-game objects (like coins, power-ups, and traps). It allows for smooth navigation and easy expansion with future features such as crouching or dashing.
- The **EnemyController.cs** script manages enemy AI, including patrolling, chasing, attacking, and returning to patrol when the player escapes detection. The integration of animations and Gizmos ensures smoother gameplay and ease of debugging.
- **CoinManager.cs** handles the collection of coins, updates the player's score, and triggers effects like UI updates or audio feedback when a coin is collected. It integrates seamlessly with UI elements for real-time tracking and level completion.
- **PowerUpManager.cs** manages various power-ups, applying temporary boosts like speed or shield to the player. It uses coroutines to track the duration of effects and provides feedback through sound and particle effects.
- **LevelManager.cs** coordinates level progression, handles transitions between levels, and manages game-over and restart logic. The script ensures smooth level progression, from setup to completion.
- **ExitController.cs** detects when the player reaches the exit, triggers completion effects, and coordinates with the LevelManager for transitioning to the next level or victory screen.
- **PlayerHealth.cs** manages the player's health system, including taking damage, healing, and triggering game-over events. It integrates with the PowerUpManager to prevent damage when the shield is active and updates health UI dynamically.
- **TrapController.cs** manages traps within the game world, detecting the player and dealing damage. The traps feature cooldown mechanisms and visual/audio feedback to enhance gameplay dynamics.
- **UIManager.cs** is responsible for updating the UI, including health, score, level display, and power-up feedback. It ensures the UI dynamically reflects the player's status throughout the game.
- **GameOverManager.cs** handles the game-over screen, including final score display, allowing players to restart levels or return to the main menu. It also provides audio feedback when the game-over state is triggered.
- **AudioManager.cs** manages all the audio in the game, including background music, sound effects, and UI sounds. It provides independent volume control for music and effects and ensures only one instance of the manager exists globally.
- **MazeGenerator.cs** dynamically generates the maze structure for each level, ensuring increasing difficulty through randomized placement of walls, traps, coins, and exits. It allows for maze regeneration and resets as required by the gameplay.

All these scripts are designed to be extendable, allowing developers to easily introduce new mechanics or features as the game evolves. The modular nature of each script also promotes reusability, making it easier to maintain and scale the game.

## **Removed Scripts**
## **TrapController.cs**
*Purpose:* Manage traps in the game world, handle detection of the player, and apply damage or effects when triggered.
### **Features of TrapController.cs**
1. **Player Detection:**
   - Uses OnTriggerEnter to detect the player when they enter the trap's trigger zone.
2. **Damage Application:**
   - Deals a specified amount of damage or causes instant death if isInstantKill is true.
3. **Visual and Audio Feedback:**
   - Plays a particle effect and sound when the trap is triggered.
4. **Cooldown System:**
   - Prevents the trap from triggering repeatedly within a short period using a cooldown timer.
5. **Reusable Design:**
   - Can be configured for different traps (spikes, flames, etc.) with unique effects and damage settings.
### **How It Works**
1. **Trigger Activation:**
   - When the player enters the trap’s trigger zone, ActivateTrap is called.
2. **Effect Execution:**
   - Plays audio and visual effects to provide feedback to the player.
3. **Damage Handling:**
   - Calls the TakeDamage(int damage) method from the PlayerHealth script.
   - If isInstantKill is enabled, it sets the player's health to zero.
4. **Cooldown Mechanism:**
   - Temporarily disables the trap to prevent spamming and reactivates it after the cooldown period.
---
## **GameOverManager.cs**
*Purpose:* Manage the Game Over screen and its associated actions.
### **Features of GameOverManager.cs**
1. **Final Score Display:**
   - Retrieves the final score using PlayerPrefs and displays it on the Game Over screen.
2. **Restart Level:**
   - Allows players to retry the current level from the beginning.
3. **Return to Main Menu:**
   - Lets players exit to the main menu.
4. **Audio Feedback:**
   - Plays a "Game Over" sound when the screen appears.
### **How It Works**
1. **Score Display:**
   - When the Game Over scene loads, the DisplayFinalScore() method retrieves the player's score from PlayerPrefs and updates the finalScoreText.
2. **Restart Level:**
   - The "Restart" button reloads the current level using SceneManager.
3. **Main Menu Navigation:**
   - The "Main Menu" button loads the main menu scene.
4. **Audio Playback:**
   - A game-over sound plays once when the Game Over screen is displayed.
---