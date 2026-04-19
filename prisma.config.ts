import { loadEnvConfig } from "@next/env";
import { getPrismaConfigDatabaseUrl } from "./lib/database-url";
import { defineConfig } from "prisma/config";

loadEnvConfig(process.cwd());

export default defineConfig({
  datasource: {
    url: getPrismaConfigDatabaseUrl(),
  },
});
