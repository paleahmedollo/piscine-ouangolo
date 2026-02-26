# Creer un raccourci bureau qui lance Chrome avec la resolution DNS personnalisee
# Pas besoin de droits admin !

$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutPath = "$desktopPath\Piscine de Ouangolo.lnk"
$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"

# Profil Chrome isole pour Ouangolo (propre processus = regles DNS toujours actives)
$profileDir = "$env:LOCALAPPDATA\OuangoloChrome"

$WScriptShell = New-Object -ComObject WScript.Shell
$shortcut = $WScriptShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $chromePath
$shortcut.Arguments = "--user-data-dir=`"$profileDir`" --host-resolver-rules=`"MAP gestion.piscine.ouangolo 127.0.0.1`" --no-first-run --no-default-browser-check http://gestion.piscine.ouangolo/"
$shortcut.WorkingDirectory = "C:\Program Files\Google\Chrome\Application"
$shortcut.IconLocation = "$chromePath,0"
$shortcut.Description = "Ouvrir le systeme de gestion Piscine de Ouangolo"
$shortcut.WindowStyle = 1
$shortcut.Save()

Write-Host "Raccourci cree: $shortcutPath"
Write-Host ""
Write-Host "=== AUSSI: Mise a jour des fichiers de config ==="

# Mettre a jour start.bat pour indiquer la bonne URL
Write-Host "Raccourci bureau cree avec succes !"
Write-Host "Double-clique sur 'Piscine de Ouangolo' sur le bureau pour ouvrir le site."
