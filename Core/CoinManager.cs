using UnityEngine;

public class CoinManager : MonoBehaviour
{
    public static CoinManager Instance; // Singleton for global access

    [Header("Coin Settings")]
    public int totalCoins; // Total coins in the level
    public int collectedCoins; // Coins collected by the player

    [Header("Effects")]
    public AudioClip coinPickupSound;
    public ParticleSystem coinPickupEffect;

    [Header("Coin Container")]
    public GameObject coinContainer; // GameObject containing all the coin objects

    [Header("Door")]
    public Transform door; // The door GameObject to rotate
    private Quaternion targetRotation;
    public float rotationSpeed = 15f; // Speed of the rotation


    private UIManager uiManager; // Reference to update the UI
    private AudioManager audioManager;

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
        uiManager = FindObjectOfType<UIManager>();
        audioManager = FindObjectOfType<AudioManager>();
        targetRotation = Quaternion.Euler(-90, 0, -90);

        // Count the coins by checking the number of children in the coin container
        if (coinContainer != null)
        {
            totalCoins = coinContainer.transform.childCount;
            Debug.Log($"Total Coins: {totalCoins}");
        }

        // Update UI at the start of the game
        UpdateUI();
    }

    public void CollectCoin(GameObject coin)
    {
        collectedCoins++;
        totalCoins--; // Decrease remaining coins
        UpdateUI();

        // Play sound effect
        if (audioManager != null && coinPickupSound != null)
        {
            audioManager.PlaySound(coinPickupSound);
        }

        // Play particle effect
        if (coinPickupEffect != null)
        {
            Instantiate(coinPickupEffect, coin.transform.position, Quaternion.identity);
        }
        uiManager.UpdateScore(100);
        // Destroy the collected coin
        Destroy(coin);

        // Check if all coins are collected
        if (totalCoins <= 0)
        {
            LevelComplete();
        }
    }

    private void UpdateUI()
    {
        if (uiManager != null)
        {
            uiManager.UpdateCoinUI(totalCoins);
        }
    }

    private void LevelComplete()
    {
        Debug.Log("All coins collected! Gateway Opened.");
        RotateDoorSmoothly();
    }
    // Function to call for smooth rotation
    public void RotateDoorSmoothly()
    {
        StartCoroutine(RotateDoorCoroutine());
    }

    private System.Collections.IEnumerator RotateDoorCoroutine()
    {
        Quaternion currentRotation = door.rotation;

        // Rotate from current rotation to the target rotation smoothly
        float timeElapsed = 0f;
        float duration = 1f / rotationSpeed; // Calculate the duration for smooth rotation

        while (timeElapsed < duration)
        {
            timeElapsed += Time.deltaTime;
            door.rotation = Quaternion.Slerp(currentRotation, targetRotation, timeElapsed / duration);
            yield return null; // Wait until next frame
        }

        // Ensure the door reaches the exact target rotation
        door.rotation = targetRotation;
    }
}
