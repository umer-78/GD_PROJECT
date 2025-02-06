using UnityEngine;
using UnityEngine.SceneManagement;

public class MenuManager : MonoBehaviour
{
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
