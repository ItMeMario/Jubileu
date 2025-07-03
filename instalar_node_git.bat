@echo off
:: Script BRASILEIRO para instalar Node.js e Git - 
title Instalador Node.js + Git - 
color 0a
echo.
echo ###################################################
echo #           INSTALADOR NODE.JS + GIT              #
echo #        					       #
echo ###################################################
echo.

:: Verifica se já tem Node.js instalado
where node >nul 2>nul
if %errorlevel% equ 0 (
    echo [AVISO] Node.js já está instalado! Versao:
    node --version
    echo.
) else (
    echo [PASSO 1] Baixando Node.js LTS...
    powershell -Command "(New-Object Net.WebClient).DownloadFile('https://nodejs.org/dist/latest-v18.x/node-v18.17.1-x64.msi', 'nodejs-installer.msi')"
    echo [PASSO 2] Instalando Node.js (silencioso)...
    msiexec /i nodejs-installer.msi /quiet /qn /norestart
    echo [+] Node.js instalado com sucesso!
    del nodejs-installer.msi
    echo.
)

:: Verifica se já tem Git instalado
where git >nul 2>nul
if %errorlevel% equ 0 (
    echo [AVISO] Git já está instalado! Versao:
    git --version
    echo.
) else (
    echo [PASSO 3] Baixando Git...
    powershell -Command "(New-Object Net.WebClient).DownloadFile('https://github.com/git-for-windows/git/releases/download/v2.41.0.windows.3/Git-2.41.0.3-64-bit.exe', 'git-installer.exe')"
    echo [PASSO 4] Instalando Git (silencioso)...
    start /wait git-installer.exe /VERYSILENT /NORESTART /COMPONENTS="icons,ext\reg\shellhere,assoc,assoc_sh"
    echo [+] Git instalado com sucesso!
    del git-installer.exe
    echo.
)

:: Mensagem final
echo ###################################################
echo # TUDO PRONTO! Node.js e Git instalados.          #
echo # - Node.js: digite 'node --version'              #
echo # - Git: digite 'git --version'                   #
echo # - Atualize o PATH se necessario (reinicie o PC).#
echo ###################################################
echo.
pause