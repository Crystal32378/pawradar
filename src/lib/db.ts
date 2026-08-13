import { PrismaClient } from '@prisma/client';

/**
 * Global Prisma client singleton.
 *
 * On Vercel serverless, each function invocation may create a new
 * PrismaClient — which would exhaust Neon's connection pool quickly.
 * Caching on `globalThis` survives hot-reloads and warm invocations.
 *
 * `log: ['query']` is dev-only: production noise + cost.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const isDev = process.env.NODE_ENV !== 'production';

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isDev ? ['query', 'error', 'warn'] : ['error'],
  });

if (isDev) globalForPrisma.prisma = db;
