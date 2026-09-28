param([switch]$LocalML)
$ErrorActionPreference = 'Stop'
if ($LocalML) {
    $env:ML_MODE = 'local'
    $env:ML_URL = 'http://127.0.0.1:8090'
    $env:ML_TIMEOUT = '45'
}
$root = Split-Path (Split-Path $PSScriptRoot)
Set-Location $root
& .\.venv\Scripts\python.exe scripts\init_local.py
& $PSScriptRoot\start-db.ps1
$env:PYTHONPATH = Join-Path $root 'backend'
& .\.venv\Scripts\alembic.exe -c backend\alembic.ini upgrade head
if ($LASTEXITCODE -ne 0) { throw 'Migration failed' }
& .\.venv\Scripts\python.exe -m app.seed
if ($LASTEXITCODE -ne 0) { throw 'Seed failed' }
$runtime = Join-Path $root '.runtime'
$apiPort = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
$uiPort = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
if ($apiPort -or $uiPort) { throw 'Port 8000 or 5173 is occupied. Check the existing application before starting another.' }
$api = Start-Process -FilePath (Join-Path $root '.venv\Scripts\python.exe') -ArgumentList '-m uvicorn app.main:app --host 127.0.0.1 --port 8000' -WorkingDirectory $root -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtime 'api.log') -RedirectStandardError (Join-Path $runtime 'api-error.log')
$ui = Start-Process -FilePath (Get-Command node.exe).Source -ArgumentList 'node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 --strictPort' -WorkingDirectory (Join-Path $root 'frontend') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtime 'ui.log') -RedirectStandardError (Join-Path $runtime 'ui-error.log')
@{ api = $api.Id; ui = $ui.Id } | ConvertTo-Json | Set-Content (Join-Path $runtime 'processes.json')
Write-Host 'UI: http://127.0.0.1:5173 | API: http://127.0.0.1:8000/docs'

