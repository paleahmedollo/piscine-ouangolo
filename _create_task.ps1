# Creer une tache planifiee qui tourne en SYSTEM pour modifier le hosts file
$action = New-ScheduledTaskAction `
    -Execute 'powershell.exe' `
    -Argument '-ExecutionPolicy Bypass -WindowStyle Hidden -File "D:\Piscine_de_Ouangolo\_fix_hosts_admin.ps1"'

$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddSeconds(5)

$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 2) `
    -DeleteExpiredTaskAfter (New-TimeSpan -Seconds 30)

try {
    # Supprimer la tache si elle existe deja
    Unregister-ScheduledTask -TaskName 'FixHostsOuangolo' -Confirm:$false -ErrorAction SilentlyContinue

    # Creer la tache qui tourne en SYSTEM (plein acces fichiers systeme)
    Register-ScheduledTask `
        -TaskName 'FixHostsOuangolo' `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -RunLevel Highest `
        -User 'SYSTEM' `
        -Force | Out-Null

    Write-Host "Tache creee. Lancement dans 5 secondes..."
    Start-Sleep -Seconds 7

    # Lancer la tache immediatement
    Start-ScheduledTask -TaskName 'FixHostsOuangolo'
    Start-Sleep -Seconds 3

    # Verifier que le hosts a ete modifie
    $content = Get-Content 'C:\Windows\System32\drivers\etc\hosts' -Raw
    if ($content -match '127\.0\.0\.1\s+gestion\.piscine\.ouangolo') {
        Write-Host "SUCCESS: Hosts file corrige !"
        # Nettoyer la tache
        Unregister-ScheduledTask -TaskName 'FixHostsOuangolo' -Confirm:$false -ErrorAction SilentlyContinue
    } else {
        Write-Host "ECHEC: Le hosts n'a pas ete modifie."
        Write-Host "Contenu actuel:"
        Write-Host $content
    }
} catch {
    Write-Host "ERREUR: $($_.Exception.Message)"
}
