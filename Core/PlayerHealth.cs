using UnityEngine;

public class PlayerHealth : MonoBehaviour
{
    public static PlayerHealth Instance { get; private set; }

    [Header("Health Settings")]
    public int maxHealth = 100;       // Maximum health
    public int currentHealth;         // Current health value
    public bool isShielded = false;   // Shield status (integrated with PowerUpManager)

    [Header("Feedback")]
    public AudioClip damageSound;     // Sound played when taking damage
    public AudioClip healSound;       // Sound played when healing
    public ParticleSystem damageEffect; // Particle effect when taking damage
    public ParticleSystem healEffect;   // Particle effect when healing
    public Animator animator;

    private UIManager uiManager;      // Reference to UI Manager for health bar updates
    private AudioManager audioManager;


    private void Awake()
    {
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
        currentHealth = maxHealth;    // Initialize health
        uiManager = FindObjectOfType<UIManager>();
        audioManager = FindObjectOfType<AudioManager>();

        UpdateUI();
    }

    public void DecreaseHealth(int damage)
    {
        currentHealth -= damage;
        if (currentHealth <= 0)
        {
            // Trigger Game Over logic here.
            Debug.Log("Player Health reached 0. Game Over.");
        }
    }

    public void TakeDamage(int damage)
    {
        uiManager.ShowDamageFlash();
        if (isShielded)
        {
            Debug.Log("Shield active! No damage taken.");
            return;
        }

        currentHealth -= damage;
        currentHealth = Mathf.Clamp(currentHealth, 0, maxHealth); // Ensure health stays within bounds

        if (damageEffect != null)
        {
            Instantiate(damageEffect, transform.position, Quaternion.identity);
        }

        if (damageSound != null && audioManager != null)
        {
            audioManager.PlaySound(damageSound);
        }

        Debug.Log($"Player took {damage} damage. Current health: {currentHealth}");

        UpdateUI();

        if (currentHealth <= 0)
        {
            Die();
        }
    }

    public void Heal(int amount)
    {
        currentHealth += amount;
        currentHealth = Mathf.Clamp(currentHealth, 0, maxHealth); // Ensure health stays within bounds

        if (healEffect != null)
        {
            Instantiate(healEffect, transform.position, Quaternion.identity);
        }

        if (healSound != null && audioManager != null)
        {
            audioManager.PlaySound(healSound);
        }

        Debug.Log($"Player healed by {amount}. Current health: {currentHealth}");

        UpdateUI();
    }

    private void Die()
    {
        Debug.Log("Player has died!");
        animator.SetBool("isDead", true);
        Invoke("GameOver", 2f);
    }
    private void GameOver()
    {
        GameManager.Instance.GameOver();
    }

    private void UpdateUI()
    {
        if (uiManager != null)
        {
            uiManager.UpdateHealthBar(currentHealth, maxHealth); // Update health bar in UI
        }
    }
}