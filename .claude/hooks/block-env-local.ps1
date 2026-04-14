# block-env-local.ps1
# PreToolUse hook: deny Claude Code access to .env.local
# Place in: .claude/hooks/block-env-local.ps1

$ErrorActionPreference = 'SilentlyContinue'

# Read JSON context from stdin
$rawInput = @()
while ($line = [Console]::In.ReadLine()) {
    $rawInput += $line
}
$jsonStr = $rawInput -join "`n"

try {
    $hookInput = $jsonStr | ConvertFrom-Json
} catch {
    # JSON parse failure — don't block, let Claude proceed
    exit 0
}

$toolName  = $hookInput.tool_name
$filePath  = $hookInput.tool_input.file_path
$command   = $hookInput.tool_input.command

# For Read/Write/Edit tools: check file_path
if ($filePath) {
    $basename = [System.IO.Path]::GetFileName($filePath)
    if ($basename -in @('.env', '.env.local')) {
        $result = @{
            hookSpecificOutput = @{
                hookEventName          = 'PreToolUse'
                permissionDecision     = 'deny'
                permissionDecisionReason = 'Access to .env.local is blocked by project hook'
            }
        }
        $result | ConvertTo-Json -Depth 3 -Compress
        exit 0
    }
}

# For Bash tool: check if command references .env.local
if ($toolName -eq 'Bash' -and $command) {
    if ($command -match '\.env(\.local)?(?=\s|[''";|&>]|$)') {
        $result = @{
            hookSpecificOutput = @{
                hookEventName          = 'PreToolUse'
                permissionDecision     = 'deny'
                permissionDecisionReason = 'Bash command references .env.local, which is blocked by project hook'
            }
        }
        $result | ConvertTo-Json -Depth 3 -Compress
        exit 0
    }
}

exit 0