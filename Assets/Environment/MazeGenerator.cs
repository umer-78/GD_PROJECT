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
    private int baseWidth, baseHeight, baseTraps, baseCoins;
    private bool basesCaptured = false;

    private void Start()
    {
        GenerateMaze(level);
    }

    public void GenerateMaze(int level)
    {
        // Sizes are derived from the Inspector values each time. They used to be
        // added onto the previous call's result, so regenerating grew the maze
        // on every call.
        if (!basesCaptured)
        {
            baseWidth = width; baseHeight = height; baseTraps = trapCount; baseCoins = coinCount;
            basesCaptured = true;
        }
        ClearMaze();

        // Adjust maze size and difficulty based on level; odd sizes keep a wall border
        width = Mathf.Max(5, baseWidth + level * 2) | 1;
        height = Mathf.Max(5, baseHeight + level * 2) | 1;
        trapCount = baseTraps + level;    // Add more traps as levels increase
        coinCount = baseCoins + level * 2;

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

        // Carve a perfect maze (recursive backtracker) so every open cell -
        // coins and the exit included - can be reached. The old random carving
        // often left coins sealed off, which made a level impossible to finish.
        var stack = new System.Collections.Generic.Stack<Vector2Int>();
        var start = new Vector2Int(1, 1);
        maze[start.x, start.y] = 0;
        stack.Push(start);
        Vector2Int[] dirs = { new Vector2Int(2, 0), new Vector2Int(-2, 0), new Vector2Int(0, 2), new Vector2Int(0, -2) };
        while (stack.Count > 0)
        {
            Vector2Int cell = stack.Peek();
            var options = new System.Collections.Generic.List<Vector2Int>();
            foreach (Vector2Int d in dirs)
            {
                Vector2Int n = cell + d;
                if (n.x > 0 && n.x < width - 1 && n.y > 0 && n.y < height - 1 && maze[n.x, n.y] == 1)
                {
                    options.Add(n);
                }
            }
            if (options.Count == 0)
            {
                stack.Pop();
                continue;
            }
            Vector2Int next = options[Random.Range(0, options.Count)];
            maze[(cell.x + next.x) / 2, (cell.y + next.y) / 2] = 0;
            maze[next.x, next.y] = 0;
            stack.Push(next);
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
            if (!TryGetRandomEmptyCell(out Vector2Int position)) break;
            Instantiate(trapPrefab, new Vector3(position.x, 0.5f, position.y), Quaternion.identity, transform);
        }
    }

    private void PlaceCoins()
    {
        for (int i = 0; i < coinCount; i++)
        {
            if (!TryGetRandomEmptyCell(out Vector2Int position)) break;
            Instantiate(coinPrefab, new Vector3(position.x, 0.5f, position.y), Quaternion.identity, transform);
        }
    }

    private void PlaceExit()
    {
        if (!TryGetRandomEmptyCell(out Vector2Int exitPosition)) return;
        Instantiate(exitPrefab, new Vector3(exitPosition.x, 0.5f, exitPosition.y), Quaternion.identity, transform);
    }

    // The old version looped forever (freezing Unity) once every open cell was
    // taken, e.g. many coins in a small maze. This one picks from the free cells.
    private bool TryGetRandomEmptyCell(out Vector2Int cell)
    {
        var free = new System.Collections.Generic.List<Vector2Int>();
        for (int x = 1; x < width - 1; x++)
        {
            for (int y = 1; y < height - 1; y++)
            {
                if (maze[x, y] == 0 && !(x == 1 && y == 1)) free.Add(new Vector2Int(x, y)); // keep the start cell clear
            }
        }
        if (free.Count == 0)
        {
            Debug.LogWarning("MazeGenerator: no free cells left for more objects.");
            cell = default;
            return false;
        }
        cell = free[Random.Range(0, free.Count)];
        maze[cell.x, cell.y] = 2; // Mark as occupied
        return true;
    }

    public void ClearMaze()
    {
        for (int i = transform.childCount - 1; i >= 0; i--)
        {
            Destroy(transform.GetChild(i).gameObject); // Clear previously generated maze
        }
    }
}
