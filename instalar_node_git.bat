@echo off
setlocal enabledelayedexpansion

:: Checar se está rodando como administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Por favor, execute este script como Administrador.
    pause
    exit /b
)

:: Diretório temporário para downloads
set TEMP_DIR=%TEMP%\instaladores
mkdir "%TEMP_DIR%"

:: URLs dos instaladores (versões estáveis em julho de 2025)
set GIT_URL=https://github.com/git-for-windows/git/releases/download/v2.45.1.windows.1/Git-2.45.1-64-bit.exe
set NODE_URL=https://nodejs.org/dist/v20.12.2/node-v20.12.2-x64.msi

:: Caminho para os arquivos baixados
set GIT_INSTALLER=%TEMP_DIR%\git-installer.exe
set NODE_INSTALLER=%TEMP_DIR%\node-installer.msi

echo Baixando Git...
powershell -Command "Invoke-WebRequest -Uri '%GIT_URL%' -OutFile '%GIT_INSTALLER%'"

echo Baixando Node.js...
powershell -Command "Invoke-WebRequest -Uri '%NODE_URL%' -OutFile '%NODE_INSTALLER%'"

echo Instalando Git...
start /wait "" "%GIT_INSTALLER%" /VERYSILENT

echo Instalando Node.js...
msiexec /i "%NODE_INSTALLER%" /quiet /norestart

:: (Opcional) Habilita a Execution Policy no PowerShell para scripts locais
:: Descomente a linha abaixo se quiser ativar
:: powershell -Command "Set-ExecutionPolicy RemoteSigned -Scope LocalMachine -Force"

echo.
echo Instalação concluída.
pause
