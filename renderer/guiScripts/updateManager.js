document.addEventListener("DOMContentLoaded", () => {
  const btnUpdate = document.getElementById("btn-update");
  const updateStatus = document.getElementById("update-status");
  const updateStatusText = document.getElementById("update-status-text");
  const updateProgressBar = document.getElementById("update-progress-inner");

  if (!btnUpdate) return;

  btnUpdate.addEventListener("click", async () => {
    btnUpdate.disabled = true;
    showStatus("Procurando atualizações...", true);
    try {
      await window.electronAPI.checkForUpdates();
    } catch (error) {
      showStatus("Erro ao procurar atualizações.");
      console.error(error);
      btnUpdate.disabled = false;
    }
  });

  // Listeners
  window.electronAPI.onUpdateChecking(() => {
    showStatus("Procurando atualizações...", true);
  });

  window.electronAPI.onUpdateAvailable((info) => {
    showStatus(`Nova versão ${info.version} encontrada! Baixando...`);
    // O download começa automaticamente ou é chamado manualmente dependendo do handler
    // Mas no handler backend eu chamo downloadUpdate() manualmente se autoDownload=false.
    // O handler do 'checking-for-update' -> 'update-available' poderia acionar o download.
    // Vou assumir que o usuario clica update e se tiver, ele baixa.
    // Falta chamar downloadUpdate() se eu botei autoDownload=false.
    // Vou chamar explicitamente aqui.
    window.electronAPI.downloadUpdate();
  });

  window.electronAPI.onUpdateNotAvailable(() => {
    showStatus("✅ Você já está na versão mais recente.", false);
    btnUpdate.disabled = false;
  });

  window.electronAPI.onUpdateDownloadProgress((progressObj) => {
    const percent = Math.round(progressObj.percent);
    updateStatusText.innerText = `Baixando: ${percent}%`;
    if (updateProgressBar) {
      updateProgressBar.style.width = `${percent}%`;
    }
  });

  window.electronAPI.onUpdateDownloaded((info) => {
    showStatus("Atualização pronta para instalar!", false);
    btnUpdate.innerHTML = "🔄 Reiniciar";
    btnUpdate.disabled = false;
    
    // Remove listeners antigos de click e adiciona um novo
    const newBtn = btnUpdate.cloneNode(true);
    btnUpdate.parentNode.replaceChild(newBtn, btnUpdate);
    
    newBtn.addEventListener("click", () => {
      window.electronAPI.quitAndInstall();
    });
  });

  window.electronAPI.onUpdateError((error) => {
    showStatus(`Erro: ${error}`);
    btnUpdate.disabled = false;
    setTimeout(hideStatus, 5000);
  });

  function showStatus(text, loading = false) {
    if (updateStatus) {
      updateStatus.style.display = "flex";
      updateStatusText.innerText = text;
      
      // Resetar barra se não estiver baixando
      if (!text.includes("Baixando")) {
         if (updateProgressBar) updateProgressBar.style.width = "0%";
      }
    }
  }

  function hideStatus() {
    if (updateStatus) {
      updateStatus.style.display = "none";
    }
  }
});
