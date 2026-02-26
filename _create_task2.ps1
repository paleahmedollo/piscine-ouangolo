# Approche avec schtasks.exe en XML
$xml = @'
<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>Fix hosts Ouangolo</Description>
  </RegistrationInfo>
  <Triggers>
    <TimeTrigger>
      <StartBoundary>2000-01-01T00:00:00</StartBoundary>
      <Enabled>true</Enabled>
    </TimeTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <UserId>S-1-5-18</UserId>
      <RunLevel>HighestAvailable</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <ExecutionTimeLimit>PT2M</ExecutionTimeLimit>
    <Priority>7</Priority>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>powershell.exe</Command>
      <Arguments>-ExecutionPolicy Bypass -WindowStyle Hidden -File "D:\Piscine_de_Ouangolo\_fix_hosts_admin.ps1"</Arguments>
    </Exec>
  </Actions>
</Task>
'@

$xmlPath = "$env:TEMP\fix_hosts_task.xml"
$xml | Out-File -FilePath $xmlPath -Encoding Unicode

# Supprimer si existe
& schtasks.exe /delete /tn "FixHostsOuangolo" /f 2>$null

# Creer avec XML (S-1-5-18 = SYSTEM)
$result = & schtasks.exe /create /tn "FixHostsOuangolo" /xml $xmlPath /f 2>&1
Write-Host "Resultat creation: $result"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Tache creee. Lancement..."
    $result2 = & schtasks.exe /run /tn "FixHostsOuangolo" 2>&1
    Write-Host "Resultat lancement: $result2"
    Start-Sleep -Seconds 5

    $content = Get-Content 'C:\Windows\System32\drivers\etc\hosts' -Raw
    if ($content -match '127\.0\.0\.1\s+gestion') {
        Write-Host "SUCCESS !"
        & schtasks.exe /delete /tn "FixHostsOuangolo" /f 2>$null
    } else {
        Write-Host "Le fichier n'a pas change, code erreur: $LASTEXITCODE"
    }
} else {
    Write-Host "Echec creation tache. Code: $LASTEXITCODE"
}

Remove-Item $xmlPath -ErrorAction SilentlyContinue
