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
        GameObject playerObject = GameObject.FindGameObjectWithTag("Player");
        if (playerObject == null)
        {
            Debug.LogWarning($"{name}: no object tagged Player; enemy disabled.");
            enabled = false;
            return;
        }
        player = playerObject.transform;
        navAgent = GetComponent<UnityEngine.AI.NavMeshAgent>();
        if (patrolPoints == null) patrolPoints = new Transform[0];

        if (patrolPoints.Length > 0)
        {
            SetPatrolDestination();
        }
    }

    private void Update()
    {
        if (player == null) return;
        float distanceToPlayer = Vector3.Distance(transform.position, player.position);

        if (IsPlayerInFieldOfView(distanceToPlayer))
        {
            if (!isAttacking)
            {
                isAttacking = true;
                if (navAgent != null) navAgent.isStopped = true; // Stop movement
                Invoke(nameof(StartAttacking), attackCooldown);
            }
        }
        else
        {
            if (isAttacking)
            {
                isAttacking = false;
                CancelInvoke(nameof(StartAttacking)); // player left before the first shot
                StopAttacking();
                if (navAgent != null) navAgent.isStopped = false; // Resume movement
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

        if (angleToPlayer > fieldOfViewAngle) return false;

        // Enemies used to see and shoot through maze walls. Require a clear line.
        Vector3 eye = bulletSpawnPoint != null ? bulletSpawnPoint.position : transform.position + Vector3.up;
        if (Physics.Raycast(eye, (player.position - eye).normalized, out RaycastHit hit, detectionRange, ~0, QueryTriggerInteraction.Ignore))
        {
            return hit.transform == player || hit.transform.IsChildOf(player);
        }
        return true;
    }

    private void Patrol()
    {
        if (patrolPoints.Length == 0 || navAgent == null || !navAgent.isOnNavMesh) return;

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
        if (patrolPoints.Length > 0 && navAgent != null && navAgent.isOnNavMesh && patrolPoints[currentPatrolIndex] != null)
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
        if (player == null || PlayerHealth.Instance == null || PlayerHealth.Instance.currentHealth <= 0)
        {
            StopAttacking();
            return;
        }

        if (bulletPrefab != null && bulletSpawnPoint != null)
        {
            if (AudioManager.Instance != null) AudioManager.Instance.PlaySoundEffect(bulletaudio);
            GameObject bullet = Instantiate(bulletPrefab, bulletSpawnPoint.position, bulletSpawnPoint.rotation);
            // stop the bullet colliding with the enemy that fired it
            Collider bulletCollider = bullet.GetComponent<Collider>();
            if (bulletCollider != null)
            {
                foreach (Collider own in GetComponentsInChildren<Collider>())
                {
                    Physics.IgnoreCollision(bulletCollider, own);
                }
            }
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
