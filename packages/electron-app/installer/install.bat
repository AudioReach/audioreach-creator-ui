:: Place this next to the `win-unpacked` folder.

@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"
set "SCRIPT_DIR=%~dp0"
set "APP_DIR=%SCRIPT_DIR%win-unpacked"
set "APP_NAME=audioreach-creator-ui"
set "APP_DISPLAY_NAME=AudioReach Creator"
set "APP_VERSION=0.0.1"
set "INSTALL_DIR=%ProgramFiles%\%APP_NAME%"
set "ELECTRON_VERSION=37.2.1"
set "POWERSHELL=%SYSTEMROOT%\System32\WindowsPowerShell\v1.0\powershell.exe"

:: Check for administrator privileges
%POWERSHELL% -Command "& {if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] 'Administrator')) { exit 1 }}" 2>nul
if errorlevel 1 (
    echo This script must be run as Administrator
    echo Right-click and select "Run as administrator"
    pause
    exit /b 1
)

echo Installing %APP_DISPLAY_NAME% v%APP_VERSION%
echo ========================================

:: Check if win-unpacked directory exists
if not exist "%APP_DIR%" (
    echo win-unpacked directory not found at: %APP_DIR%
    echo Make sure this script is in the same directory as win-unpacked/
    pause
    exit /b 1
)

:: Check if the executable exists
if not exist "%APP_DIR%\%APP_NAME%.exe" (
    echo Could not find executable: %APP_DIR%\%APP_NAME%.exe
    echo Available files:
    dir "%APP_DIR%"
    pause
    exit /b 1
)

echo Found executable: %APP_NAME%.exe

:: Check if application is already installed
set "BACKUP_DIR="
if exist "%INSTALL_DIR%" (
    echo.
    echo WARNING: %APP_DISPLAY_NAME% is already installed at: %INSTALL_DIR%
    echo.
    echo Proceeding with upgrade/reinstall...

    :: Kill any running instances before upgrade
    echo Stopping any running instances...
    taskkill /f /im "%APP_NAME%.exe" >nul 2>&1
    if not errorlevel 1 (
        echo Stopped running application
        timeout /t 2 /nobreak >nul
    )
)

:: STEP 1: Download and install FFmpeg
echo.
echo Downloading Electron binaries for Windows...

:: Create temporary directory
set "TEMP_DIR=%TEMP%\electron-ffmpeg-%RANDOM%"
mkdir "%TEMP_DIR%"

:: Download FFmpeg prebuilt
REM set "FFMPEG_URL=https://github.com/electron/electron/releases/download/v${ELECTRON_VERSION}/ffmpeg-v${ELECTRON_VERSION}-linux-x64.zip"
set FFMPEG_PREBUILT_VERSION=0.101.2
set FFMPEG_PREBUILT_URL="https://github.com/nwjs-ffmpeg-prebuilt/nwjs-ffmpeg-prebuilt/releases/download/%FFMPEG_PREBUILT_VERSION%/%FFMPEG_PREBUILT_VERSION%-win-x64.zip"
echo Downloading from: %FFMPEG_PREBUILT_URL%

:: Use faster PowerShell WebClient instead of Invoke-WebRequest
%POWERSHELL% -NoProfile -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Write-Host 'Starting download...'; $wc = New-Object System.Net.WebClient; $wc.Headers.Add('User-Agent', 'Mozilla/5.0'); $wc.DownloadFile('%FFMPEG_PREBUILT_URL%', '%TEMP_DIR%\ffmpeg.zip'); Write-Host 'Download completed'; $wc.Dispose()}"

if errorlevel 1 (
    echo Failed to download FFmpeg
    rmdir /s /q "%TEMP_DIR%"
    pause
    exit /b 1
)

:: Extract using PowerShell
echo Extracting binaries...
%POWERSHELL% -Command "& {Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('%TEMP_DIR%\ffmpeg.zip', '%TEMP_DIR%')}"

