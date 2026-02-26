@echo off
title Reparation URL - Piscine Ouangolo

:: Lance le script PowerShell avec droits admin (UAC)
powershell -ExecutionPolicy Bypass -Command "Start-Process powershell -Verb RunAs -Wait -ArgumentList '-ExecutionPolicy Bypass -File ""%~dp0_fix_hosts_admin.ps1""'"

exit
