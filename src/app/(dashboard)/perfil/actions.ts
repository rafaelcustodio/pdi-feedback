"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

type Faixa = "baixo" | "medio" | "alto";

function getFaixa(value: number): Faixa {
  if (value <= 2.33) return "baixo";
  if (value <= 3.66) return "medio";
  return "alto";
}

const QUADRANT_NAMES: Record<string, string> = {
  alto_alto: "Top Performer",
  alto_medio: "Alto Potencial",
  alto_baixo: "Forte Potencial",
  medio_alto: "Alto Desempenho",
  medio_medio: "Profissional Chave",
  medio_baixo: "Enigma",
  baixo_alto: "Comprometido",
  baixo_medio: "Eficaz",
  baixo_baixo: "Insuficiente",
};

export type MyNineBoxResult = {
  desempenho: number;
  potencial: number;
  mediaGeral: number;
  quadrante: string;
  desempenhoFaixa: Faixa;
  potencialFaixa: Faixa;
};

export async function getMyNineBoxResult(): Promise<{
  data?: MyNineBoxResult;
  error?: string;
}> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autenticado" };

  const userId = session.user.id;

  // Find the most recent CLOSED evaluation for this employee
  const evaluation = await prisma.nineBoxEvaluation.findFirst({
    where: {
      evaluateeId: userId,
      status: "closed",
    },
    orderBy: { createdAt: "desc" },
    include: {
      evaluators: {
        select: {
          status: true,
          q1: true,
          q2: true,
          q3: true,
          q4: true,
          q5: true,
          q6: true,
          q7: true,
          q8: true,
          q9: true,
          q10: true,
          q11: true,
          q12: true,
        },
      },
    },
  });

  if (!evaluation) return { data: undefined };

  const completed = evaluation.evaluators.filter(
    (e: { status: string }) => e.status === "completed"
  );

  if (completed.length === 0) return { data: undefined };

  let desempenhoSum = 0;
  let potencialSum = 0;
  let desempenhoCount = 0;
  let potencialCount = 0;

  for (const ev of completed) {
    const desQ = [ev.q1, ev.q2, ev.q3, ev.q4, ev.q5, ev.q6].filter(
      (v): v is number => v !== null
    );
    const potQ = [ev.q7, ev.q8, ev.q9, ev.q10, ev.q11, ev.q12].filter(
      (v): v is number => v !== null
    );
    desempenhoSum += desQ.reduce((a, b) => a + b, 0);
    potencialSum += potQ.reduce((a, b) => a + b, 0);
    desempenhoCount += desQ.length;
    potencialCount += potQ.length;
  }

  const desempenho = desempenhoCount > 0
    ? Number((desempenhoSum / desempenhoCount).toFixed(2))
    : 0;
  const potencial = potencialCount > 0
    ? Number((potencialSum / potencialCount).toFixed(2))
    : 0;
  const totalCount = desempenhoCount + potencialCount;
  const mediaGeral = totalCount > 0
    ? Number(((desempenhoSum + potencialSum) / totalCount).toFixed(2))
    : 0;

  const desempenhoFaixa = getFaixa(desempenho);
  const potencialFaixa = getFaixa(potencial);
  const quadrante =
    QUADRANT_NAMES[`${potencialFaixa}_${desempenhoFaixa}`] || "";

  return {
    data: {
      desempenho,
      potencial,
      mediaGeral,
      quadrante,
      desempenhoFaixa,
      potencialFaixa,
    },
  };
}
