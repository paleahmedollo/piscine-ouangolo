# Verifier si l'utilisateur est dans le groupe Administrateurs
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
$groups = ([Security.Principal.WindowsIdentity]::GetCurrent()).Groups | ForEach-Object { $_.Translate([Security.Principal.NTAccount]).Value }
Write-Host "Est admin eleve: $isAdmin"
Write-Host "Groupes:"
$groups | Where-Object { $_ -match "Admin|Administrat" } | ForEach-Object { Write-Host "  - $_" }

# Tenter de creer une tache planifiee SANS SYSTEM, avec l'utilisateur courant en elevated
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
Write-Host "Utilisateur: $currentUser"
