using UnityEngine;
using UnityEngine.SceneManagement;

public class LevelManager : MonoBehaviour
{
    public static LevelManager Instance; // Singleton for global access

    [Header("Level Settings")]
    public int currentLevel = 0; // Read from the scene name at runtime (Level3 -> 3)
    public int totalLevels = 5;  // Level1 .. Level5 ship with the project

    [Header("UI & Transitions")]
    public GameObject levelCompleteUI; // UI shown on level completion
    public float transitionDelay = 2f; // Delay before transitioning to the next level

    private bool completing = false;

    void Awake()
    {
        // One LevelManager per scene; a stale one from a previous scene must not win.
        Instance = this;

        // Every level scene was saved with currentLevel = 0 and totalLevels = 3,
        // so finishing Level2 reloaded Level1 and Level4/Level5 were unreachable.
        // The scene name is the reliable source.
        int fromName = LevelNumberOf(SceneManager.GetActiveScene().name);
        if (fromName > 0) currentLevel = fromName;
        int built = CountLevelScenesInBuild();
        if (built > 0) totalLevels = built;
    }

    void OnDestroy()
    {
        if (Instance == this) Instance = null;
    }

    void Start()
    {
        SetupLevel();
    }

    private static int LevelNumberOf(string sceneName)
    {
        if (!sceneName.StartsWith("Level")) return 0;
        return int.TryParse(sceneName.Substring(5), out int n) ? n : 0;
    }

    private static int CountLevelScenesInBuild()
    {
        int count = 0;
        for (int i = 0; i < SceneManager.sceneCountInBuildSettings; i++)
        {
            string path = SceneUtility.GetScenePathByBuildIndex(i);
            string name = System.IO.Path.GetFileNameWithoutExtension(path);
            if (LevelNumberOf(name) > 0) count++;
        }
        return count;
    }

    private void SetupLevel()
    {
        Debug.Log("Setting up Level: " + currentLevel);
        // The coin count used to be overwritten here with the number of
        // CoinManager objects (always 1), so the door opened after one coin.
        // CoinManager counts its own coins.

        if (levelCompleteUI != null)
        {
            levelCompleteUI.SetActive(false);
        }
    }

    public void CompleteLevel()
    {
        if (completing) return;
        completing = true;
        Debug.Log("Level Complete!");
        if (levelCompleteUI != null)
        {
            levelCompleteUI.SetActive(true);
        }

        // Realtime so the delay still runs if something paused the game.
        StartCoroutine(LoadNextAfterDelay());
    }

    private System.Collections.IEnumerator LoadNextAfterDelay()
    {
        yield return new WaitForSecondsRealtime(transitionDelay);
        LoadNextLevel();
    }

    public void LoadNextLevel()
    {
        Time.timeScale = 1f;
        int next = currentLevel + 1;

        if (next <= totalLevels && Application.CanStreamedLevelBeLoaded("Level" + next))
        {
            Debug.Log("Loading Next Level: " + next);
            SceneManager.LoadScene("Level" + next);
        }
        else
        {
            // There is no "Victory" scene in the project; loading it threw.
            Debug.Log("All Levels Completed!");
            SceneManager.LoadScene(Application.CanStreamedLevelBeLoaded("Victory") ? "Victory" : "MainMenu");
        }
    }

    public void RestartLevel()
    {
        Time.timeScale = 1f;
        Debug.Log("Restarting Level: " + currentLevel);
        SceneManager.LoadScene(SceneManager.GetActiveScene().name);
    }
}
