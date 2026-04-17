# gitleaks-scan.ps1
# Runs on every Claude Code Stop event to detect leaked secrets.

$projectDir = $env:CLAUDE_PROJECT_DIR
if (-not $projectDir) {
    $projectDir = Get-Location
}

# Check gitleaks is available
if (-not (Get-Command gitleaks -ErrorAction SilentlyContinue)) {
    Write-Host "[gitleaks] WARNING: gitleaks not found in PATH, skipping scan." -ForegroundColor Yellow
    exit 0
}

$reportPath = Join-Path $projectDir ".claude" "gitleaks-report.json"

Write-Host "[gitleaks] Scanning working tree for secrets..." -ForegroundColor Cyan

# Scan staged + unstaged changes only (fast); use --log-opts for full history scan
gitleaks detect `
    --source $projectDir `
    --report-format json `
    --report-path $reportPath `
    --no-banner `
    --exit-code 1 `
    2>&1

$exitCode = $LASTEXITCODE

if ($exitCode -eq 0) {
    Write-Host "[gitleaks] Clean — no secrets detected." -ForegroundColor Green
    # Remove empty report to avoid noise
    if (Test-Path $reportPath) { Remove-Item $reportPath }
} elseif ($exitCode -eq 1) {
    Write-Host "" 
    Write-Host "[gitleaks] *** SECRETS DETECTED — review $reportPath ***" -ForegroundColor Red
    Write-Host "[gitleaks] Rotate any real keys immediately before pushing." -ForegroundColor Red

    # Print a summary of findings (file + rule only, no raw secret values)
    if (Test-Path $reportPath) {
        $findings = Get-Content $reportPath | ConvertFrom-Json
        foreach ($f in $findings) {
            Write-Host "  - [$($f.RuleID)] $($f.File):$($f.StartLine)" -ForegroundColor Yellow
        }
    }

    # Exit 0 so Claude Code itself is not blocked — this is advisory only.
    # Change to `exit 1` if you want Claude Code to treat this as a hard error.
    exit 0
} else {
    Write-Host "[gitleaks] Scan failed (exit $exitCode). Check gitleaks installation." -ForegroundColor Yellow
    exit 0
}