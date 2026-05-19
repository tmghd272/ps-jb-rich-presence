const { ipcRenderer } = require("electron");

// ---------------- ELEMENTS ----------------
const ipInput = document.getElementById("ip");
const portInput = document.getElementById("port");
const lockPort = document.getElementById("lockPort");

const clientIdInput = document.getElementById("clientId");
const customIdToggle = document.getElementById("customIdToggle");

const autoStartRPC = document.getElementById("autoStartRPC");
const startOnBoot = document.getElementById("startOnBoot");
const minimizeToTray = document.getElementById("minimizeToTray");

const statusEl = document.getElementById("status");
const logBox = document.getElementById("log");

const startBtn = document.getElementById("start");
const stopBtn = document.getElementById("stop");
const saveBtn = document.getElementById("save");

// ---------------- CUSTOM PAGE NAVIGATION ----------------
const customtitleidPageBtn = document.getElementById("customtitleidPage");

function opencustomtitleidPage() {
  window.location.href = "customid.html";
}

customtitleidPageBtn?.addEventListener("click", opencustomtitleidPage);

// ---------------- AUTO START GUARD ----------------
let autoStarted = false;

// ---------------- LOG SYSTEM ----------------
function addLog(text) {
  if (!logBox || !text) return;

  const lines = text.toString().split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const div = document.createElement("div");
    div.textContent = trimmed;
    logBox.appendChild(div);
  }

  logBox.scrollTop = logBox.scrollHeight;
}

// ---------------- LOCK SYSTEM ----------------
function applyPortLock() {
  if (!portInput || !lockPort) return;

  const locked = !lockPort.checked;
  portInput.disabled = locked;
  portInput.style.opacity = locked ? "0.5" : "1";
}

function applyClientLock() {
  if (!clientIdInput || !customIdToggle) return;

  const locked = !customIdToggle.checked;
  clientIdInput.disabled = locked;
  clientIdInput.style.opacity = locked ? "0.5" : "1";
}

// ---------------- CONFIG (IPC ONLY) ----------------
function loadConfig() {
  ipcRenderer.send("get-config");
}

// single source of truth (NO PATHS, NO FILE ACCESS)
ipcRenderer.on("config-data", (event, config) => {
  if (!config) return;

  ipInput.value = config.PS_IP ?? "";
  portInput.value = config.PS_PORT ?? "2121";
  clientIdInput.value = config.DISCORD_CLIENT_ID ?? "1504939441758797998";

  autoStartRPC.checked = !!config.AUTO_START_RPC;
  startOnBoot.checked = !!config.START_ON_BOOT;
  minimizeToTray.checked = !!config.MINIMIZE_TO_TRAY;

  applyPortLock();
  applyClientLock();

  // Prevent multiple auto-start triggers
  if (config.AUTO_START_RPC && !autoStarted) {
    autoStarted = true;
    setTimeout(startRPC, 800);
  }
});

// ---------------- INIT ----------------
window.addEventListener("DOMContentLoaded", () => {
  loadConfig();
});

// ---------------- EVENTS ----------------
lockPort?.addEventListener("change", applyPortLock);
customIdToggle?.addEventListener("change", applyClientLock);

// ---------------- SAVE CONFIG ----------------
saveBtn?.addEventListener("click", () => {
  ipcRenderer.send("save-config", {
    PS_IP: ipInput.value.trim(),
    PS_PORT: portInput.value.trim(),
    DISCORD_CLIENT_ID: clientIdInput.value.trim(),

    AUTO_START_RPC: autoStartRPC.checked,
    START_ON_BOOT: startOnBoot.checked,
    MINIMIZE_TO_TRAY: minimizeToTray.checked
  });

  addLog("Config saved successfully!");
});

// ---------------- START / STOP RPC ----------------
function startRPC() {
  ipcRenderer.send("start-rpc", {
    ip: ipInput.value.trim(),
    port: portInput.value.trim(),
    clientId: clientIdInput.value.trim()
  });
}

startBtn?.addEventListener("click", startRPC);

stopBtn?.addEventListener("click", () => {
  ipcRenderer.send("stop-rpc");
});

// ---------------- STATUS & LOGS ----------------
ipcRenderer.on("status-update", (event, text) => {
  if (statusEl) statusEl.innerText = text;
  addLog(`[STATUS] ${text}`);
});

ipcRenderer.on("log", (event, text) => {
  addLog(text);
});