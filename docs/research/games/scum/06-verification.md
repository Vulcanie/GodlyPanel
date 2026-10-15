# SCUM verification (DRAFT, written after first cycles; being refined)

Server "Scratch scum", game port 31120, install 15 GB already done. Panel https://127.0.0.1:47999 (scratch).

| check | result | evidence |
|---|---|---|
| Install / exe location | PASS | `SCUM\Binaries\Win64\SCUMServer.exe` in folder root, as in the notes |
| Start script | PASS (content) | `start /MIN "Scratch scum" SCUM\Binaries\Win64\SCUMServer.exe -log -port=31120 -MaxPlayers=64`, no password on the line |
| Start via panel | PARTIAL | API says "starting", but SCUMServer.exe only appears ~90-130 s later (see below) |
| processName `SCUMServer.exe` stays running | PASS | single process (+ conhost, crashpad_handler children), no -Win64-Shipping child |
| Panel status/stop | FAIL | `SCUMServer.exe` runs ELEVATED (manifest `highestAvailable`); a non-elevated panel gets no ExecutablePath for it, so GET /api/status says online:false and POST stop says "running, but not from Scratch scum's folder ... Nothing was stopped" (409). taskkill, taskkill /F, Stop-Process, WM_CLOSE, AttachConsole(Ctrl+C) all: access denied. Only WMI Win32_Process.Terminate worked. |
| ServerSettings.ini kept | PASS (2nd run) | name/password/maxplayers survived; game adds 434 keys; see detail |
