# Verification complete des groupes et du statut admin
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]$identity

Write-Host "=== Utilisateur ==="
Write-Host "Nom: $($identity.Name)"
Write-Host "Est Admin (eleve): $($principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator))"

Write-Host ""
Write-Host "=== Tous les groupes ==="
$identity.Groups | ForEach-Object {
    try {
        $name = $_.Translate([Security.Principal.NTAccount]).Value
        Write-Host "  $name"
    } catch {
        Write-Host "  (SID: $($_.Value))"
    }
}

Write-Host ""
Write-Host "=== Test ecriture hosts ==="
try {
    $stream = [IO.File]::Open('C:\Windows\System32\drivers\etc\hosts', 'Open', 'ReadWrite')
    $stream.Close()
    Write-Host "PEUT ecrire le fichier hosts !"
} catch {
    Write-Host "NE PEUT PAS ecrire: $($_.Exception.Message)"
}
