using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

public class MenuManager : MonoBehaviour
{
    private void Start()
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        // A browser tab can't be closed from the game, so drop the Quit button.
        foreach (var button in FindObjectsOfType<Button>())
        {
            for (int i = 0; i < button.onClick.GetPersistentEventCount(); i++)
            {
                if (button.onClick.GetPersistentMethodName(i) == nameof(QuitGame))
                {
                    button.gameObject.SetActive(false);
                    break;
                }
            }
        }
#endif
    }

    public void PlayGame()
    {
        int nextLevelIndex = SceneManager.GetActiveScene().buildIndex + 1;

        if (nextLevelIndex < SceneManager.sceneCountInBuildSettings) // Check if next level exists
        {
            SceneManager.LoadScene(nextLevelIndex); // Load the next level
        }
        else
        {
            Debug.Log("No more levels!");
            SceneManager.LoadScene("MainMenu");
        }
    }

    public void QuitGame()
    {
        Debug.Log("Quit Game");
        Application.Quit(); // Exits the application
    }
}
