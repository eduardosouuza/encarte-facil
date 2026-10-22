import { createApp } from "./app.js";
import { config } from "./config.js";
import { getDb } from "./db/connection.js";
import { seedDatabase } from "./db/seed.js";
getDb();
seedDatabase();
const app = createApp();
const server = app.listen(config.port, config.host, () => {
    // eslint-disable-next-line no-console
    console.log(`[encarte-facil] API em http://localhost:${config.port} (${config.nodeEnv})`);
});
function shutdown(signal) {
    // eslint-disable-next-line no-console
    console.log(`[encarte-facil] ${signal} recebido, encerrando...`);
    server.close(() => process.exit(0));
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
