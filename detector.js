const TITLE_REGEX = /(CUSA\d+|PPSA\d+)_\d+/;
const SYSTEM_PREFIX = ["NPXS", "NPXX", "NPIX"];

function extractTitle(text) {
  const match = text.match(TITLE_REGEX);
  if (!match) return null;

  const title = match[1].toUpperCase();

  if (SYSTEM_PREFIX.some(p => title.startsWith(p))) return null;

  return title;
}

module.exports = { extractTitle };