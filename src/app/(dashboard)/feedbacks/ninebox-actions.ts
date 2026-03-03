"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { buildNineBoxInviteHtml } from "@/lib/email-templates";
import { revalidatePath } from "next/cache";

export type NineBoxStatusData = {
  evaluationId: string;
  status: "open" | "closed";
  totalEvaluators: number;
  completedEvaluators: number;
  evaluators: {
    id: string;
    evaluatorName: string;
    status: "pending" | "completed";
  }[];
};

export type EvaluatorCandidate = {
  id: string;
  name: string;
  email: string;
};

export async function getNineBoxStatus(
  feedbackId: string
): Promise<NineBoxStatusData | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const evaluation = await prisma.nineBoxEvaluation.findUnique({
    where: { feedbackId },
    include: {
      evaluators: {
        include: {
          evaluator: { select: { name: true } },
        },
      },
    },
  });

  if (!evaluation) return null;

  return {
    evaluationId: evaluation.id,
    status: evaluation.status,
    totalEvaluators: evaluation.evaluators.length,
    completedEvaluators: evaluation.evaluators.filter(
      (e: { status: string }) => e.status === "completed"
    ).length,
    evaluators: evaluation.evaluators.map(
      (e: { id: string; status: string; evaluator: { name: string } }) => ({
        id: e.id,
        evaluatorName: e.evaluator.name,
        status: e.status as "pending" | "completed",
      })
    ),
  };
}

export async function getEvaluatorCandidates(
  feedbackId: string
): Promise<EvaluatorCandidate[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const role = (session.user as { role?: string }).role || "employee";
  if (role === "employee") return [];

  const feedback = await prisma.feedback.findUnique({
    where: { id: feedbackId },
    select: { employeeId: true, managerId: true },
  });

  if (!feedback) return [];

  // Get all active users except the evaluatee and the manager
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      id: { notIn: [feedback.employeeId, feedback.managerId] },
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return users;
}

export async function startNineBoxEvaluation(
  feedbackId: string,
  evaluatorIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Acesso não autorizado" };
  }

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  // Only managers and admins can start Nine Box
  if (role === "employee") {
    return { success: false, error: "Apenas gestores podem iniciar avaliação Nine Box" };
  }

  // Validate the feedback exists and user has access
  const feedback = await prisma.feedback.findUnique({
    where: { id: feedbackId },
    select: { id: true, employeeId: true, managerId: true, status: true },
  });

  if (!feedback) {
    return { success: false, error: "Feedback não encontrado" };
  }

  // Only the feedback manager or admin can start
  if (role !== "admin" && feedback.managerId !== userId) {
    return { success: false, error: "Apenas o gestor do feedback pode iniciar a avaliação Nine Box" };
  }

  // Cannot start if feedback is cancelled
  if (feedback.status === "cancelled") {
    return { success: false, error: "Não é possível iniciar Nine Box para um feedback cancelado" };
  }

  // Check if a NineBox already exists
  const existing = await prisma.nineBoxEvaluation.findUnique({
    where: { feedbackId },
  });

  if (existing) {
    return { success: false, error: "Já existe uma avaliação Nine Box para este feedback" };
  }

  // Must have at least 1 evaluator
  if (!evaluatorIds || evaluatorIds.length === 0) {
    return { success: false, error: "Selecione pelo menos um avaliador" };
  }

  // Create the evaluation with evaluators
  const evaluation = await prisma.nineBoxEvaluation.create({
    data: {
      feedbackId,
      evaluateeId: feedback.employeeId,
      createdById: userId,
      status: "open",
      evaluators: {
        create: evaluatorIds.map((evaluatorId: string) => ({
          evaluatorId,
          status: "pending",
        })),
      },
    },
    include: {
      evaluatee: { select: { name: true } },
      evaluators: {
        include: {
          evaluator: { select: { name: true, email: true } },
        },
      },
    },
  });

  // Send notifications and emails to each evaluator
  const evaluateeName = evaluation.evaluatee.name;
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  for (const evaluatorRecord of evaluation.evaluators) {
    // Create in-app notification
    await prisma.notification.create({
      data: {
        userId: evaluatorRecord.evaluatorId,
        type: "ninebox_invite",
        title: `Avaliação Nine Box — ${evaluateeName}`,
        message: `Você foi convidado para avaliar ${evaluateeName}. Acesse o formulário para responder.`,
      },
    });

    // Send email
    const formUrl = `${baseUrl}/ninebox/${evaluatorRecord.id}`;
    await sendEmail({
      to: evaluatorRecord.evaluator.email,
      subject: `Convite: Avaliação Nine Box de ${evaluateeName}`,
      html: buildNineBoxInviteHtml(
        evaluatorRecord.evaluator.name,
        evaluateeName,
        formUrl
      ),
    });
  }

  revalidatePath(`/feedbacks/${feedbackId}`);
  return { success: true };
}
