using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class DontDestroyOnLoad : MonoBehaviour
{
    private static AudioSource backgroundMusicInstance;

    private void Awake()
    {
        // Check if there's already a background music instance
        if (backgroundMusicInstance != null && backgroundMusicInstance != GetComponent<AudioSource>())
        {
            // If a background music instance exists, destroy this GameObject
            Destroy(gameObject);
            return;
        }

        // Set the static instance to this GameObject's AudioSource
        backgroundMusicInstance = GetComponent<AudioSource>();

        if (backgroundMusicInstance == null)
        {
            Debug.LogError("No AudioSource component found on this GameObject.");
        }
        else
        {
            // Set the tag to "BackgroundMusic" (optional, for scene search purposes)
            gameObject.tag = "BackgroundMusic";

            // Prevent this GameObject from being destroyed on scene load
            DontDestroyOnLoad(gameObject);
        }
    }
}
