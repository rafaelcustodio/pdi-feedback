import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL!;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaClientExtended = PrismaClient & { pDIFollowUp: any; nineBoxEvaluation: any; nineBoxEvaluator: any };

export const prisma = (globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  })) as PrismaClientExtended;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma as PrismaClient;
