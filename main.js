const { POLL_INTERVAL } = require("./config");
const { listSandbox } = require("./ftp");
const { extractTitle } = require("./detector");
const { resolveAll } = require("./resolver");
const { connectRPC, updatePresence, clearPresence } = require("./discord");

let lastTitle = null;

/* Get last valid PS title from sandbox list */
function getActive(entries) {
  for (let i = entries.length - 1; i >= 0; i--) {
    const t = extractTitle(entries[i].name || "");
    if (t) return t;
  }
  return null;
}

/* Discord Presence Status Format */
function formatPresence(titleId, gameName) {
  let consoleName = "PlayStation";

  if (titleId.startsWith("PPSA")) {
    consoleName = "PlayStation 5";
  } else if (titleId.startsWith("CUSA")) {
    consoleName = "PlayStation 4";
  }

  return {
    details: `Playing ${consoleName} Game`,
    state: `${gameName} (${titleId})`
  };
}

/* Main polling loop */
async function loop() {
  try {
    const entries = await listSandbox();
    const titleId = getActive(entries);

    // Game changed / started
    if (titleId && titleId !== lastTitle) {
      lastTitle = titleId;

      const { name, icon } = await resolveAll(titleId);

      const presence = formatPresence(titleId, name);

      console.log("Detected:", presence.state);

      updatePresence(presence, icon);
    }

    // Game stopped
    if (!titleId && lastTitle) {
      lastTitle = null;
      clearPresence();
    }

  } catch (err) {
    console.log("Error:", err.message);
  }

  setTimeout(loop, POLL_INTERVAL);
}

/* Start everything */
(async () => {
  console.log("Starting PS4/PS5 Tracker...");

  await connectRPC();

  loop();
})();