using UnityEngine;

public class ObstacleController : MonoBehaviour
{
    [Header("Obstacle Settings")]
    public bool isMoving = false;                // Whether the obstacle moves
    public Vector3 startPoint;                   // Starting position
    public Vector3 endPoint;                     // End position for movement
    public float moveSpeed = 2f;                 // Speed of obstacle movement

    public bool isRotating = false;              // Whether the obstacle rotates
    public Vector3 rotationAxis = Vector3.up;    // Axis of rotation
    public float rotationSpeed = 100f;           // Speed of rotation (degrees per second)

    [Header("Damage Settings")]
    public int damageAmount = 20;                // Damage dealt to the player on contact

    private bool movingToEnd = true;             // Direction flag for moving obstacles

    private void Start()
    {
        // Initialize the start point if not set in the Inspector
        if (isMoving)
        {
            transform.position = startPoint;
        }
    }

    private void Update()
    {
        if (isMoving)
        {
            HandleMovement();
        }

        if (isRotating)
        {
            HandleRotation();
        }
    }

    private void HandleMovement()
    {
        // Move the obstacle back and forth between startPoint and endPoint
        Vector3 target = movingToEnd ? endPoint : startPoint;
        transform.position = Vector3.MoveTowards(transform.position, target, moveSpeed * Time.deltaTime);

        if (Vector3.Distance(transform.position, target) < 0.1f)
        {
            movingToEnd = !movingToEnd; // Switch direction
        }
    }

    private void HandleRotation()
    {
        // Rotate the obstacle around the specified axis
        transform.Rotate(rotationAxis, rotationSpeed * Time.deltaTime);
    }

    private void OnCollisionEnter(Collision collision)
    {
        if (collision.gameObject.CompareTag("Player"))
        {
            PlayerHealth.Instance.TakeDamage(damageAmount);
        }
    }
}
