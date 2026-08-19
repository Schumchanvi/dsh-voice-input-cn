' voice-bridge autostart (hidden, no console window)
' Uses pythonw from PATH; runs voice-bridge.py from this script's folder.
Set ws = CreateObject("Wscript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
ws.Run "pythonw.exe -u """ & scriptDir & "\voice-bridge.py""", 0, False
