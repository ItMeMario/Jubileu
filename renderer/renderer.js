const { ipcRenderer } = require("electron");

const btnQr = document.getElementById("btn-qrcode");
const btnConfig = document.getElementById("btn-config");
const output = document.getElementById("output");

btnQr.addEventListener("click", () => {
  ipcRenderer.send("start-qrcode");
});

btnConfig.addEventListener("click", () => {
  ipcRenderer.send("open-config");
});

ipcRenderer.on("qr-generated", (event, qr) => {
  output.textContent = `QR Code gerado:\n${qr}`;
});

ipcRenderer.on("client-ready", (event, msg) => {
  output.textContent = msg;
});

ipcRenderer.on("config-opened", (event, msg) => {
  output.textContent = msg;
});
