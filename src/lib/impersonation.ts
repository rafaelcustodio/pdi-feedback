"use server";

import { auth } from "@/lib/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const COOKIE = "__impersonate";

export async function getEffectiveAuth() {
  const session = await auth();
  if (!session?.user) return session;
  if ((session.user as { role?: string }).role !== "admin") return session;

  const cookieStore = await cookies();
  const targetId = cookieStore.get(COOKIE)?.value;
  if (!targetId) return session;

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
      evaluationMode: true,
    },
  });
  if (!target) return session;

  return {
    ...session,
    user: {
      ...session.user,
      id: target.id,
      name: target.name,
      email: target.email,
      role: target.role,
      image: target.avatarUrl,
      evaluationMode: target.evaluationMode,
    },
  };
}

export async function getImpersonationInfo() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "admin")
    return null;

  const cookieStore = await cookies();
  const targetId = cookieStore.get(COOKIE)?.value;
  if (!targetId) return null;

  return prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, name: true, role: true },
  });
}
