using UnityEngine;

public class Bullet : MonoBehaviour
{
    public int damage = 10; // Damage dealt by the bullet
    public float lifetime = 5f; // Bullet lifetime before destruction

    private void Start()
    {
        Destroy(gameObject, lifetime); // Destroy the bullet after its lifetime
    }

    private void OnCollisionEnter(Collision collision)
    {

        Debug.Log("Collided with player");
        // Check if the bullet hit the player
        if (collision.gameObject.CompareTag("Player"))
        {
            if (PlayerHealth.Instance != null)
            {
                PlayerHealth.Instance.TakeDamage(damage);
            }
        }

        // Destroy the bullet on collision
        Destroy(gameObject);
    }
}
