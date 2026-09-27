param(
  [string]$Bounds = "36.80,55.50,37.95,56.00",
  [string]$MaxZoom = "14",
  [switch]$Force
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$tools = Join-Path $root "runtime\maps\tools"
$data = Join-Path $root "runtime\maps\data"
$tmp = Join-Path $root "runtime\maps\tmp"
$out = Join-Path $root "frontend\public\maps\moscow.pmtiles"
$pbf = Join-Path $tools "central-fed-district-latest.osm.pbf"
$jar = Join-Path $tools "planetiler.jar"
$pbfUrl = "https://download.geofabrik.de/russia/central-fed-district-latest.osm.pbf"
$jarUrl = "https://github.com/onthegomap/planetiler/releases/download/v0.10.2/planetiler.jar"
$jreUrl = "https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jre/hotspot/normal/eclipse"

New-Item -ItemType Directory -Force -Path $tools, $data, $tmp, (Split-Path $out) | Out-Null

function Ensure-Download {
  param([string]$Url, [string]$Dest, [string]$Label)
  if (Test-Path $Dest) { return }
  Write-Host "Скачивание: $Label"
  & curl.exe -L --retry 8 --retry-delay 5 --retry-all-errors -C - -o $Dest $Url
  if ($LASTEXITCODE -ne 0 -or !(Test-Path $Dest)) { throw "Не удалось скачать: $Url" }
}

Ensure-Download -Url $jarUrl -Dest $jar -Label "planetiler.jar"
Ensure-Download -Url $pbfUrl -Dest $pbf -Label "OSM-выгрузка ЦФО (Геофабрик)"

$neZip = Join-Path $data "data\sources\natural_earth_vector.sqlite.zip"
Ensure-Download -Url "https://github.com/onthegomap/planetiler/raw/main/planetiler-core/src/test/resources/natural_earth_vector.sqlite.zip" `
  -Dest $neZip -Label "Natural Earth (упрощённый пакет planetiler)"

$java = Get-ChildItem -Recurse -Path $tools -Filter java.exe -ErrorAction SilentlyContinue |
  Select-Object -First 1
if (-not $java) {
  $jreZip = Join-Path $tools "jre21.zip"
  Ensure-Download -Url $jreUrl -Dest $jreZip -Label "Temurin JRE 21"
  Expand-Archive -Path $jreZip -DestinationPath (Join-Path $tools "jre") -Force
  $java = Get-ChildItem -Recurse -Path (Join-Path $tools "jre") -Filter java.exe |
    Select-Object -First 1
}
if (-not $java) { throw "java.exe не найден в $tools" }

if ((Test-Path $out) -and -not $Force) {
  Write-Host "Пакет уже существует: $out (пересборка: -Force)"
  exit 0
}

Write-Host "Сборка $out (bounds=$Bounds maxzoom=$MaxZoom)"
Push-Location $data
try {
  & $java.FullName -Xmx6g -jar $jar `
    "--osm_path=$pbf" `
    "--bounds=$Bounds" `
    "--minzoom=0" `
    "--maxzoom=$MaxZoom" `
    "--tmpdir=$tmp" `
    "--output=$out" `
    "--force" `
    "--download" `
    "--http_timeout=300s"
  if ($LASTEXITCODE -ne 0) { throw "planetiler завершился с кодом $LASTEXITCODE" }
}
finally {
  Pop-Location
}

$item = Get-Item $out
Write-Host "Готово: $($item.FullName) ($([math]::Round($item.Length / 1MB, 1)) МБ)"
