using UnityEngine;

public class ExitController : MonoBehaviour
{
    [Header("Exit Settings")]
    public AudioClip exitReachedSound; // Sound played when the exit is reached
    public ParticleSystem exitEffect; // Visual effect for the exit

    private bool isExitReached = false; // Ensures exit logic is triggered only once

    void OnTriggerEnter(Collider other)
    {
        if (isExitReached) return;

        if (other.CompareTag("Player")) // Ensure only the player triggers the exit
        {
            isExitReached = true;
            TriggerExit();
        }
    }

    private void TriggerExit()
    {
        Debug.Log("Exit Reached! Completing level...");

        // Play sound effect
        if (exitReachedSound != null)
        {
            AudioSource.PlayClipAtPoint(exitReachedSound, transform.position);
        }

        // Play particle effect
        if (exitEffect != null)
        {
            Instantiate(exitEffect, transform.position, Quaternion.identity);
        }

        // Notify LevelManager to complete the level
        LevelManager.Instance.CompleteLevel();
    }
}
