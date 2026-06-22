' Fully hidden startup sync — no taskbar flash (WindowStyle 0).
Set shell = CreateObject("Wscript.Shell")
repo = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
ps1 = repo & "\git-sync-windows.ps1"
shell.Run "powershell.exe -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File """ & ps1 & """", 0, False
