const axios = require("axios");
const cheerio = require("cheerio");

const cache = {};

// -----------------------------
// Uses PS FTP sandbox TitleID (CUSA/PPSA) and queries Orbis/Prospero Patches API page
// https://*patches.com/${titleId}
// -----------------------------
async function resolveAll(titleId) {
  titleId = titleId.toUpperCase();

  if (cache[titleId]) return cache[titleId];

  const url = titleId.startsWith("PPSA")
    ? `https://prosperopatches.com/${titleId}`
    : `https://orbispatches.com/${titleId}`;

  const { name, icon } = await scrapePage(url);

  const finalName = name || titleId;

  cache[titleId] = { name: finalName, icon };

  return cache[titleId];
}

// -----------------------------
// Parses Orbis/Prospero Patches- 
// -HTML using game titleID.
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

    // Parse game name
    const name = $("h1").first().text().trim() || null;

    let icon = null;

    // Parse image icon
    $("img").each((_, el) => {
      const src = $(el).attr("src") || "";
      if (!icon && src.includes("icon0")) {
        icon = src;
      }
    });

    // CSS background:url
    if (!icon) {
      const cssMatch = html.match(
        /url\(["']?(https:\/\/cdn\.[^"')]+icon0\.(webp|png|jpg))["']?\)/
      );

      if (cssMatch) icon = cssMatch[1];
    }

    // GLOBAL CDN fallback
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