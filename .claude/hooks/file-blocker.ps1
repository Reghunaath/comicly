$ErrorActionPreference = 'SilentlyContinue'

$jsonStr = [Console]::In.ReadToEnd()

try {
    $hookInput = $jsonStr | ConvertFrom-Json
} catch {
    exit 0
}

$toolName = $hookInput.tool_name
$filePath = $hookInput.tool_input.file_path
$command  = $hookInput.tool_input.command

function Test-SensitiveFile($path) {
    if (-not $path) { return $false }
    $basename = [System.IO.Path]::GetFileName($path)
    return ($basename -eq '.env') -or
           ($basename -match '^\.env\.') -or
           ($basename -match '^secrets\.')
}

function Block-Access($reason) {
    @{
        hookSpecificOutput = @{
            hookEventName            = 'PreToolUse'
            permissionDecision       = 'deny'
            permissionDecisionReason = $reason
        }
    } | ConvertTo-Json -Depth 3 -Compress
    exit 0
}

if (Test-SensitiveFile $filePath) {
    $name = [System.IO.Path]::GetFileName($filePath)
    Block-Access "BLOCKED: '$name' is a sensitive file - access denied by project security hook"
}

if ($filePath -and [System.IO.Path]::GetExtension($filePath) -eq '.drawio') {
    Block-Access "BLOCKED: .drawio files are blocked by project hook"
}

if ($toolName -eq 'Bash' -and $command) {
    if ($command -match '\.env(\.[\w.-]+)?(?=\s|[''";|&>$]|$)') {
        Block-Access "BLOCKED: Bash command references a sensitive .env file — denied by project security hook"
    }
    if ($command -match '\bsecrets\.\w+(?=\s|[''";|&>$]|$)') {
        Block-Access "BLOCKED: Bash command references a secrets file — denied by project security hook"
    }
    if ($command -match '\.drawio(?=\s|[''";|&>$]|$)') {
        Block-Access "BLOCKED: Bash command references a .drawio file — denied by project hook"
    }
}

exit 0
