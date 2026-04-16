$target = Join-Path $PSScriptRoot "file-blocker.ps1"
if (Test-Path $target) {
    & $target
    exit $LASTEXITCODE
} else {
    Write-Host "file-blocker.ps1 not found at $target"
    exit 0
}