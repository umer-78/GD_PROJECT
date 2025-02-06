using UnityEngine;
using UnityEngine.SceneManagement;

public class GameManager : MonoBehaviour
{
    public static GameManager Instance; // Singleton pattern

    [Header("Game States")]
    public bool isGamePaused = false;   // Check if the game is paused
    public int currentLevel = 0;       // Tracks the current level
    public int maxLevels = 3;          // Total number of levels

    public bool isGameOver = false;

    [Header("UI and Managers")]
    public UIManager uiManager;        // Reference to the UI Manager
    public AudioManager audioManager;  // Reference to the Audio Manager
    public PlayerController player;    // Reference to the Player
    public GameObject gameOverPanel;
    public GameObject victoryPanel;

    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject); // Keep the GameManager across scenes
        }
        else
        {
            Destroy(gameObject);
        }
    }

    private void Start()
    {
        uiManager.UpdateLevelText(currentLevel); // Initialize UI with the current level
    }

    public void StartGame()
    {
        // Start the first level
        currentLevel = 1;
        LoadLevel("Level1");
    }

    public void LoadLevel(string levelName)
    {
        SceneManager.LoadScene(levelName);
        uiManager.UpdateLevelText(currentLevel);
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
        gameOverPanel.SetActive(true);
        Time.timeScale = 0; // Pause the game
    }

    public void Victory()
    {
        if (isGameOver) return;

        isGameOver = true;
        victoryPanel.SetActive(true);
        Time.timeScale = 0; // Pause the game
    }

    public void PauseGame()
    {
        isGamePaused = true;
        Time.timeScale = 0f; // Pause the game
        uiManager.ShowPauseMenu();
    }

    public void ResumeGame()
    {
        isGamePaused = false;
        Time.timeScale = 1f; // Resume the game
        uiManager.HidePauseMenu();
    }

    public void QuitGame()
    {
        Debug.Log("Quitting the game...");
        Application.Quit();
    }
}
