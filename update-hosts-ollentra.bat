@echo off
:: Ce script doit etre execute en tant qu'administrateur
title Mise a jour hosts - gestix.uat => ollentra.uat

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERREUR: Clic droit sur ce fichier ^> "Executer en tant qu'administrateur"
    pause
    exit /b 1
)

echo [OK] Droits administrateur confirmes
echo.
echo Remplacement de gestix.uat par ollentra.uat dans le fichier hosts...

powershell -Command "(Get-Content 'C:\Windows\System32\drivers\etc\hosts') -replace '127\.0\.0\.1\s+gestix\.uat', '127.0.0.1    ollentra.uat' | Set-Content 'C:\Windows\System32\drivers\etc\hosts'"

if %errorLevel% equ 0 (
    echo [OK] Hosts mis a jour avec succes !
    echo.
    ipconfig /flushdns
    echo.
    echo L'application est maintenant accessible sur :
    echo   http://ollentra.uat
    echo   http://ollentra.uat:5173  ^(si Vite dev server^)
) else (
    echo ERREUR lors de la modification du fichier hosts
)

echo.
pause
