const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

const cache = {};

// -----------------------------
// Load Custom TitleID config (customid.json)
// -----------------------------
const configPath = path.join(__dirname, "customid.json");

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (e) {
    console.log("[CONFIG] Failed to load customid.json");
    return { block: [], allow: {} };
  }
}

let config = loadConfig();

function reloadConfig() {
  config = loadConfig();
}

// -----------------------------
// Uses PS FTP sandbox TitleID (CUSA/PPSA) and queries Orbis/Prospero Patches API page
// https://*patches.com/${titleId}
// -----------------------------
async function resolveAll(titleId) {
  titleId = titleId.toUpperCase();

  if (cache[titleId]) return cache[titleId];

  // -----------------------------
  // BLOCK LIST
  // -----------------------------
  if (config.block?.includes(titleId)) {
    return null;
  }

  // -----------------------------
  // CUSTOM OVERRIDE
  // -----------------------------
  if (config.allow?.[titleId]) {
    const override = config.allow[titleId];

    const result = {
      name: override.name || titleId,
      icon: override.icon || null
    };

    cache[titleId] = result;
    return result;
  }

  const url = titleId.startsWith("PPSA")
    ? `https://prosperopatches.com/${titleId}`
    : `https://orbispatches.com/${titleId}`;

  const { name, icon } = await scrapePage(url);

  const finalName = name || titleId;

  const result = {
    name: finalName,
    icon
  };

  cache[titleId] = result;

  return result;
}

// -----------------------------
// Parses Orbis/Prospero Patches HTML using game titleID
// -----------------------------
async function scrapePage(url) {
  try {
    const res = await axios.get(url, {
      timeout: 6000,
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    const html = res.data;
    const $ = cheerio.load(html);

    const name = $("h1").first().text().trim() || null;

    let icon = null;

    $("img").each((_, el) => {
      const src = $(el).attr("src") || "";
      if (!icon && src.includes("icon0")) {
        icon = src;
      }
    });

    if (!icon) {
      const cssMatch = html.match(
        /url\(["']?(https:\/\/cdn\.[^"')]+icon0\.(webp|png|jpg))["']?\)/
      );

      if (cssMatch) icon = cssMatch[1];
    }

    if (!icon) {
      const raw = html.match(
        /https:\/\/cdn\.[^"' <>]+icon0\.(webp|png|jpg)/
      );

      if (raw) icon = raw[0];
    }

    console.log("[RESOLVER]");
    console.log("URL:", url);
    console.log("NAME:", name);
    console.log("ICON:", icon);

    return { name, icon };
  } catch (e) {
    console.log("[RESOLVER ERROR]", e.message);
    return { name: null, icon: null };
  }
}

module.exports = { resolveAll };