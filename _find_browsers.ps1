$paths = @(
    'C:\Program Files\Google\Chrome\Application\chrome.exe',
    'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
    'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
    'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe",
    'C:\Program Files\Mozilla Firefox\firefox.exe',
    'C:\Program Files (x86)\Mozilla Firefox\firefox.exe',
    'C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe',
    'C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe'
)
foreach ($p in $paths) {
    if (Test-Path $p) { Write-Host "TROUVE: $p" }
}

# Chercher via registre
$regPaths = @(
    'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe',
    'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe',
    'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\firefox.exe'
)
foreach ($r in $regPaths) {
    if (Test-Path $r) {
        $val = (Get-ItemProperty $r).'(default)'
        if ($val) { Write-Host "REG: $val" }
    }
}
