"use server";

import { prisma } from "@/lib/prisma";
import { canAccessEmployee, getSessionAccessControl } from "@/lib/access-control";

// --- Quadrant calculation utilities ---

type Faixa = "baixo" | "medio" | "alto";

function getFaixa(value: number): Faixa {
  if (value <= 2.33) return "baixo";
  if (value <= 3.66) return "medio";
  return "alto";
}

const QUADRANT_NAMES: Record<string, string> = {
  "alto_alto": "Top Performer",
  "alto_medio": "Alto Potencial",
  "alto_baixo": "Forte Potencial",
  "medio_alto": "Alto Desempenho",
  "medio_medio": "Profissional Chave",
  "medio_baixo": "Enigma",
  "baixo_alto": "Comprometido",
  "baixo_medio": "Eficaz",
  "baixo_baixo": "Insuficiente",
};

function getQuadrantName(potencial: Faixa, desempenho: Faixa): string {
  return QUADRANT_NAMES[`${potencial}_${desempenho}`] || "";
}

// --- Question labels ---

const QUESTION_LABELS: Record<string, string> = {
  q1: "Qualidade do trabalho entregue",
  q2: "Cumprimento de prazos e metas",
  q3: "Conhecimento técnico e competências",
  q4: "Capacidade de resolução de problemas",
  q5: "Colaboração e trabalho em equipe",
  q6: "Responsabilidade e comprometimento",
  q7: "Capacidade de aprender novas habilidades",
  q8: "Adaptabilidade a mudanças",
  q9: "Iniciativa e proatividade",
  q10: "Potencial para assumir maiores responsabilidades",
  q11: "Habilidades de liderança e influência",
  q12: "Visão estratégica e pensamento crítico",
};

// --- Types ---

export type QuestionAverage = {
  key: string;
  label: string;
  average: number;
};

export type NineBoxEvalResult = {
  evaluationId: string;
  status: "open" | "closed";
  feedbackPeriod: string;
  desempenho: number;
  potencial: number;
  mediaGeral: number;
  quadrante: string;
  desempenhoFaixa: Faixa;
  potencialFaixa: Faixa;
  completedEvaluators: number;
  totalEvaluators: number;
  questionAverages: QuestionAverage[];
  evaluatorDetails: {
    name: string;
    q13PontosFortes: string | null;
    q14Oportunidade: string | null;
  }[];
};

export type NineBoxDashboardData = {
  employeeName: string;
  employeeId: string;
  current: NineBoxEvalResult | null;
  previous: NineBoxEvalResult | null;
};

