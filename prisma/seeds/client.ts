import { loadEnvConfig } from "@next/env";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { getDatabaseUrl, shouldUseDatabaseSsl } from "../../lib/database-url";

loadEnvConfig(process.cwd());

const databaseUrl = getDatabaseUrl();

const pool = new Pool({
	connectionString: databaseUrl,
	ssl: shouldUseDatabaseSsl(databaseUrl) ? { rejectUnauthorized: false } : undefined,
});

export const prisma = new PrismaClient({
	adapter: new PrismaPg(pool),
});

export async function disconnectPrisma() {
	await prisma.$disconnect();
	await pool.end();
}