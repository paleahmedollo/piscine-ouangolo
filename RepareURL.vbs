If WScript.Arguments.Named.Exists("elevated") Then
    ' On est admin - on fait le travail
    Dim fso, hostsPath, ts, content
    hostsPath = "C:\Windows\System32\drivers\etc\hosts"

    Set fso = CreateObject("Scripting.FileSystemObject")
    Set ts = fso.OpenTextFile(hostsPath, 2, True) ' 2 = ecriture
    ts.WriteLine "# Copyright (c) 1993-2009 Microsoft Corp."
    ts.WriteLine "#"
    ts.WriteLine "# Fichier hosts - Piscine de Ouangolo"
    ts.WriteLine "#"
    ts.WriteLine "# localhost name resolution is handled within DNS itself."
    ts.WriteLine "#" & Chr(9) & "127.0.0.1       localhost"
    ts.WriteLine "#" & Chr(9) & "::1             localhost"
    ts.WriteLine ""
    ts.WriteLine "127.0.0.1    gestion.piscine.ouangolo"
    ts.Close

    ' Vider le cache DNS
    Dim shell
    Set shell = CreateObject("WScript.Shell")
    shell.Run "cmd /c ipconfig /flushdns", 0, True

    MsgBox "Correction effectuee !" & Chr(13) & Chr(13) & _
           "Le site est maintenant accessible sur :" & Chr(13) & _
           "http://gestion.piscine.ouangolo/" & Chr(13) & Chr(13) & _
           "Ouvre ton navigateur et tape cette adresse.", _
           64, "Piscine de Ouangolo - URL corrigee"
Else
    ' Relancer en admin
    Dim objShell
    Set objShell = CreateObject("Shell.Application")
    objShell.ShellExecute "wscript.exe", _
        Chr(34) & WScript.ScriptFullName & Chr(34) & " /elevated", _
        "", "runas", 1
End If
