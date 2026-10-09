# Baut das Space-Trader-Image fuer mehrere Architekturen und pusht es nach docker.eye-project.de.
# Aufruf: .\docker-build.ps1 [-Tag <tag>] [-Platforms linux/arm64] [-NoPush]
param(
    [string]$Registry = 'docker.eye-project.de',
    [string]$Image = 'spacetrader',
    [string]$Tag = '',
    [string]$Platforms = 'linux/amd64,linux/arm64',
    [switch]$NoPush
)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

if (-not $Tag) {
    $Tag = (git rev-parse --short HEAD).Trim()
    if (git status --porcelain) { $Tag = "$Tag-dirty" }
}

# Multi-Arch-Builds brauchen einen Builder mit docker-container-Treiber
$builder = 'spacetrader-builder'
docker buildx inspect $builder *> $null
if ($LASTEXITCODE -ne 0) {
    docker buildx create --name $builder --driver docker-container | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'buildx-Builder konnte nicht angelegt werden' }
}

$repo = "$Registry/$Image"
if ($NoPush) {
    # --load kann nur eine Plattform ins lokale Docker laden
    $Platforms = 'linux/amd64'
    $output = '--load'
} else {
    $output = '--push'
}

Write-Host "Baue $repo`:$Tag fuer $Platforms" -ForegroundColor Cyan
docker buildx build --builder $builder --platform $Platforms --pull `
    -t "$repo`:$Tag" -t "$repo`:latest" $output .
if ($LASTEXITCODE -ne 0) { throw 'docker buildx build fehlgeschlagen' }

if ($NoPush) {
    Write-Host 'Lokal gebaut (linux/amd64), kein Push.' -ForegroundColor Yellow
} else {
    Write-Host "Fertig: $repo`:$Tag und :latest gepusht ($Platforms)." -ForegroundColor Green
}
