$RepoPath = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$PidPath = Join-Path $RepoPath 'tools\auto-push.pid'

if (!(Test-Path $PidPath)) {
    Write-Host 'Auto-push watcher is not running.'
    exit 0
}

$WatcherPid = Get-Content -Path $PidPath | Select-Object -First 1
$process = Get-Process -Id $WatcherPid -ErrorAction SilentlyContinue

if ($process) {
    Stop-Process -Id $WatcherPid
    Write-Host "Stopped auto-push watcher process $WatcherPid."
} else {
    Write-Host 'Auto-push watcher process was not found.'
}

Remove-Item -Path $PidPath -Force -ErrorAction SilentlyContinue
