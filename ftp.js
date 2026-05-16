const ftp = require("basic-ftp");
const { PS_IP, PS_PORT } = require("./config");

let client = null;

// controls retry behavior
let isConnecting = false;
const RETRY_DELAY = 10000; // 10 seconds between retries

async function connect() {
  if (client) return client;
  if (isConnecting) return null;

  isConnecting = true;

  while (!client) {
    try {
      const c = new ftp.Client();
      c.ftp.verbose = false;

      await c.access({
        host: PS_IP,
        port: PS_PORT,
        user: "anonymous", // Change this if your PS have a custom username
        password: "anonymous" // Change this if your PS have a custom password
      });

      client = c;
      console.log(`[FTP] Connected successfully to ${PS_IP}:${PS_PORT}`);

      isConnecting = false;
      return client;

    } catch (e) {
      console.log(`[FTP] Connection failed to ${PS_IP}:${PS_PORT}`);
      console.log(`[FTP ERROR]`, e.message);

      client = null;

      // wait before retry (prevents spam loop)
      await new Promise(res => setTimeout(res, RETRY_DELAY));
    }
  }

  isConnecting = false;
}

async function listSandbox() {
  try {
    const c = await connect();

    if (!c) return [];

    await c.cd("/mnt/sandbox");
    return await c.list();

  } catch (e) {
    console.log("[FTP] listSandbox failed:", e.message);

    // force reconnect next time
    client = null;
    return [];
  }
}

module.exports = { listSandbox };