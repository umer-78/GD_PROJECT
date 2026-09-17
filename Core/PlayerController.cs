using UnityEngine;
using Cinemachine;


public class PlayerController : MonoBehaviour
{
    [Header("Movement Settings")]
    public float moveSpeed = 5f;
    public float rotationSpeed = 720f;  // degrees per second
    public bool isShielded;

    [Header("Interaction")]
    public int coinsCollected = 0;

    [Header("Debug")]
    public bool logMovement = false;    // per-frame logging slowed the editor to a crawl

    public CinemachineVirtualCamera virtualCamera;
    private CinemachineTransposer transposer;
    private Rigidbody rb;
    public Animator animator;
    private Vector3 wantedVelocity;

    void Start()
    {
        if (PlayerHealth.Instance != null) isShielded = PlayerHealth.Instance.isShielded;
        if (virtualCamera != null)
        {
            transposer = virtualCamera.GetCinemachineComponent<CinemachineTransposer>();
        }
        rb = GetComponent<Rigidbody>();
    }

    void Update()
    {
        HandleMovement();
    }

    // Physics velocity is applied in FixedUpdate so movement speed does not
    // depend on the frame rate.
    void FixedUpdate()
    {
        if (rb == null) return;
        rb.velocity = new Vector3(wantedVelocity.x, rb.velocity.y, wantedVelocity.z);
    }

    void HandleMovement()
    {
        float horizontal = Input.GetAxis("Horizontal");
        float vertical = Input.GetAxis("Vertical");

        Vector3 direction = new Vector3(horizontal, 0, vertical).normalized;

        if (direction.magnitude > 0.1f)
        {
            // Turn toward the movement direction at rotationSpeed degrees per second.
            // (LerpAngle with deltaTime * 720 clamped to 1 every frame, so the
            // player snapped instantly and rotationSpeed did nothing.)
            float targetAngle = Mathf.Atan2(direction.x, direction.z) * Mathf.Rad2Deg;
            float smoothAngle = Mathf.MoveTowardsAngle(transform.eulerAngles.y, targetAngle, rotationSpeed * Time.deltaTime);
            transform.rotation = Quaternion.Euler(0, smoothAngle, 0);

            // Calculate the movement direction
            Vector3 moveDir = Quaternion.Euler(0, targetAngle, 0) * Vector3.forward;
            wantedVelocity = moveDir * moveSpeed;

            // Update camera offset (z value) based on movement direction
            if (transposer != null)
            {
                if (vertical > 0) // Moving forward
                {
                    transposer.m_FollowOffset.z = -5f; // Negative offset (camera behind player)
                }
                else if (vertical < 0) // Moving backward
                {
                    transposer.m_FollowOffset.z = 5f; // Positive offset (camera in front of player)
                }
            }

            if (logMovement) Debug.Log($"TargetAngle: {targetAngle}, SmoothAngle: {smoothAngle}, MoveDir: {moveDir}");

            if (animator != null) animator.SetBool("isRunning", true);
        }
        else
        {
            wantedVelocity = Vector3.zero;
            if (animator != null) animator.SetBool("isRunning", false);

            // Reset camera offset to default
            if (transposer != null) transposer.m_FollowOffset.z = -5f; // Default offset behind the player
        }
    }

    private void OnTriggerEnter(Collider other)
    {
        if (other.CompareTag("Coin"))
        {
            if (CoinManager.Instance != null && CoinManager.Instance.CollectCoin(other.gameObject))
            {
                coinsCollected++;
            }
        }
        else if(other.CompareTag("END"))
        {
            if (GameManager.Instance != null) GameManager.Instance.Victory();
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
        if (!isShielded && PlayerHealth.Instance != null)
        {
            PlayerHealth.Instance.TakeDamage(damage);
        }
    }
}
