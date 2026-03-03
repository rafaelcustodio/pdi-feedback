"use server";

import { prisma } from "@/lib/prisma";
import { getEffectiveAuth } from "@/lib/impersonation";

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

export type MyProfileDependentData = {
  id: string;
  name: string;
  relationship: string;
  cpf: string | null;
};

export type MyProfileEmergencyContact = {
  id: string;
  name: string;
  phone: string;
  relationship: string | null;
};

export type MyFullProfile = {
  id: string;
  name: string;
  email: string;
  role: string;
  evaluationMode: string;
  isActive: boolean;
  avatarUrl: string | null;
  admissionDate: Date | null;
  phone: string | null;
  jobTitle: string | null;
  createdAt: Date;
  cpf: string | null;
  rg: string | null;
  birthDate: Date | null;
  ethnicity: string | null;
  gender: string | null;
  maritalStatus: string | null;
  educationLevel: string | null;
  livesWithDescription: string | null;
  address: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  personalEmail: string | null;
  hasBradescoAccount: string | null;
  bankAgency: string | null;
  bankAccount: string | null;
  hasOtherEmployment: boolean | null;
  healthPlanOption: string | null;
  wantsTransportVoucher: boolean | null;
  contractType: string | null;
  shirtSize: string | null;
  hasChildren: boolean | null;
  childrenAges: string | null;
  hasIRDependents: boolean | null;
  hobbies: string[];
  socialNetworks: unknown;
  favoriteBookMovieGenres: string | null;
  favoriteBooks: string | null;
  favoriteMovies: string | null;
  favoriteMusic: string | null;
  admiredValues: string | null;
  foodAllergies: string | null;
  hasPets: string | null;
  participateInVideos: boolean | null;
  dependents: MyProfileDependentData[];
  emergencyContacts: MyProfileEmergencyContact[];
};

export type MyPendingChangeRequest = {
  id: string;
  fieldName: string;
  newValue: string | null;
  createdAt: Date;
};

export async function getMyPendingChangeRequests(): Promise<{
  data?: MyPendingChangeRequest[];
  error?: string;
}> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) return { error: "Não autenticado" };

  const requests = await prisma.changeRequest.findMany({
    where: {
      userId: session.user.id,
      status: "pending",
    },
    select: {
      id: true,
      fieldName: true,
      newValue: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return { data: requests };
}

export async function getMyFullProfile(): Promise<{
  data?: MyFullProfile;
  error?: string;
}> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) return { error: "Não autenticado" };

  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      dependents: {
        select: { id: true, name: true, relationship: true, cpf: true },
        orderBy: { createdAt: "asc" },
      },
      emergencyContacts: {
        select: { id: true, name: true, phone: true, relationship: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!user) return { error: "Usuário não encontrado" };

  return {
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      evaluationMode: user.evaluationMode,
      isActive: user.isActive,
      avatarUrl: user.avatarUrl,
      admissionDate: user.admissionDate,
      phone: user.phone ?? null,
      jobTitle: user.jobTitle ?? null,
      createdAt: user.createdAt,
      cpf: user.cpf ?? null,
      rg: user.rg ?? null,
      birthDate: user.birthDate ?? null,
      ethnicity: user.ethnicity ?? null,
      gender: user.gender ?? null,
      maritalStatus: user.maritalStatus ?? null,
      educationLevel: user.educationLevel ?? null,
      livesWithDescription: user.livesWithDescription ?? null,
      address: user.address ?? null,
      addressNumber: user.addressNumber ?? null,
      addressComplement: user.addressComplement ?? null,
      city: user.city ?? null,
      state: user.state ?? null,
      zipCode: user.zipCode ?? null,
      personalEmail: user.personalEmail ?? null,
      hasBradescoAccount: user.hasBradescoAccount ?? null,
      bankAgency: user.bankAgency ?? null,
      bankAccount: user.bankAccount ?? null,
      hasOtherEmployment: user.hasOtherEmployment ?? null,
      healthPlanOption: user.healthPlanOption ?? null,
      wantsTransportVoucher: user.wantsTransportVoucher ?? null,
      contractType: user.contractType ?? null,
      shirtSize: user.shirtSize ?? null,
      hasChildren: user.hasChildren ?? null,
      childrenAges: user.childrenAges ?? null,
      hasIRDependents: user.hasIRDependents ?? null,
      hobbies: user.hobbies ?? [],
      socialNetworks: user.socialNetworks ?? null,
      favoriteBookMovieGenres: user.favoriteBookMovieGenres ?? null,
      favoriteBooks: user.favoriteBooks ?? null,
      favoriteMovies: user.favoriteMovies ?? null,
      favoriteMusic: user.favoriteMusic ?? null,
      admiredValues: user.admiredValues ?? null,
      foodAllergies: user.foodAllergies ?? null,
      hasPets: user.hasPets ?? null,
      participateInVideos: user.participateInVideos ?? null,
      dependents: user.dependents,
      emergencyContacts: user.emergencyContacts,
    },
  };
}

export async function getMyNineBoxResult(): Promise<{
  data?: MyNineBoxResult;
  error?: string;
}> {
  const session = await getEffectiveAuth();
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