:: Find ffmpeg.dll
for /r "%TEMP_DIR%" %%f in (ffmpeg.dll) do (
    if exist "%%f" (
        echo Found binaries: %%f
        copy "%%f" "%APP_DIR%\ffmpeg.dll"
        if errorlevel 1 (
            echo Failed to copy ffmpeg.dll
            rmdir /s /q "%TEMP_DIR%"
            pause
            exit /b 1
        ) else (
            echo Installed binaries from prebuilt v%FFMPEG_PREBUILT_VERSION%
        )
        goto :ffmpeg_found
    )
)

echo Could not find ffmpeg.dll in prebuilt package
rmdir /s /q "%TEMP_DIR%"
pause
exit /b 1

:ffmpeg_found
:: Cleanup FFmpeg temp directory
rmdir /s /q "%TEMP_DIR%"

:: Verify FFmpeg installation
if not exist "%APP_DIR%\ffmpeg.dll" (
    echo FFmpeg installation failed
    pause
    exit /b 1
)

:: STEP 2: Install application system-wide
echo.
echo Installing application files to %INSTALL_DIR%
if exist "%INSTALL_DIR%" rmdir /s /q "%INSTALL_DIR%"
mkdir "%INSTALL_DIR%"

:: Use PowerShell to copy files instead of xcopy
%POWERSHELL% -Command "& {Copy-Item -Path '%APP_DIR%\*' -Destination '%INSTALL_DIR%' -Recurse -Force}"

if errorlevel 1 (
    echo Failed to copy application files
    pause
    exit /b 1
)

:: Verify installation
if not exist "%INSTALL_DIR%\%APP_NAME%.exe" (
    echo Failed to copy application files - executable not found
    pause
    exit /b 1
)
echo Application files copied successfully

:: Step 3: Create Start Menu shortcut
echo Creating Start Menu shortcut...
set "START_MENU=%ProgramData%\Microsoft\Windows\Start Menu\Programs"
%POWERSHELL% -Command "& {$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%START_MENU%\%APP_DISPLAY_NAME%.lnk'); $Shortcut.TargetPath = '%INSTALL_DIR%\%APP_NAME%.exe'; $Shortcut.WorkingDirectory = '%INSTALL_DIR%'; $Shortcut.Description = 'AudioReach Creator'; $Shortcut.Save()}"

:: Step 4: Create Desktop shortcut
echo Creating Desktop shortcut...
set "DESKTOP=%PUBLIC%\Desktop"
%POWERSHELL% -Command "& {$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%DESKTOP%\%APP_DISPLAY_NAME%.lnk'); $Shortcut.TargetPath = '%INSTALL_DIR%\%APP_NAME%.exe'; $Shortcut.WorkingDirectory = '%INSTALL_DIR%'; $Shortcut.Description = 'AudioReach Creator'; $Shortcut.Save()}"

:: Step 5: Add to PATH
echo Adding to system PATH...
%POWERSHELL% -Command "& {$currentPath = [Environment]::GetEnvironmentVariable('PATH', 'Machine'); if ($currentPath -notlike '*%INSTALL_DIR%*') { $newPath = $currentPath + ';%INSTALL_DIR%'; [Environment]::SetEnvironmentVariable('PATH', $newPath, 'Machine'); Write-Host 'Added to system PATH' } else { Write-Host 'Already in system PATH' }}"

if errorlevel 1 (
    echo Could not add to PATH - you may need to restart your computer
)

