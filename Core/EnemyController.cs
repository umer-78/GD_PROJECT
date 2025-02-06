using UnityEngine;

public class EnemyController : MonoBehaviour
{
    [Header("Detection Settings")]
    public float detectionRange = 10f; // Range at which the enemy detects the player
    public float attackCooldown = 1f; // Time delay before starting to attack
    public float attackRate = 0.5f; // Rate of laser fire in seconds
    public float fieldOfViewAngle = 45f; // Field of view angle for detecting the player

    [Header("Patrol Settings")]
    public Transform[] patrolPoints; // Points for patrolling
    public float patrolWaitTime = 2f; // Wait time at each patrol point

    [Header("Projectile Settings")]
    public GameObject bulletPrefab; // Prefab of the bullet
    public Transform bulletSpawnPoint; // Position where the bullet is spawned
    public float bulletSpeed = 20f; // Speed of the bullet
    public AudioClip bulletaudio;

    private Transform player;
    private UnityEngine.AI.NavMeshAgent navAgent;
    private int currentPatrolIndex = 0;
    private float patrolTimer = 0f;
    private bool isAttacking = false;

    private void Start()
    {
        player = GameObject.FindGameObjectWithTag("Player").transform;
        navAgent = GetComponent<UnityEngine.AI.NavMeshAgent>();

        if (patrolPoints.Length > 0)
        {
            SetPatrolDestination();
        }
    }

    private void Update()
    {
        float distanceToPlayer = Vector3.Distance(transform.position, player.position);

        if (IsPlayerInFieldOfView(distanceToPlayer))
        {
            if (!isAttacking)
            {
                isAttacking = true;
                navAgent.isStopped = true; // Stop movement
                Invoke(nameof(StartAttacking), attackCooldown);
            }
        }
        else
        {
            if (isAttacking)
            {
                isAttacking = false;
                StopAttacking();
                navAgent.isStopped = false; // Resume movement
                SetPatrolDestination();
            }

            Patrol();
        }
    }

    private bool IsPlayerInFieldOfView(float distanceToPlayer)
    {
        if (distanceToPlayer > detectionRange) return false;

        Vector3 directionToPlayer = (player.position - transform.position).normalized;
        float angleToPlayer = Vector3.Angle(transform.forward, directionToPlayer);

        return angleToPlayer <= fieldOfViewAngle;
    }

    private void Patrol()
    {
        if (patrolPoints.Length == 0) return;

        if (!navAgent.pathPending && navAgent.remainingDistance < 0.5f)
        {
            patrolTimer += Time.deltaTime;

            if (patrolTimer >= patrolWaitTime)
            {
                patrolTimer = 0f;
                currentPatrolIndex = (currentPatrolIndex + 1) % patrolPoints.Length;
                SetPatrolDestination();
            }
        }
    }

    private void SetPatrolDestination()
    {
        if (patrolPoints.Length > 0)
        {
            navAgent.SetDestination(patrolPoints[currentPatrolIndex].position);
        }
    }

    private void StartAttacking()
    {
        if (isAttacking)
        {
            InvokeRepeating(nameof(FireBullet), 0f, attackRate); // Fire bullets at regular intervals
        }
    }

    private void StopAttacking()
    {
        CancelInvoke(nameof(FireBullet)); // Stop firing bullets
    }

    private void FireBullet()
    {
        if (player == null || PlayerHealth.Instance.currentHealth <= 0)
            return;

        if (bulletPrefab != null && bulletSpawnPoint != null)
        {
            AudioManager.Instance.PlaySoundEffect(bulletaudio);
            GameObject bullet = Instantiate(bulletPrefab, bulletSpawnPoint.position, bulletSpawnPoint.rotation);
            Rigidbody rb = bullet.GetComponent<Rigidbody>();

            if (rb != null)
            {
                // Calculate direction toward the player
                Vector3 directionToPlayer = (player.position - bulletSpawnPoint.position).normalized;

                // Launch the bullet toward the player
                rb.velocity = directionToPlayer * bulletSpeed;
            }
        }
    }

    private void OnDrawGizmosSelected()
    {
        Gizmos.color = Color.red;
        Gizmos.DrawWireSphere(transform.position, detectionRange);

        // Visualize field of view
        Vector3 forward = transform.forward * detectionRange;
        Vector3 leftBoundary = Quaternion.Euler(0, -fieldOfViewAngle, 0) * forward;
        Vector3 rightBoundary = Quaternion.Euler(0, fieldOfViewAngle, 0) * forward;

        Gizmos.color = Color.blue;
        Gizmos.DrawRay(transform.position, leftBoundary);
        Gizmos.DrawRay(transform.position, rightBoundary);
    }
}
