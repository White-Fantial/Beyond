export const config = {
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME ?? "Beyond",
    url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    env: process.env.NODE_ENV ?? "development",
  },
  database: {
    url: process.env.DATABASE_URL ?? "",
  },
  auth: {
    secret: process.env.NEXTAUTH_SECRET ?? "",
    url: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
  },
} as const;
