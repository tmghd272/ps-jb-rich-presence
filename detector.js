const fs = require("fs");
const path = require("path");

const TITLE_REGEX = /(CUSA\d+|PPSA\d+)_\d+/i;
const SYSTEM_PREFIX = ["NPXS", "NPXX", "NPIX"];

const configPath = path.join(__dirname, "customid.json");

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch {
    return { block: [], allow: {} };
  }
}

function extractTitle(text = "") {
  const config = loadConfig();

  // -----------------------------
  // NORMAL TITLEID DETECTION
  // -----------------------------
  const match = text.match(TITLE_REGEX);

  if (match) {
    const title = match[1].toUpperCase();

    if (SYSTEM_PREFIX.some(p => title.startsWith(p))) {
      return null;
    }

    return title;
  }

  // -----------------------------
  // CUSTOM TITLEID DETECTION
  // -----------------------------
  const customIds = Object.keys(config.allow || {});

  for (const customId of customIds) {
    if (text.toUpperCase().includes(customId.toUpperCase())) {
      return customId.toUpperCase();
    }
  }

  return null;
}

module.exports = { extractTitle };