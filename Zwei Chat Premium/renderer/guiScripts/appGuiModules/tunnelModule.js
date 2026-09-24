// renderer/guiScripts/appGuiModules/tunnelModule.js
// Controlador de Interface do Cloudflare Tunnel Watchdog (Vulnerabilidade #7)

import { $ } from "./domUtils.js";

/**
 * Atualiza visualmente todos os componentes de túnel na interface
 * @param {object} statusData - Métricas vindas do watchdog
 */
export function updateTunnelUi(statusData) {
  if (!statusData) return;

  const state = (statusData.state || statusData.status || "INITIALIZING").toUpperCase();
  const latency = statusData.latencyMs || 0;
  const publicUrl = statusData.publicUrl || "Iniciando...";

  // 1. Sidebar Footer Widget
  const dot = $("#tunnel-status-dot");
  const text = $("#tunnel-status-text");
  const widget = $("#tunnel-status-widget");

  if (dot && text) {
    dot.className = "status-dot status-dot-pulse";

    switch (state) {
      case "ONLINE":
        dot.classList.add("status-dot-green");
        text.textContent = `Online (${latency}ms)`;
        if (widget) {
          widget.title = `Túnel Cloudflare Ativo e Saudável\nURL: ${publicUrl}\nLatência: ${latency}ms\nUptime: ${statusData.uptimeSeconds || 0}s`;
        }
        break;
      case "DEGRADED":
        dot.classList.add("status-dot-yellow");
        text.textContent = `Instável (${latency}ms)`;
        if (widget) {
          widget.title = "Túnel Cloudflare com oscilação detectada. Tentando normalizar...";
        }
        break;
      case "RECONNECTING":
        dot.classList.add("status-dot-yellow");
        text.textContent = "Reconectando...";
        if (widget) {
          widget.title = "Auto-recuperação do túnel em andamento...";
        }
        break;
      case "SUSPENDED":
        dot.classList.add("status-dot-yellow");
        text.textContent = "Em pausa (Sleep)";
        if (widget) {
          widget.title = "Sistema operacional em suspensão/hibernação";
        }
        break;
      case "OFFLINE":
        dot.classList.add("status-dot-red");
        text.textContent = "Offline";
        if (widget) {
          widget.title = `Túnel desconectado\nErro: ${statusData.error || "Sem resposta no heartbeat"}`;
        }
        break;
      default:
        dot.classList.add("status-dot-yellow");
        text.textContent = "Verificando...";
        if (widget) {
          widget.title = "Inicializando túnel Cloudflare...";
        }
    }
  }

  // 2. Dashboard Card
  const dashStatus = $("#dash-tunnel-status");
  const dashSubtext = $("#dash-tunnel-subtext");

  if (dashStatus) {
    let pillClass = "status-yellow";
    let label = "Verificando...";

    if (state === "ONLINE") {
      pillClass = "status-green";
      label = "Ativo e Saudável";
    } else if (state === "DEGRADED") {
      pillClass = "status-yellow";
      label = "Oscilando";
    } else if (state === "RECONNECTING") {
      pillClass = "status-yellow";
      label = "Reconectando";
    } else if (state === "OFFLINE") {
      pillClass = "status-red";
      label = "Desconectado";
    }

    dashStatus.innerHTML = `<span class="status-pill ${pillClass}"><span class="status-dot"></span> ${label}</span>`;
  }

  if (dashSubtext) {
    if (state === "ONLINE") {
      dashSubtext.textContent = `Latência: ${latency}ms | Reconexões: ${statusData.totalReconnects || 0}`;
    } else {
      dashSubtext.textContent = `Status: ${state.toLowerCase()} | Porta: ${statusData.port || 3000}`;
    }
  }

  // 3. Settings Diagnostic Panel
  const cfgState = $("#settings-tunnel-state");
  const cfgLatency = $("#settings-tunnel-latency");
  const cfgPort = $("#settings-tunnel-port");
  const cfgReconnects = $("#settings-tunnel-reconnects");
  const cfgUrl = $("#settings-tunnel-public-url");

  if (cfgState) {
    const pill = state === "ONLINE" ? "status-green" : state === "OFFLINE" ? "status-red" : "status-yellow";
    cfgState.innerHTML = `<span class="status-pill ${pill}">${state}</span>`;
  }
  if (cfgLatency) cfgLatency.textContent = `${latency} ms`;
  if (cfgPort) cfgPort.textContent = String(statusData.port || 3000);
  if (cfgReconnects) cfgReconnects.textContent = String(statusData.totalReconnects || 0);
  if (cfgUrl) cfgUrl.textContent = publicUrl;
}

/**
 * Inicializa o módulo do túnel com listeners reativos e atalhos de reconexão
 * @param {object} api - Instância do window.zweiPremiumApi
 */
export function initTunnelModule(api) {
  if (!api) return;

  // Consulta inicial de status
  if (typeof api.getTunnelStatus === "function") {
    api.getTunnelStatus().then(updateTunnelUi).catch(console.error);
  }

  // Botão de reconexão rápida na barra lateral
  const btnReconnect = $("#btn-tunnel-reconnect");
  if (btnReconnect) {
    btnReconnect.addEventListener("click", async () => {
      btnReconnect.classList.add("spinning");
      btnReconnect.disabled = true;
      try {
        if (typeof api.reconnectTunnel === "function") {
          await api.reconnectTunnel();
        }
      } catch (err) {
        console.error("Erro ao solicitar reconexão do túnel:", err);
      } finally {
        setTimeout(() => {
          btnReconnect.classList.remove("spinning");
          btnReconnect.disabled = false;
        }, 1500);
      }
    });
  }

  // Botão de reconexão na aba de configurações
  const btnSettingsRefresh = $("#btn-settings-refresh-tunnel");
  if (btnSettingsRefresh) {
    btnSettingsRefresh.addEventListener("click", async () => {
      btnSettingsRefresh.disabled = true;
      btnSettingsRefresh.textContent = "⏳ Reconectando...";
      try {
        if (typeof api.reconnectTunnel === "function") {
          await api.reconnectTunnel();
        }
      } catch (err) {
        console.error("Erro ao reconectar via configurações:", err);
      } finally {
        setTimeout(() => {
          btnSettingsRefresh.disabled = false;
          btnSettingsRefresh.textContent = "🔄 Testar / Reconectar Túnel";
        }, 2000);
      }
    });
  }

  // Ouvintes de eventos em tempo real do Electron
  if (typeof api.onTunnelStatusChanged === "function") {
    api.onTunnelStatusChanged(updateTunnelUi);
  }
  if (typeof api.onTunnelHeartbeat === "function") {
    api.onTunnelHeartbeat(updateTunnelUi);
  }
  if (typeof api.onTunnelReconnecting === "function") {
    api.onTunnelReconnecting(updateTunnelUi);
  }
  if (typeof api.onTunnelReconnected === "function") {
    api.onTunnelReconnected(updateTunnelUi);
  }
}
