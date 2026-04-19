const LOCAL_DATABASE_HOSTS = ["localhost", "127.0.0.1", "::1"];

export function getDatabaseUrl(rawUrl = process.env.DATABASE_URL): string {
  if (!rawUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  return rawUrl;
}

export function getPrismaConfigDatabaseUrl(rawUrl = process.env.DATABASE_URL): string {
  const databaseUrl = getDatabaseUrl(rawUrl);
  const url = new URL(databaseUrl);

  if (LOCAL_DATABASE_HOSTS.includes(url.hostname) || url.searchParams.has("sslmode")) {
    return databaseUrl;
  }

  url.searchParams.set("sslmode", "require");
  return url.toString();
}

export function shouldUseDatabaseSsl(databaseUrl: string): boolean {
  const url = new URL(databaseUrl);
  return !LOCAL_DATABASE_HOSTS.includes(url.hostname) || url.searchParams.get("sslmode") === "require";
}