import { loadConfig } from "../lib/config.js";
import { createPool, runSchema, testConnection } from "../lib/postgres.js";

async function main() {
  const config = await loadConfig();
  const pool = createPool(config);

  try {
    await testConnection(pool);
    await runSchema(pool);
    console.log("database schema initialized");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
