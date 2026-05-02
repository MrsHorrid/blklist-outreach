import { PrismaClient } from '@prisma/client'

const g = globalThis as unknown as { prisma?: PrismaClient }

// Standard singleton pattern — Next.js injects .env.local automatically,
// so DATABASE_URL is always available here.
export const db = g.prisma ?? new PrismaClient()
export const prisma = db

if (process.env.NODE_ENV !== 'production') g.prisma = db
