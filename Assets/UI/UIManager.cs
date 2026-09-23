using UnityEngine;
using UnityEngine.UI;
using TMPro;

public class UIManager : MonoBehaviour
{
    [Header("UI Elements")]
    public Slider healthBar;                  // Health bar UI
    public TextMeshProUGUI scoreText;                   // Score display
    public TextMeshProUGUI levelText;                   // Current level display
    public TextMeshProUGUI coinText;
    public GameObject gameOverScreen;
    public GameObject pauseMenu;

    [Header("Feedback")]
    public GameObject damageFlash;           // Flash effect on taking damage
    public float flashDuration = 0.2f;       // Duration of the damage flash effect

    private int score = 0;                   // Current score

    void Start()
    {
        UpdateScore(score);                      // Initialize the score display
        if (CoinManager.Instance != null) UpdateCoinUI(CoinManager.Instance.totalCoins);
        if (damageFlash != null)
            damageFlash.SetActive(false);    // Ensure damage flash is off at start
    }

    public void UpdateHealthBar(int currentHealth, int maxHealth)
    {
        if (healthBar != null)
        {
            healthBar.value = (float)currentHealth / maxHealth;
        }
    }

    public void UpdateScore(int points)
    {
        score += points;
        if (scoreText != null)
        {
            scoreText.text = $"Score: {score}";
        }
    }

    public void ShowDamageFlash()
    {
        if (damageFlash != null && isActiveAndEnabled)
        {
            StopCoroutine(nameof(DamageFlashRoutine));
            StartCoroutine(nameof(DamageFlashRoutine));
        }
    }

    private System.Collections.IEnumerator DamageFlashRoutine()
    {
        damageFlash.SetActive(true);
        // realtime: with the game paused (timeScale 0) the flash never cleared
        yield return new WaitForSecondsRealtime(flashDuration);
        damageFlash.SetActive(false);
    }

    public void UpdateLevelText(int level)
    {
        if (levelText != null)
        {
            levelText.text = $"Level: {level}";
        }
    }
    public void UpdateCoinUI(int coinCount)
    {
        if (coinText != null) coinText.text = $"Coins: {coinCount}";
    }

    public void ShowGameOverScreen()
    {
        if (GameManager.Instance != null) GameManager.Instance.isGameOver = true;
        if (gameOverScreen != null) gameOverScreen.SetActive(true);
    }

    public void ShowPauseMenu()
    {
        if (pauseMenu != null) pauseMenu.SetActive(true);
    }

    public void HidePauseMenu()
    {
        if (pauseMenu != null) pauseMenu.SetActive(false);
    }
}