:: Step 6: Create uninstaller
echo Creating uninstaller...
(
echo @echo off
echo setlocal
echo.
echo :: Check for administrator privileges
echo "%SYSTEMROOT%\System32\WindowsPowerShell\v1.0\powershell.exe" -Command "^& {if ^(-NOT ^([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent^(^)^).IsInRole^([Security.Principal.WindowsBuiltInRole] 'Administrator'^)^) { exit 1 }}" 2^>nul
echo if errorlevel 1 ^(
echo     echo This script must be run as Administrator
echo     echo Right-click and select "Run as administrator"
echo     pause
echo     exit /b 1
echo ^)
echo.
echo echo Uninstalling %APP_DISPLAY_NAME%...
echo.
echo :: Kill any running instances
echo taskkill /f /im "%APP_NAME%.exe" ^>nul 2^>^&1
echo.
echo :: Remove shortcuts
echo del "%START_MENU%\%APP_DISPLAY_NAME%.lnk" ^>nul 2^>^&1
echo del "%DESKTOP%\%APP_DISPLAY_NAME%.lnk" ^>nul 2^>^&1
echo.
echo :: Remove from PATH
echo "%SYSTEMROOT%\System32\WindowsPowerShell\v1.0\powershell.exe" -Command "^& {$currentPath = [Environment]::GetEnvironmentVariable('PATH', 'Machine'^); if ($currentPath -like '*%INSTALL_DIR%*'^) { $newPath = $currentPath -replace ';%INSTALL_DIR%', '' -replace '%INSTALL_DIR%;', ''; [Environment]::SetEnvironmentVariable('PATH', $newPath, 'Machine'^) }}"
echo.
echo :: Remove from Add/Remove Programs
echo "%SYSTEMROOT%\System32\WindowsPowerShell\v1.0\powershell.exe" -Command "^& {Remove-Item -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\%APP_NAME%' -Force -ErrorAction SilentlyContinue}"
echo.
echo :: Remove application directory
echo cd /d "%%TEMP%%"
echo rmdir /s /q "%INSTALL_DIR%"
echo.
echo echo %APP_DISPLAY_NAME% has been uninstalled
echo echo To reinstall, run this installer as Administrator
echo pause
) > "%INSTALL_DIR%\uninstall.bat"

:: Step 7: Add/Update in Add/Remove Programs
echo Registering with Add/Remove Programs...
%POWERSHELL% -Command "& {$regPath = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\%APP_NAME%'; if (Test-Path $regPath) { Write-Host 'Updating existing registry entry...' } else { Write-Host 'Creating new registry entry...' }; New-Item -Path $regPath -Force | Out-Null; Set-ItemProperty -Path $regPath -Name 'DisplayName' -Value '%APP_DISPLAY_NAME%'; Set-ItemProperty -Path $regPath -Name 'DisplayVersion' -Value '%APP_VERSION%'; Set-ItemProperty -Path $regPath -Name 'Publisher' -Value 'Qualcomm Inc.'; Set-ItemProperty -Path $regPath -Name 'InstallLocation' -Value '%INSTALL_DIR%'; Set-ItemProperty -Path $regPath -Name 'UninstallString' -Value '%INSTALL_DIR%\uninstall.bat'; Set-ItemProperty -Path $regPath -Name 'NoModify' -Value 1 -Type DWord; Set-ItemProperty -Path $regPath -Name 'NoRepair' -Value 1 -Type DWord; try { $size = (Get-ChildItem '%INSTALL_DIR%' -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1KB; Set-ItemProperty -Path $regPath -Name 'EstimatedSize' -Value ([int]$size) -Type DWord } catch { }}"

echo.
if not "%BACKUP_DIR%"=="" (
    echo Installation/Upgrade completed successfully!
    echo.
    echo    Installation Summary:
    echo    Application: %INSTALL_DIR%
    echo    Previous version backed up to: %BACKUP_DIR%
    echo    Executable: %APP_NAME%.exe
    echo    Start Menu: %START_MENU%\%APP_DISPLAY_NAME%.lnk
    echo    Desktop: %DESKTOP%\%APP_DISPLAY_NAME%.lnk
    echo    Uninstaller: %INSTALL_DIR%\uninstall.bat
) else (
    echo Installation completed successfully!
    echo.
    echo    Installation Summary:
    echo    Application: %INSTALL_DIR%
    echo    Executable: %APP_NAME%.exe
    echo    Start Menu: %START_MENU%\%APP_DISPLAY_NAME%.lnk
    echo    Desktop: %DESKTOP%\%APP_DISPLAY_NAME%.lnk
    echo    Uninstaller: %INSTALL_DIR%\uninstall.bat
)

echo.
echo    You can now launch the app from:
echo    - Start Menu
echo    - Desktop shortcut
echo    - Command prompt: %APP_NAME%
echo    - Run dialog: %APP_NAME%
echo.
echo    To uninstall: Run %INSTALL_DIR%\uninstall.bat as Administrator
echo    Or use Add/Remove Programs in Windows Settings
echo.
pause
