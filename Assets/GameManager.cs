using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

public class GameManager : MonoBehaviour
{
    // One GameManager per scene. It used to survive scene loads with
    // DontDestroyOnLoad, which broke every level after the first: the level's own
    // GameManager (the one its buttons and panels are wired to) was destroyed as a
    // duplicate, the surviving one still pointed at the previous scene's destroyed
    // panels, and isGameOver stayed true, so Victory() and GameOver() did nothing.
    public static GameManager Instance { get; private set; }

    [Header("Game States")]
    public bool isGamePaused = false;   // Check if the game is paused
    public int currentLevel = 0;       // Level number, read from the scene name (Level1 -> 1)
    // Total levels is discovered from build settings by LevelManager; there is no
    // separate maxLevels field here to keep in sync.

    public bool isGameOver = false;

    [Header("UI and Managers")]
    public UIManager uiManager;        // Reference to the UI Manager
    public AudioManager audioManager;  // Reference to the Audio Manager
    public PlayerController player;    // Reference to the Player
    public GameObject gameOverPanel;
    public GameObject victoryPanel;

    private void Awake()
    {
        Instance = this;
        Time.timeScale = 1f;           // a previous scene may have been left paused
        isGameOver = false;
        isGamePaused = false;
        currentLevel = LevelNumberOf(SceneManager.GetActiveScene());
    }

    private void OnDestroy()
    {
        if (Instance == this) Instance = null;
    }

    private void Start()
    {
        if (uiManager == null) uiManager = FindObjectOfType<UIManager>();
        if (uiManager != null) uiManager.UpdateLevelText(currentLevel);
#if UNITY_WEBGL && !UNITY_EDITOR
        // In a browser Quit Game would only repeat Main Menu, so hide it (the panels start inactive, hence FindObjectsOfTypeAll).
        foreach (var button in Resources.FindObjectsOfTypeAll<Button>())
        {
            if (!button.gameObject.scene.IsValid()) continue;
            for (int i = 0; i < button.onClick.GetPersistentEventCount(); i++)
            {
                if (button.onClick.GetPersistentMethodName(i) == nameof(QuitGame)) { button.gameObject.SetActive(false); break; }
            }
        }
#endif
    }

    private void Update()
    {
        // Escape or P toggles the pause panel (in a browser Escape also leaves fullscreen).
        if ((Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P)) && !isGameOver)
        {
            if (isGamePaused) ResumeGame();
            else PauseGame();
        }
    }

    // "Level3" -> 3; any other scene falls back to its build index.
    private static int LevelNumberOf(Scene scene)
    {
        string digits = "";
        foreach (char c in scene.name)
        {
            if (char.IsDigit(c)) digits += c;
        }
        return int.TryParse(digits, out int n) ? n : scene.buildIndex;
    }

    public void StartGame()
    {
        LoadLevel("Level1");
    }

    public void LoadLevel(string levelName)
    {
        Time.timeScale = 1f;
        SceneManager.LoadScene(levelName); // the new scene's GameManager updates the UI
    }

    public void NextLevel()
    {
        Time.timeScale = 1; // Resume the game
        int nextLevelIndex = SceneManager.GetActiveScene().buildIndex + 1;

        if (nextLevelIndex < SceneManager.sceneCountInBuildSettings)
        {
            SceneManager.LoadScene(nextLevelIndex);
        }
        else
        {
            Debug.Log("No more levels!");
            GoToMainMenu();
        }
    }

    public void GoToMainMenu()
    {
        Time.timeScale = 1; // Resume the game
        SceneManager.LoadScene("MainMenu");
    }

    public void RestartLevel()
    {
        // Reload the current level
        Time.timeScale = 1; // Resume the game
        SceneManager.LoadScene(SceneManager.GetActiveScene().name);
    }

    public void GameOver()
    {
        // Show Game Over UI and handle logic
        if (isGameOver) return;

        isGameOver = true;
        if (gameOverPanel != null) gameOverPanel.SetActive(true);
        Time.timeScale = 0; // Pause the game
    }

    public void Victory()
    {
        if (isGameOver) return;

        isGameOver = true;
        if (victoryPanel != null) victoryPanel.SetActive(true);
        Time.timeScale = 0; // Pause the game
    }

    public void PauseGame()
    {
        if (isGameOver) return; // pausing over the game-over screen would unpause into a dead game
        isGamePaused = true;
        Time.timeScale = 0f; // Pause the game
        if (uiManager != null) uiManager.ShowPauseMenu();
    }

    public void ResumeGame()
    {
        isGamePaused = false;
        Time.timeScale = 1f; // Resume the game
        if (uiManager != null) uiManager.HidePauseMenu();
    }

    public void QuitGame()
    {
        Debug.Log("Quitting the game...");
#if UNITY_WEBGL && !UNITY_EDITOR
        // Application.Quit does nothing in a browser; go back to the main menu instead.
        Time.timeScale = 1f;
        SceneManager.LoadScene("MainMenu");
#else
        Application.Quit();
#endif
    }
}
