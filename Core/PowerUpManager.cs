//using UnityEngine;

//public class PowerUpManager : MonoBehaviour
//{
//    public static PowerUpManager Instance; // Singleton for global access

//    [Header("Power-Up Settings")]
//    public float speedBoostMultiplier = 2f;
//    public float shieldDuration = 10f;
//    public float powerUpDuration = 5f;

//    [Header("Effects")]
//    public AudioClip powerUpPickupSound;
//    public ParticleSystem powerUpEffect;

//    private PlayerController playerController;
//    private AudioManager audioManager;

//    void Awake()
//    {
//        // Singleton pattern
//        if (Instance == null)
//        {
//            Instance = this;
//        }
//        else
//        {
//            Destroy(gameObject);
//        }
//    }

//    void Start()
//    {
//        playerController = FindObjectOfType<PlayerController>();
//        audioManager = FindObjectOfType<AudioManager>();
//    }

//    public void ActivatePowerUp(string powerUpType)
//    {
//        if (powerUpEffect != null && playerController != null)
//        {
//            Instantiate(powerUpEffect, playerController.transform.position, Quaternion.identity);
//        }

//        if (audioManager != null && powerUpPickupSound != null)
//        {
//            audioManager.PlaySound(powerUpPickupSound);
//        }

//        switch (powerUpType)
//        {
//            case "SpeedBoost":
//                StartCoroutine(SpeedBoost());
//                break;
//            case "Shield":
//                StartCoroutine(Shield());
//                break;
//            default:
//                Debug.LogWarning("Unknown Power-Up Type: " + powerUpType);
//                break;
//        }
//    }

//    private System.Collections.IEnumerator SpeedBoost()
//    {
//        if (playerController == null) yield break;

//        playerController.moveSpeed *= speedBoostMultiplier;
//        Debug.Log("Speed Boost Activated!");

//        yield return new WaitForSeconds(powerUpDuration);

//        playerController.moveSpeed /= speedBoostMultiplier;
//        Debug.Log("Speed Boost Deactivated!");
//    }

//    public void ApplyPowerUp(PlayerController player, string powerUpType)
//    {
//        if (powerUpType == "SpeedBoost")
//        {
//            player.moveSpeed *= 2;
//            StartCoroutine(RemoveSpeedBoostAfterTime(player, 5f)); // Optional duration for power-up
//        }
//        else if (powerUpType == "Shield")
//        {
//            player.isShielded = true;
//            StartCoroutine(RemoveShieldAfterTime(player, 5f)); // Optional duration for shield
//        }
//    }

//    private System.Collections.IEnumerator RemoveSpeedBoostAfterTime(PlayerController player, float duration)
//    {
//        yield return new WaitForSeconds(duration);
//        player.moveSpeed /= 2;
//    }

//    private System.Collections.IEnumerator RemoveShieldAfterTime(PlayerController player, float duration)
//    {
//        yield return new WaitForSeconds(duration);
//        player.isShielded = false;
//    }

//    private System.Collections.IEnumerator Shield()
//    {
//        if (playerController == null) yield break;

//        playerController.isShielded = true;
//        Debug.Log("Shield Activated!");

//        yield return new WaitForSeconds(shieldDuration);

//        playerController.isShielded = false;
//        Debug.Log("Shield Deactivated!");
//    }
//}
