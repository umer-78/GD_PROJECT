using UnityEngine;
using Cinemachine;


public class PlayerController : MonoBehaviour
{
    [Header("Movement Settings")]
    public float moveSpeed = 5f;
    public float rotationSpeed = 720f;
    public bool isShielded;

    [Header("Interaction")]
    public int coinsCollected = 0;

    public CinemachineVirtualCamera virtualCamera;
    private Transform cameraTransform;
    private CinemachineTransposer transposer;
    private Rigidbody rb;
    public Animator animator;

    void Start()
    {
        isShielded = PlayerHealth.Instance.isShielded;
        cameraTransform = virtualCamera.transform;
        transposer = virtualCamera.GetCinemachineComponent<CinemachineTransposer>();
        rb = GetComponent<Rigidbody>();
    }

    void Update()
    {
        HandleMovement();
    }

    void HandleMovement()
    {
        float horizontal = Input.GetAxis("Horizontal");
        float vertical = Input.GetAxis("Vertical");

        Vector3 direction = new Vector3(horizontal, 0, vertical).normalized;

        if (direction.magnitude > 0.1f)
        {
            // Calculate the target angle based on the player's movement direction
            float targetAngle = Mathf.Atan2(direction.x, direction.z) * Mathf.Rad2Deg;
            float smoothAngle = Mathf.LerpAngle(transform.eulerAngles.y, targetAngle, Time.deltaTime * rotationSpeed);
            transform.rotation = Quaternion.Euler(0, smoothAngle, 0);

            // Calculate the movement direction
            Vector3 moveDir = Quaternion.Euler(0, targetAngle, 0) * Vector3.forward;

            // Update velocity
            rb.velocity = new Vector3(moveDir.x * moveSpeed, rb.velocity.y, moveDir.z * moveSpeed);

            // Update camera offset (z value) based on movement direction
            if (vertical > 0) // Moving forward
            {
                transposer.m_FollowOffset.z = -5f; // Negative offset (camera behind player)
            }
            else if (vertical < 0) // Moving backward
            {
                transposer.m_FollowOffset.z = 5f; // Positive offset (camera in front of player)
            }

            // Debug movement calculations
            Debug.Log($"TargetAngle: {targetAngle}, SmoothAngle: {smoothAngle}, MoveDir: {moveDir}");

            animator.SetBool("isRunning", true);
        }
        else
        {
            rb.velocity = new Vector3(0, rb.velocity.y, 0);
            animator.SetBool("isRunning", false);

            // Reset camera offset to default
            transposer.m_FollowOffset.z = -5f; // Default offset behind the player

            // Debug idle state
            Debug.Log("Idle state - Velocity set to zero.");
        }
    }

    private void OnTriggerEnter(Collider other)
    {
        if (other.CompareTag("Coin"))
        {
            coinsCollected++;
            CoinManager.Instance.CollectCoin(other.gameObject);
        }
        else if(other.CompareTag("END"))
        {
            GameManager.Instance.Victory();
        }
        //else if (other.CompareTag("Trap"))
        //{
        //    TrapController trap = other.GetComponent<TrapController>();
        //    if (trap != null)
        //    {
        //        trap.TriggerTrap(this); // Pass 'this' as PlayerController
        //    }
        //    else
        //    {
        //        Debug.LogError("TrapController is missing on the trap object!");
        //    }
        //}
    }

    public void TakeDamage(int damage)
    {
        if (!isShielded)
        {
            PlayerHealth.Instance.TakeDamage(damage);
        }
    }
}
