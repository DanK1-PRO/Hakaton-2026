$ErrorActionPreference = 'Stop'
$root = Split-Path (Split-Path $PSScriptRoot)
# PostgreSQL's Windows initdb cannot bootstrap UTF-8 with a Cyrillic binary path.
# A drive alias keeps all files inside this workspace without copying them.
if ($root -match '[^\x00-\x7F]') {
    if (Test-Path 'P:\') {
        & (Join-Path $root '.venv\Scripts\python.exe') -c "import os,sys; sys.exit(0 if os.path.samefile('P:/',sys.argv[1]) else 1)" $root
        if ($LASTEXITCODE -ne 0) { throw 'Drive P: is occupied. Use Docker or an ASCII checkout path.' }
    } else { & subst.exe P: $root }
    $root = 'P:\'
}
$native = Join-Path $root 'scripts\windows\node_modules\@embedded-postgres\windows-x64\native\bin'
$data = Join-Path $root '.runtime\pgdata'
$runtime = Join-Path $root '.runtime'
New-Item -ItemType Directory -Force $runtime | Out-Null
$settings = @{}
Get-Content (Join-Path $root '.env') | ForEach-Object {
    if ($_ -match '^([^#=]+)=(.*)$') { $settings[$matches[1]] = $matches[2] }
}
if (-not (Test-Path (Join-Path $data 'PG_VERSION'))) {
    $passwordFile = Join-Path $runtime 'pg-password.tmp'
    try {
        [IO.File]::WriteAllText($passwordFile, $settings['POSTGRES_PASSWORD'], [Text.UTF8Encoding]::new($false))
        & (Join-Path $native 'initdb.exe') -D $data -U dds --auth=scram-sha-256 --encoding=UTF8 --locale=C "--pwfile=$passwordFile"
        if ($LASTEXITCODE -ne 0) { throw 'initdb failed' }
    } finally { Remove-Item -LiteralPath $passwordFile -ErrorAction SilentlyContinue }
}
& (Join-Path $native 'pg_ctl.exe') status -D $data
if ($LASTEXITCODE -ne 0) {
    & (Join-Path $native 'pg_ctl.exe') start -D $data -l (Join-Path $runtime 'postgres.log') -o '-p 55432 -h 127.0.0.1' -w
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL start failed' }
}
& (Join-Path $root '.venv\Scripts\python.exe') (Join-Path $root 'scripts\create_database.py')
if ($LASTEXITCODE -ne 0) { throw 'Database creation failed' }
