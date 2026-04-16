$target = Join-Path $PSScriptRoot "gitleaks-scan.ps1"
if (Test-Path $target) {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    & $target
    exit $LASTEXITCODE
} else {
    Write-Host "gitleaks-scan.ps1 not found at $target"
    exit 0
}