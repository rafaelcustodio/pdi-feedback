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

export type NineBoxEvaluatorFormData = {
  evaluatorId: string;
  evaluateeName: string;
  feedbackPeriod: string;
  evaluatorStatus: "pending" | "completed";
  evaluationStatus: "open" | "closed";
};

export async function getNineBoxEvaluatorData(
  evaluatorId: string
): Promise<{ data?: NineBoxEvaluatorFormData; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "not_authenticated" };
  }

  const evaluatorRecord = await prisma.nineBoxEvaluator.findUnique({
    where: { id: evaluatorId },
    include: {
      evaluation: {
        include: {
          evaluatee: { select: { name: true } },
          feedback: { select: { period: true } },
        },
      },
    },
  });

  if (!evaluatorRecord) {
    return { error: "not_found" };
  }

  // Check that the logged-in user is the evaluator
  if (evaluatorRecord.evaluatorId !== session.user.id) {
    return { error: "unauthorized" };
  }

  return {
    data: {
      evaluatorId: evaluatorRecord.id,
      evaluateeName: evaluatorRecord.evaluation.evaluatee.name,
      feedbackPeriod: evaluatorRecord.evaluation.feedback.period,
      evaluatorStatus: evaluatorRecord.status as "pending" | "completed",
      evaluationStatus: evaluatorRecord.evaluation.status as "open" | "closed",
    },
  };
}

export type NineBoxResponseInput = {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  q5: number;
  q6: number;
  q7: number;
  q8: number;
  q9: number;
  q10: number;
  q11: number;
  q12: number;
  q13PontosFortes: string;
  q14Oportunidade: string;
};

export async function submitNineBoxResponse(
  evaluatorId: string,
  responses: NineBoxResponseInput
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Acesso não autorizado" };
  }

  const evaluatorRecord = await prisma.nineBoxEvaluator.findUnique({
    where: { id: evaluatorId },
    include: {
      evaluation: { select: { status: true } },
    },
  });

  if (!evaluatorRecord) {
    return { success: false, error: "Avaliação não encontrada" };
  }

  // Check that the logged-in user is the evaluator
  if (evaluatorRecord.evaluatorId !== session.user.id) {
    return { success: false, error: "Acesso não autorizado" };
  }

  // Check evaluation is still open
  if (evaluatorRecord.evaluation.status === "closed") {
    return { success: false, error: "Esta avaliação foi encerrada" };
  }

  // Check evaluator hasn't already responded
  if (evaluatorRecord.status === "completed") {
    return { success: false, error: "Você já respondeu esta avaliação" };
  }

  // Validate q1-q12 are between 1 and 5
  const numericKeys = [
    "q1", "q2", "q3", "q4", "q5", "q6",
    "q7", "q8", "q9", "q10", "q11", "q12",
  ] as const;
  for (const key of numericKeys) {
    const val = responses[key];
    if (typeof val !== "number" || val < 1 || val > 5 || !Number.isInteger(val)) {
      return { success: false, error: `Resposta inválida para ${key}` };
    }
  }

  // Validate q13/q14 are non-empty strings
  if (!responses.q13PontosFortes || responses.q13PontosFortes.trim() === "") {
    return { success: false, error: "Pontos fortes é obrigatório" };
  }
  if (!responses.q14Oportunidade || responses.q14Oportunidade.trim() === "") {
    return { success: false, error: "Oportunidade de melhoria é obrigatório" };
  }

  await prisma.nineBoxEvaluator.update({
    where: { id: evaluatorId },
    data: {
      ...responses,
      status: "completed",
      completedAt: new Date(),
    },
  });

  return { success: true };
}
