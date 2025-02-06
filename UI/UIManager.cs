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
        UpdateCoinUI(CoinManager.Instance.totalCoins);
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
        if (damageFlash != null)
        {
            StartCoroutine(DamageFlashRoutine());
        }
    }

    private System.Collections.IEnumerator DamageFlashRoutine()
    {
        damageFlash.SetActive(true);
        yield return new WaitForSeconds(flashDuration);
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
        coinText.text = $"Coins: {coinCount}";
    }

    public void ShowGameOverScreen()
    {
        GameManager.Instance.isGameOver = true;
        gameOverScreen.SetActive(true);
    }

    public void ShowPauseMenu()
    {
        pauseMenu.SetActive(true);
    }

    public void HidePauseMenu()
    {
        pauseMenu.SetActive(false);
    }
}
