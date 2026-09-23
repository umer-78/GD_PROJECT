using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

public static class NavMeshRebake
{
    static readonly string[] Scenes =
    {
        "Assets/Scenes/Level1.unity",
        "Assets/Scenes/Level2.unity",
        "Assets/Scenes/Level3.unity",
        "Assets/Scenes/Level4.unity",
        "Assets/Scenes/Level5.unity",
    };

    public static void BakeAll()
    {
        foreach (var path in Scenes)
        {
            if (!EditorSceneManager.OpenScene(path, OpenSceneMode.Single).IsValid())
            {
                Debug.LogError("Failed to open " + path);
                EditorApplication.Exit(1);
                return;
            }
            UnityEditor.AI.NavMeshBuilder.BuildNavMesh();
            if (!EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene()))
            {
                Debug.LogError("Failed to save " + path);
                EditorApplication.Exit(1);
                return;
            }
            Debug.Log("Baked NavMesh for " + path);
        }
        EditorApplication.Exit(0);
    }
}
