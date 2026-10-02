import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@/generated/prisma/client";

// Fingerprint of the generated schema (every model's fields), so a dev server that survives
// `prisma generate` doesn't keep serving a client that predates the change.
const schemaKey = JSON.stringify(Object.entries(Prisma).filter(([name]) => name.endsWith("ScalarFieldEnum")));
const globalDb = globalThis as unknown as { prisma?: PrismaClient; prismaSchemaKey?: string };
const cached = globalDb.prismaSchemaKey === schemaKey ? globalDb.prisma : undefined;
export const db = cached ?? new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 }),
});
if (process.env.NODE_ENV !== "production") { globalDb.prisma = db; globalDb.prismaSchemaKey = schemaKey; }
