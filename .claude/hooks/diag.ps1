$logPath = Join-Path $PSScriptRoot "diag.log"

$lines = @(
    "=== Hook fired at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===",
    "CLAUDE_PROJECT_DIR=[$env:CLAUDE_PROJECT_DIR]",
    "PWD=[$((Get-Location).Path)]",
    "PSScriptRoot=[$PSScriptRoot]",
    "SHELL=[$env:SHELL]",
    "MSYSTEM=[$env:MSYSTEM]",
    "TERM=[$env:TERM]",
    "COMSPEC=[$env:COMSPEC]",
    ""
)

$lines | Out-File -FilePath $logPath -Encoding utf8 -Append