function computeEvalResult(
  evaluation: {
    id: string;
    status: string;
    feedback: { period: string };
    evaluators: {
      status: string;
      q1: number | null;
      q2: number | null;
      q3: number | null;
      q4: number | null;
      q5: number | null;
      q6: number | null;
      q7: number | null;
      q8: number | null;
      q9: number | null;
      q10: number | null;
      q11: number | null;
      q12: number | null;
      q13PontosFortes: string | null;
      q14Oportunidade: string | null;
      evaluator: { name: string };
    }[];
  }
): NineBoxEvalResult | null {
  const completed = evaluation.evaluators.filter(
    (e: { status: string }) => e.status === "completed"
  );

  if (completed.length === 0) return null;

  let desempenhoSum = 0;
  let potencialSum = 0;
  let totalQuestions = 0;

  for (const ev of completed) {
    const desQ = [ev.q1, ev.q2, ev.q3, ev.q4, ev.q5, ev.q6].filter(
      (v): v is number => v !== null
    );
    const potQ = [ev.q7, ev.q8, ev.q9, ev.q10, ev.q11, ev.q12].filter(
      (v): v is number => v !== null
    );
    desempenhoSum += desQ.reduce((a, b) => a + b, 0);
    potencialSum += potQ.reduce((a, b) => a + b, 0);
    totalQuestions += desQ.length + potQ.length;
  }

  const desempenhoTotal = completed.reduce((sum: number, ev: typeof completed[number]) => {
    const desQ = [ev.q1, ev.q2, ev.q3, ev.q4, ev.q5, ev.q6].filter(
      (v): v is number => v !== null
    );
    return sum + desQ.length;
  }, 0);

  const potencialTotal = completed.reduce((sum: number, ev: typeof completed[number]) => {
    const potQ = [ev.q7, ev.q8, ev.q9, ev.q10, ev.q11, ev.q12].filter(
      (v): v is number => v !== null
    );
    return sum + potQ.length;
  }, 0);

  const desempenho = desempenhoTotal > 0
    ? Number((desempenhoSum / desempenhoTotal).toFixed(2))
    : 0;
  const potencial = potencialTotal > 0
    ? Number((potencialSum / potencialTotal).toFixed(2))
    : 0;
  const mediaGeral = totalQuestions > 0
    ? Number(((desempenhoSum + potencialSum) / totalQuestions).toFixed(2))
    : 0;

  const desempenhoFaixa = getFaixa(desempenho);
  const potencialFaixa = getFaixa(potencial);

  // Compute per-question averages across completed evaluators
  const questionKeys = ["q1","q2","q3","q4","q5","q6","q7","q8","q9","q10","q11","q12"] as const;
  const questionAverages: QuestionAverage[] = questionKeys.map((key) => {
    const values = completed
      .map((ev: typeof completed[number]) => ev[key])
      .filter((v): v is number => v !== null);
    const avg = values.length > 0
      ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2))
      : 0;
    return { key, label: QUESTION_LABELS[key], average: avg };
  });

  return {
    evaluationId: evaluation.id,
    status: evaluation.status as "open" | "closed",
    feedbackPeriod: evaluation.feedback.period,
    desempenho,
    potencial,
    mediaGeral,
    quadrante: getQuadrantName(potencialFaixa, desempenhoFaixa),
    desempenhoFaixa,
    potencialFaixa,
    completedEvaluators: completed.length,
    totalEvaluators: evaluation.evaluators.length,
    questionAverages,
    evaluatorDetails: completed.map((ev: typeof completed[number]) => ({
      name: ev.evaluator.name,
      q13PontosFortes: ev.q13PontosFortes,
      q14Oportunidade: ev.q14Oportunidade,
    })),
  };
}

export async function getNineBoxDashboard(
  employeeId: string
): Promise<{ data?: NineBoxDashboardData; error?: string }> {
  const access = await getSessionAccessControl();
  if (!access) return { error: "Acesso não autorizado" };

  const { userId, role } = access;

  // Employees can only view their own Nine Box
  if (role === "employee") {
    if (userId !== employeeId) {
      return { error: "Acesso não autorizado" };
    }
  } else {
    const hasAccess = await canAccessEmployee(userId, role, employeeId);
    if (!hasAccess) {
      return { error: "Acesso não autorizado" };
    }
  }

  const employee = await prisma.user.findUnique({
    where: { id: employeeId },
    select: { id: true, name: true },
  });

  if (!employee) {
    return { error: "Colaborador não encontrado" };
  }

  // Fetch all Nine Box evaluations for this employee, ordered by creation date desc
  const evaluations = await prisma.nineBoxEvaluation.findMany({
    where: { evaluateeId: employeeId },
    orderBy: { createdAt: "desc" },
    include: {
      feedback: { select: { period: true } },
      evaluators: {
        include: {
          evaluator: { select: { name: true } },
        },
      },
    },
  });

  let current: NineBoxEvalResult | null = null;
  let previous: NineBoxEvalResult | null = null;

  for (const evaluation of evaluations) {
    const result = computeEvalResult(evaluation);
    if (!result) continue;

    if (!current) {
      current = result;
    } else if (!previous) {
      previous = result;
      break;
    }
  }

  return {
    data: {
      employeeName: employee.name,
      employeeId: employee.id,
      current,
      previous,
    },
  };
}
