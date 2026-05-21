; =============================================================================
; installer.nsh - Script NSIS customizado para o Jubileu Bot
; =============================================================================
; Este script é automaticamente incluído pelo electron-builder durante o build.
; Ele garante que o Jubileu Bot e TODOS os processos filhos (Chromium/Puppeteer)
; sejam encerrados antes da instalação/atualização.
; =============================================================================

!macro customInit
  ; Força o encerramento do Jubileu Bot e de todos os processos filhos
  ; /F = Forçar encerramento
  ; /IM = Nome do executável
  ; /T = Encerrar árvore inteira de processos (inclui Chromium do Puppeteer)
  ExecWait 'taskkill /F /IM "Jubileu Bot.exe" /T'
  
  ; Aguarda 2 segundos para o Windows liberar todos os file locks
  Sleep 2000
!macroend
