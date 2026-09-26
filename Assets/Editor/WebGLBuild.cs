using System.Linq;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

// Batch-mode entry point for the browser build published on GitHub Pages:
//   Unity -batchmode -quit -projectPath . -executeMethod WebGLBuild.Build -buildPath <dir>
public static class WebGLBuild
{
    public static void Build()
    {
        var args = System.Environment.GetCommandLineArgs();
        int i = System.Array.IndexOf(args, "-buildPath");
        string path = i >= 0 && i + 1 < args.Length ? args[i + 1] : "build/WebGL";

        // GitHub Pages cannot send Content-Encoding headers for .gz/.br files,
        // so ship the build uncompressed.
        PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Disabled;
        PlayerSettings.WebGL.linkerTarget = WebGLLinkerTarget.Wasm;
        PlayerSettings.WebGL.memorySize = 256;
        PlayerSettings.WebGL.exceptionSupport = WebGLExceptionSupport.None;
        PlayerSettings.WebGL.dataCaching = true;
        PlayerSettings.runInBackground = true;

        var scenes = EditorBuildSettings.scenes.Where(s => s.enabled).Select(s => s.path).ToArray();
        var report = BuildPipeline.BuildPlayer(scenes, path, BuildTarget.WebGL, BuildOptions.None);
        Debug.Log("WebGLBuild result: " + report.summary.result + ", size " + report.summary.totalSize + " bytes, errors " + report.summary.totalErrors);
        if (report.summary.result != BuildResult.Succeeded) EditorApplication.Exit(1);
    }
}
