using UnityEngine;

public class CoinManager : MonoBehaviour
{
    public static CoinManager Instance; // Singleton for global access

    [Header("Coin Settings")]
    public int totalCoins; // Coins still left in the level
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
    private bool doorOpened = false;

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
            return;
        }

        // Counted here rather than in Start so the number is ready before any
        // other script's Start (UIManager reads it) runs.
        if (coinContainer != null)
        {
            totalCoins = coinContainer.transform.childCount;
            Debug.Log($"Total Coins: {totalCoins}");
        }
    }

    void Start()
    {
        uiManager = FindObjectOfType<UIManager>();
        audioManager = FindObjectOfType<AudioManager>();
        targetRotation = Quaternion.Euler(-90, 0, -90);

        // Update UI at the start of the game
        UpdateUI();
    }

    /// <summary>Returns true if the coin was counted (false if it was already picked up).</summary>
    public bool CollectCoin(GameObject coin)
    {
        // A player with more than one collider can enter the same trigger twice in
        // one frame, and Destroy() only happens at the end of the frame, so the same
        // coin used to be counted twice. Switching its collider off marks it as taken.
        Collider coinCollider = coin.GetComponent<Collider>();
        if (coinCollider != null)
        {
            if (!coinCollider.enabled) return false;
            coinCollider.enabled = false;
        }

        collectedCoins++;
        totalCoins = Mathf.Max(0, totalCoins - 1); // Decrease remaining coins
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
        if (uiManager != null) uiManager.UpdateScore(100);
        // Destroy the collected coin
        Destroy(coin);

        // Check if all coins are collected
        if (totalCoins <= 0)
        {
            LevelComplete();
        }
        return true;
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
        if (doorOpened) return;
        doorOpened = true;
        Debug.Log("All coins collected! Gateway Opened.");
        RotateDoorSmoothly();
    }
    // Function to call for smooth rotation
    public void RotateDoorSmoothly()
    {
        if (door == null)
        {
            Debug.LogWarning("CoinManager: no door assigned, nothing to open.");
            return;
        }
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

    private void OnDestroy()
    {
        if (Instance == this) Instance = null;
    }
}
