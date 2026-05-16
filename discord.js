const RPC = require("discord-rpc");
const { DISCORD_CLIENT_ID } = require("./config");

const client = new RPC.Client({ transport: "ipc" });

// ---------- READY EVENT ----------
client.on("ready", () => {
  console.log(
    `Discord RPC connected (${DISCORD_CLIENT_ID})`
  );

  console.log(
    `Discord User: ${client.user?.username || "Unknown"}`
  );
});

// ---------- CONNECT ----------
async function connectRPC() {
  await client.login({
    clientId: DISCORD_CLIENT_ID
  });
}

// ---------- UPDATE PRESENCE ----------
function updatePresence({ details, state }, icon) {
  client.setActivity({
    details,
    state,

    largeImageKey: icon || "default",
    largeImageText: state,

    instance: true,

    // Button Linked to GIT Source.
    buttons: [
      {
        label: "PS-JB GitHub",
        url: "https://github.com/tmghd272/ps-jb-rich-presence"
      }
    ]
  });
}

// ---------- CLEAR ----------
function clearPresence() {
  client.clearActivity();
}

module.exports = {
  connectRPC,
  updatePresence,
  clearPresence
};