@echo off
:: Ce script doit etre execute en tant qu'administrateur
title Correction fichier hosts - Ouangolo

echo ========================================
echo   Correction du fichier hosts
echo ========================================
echo.

:: Verifier droits admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERREUR: Ce script doit etre execute en tant qu'administrateur !
    echo.
    echo Clic droit sur fix-hosts.bat ^> "Executer en tant qu'administrateur"
    pause
    exit /b 1
)

echo [OK] Droits administrateur confirmes
echo.
echo Correction en cours...

:: Ecrire le nouveau fichier hosts
(
echo # Copyright ^(c^) 1993-2009 Microsoft Corp.
echo #
echo # This is a sample HOSTS file used by Microsoft TCP/IP for Windows.
echo #
echo # localhost name resolution is handled within DNS itself.
echo #	127.0.0.1       localhost
echo #	::1             localhost
echo 127.0.0.1    gestion.piscine.ouangolo
) > "C:\Windows\System32\drivers\etc\hosts"

if %errorLevel% equ 0 (
    echo [OK] Fichier hosts corrige avec succes !
    echo.
    echo Vidage du cache DNS...
    ipconfig /flushdns
    echo.
    echo ========================================
    echo   TERMINE !
    echo ========================================
    echo.
    echo Ouvre maintenant ton navigateur et va sur :
    echo   http://gestion.piscine.ouangolo:5173/
    echo.
    echo ^(Lance d'abord start.bat si les serveurs ne tournent pas^)
) else (
    echo ERREUR lors de la modification du fichier hosts
)

echo.
pause
