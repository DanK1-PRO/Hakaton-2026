param([string]$ModelPath, [string]$ServerPath, [int]$GpuLayers = 99, [switch]$FormulaOnly)
$ErrorActionPreference = 'Stop'
$root = Split-Path (Split-Path $PSScriptRoot)
$runtime = Join-Path $root '.runtime'
$python = Join-Path $root '.venv-ml\Scripts\python.exe'
if (!(Test-Path -LiteralPath $python)) { throw 'Prepare .venv-ml and install ml/requirements.txt before offline launch.' }
New-Item -ItemType Directory -Path $runtime -Force | Out-Null
if (!$ModelPath) { $ModelPath = Join-Path $runtime 'models\GigaChat3.1-10B-A1.8B-q4_K_M.gguf' }
if (!$ServerPath) { $ServerPath = Join-Path $runtime 'llama-b11223\llama-server.exe' }
$ports = @(8090)
if (!$FormulaOnly) { $ports += 8091 }
foreach ($port in $ports) {
    if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) { throw "Port $port is occupied; inspect the existing service first." }
}
$started = @()
$model = $null
$oldUrl = $env:DDS_LLM_URL
$oldTimeout = $env:DDS_LLM_TIMEOUT
function Wait-LocalService([string]$url, $process) {
    for ($attempt = 0; $attempt -lt 180; $attempt++) {
        if ($process.HasExited) { throw 'Service exited; inspect .runtime logs.' }
        try { if ((Invoke-WebRequest -Uri $url -TimeoutSec 2).StatusCode -eq 200) { return } } catch { }
        Start-Sleep -Seconds 1
    }
    throw "Service not ready: $url"
}
try {
    if (!$FormulaOnly) {
        if (!(Test-Path -LiteralPath $ModelPath) -or !(Test-Path -LiteralPath $ServerPath)) { throw 'Prepare GGUF and llama-server before offline launch.' }
        $model = Start-Process -FilePath $ServerPath -ArgumentList @('--model', ('"' + $ModelPath + '"'), '--host', '127.0.0.1', '--port', '8091', '--ctx-size', '4096', '--n-gpu-layers', "$GpuLayers", '--alias', 'local-model', '--parallel', '1') -WorkingDirectory $root -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtime 'llama.log') -RedirectStandardError (Join-Path $runtime 'llama-error.log')
        $started += $model
        Wait-LocalService 'http://127.0.0.1:8091/health' $model
        $env:DDS_LLM_URL = 'http://127.0.0.1:8091/v1'
        $env:DDS_LLM_TIMEOUT = '40'
    } else { $env:DDS_LLM_URL = '' }
    $evaluator = Start-Process -FilePath $python -ArgumentList '-m uvicorn ml.evaluator_service:app --host 127.0.0.1 --port 8090' -WorkingDirectory $root -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtime 'evaluator.log') -RedirectStandardError (Join-Path $runtime 'evaluator-error.log')
    $started += $evaluator
    Wait-LocalService 'http://127.0.0.1:8090/health' $evaluator
    @{ evaluator = $evaluator.Id; model = $(if ($model) { $model.Id } else { $null }) } | ConvertTo-Json | Set-Content (Join-Path $runtime 'ml-processes.json')
    Write-Host 'ML ready on 8090. API settings: ML_MODE=local, ML_URL=http://127.0.0.1:8090, ML_TIMEOUT=45.'
} catch {
    foreach ($process in $started) { if (!$process.HasExited) { & taskkill.exe /PID $process.Id /T /F | Out-Null } }
    throw
} finally {
    $env:DDS_LLM_URL = $oldUrl
    $env:DDS_LLM_TIMEOUT = $oldTimeout
}
