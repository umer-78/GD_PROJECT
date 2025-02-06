using UnityEngine;

public class AudioManager : MonoBehaviour
{
    [Header("Audio Sources")]
    public AudioSource musicSource;         // Audio source for background music
    public AudioSource effectsSource;       // Audio source for sound effects
    public AudioSource soundEffectSource;

    [Header("Music Tracks")]
    public AudioClip gameplayMusic;         // Background music for gameplay
    public AudioClip victoryMusic;          // Background music for victory
    public AudioClip gameOverMusic;         // Background music for game over
    public AudioClip gameOverSound;
    public AudioClip victorySound;

    private static AudioManager instance;

    void Awake()
    {
        // Singleton pattern to ensure only one AudioManager exists
        if (instance == null)
        {
            instance = this;
            DontDestroyOnLoad(gameObject); // Persist across scenes
        }
        else
        {
            Destroy(gameObject); // Destroy duplicate
        }
    }

    public static AudioManager Instance
    {
        get
        {
            if (instance == null)
            {
                Debug.LogError("AudioManager not initialized!");
            }
            return instance;
        }
    }

    public void PlayMusic(AudioClip clip)
    {
        if (musicSource != null && clip != null)
        {
            musicSource.clip = clip;
            musicSource.loop = true; // Music loops by default
            musicSource.Play();
        }
    }

    public void StopMusic()
    {
        if (musicSource != null)
        {
            musicSource.Stop();
        }
    }

    public void PlaySoundEffect(AudioClip clip)
    {
        if (effectsSource != null && clip != null)
        {
            effectsSource.PlayOneShot(clip);
        }
    }

    public void SetMusicVolume(float volume)
    {
        if (musicSource != null)
        {
            musicSource.volume = Mathf.Clamp01(volume); // Clamp between 0 and 1
        }
    }

    public void SetEffectsVolume(float volume)
    {
        if (effectsSource != null)
        {
            effectsSource.volume = Mathf.Clamp01(volume); // Clamp between 0 and 1
        }
    }

    public void PlaySound(AudioClip clip)
    {
        soundEffectSource.PlayOneShot(clip);
    }

    public void PlayGameOverSound()
    {
        PlaySound(gameOverSound);
    }

    public void PlayVictorySound()
    {
        PlaySound(victorySound);
    }
}
