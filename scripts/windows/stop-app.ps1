$ErrorActionPreference = 'Stop'
$root = Split-Path (Split-Path $PSScriptRoot)
$path = Join-Path $root '.runtime\processes.json'
if (Test-Path $path) {
    $ids = Get-Content $path -Raw | ConvertFrom-Json
    foreach ($id in @($ids.api, $ids.ui)) {
        $process = Get-CimInstance Win32_Process -Filter "ProcessId = $id" -ErrorAction SilentlyContinue
        if ($process -and ($process.CommandLine -match 'uvicorn app.main:app|vite/bin/vite.js')) {
            Stop-Process -Id $id
        }
    }
}
$native = Join-Path $root 'scripts\windows\node_modules\@embedded-postgres\windows-x64\native\bin'
& (Join-Path $native 'pg_ctl.exe') stop -D (Join-Path $root '.runtime\pgdata') -m fast -w

