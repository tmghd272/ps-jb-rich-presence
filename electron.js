process.env.NODE_NO_WARNINGS = "1";

const {
  app,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  nativeImage
} = require("electron");

const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

// Variables
let mainWindow = null;
let backendProcess = null;
let tray = null;
let isQuitting = false;

// One Instance Only.
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// ---------- CONFIG PATH (resources/app) ----------
const getConfigPath = () => {
  return path.join(__dirname, "config.json");
};

function loadConfig() {
  const configPath = getConfigPath();

  if (!fs.existsSync(configPath)) {
    const defaultConfig = {
      PS_IP: "",
      PS_PORT: "2121",
      POLL_INTERVAL: 5000,
      DISCORD_CLIENT_ID: "1504939441758797998",
      AUTO_START_RPC: false,
      START_ON_BOOT: false,
      MINIMIZE_TO_TRAY: false
    };

    saveConfig(defaultConfig);
    return defaultConfig;
  }

  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (e) {
    console.error("Failed to load config:", e);
    return {
      PS_IP: "",
      PS_PORT: "2121",
      POLL_INTERVAL: 5000,
      DISCORD_CLIENT_ID: "1504939441758797998",
      AUTO_START_RPC: false,
      START_ON_BOOT: false,
      MINIMIZE_TO_TRAY: false
    };
  }
}

function saveConfig(data) {
  const configPath = getConfigPath();

  try {
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
    console.log("Config saved to:", configPath);
  } catch (e) {
    console.error("Failed to save config:", e);
  }
}

// ---------- CONFIG For (Custom TitleIDs) ----------
const getCustomConfigPath = () => {
  return path.join(__dirname, "customid.json");
};

function loadCustomConfig() {
  const file = getCustomConfigPath();

  if (!fs.existsSync(file)) {
    const defaultCustom = {
      block: [],
      allow: {}
    };

    fs.writeFileSync(file, JSON.stringify(defaultCustom, null, 2));
    return defaultCustom;
  }

  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    console.error("Failed to load custom config:", e);
    return {
      block: [],
      allow: {}
    };
  }
}

function saveCustomConfig(data) {
  const file = getCustomConfigPath();

  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    console.log("Custom config saved to:", file);
  } catch (e) {
    console.error("Failed to save custom config:", e);
  }
}

// ---------- STARTUP ----------
function toggleStartup(enable) {
  if (!app.isPackaged) {
    console.log("Startup toggle only works in packaged version");
    return false;
  }

  try {
    app.setLoginItemSettings({
      openAtLogin: enable,
      enabled: enable,
      path: app.getPath("exe"),
      args: []
    });

    console.log(`Startup ${enable ? "ENABLED" : "DISABLED"}`);
    return true;

  } catch (err) {
    console.error("Failed to set startup:", err.message);
    return false;
  }
}

// ---------- TRAY ----------
function createTray() {
  if (tray) return;

  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, "app", "psjblogo.ico")
    : path.join(__dirname, "psjblogo.ico");

  const trayIcon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath).resize({
        width: 16,
        height: 16
      })
    : nativeImage.createEmpty();

  tray = new Tray(trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    { label: "Open", click: () => mainWindow?.show() },
    { label: "Quit", click: () => { isQuitting = true; app.quit(); } }
  ]);

  tray.setToolTip("PS-JB Rich Presence");
  tray.setContextMenu(contextMenu);
  tray.on("click", () => mainWindow?.show());
}

// ---------- WINDOW ----------
function createWindow() {
  const config = loadConfig(); // decide before window shows

  mainWindow = new BrowserWindow({
    width: 520,
    height: 500,
    resizable: false,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  Menu.setApplicationMenu(null);

  mainWindow.loadFile(path.join(__dirname, "ui", "index.html"));

  const forceShow = process.argv.includes("--show-window");

  // SHOW ONLY IF NOT IN TRAY MODE
  if (!config.MINIMIZE_TO_TRAY || forceShow) {
    mainWindow.show();
  }

  mainWindow.on("close", (event) => {
    const config = loadConfig();

    if (config.MINIMIZE_TO_TRAY && !isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

// ---------- STATUS ----------
function setStatus(text) {
  mainWindow?.webContents.send("status-update", text);
}

// ---------- START RPC ----------
function startRPC(uiConfig) {
  if (backendProcess) return;

  const mainJsPath = path.join(__dirname, "main.js");

  backendProcess = spawn(process.execPath, [mainJsPath], {
    cwd: __dirname,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      CUSTOM_IP: uiConfig?.ip,
      CUSTOM_PORT: uiConfig?.port,
      CUSTOM_CLIENT_ID: uiConfig?.clientId
    }
  });

  setStatus("PS-JB Rich Presence: Running");

  backendProcess.stdout.on("data", (data) =>
    mainWindow?.webContents.send("log", data.toString().trim())
  );

  backendProcess.stderr.on("data", (data) =>
    mainWindow?.webContents.send("log", "[ERROR] " + data.toString().trim())
  );

  backendProcess.on("close", (code) => {
    backendProcess = null;
    setStatus("PS-JB Rich Presence: Stopped");
    mainWindow?.webContents.send("log", `Backend exited (${code})`);
  });
}

// ---------- IPC ----------
//config.json
ipcMain.on("get-config", (event) =>
  event.reply("config-data", loadConfig())
);

ipcMain.on("save-config", (event, newData) => {
  const current = loadConfig();
  const updated = { ...current, ...newData };

  saveConfig(updated);
  applySettings();

  event.reply("config-data", updated);
});

//customid.json
ipcMain.on("get-custom-config", (event) => {
  event.reply("custom-config-data", loadCustomConfig());
});

ipcMain.on("save-custom-config", (event, data) => {
  saveCustomConfig(data);
  event.reply("custom-config-data", data);
});

ipcMain.on("start-rpc", (event, uiConfig) => startRPC(uiConfig));
ipcMain.on("stop-rpc", () => backendProcess?.kill());

ipcMain.on("restart-app", () => {
  app.relaunch({
    args: process.argv.concat(["--show-window"])
  });

  app.exit();
});
// ---------- APPLY SETTINGS ----------
function applySettings() {
  const config = loadConfig();

  console.log("Applying settings - START_ON_BOOT:", config.START_ON_BOOT);

  toggleStartup(config.START_ON_BOOT);

  if (config.MINIMIZE_TO_TRAY && !tray) {
    createTray();
  }
}

// ---------- APP START ----------
app.whenReady().then(() => {
  createWindow();
  applySettings();
});

app.on("window-all-closed", () => app.quit());
app.on("before-quit", () => { isQuitting = true; });