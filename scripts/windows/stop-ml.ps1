$ErrorActionPreference = 'Stop'
$root = Split-Path (Split-Path $PSScriptRoot)
$file = Join-Path $root '.runtime\ml-processes.json'
if (!(Test-Path -LiteralPath $file)) { return }
$ids = Get-Content -LiteralPath $file -Raw | ConvertFrom-Json
foreach ($processId in @($ids.evaluator, $ids.model)) {
    if (!$processId) { continue }
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $processId" -ErrorAction SilentlyContinue
    if ($process -and ($process.CommandLine -match 'uvicorn ml.evaluator_service:app|llama-server.exe') -and $process.ExecutablePath.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) {
        & taskkill.exe /PID $processId /T /F | Out-Null
    }
}
