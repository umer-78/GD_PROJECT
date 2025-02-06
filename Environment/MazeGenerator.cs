using UnityEngine;

public class MazeGenerator : MonoBehaviour
{
    [Header("Maze Dimensions")]
    public int width = 10;                // Number of columns
    public int height = 10;               // Number of rows

    [Header("Maze Elements")]
    public GameObject wallPrefab;         // Prefab for walls
    public GameObject floorPrefab;        // Prefab for floors
    public GameObject trapPrefab;         // Prefab for traps
    public GameObject coinPrefab;         // Prefab for coins
    public GameObject exitPrefab;         // Prefab for the exit point

    [Header("Difficulty Settings")]
    public int trapCount = 5;             // Number of traps in the maze
    public int coinCount = 10;            // Number of coins in the maze
    public int level = 0;

    private int[,] maze;                  // 2D array to store maze structure
    private void Start()
    {
        GenerateMaze(level);
    }
    public void GenerateMaze(int level)
    {
        // Adjust maze size and difficulty based on level
        width += level * 2;               // Increase maze size per level
        height += level * 2;
        trapCount += level;               // Add more traps as levels increase
        coinCount += level * 2;

        // Initialize the maze
        maze = new int[width, height];
        InitializeMaze();

        // Place maze elements
        PlaceWalls();
        PlaceTraps();
        PlaceCoins();
        PlaceExit();
    }

    private void InitializeMaze()
    {
        // Initialize all cells as walls
        for (int x = 0; x < width; x++)
        {
            for (int y = 0; y < height; y++)
            {
                maze[x, y] = 1; // 1 represents a wall
            }
        }

        // Create a simple open path for the maze
        for (int x = 1; x < width - 1; x += 2)
        {
            for (int y = 1; y < height - 1; y += 2)
            {
                maze[x, y] = 0; // 0 represents a path
                if (Random.value > 0.5f)
                {
                    int randX = Random.Range(-1, 2) * 2;
                    int randY = Random.Range(-1, 2) * 2;

                    if (x + randX > 0 && x + randX < width - 1 && y + randY > 0 && y + randY < height - 1)
                    {
                        maze[x + randX / 2, y + randY / 2] = 0;
                    }
                }
            }
        }
    }

    private void PlaceWalls()
    {
        for (int x = 0; x < width; x++)
        {
            for (int y = 0; y < height; y++)
            {
                if (maze[x, y] == 1)
                {
                    Instantiate(wallPrefab, new Vector3(x, 0, y), Quaternion.identity, transform);
                }
                else
                {
                    Instantiate(floorPrefab, new Vector3(x, 0, y), Quaternion.identity, transform);
                }
            }
        }
    }

    private void PlaceTraps()
    {
        for (int i = 0; i < trapCount; i++)
        {
            Vector2Int position = GetRandomEmptyCell();
            Instantiate(trapPrefab, new Vector3(position.x, 0.5f, position.y), Quaternion.identity, transform);
        }
    }

    private void PlaceCoins()
    {
        for (int i = 0; i < coinCount; i++)
        {
            Vector2Int position = GetRandomEmptyCell();
            Instantiate(coinPrefab, new Vector3(position.x, 0.5f, position.y), Quaternion.identity, transform);
        }
    }

    private void PlaceExit()
    {
        Vector2Int exitPosition = GetRandomEmptyCell();
        Instantiate(exitPrefab, new Vector3(exitPosition.x, 0.5f, exitPosition.y), Quaternion.identity, transform);
    }

    private Vector2Int GetRandomEmptyCell()
    {
        while (true)
        {
            int x = Random.Range(1, width - 1);
            int y = Random.Range(1, height - 1);

            if (maze[x, y] == 0)
            {
                maze[x, y] = 2; // Mark as occupied
                return new Vector2Int(x, y);
            }
        }
    }

    public void ClearMaze()
    {
        foreach (Transform child in transform)
        {
            Destroy(child.gameObject); // Clear previously generated maze
        }
    }
}
