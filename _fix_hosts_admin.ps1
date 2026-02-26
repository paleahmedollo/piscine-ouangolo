# Script qui tourne en admin - corrige le fichier hosts
$hostsPath = "C:\Windows\System32\drivers\etc\hosts"

$newHosts = @"
# Copyright (c) 1993-2009 Microsoft Corp.
# Fichier hosts - Piscine de Ouangolo
# localhost name resolution is handled within DNS itself.
#	127.0.0.1       localhost
#	::1             localhost

127.0.0.1    gestion.piscine.ouangolo
"@

try {
    [System.IO.File]::WriteAllText($hostsPath, $newHosts, [System.Text.Encoding]::ASCII)

    # Vider le cache DNS
    Start-Process "ipconfig" -ArgumentList "/flushdns" -Wait -WindowStyle Hidden

    # Message de succes
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show(
        "Corrections appliquees !`n`nOuvre maintenant ton navigateur et tape :`nhttp://gestion.piscine.ouangolo/`n`nLe site devrait s'ouvrir.",
        "Ouangolo - URL Corrigee",
        "OK",
        "Information"
    )
} catch {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show(
        "Erreur : $($_.Exception.Message)",
        "Echec",
        "OK",
        "Error"
    )
}
