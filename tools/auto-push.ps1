param(
    [string]$RepoPath = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
    [int]$DelaySeconds = 8,
    [string]$CommitPrefix = 'Auto update'
)

$ErrorActionPreference = 'Continue'
$Git = Join-Path $env:USERPROFILE 'tools\PortableGit\cmd\git.exe'
$LogPath = Join-Path $RepoPath 'tools\auto-push.log'
$PidPath = Join-Path $RepoPath 'tools\auto-push.pid'

function Write-Log {
    param([string]$Message)
    $line = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
    Add-Content -Path $LogPath -Value $line
    Write-Host $line
}

function Test-GitReady {
    if (!(Test-Path $Git)) {
        Write-Log "Git was not found at $Git"
        return $false
    }

    & $Git -C $RepoPath rev-parse --is-inside-work-tree *> $null
    if ($LASTEXITCODE -ne 0) {
        Write-Log "$RepoPath is not a Git repository."
        return $false
    }

    return $true
}

function Invoke-AutoPush {
    if (!(Test-GitReady)) { return }

    & $Git -C $RepoPath add -A
    & $Git -C $RepoPath diff --cached --quiet
    if ($LASTEXITCODE -eq 0) {
        Write-Log 'No tracked changes to commit.'
        return
    }

    $message = "{0}: {1}" -f $CommitPrefix, (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
    & $Git -C $RepoPath commit -m $message
    if ($LASTEXITCODE -ne 0) {
        Write-Log 'Commit failed.'
        return
    }

    & $Git -C $RepoPath pull --rebase origin main
    if ($LASTEXITCODE -ne 0) {
        Write-Log 'Pull/rebase failed. Resolve the Git issue, then push manually.'
        return
    }

    & $Git -C $RepoPath push origin main
    if ($LASTEXITCODE -eq 0) {
        Write-Log "Pushed commit: $message"
    } else {
        Write-Log 'Push failed. Check GitHub authentication or network connection.'
    }
}

if (!(Test-GitReady)) {
    exit 1
}

Set-Content -Path $PidPath -Value $PID
Write-Log "Auto-push watcher started for $RepoPath"

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $RepoPath
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true

$ignoredPattern = '\\(\.git|node_modules|\.vercel)(\\|$)|\\tools\\auto-push\.(log|pid)$'
$pending = $false
$lastChange = Get-Date

$action = {
    if ($Event.SourceEventArgs.FullPath -match $using:ignoredPattern) {
        return
    }

    $script:pending = $true
    $script:lastChange = Get-Date
}

$subscriptions = @(
    Register-ObjectEvent $watcher Changed -Action $action
    Register-ObjectEvent $watcher Created -Action $action
    Register-ObjectEvent $watcher Deleted -Action $action
    Register-ObjectEvent $watcher Renamed -Action $action
)

try {
    while ($true) {
        Start-Sleep -Seconds 1
        if ($pending -and ((Get-Date) - $lastChange).TotalSeconds -ge $DelaySeconds) {
            $pending = $false
            Invoke-AutoPush
        }
    }
} finally {
    $subscriptions | ForEach-Object { Unregister-Event -SubscriptionId $_.Id -ErrorAction SilentlyContinue }
    $watcher.Dispose()
    Remove-Item -Path $PidPath -Force -ErrorAction SilentlyContinue
    Write-Log 'Auto-push watcher stopped.'
}
