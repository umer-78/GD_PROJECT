using UnityEngine;
using UnityEngine.SceneManagement;

public class LevelManager : MonoBehaviour
{
    public static LevelManager Instance; // Singleton for global access

    [Header("Level Settings")]
    public int currentLevel = 0; // Current level index
    public int totalLevels = 3;  // Total number of levels

    [Header("UI & Transitions")]
    public GameObject levelCompleteUI; // UI shown on level completion
    public float transitionDelay = 2f; // Delay before transitioning to the next level

    private CoinManager coinManager;
    private PlayerHealth playerHealth;

    void Awake()
    {
        // Singleton pattern
        if (Instance == null)
        {
            Instance = this;
        }
        else
        {
            Destroy(gameObject);
        }
    }

    void Start()
    {
        coinManager = FindObjectOfType<CoinManager>();
        playerHealth = FindObjectOfType<PlayerHealth>();
        SetupLevel();
    }

    private void SetupLevel()
    {
        Debug.Log("Setting up Level: " + currentLevel);
        if (coinManager != null)
        {
            coinManager.collectedCoins = 0;
            coinManager.totalCoins = FindObjectsOfType<CoinManager>().Length; // Example logic
        }

        if (levelCompleteUI != null)
        {
            levelCompleteUI.SetActive(false);
        }
    }

    public void CompleteLevel()
    {
        Debug.Log("Level Complete!");
        if (levelCompleteUI != null)
        {
            Time.timeScale = 0f; 
            levelCompleteUI.SetActive(true);
        }

        // Proceed to the next level after a delay
        Invoke(nameof(LoadNextLevel), transitionDelay);
    }

    public void LoadNextLevel()
    {
        Time.timeScale = 1f;
        currentLevel++;

        if (currentLevel < totalLevels)
        {
            Debug.Log("Loading Next Level: " + currentLevel);
            SceneManager.LoadScene("Level" + currentLevel); // Load the next level by name
        }
        else
        {
            Debug.Log("All Levels Completed!");
            SceneManager.LoadScene("Victory"); // Load victory scene
        }
    }

    public void RestartLevel()
    {
        Debug.Log("Restarting Level: " + currentLevel);
        SceneManager.LoadScene("Level" + currentLevel);
    }
}
