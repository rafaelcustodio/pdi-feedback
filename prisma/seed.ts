import { PrismaClient, UserRole, PDIStatus, GoalStatus, FeedbackStatus } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const connectionString = process.env.DATABASE_URL!;
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  console.log("Seeding database...");

  // Clean existing data
  await prisma.notification.deleteMany();
  await prisma.pDISchedule.deleteMany();
  await prisma.feedbackSchedule.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.pDIEvidence.deleteMany();
  await prisma.pDIComment.deleteMany();
  await prisma.pDIGoal.deleteMany();
  await prisma.pDI.deleteMany();
  await prisma.employeeHierarchy.deleteMany();
  await prisma.organizationalUnit.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await hash("senha123", 10);

  // ============================================================
  // Users (3-level hierarchy: Director -> Managers -> Employees)
  // ============================================================

  // Admin user (not linked to hierarchy - has full access)
  await prisma.user.create({
    data: {
      name: "Ana Silva",
      email: "ana.silva@empresa.com",
      password: passwordHash,
      role: UserRole.admin,
    },
  });

  const director = await prisma.user.create({
    data: {
      name: "Carlos Oliveira",
      email: "carlos.oliveira@empresa.com",
      password: passwordHash,
      role: UserRole.manager,
    },
  });

  const managerTech = await prisma.user.create({
    data: {
      name: "Mariana Santos",
      email: "mariana.santos@empresa.com",
      password: passwordHash,
      role: UserRole.manager,
    },
  });

  const managerHR = await prisma.user.create({
    data: {
      name: "Roberto Lima",
      email: "roberto.lima@empresa.com",
      password: passwordHash,
      role: UserRole.manager,
    },
  });

  const devSenior = await prisma.user.create({
    data: {
      name: "Fernanda Costa",
      email: "fernanda.costa@empresa.com",
      password: passwordHash,
      role: UserRole.employee,
    },
  });

  const devJunior = await prisma.user.create({
    data: {
      name: "Lucas Pereira",
      email: "lucas.pereira@empresa.com",
      password: passwordHash,
      role: UserRole.employee,
    },
  });

  const hrAnalyst = await prisma.user.create({
    data: {
      name: "Juliana Ferreira",
      email: "juliana.ferreira@empresa.com",
      password: passwordHash,
      role: UserRole.employee,
    },
  });

  // ============================================================
  // Organizational Units
  // ============================================================

  const empresa = await prisma.organizationalUnit.create({
    data: { name: "Empresa ACME" },
  });

  const techDept = await prisma.organizationalUnit.create({
    data: { name: "Tecnologia", parentId: empresa.id },
  });

  const hrDept = await prisma.organizationalUnit.create({
    data: { name: "Recursos Humanos", parentId: empresa.id },
  });

  const devTeam = await prisma.organizationalUnit.create({
    data: { name: "Desenvolvimento", parentId: techDept.id },
  });

  // ============================================================
  // Employee Hierarchy (3 levels)
  // Level 1: Director (Carlos) manages Managers
  // Level 2: Managers (Mariana, Roberto) manage Employees
  // Level 3: Employees (Fernanda, Lucas, Juliana)
  // ============================================================

  await prisma.employeeHierarchy.createMany({
    data: [
      // Director manages Tech Manager
      {
        employeeId: managerTech.id,
        managerId: director.id,
        organizationalUnitId: techDept.id,
      },
      // Director manages HR Manager
      {
        employeeId: managerHR.id,
        managerId: director.id,
        organizationalUnitId: hrDept.id,
      },
      // Tech Manager manages developers
      {
        employeeId: devSenior.id,
        managerId: managerTech.id,
        organizationalUnitId: devTeam.id,
      },
      {
        employeeId: devJunior.id,
        managerId: managerTech.id,
        organizationalUnitId: devTeam.id,
      },
      // HR Manager manages HR analyst
      {
        employeeId: hrAnalyst.id,
        managerId: managerHR.id,
        organizationalUnitId: hrDept.id,
      },
    ],
  });

  // ============================================================
  // Sample PDI
  // ============================================================

  const pdi = await prisma.pDI.create({
    data: {
      employeeId: devJunior.id,
      managerId: managerTech.id,
      status: PDIStatus.active,
      period: "2026-S1",
      frequencyMonths: 6,
    },
  });

  await prisma.pDIGoal.createMany({
    data: [
      {
        pdiId: pdi.id,
        title: "Aprender TypeScript avançado",
        description: "Estudar generics, utility types e design patterns em TypeScript",
        competency: "Conhecimento Técnico",
        status: GoalStatus.in_progress,
        dueDate: new Date("2026-06-30"),
      },
      {
        pdiId: pdi.id,
        title: "Melhorar comunicação em reuniões",
        description: "Participar ativamente das dailies e apresentar nas retrospectivas",
        competency: "Comunicação",
        status: GoalStatus.pending,
        dueDate: new Date("2026-06-30"),
      },
      {
        pdiId: pdi.id,
        title: "Contribuir com code reviews",
        description: "Realizar pelo menos 3 code reviews por semana",
        competency: "Trabalho em Equipe",
        status: GoalStatus.pending,
        dueDate: new Date("2026-04-30"),
      },
    ],
  });

  await prisma.pDIComment.create({
    data: {
      pdiId: pdi.id,
      authorId: managerTech.id,
      content: "Lucas, vamos focar primeiro na meta de TypeScript. Posso indicar alguns cursos.",
    },
  });

  // ============================================================
  // Sample Feedback
  // ============================================================

  await prisma.feedback.create({
    data: {
      employeeId: devSenior.id,
      managerId: managerTech.id,
      period: "2025-S2",
      content: "Fernanda demonstrou excelente desempenho no último semestre.",
      strengths: "Liderança técnica, qualidade de código, mentoria de júniors",
      improvements: "Documentação de decisões arquiteturais, delegação de tarefas",
      rating: 4,
      status: FeedbackStatus.submitted,
      frequencyMonths: 6,
    },
  });

  await prisma.feedback.create({
    data: {
      employeeId: devJunior.id,
      managerId: managerTech.id,
      period: "2025-S2",
      content: "Lucas está evoluindo bem, mas precisa melhorar em algumas áreas.",
      strengths: "Proatividade, vontade de aprender, boa relação com a equipe",
      improvements: "Aprofundar conhecimentos em TypeScript, melhorar estimativas de prazo",
      rating: 3,
      status: FeedbackStatus.draft,
      frequencyMonths: 6,
    },
  });

  // ============================================================
  // Sample Schedules
  // ============================================================

  await prisma.feedbackSchedule.createMany({
    data: [
      {
        employeeId: devSenior.id,
        managerId: managerTech.id,
        frequencyMonths: 6,
        nextDueDate: new Date("2026-06-30"),
        isActive: true,
      },
      {
        employeeId: devJunior.id,
        managerId: managerTech.id,
        frequencyMonths: 3,
        nextDueDate: new Date("2026-03-31"),
        isActive: true,
      },
    ],
  });

  await prisma.pDISchedule.createMany({
    data: [
      {
        employeeId: devJunior.id,
        managerId: managerTech.id,
        frequencyMonths: 6,
        nextDueDate: new Date("2026-06-30"),
        isActive: true,
      },
    ],
  });

  // ============================================================
  // Sample Notifications
  // ============================================================

  await prisma.notification.createMany({
    data: [
      {
        userId: managerTech.id,
        type: "feedback_reminder",
        title: "Feedback pendente",
        message: "O feedback de Lucas Pereira para o período 2025-S2 ainda está em rascunho.",
        isRead: false,
        emailSent: false,
      },
      {
        userId: managerTech.id,
        type: "pdi_reminder",
        title: "PDI próximo do vencimento",
        message: "A meta 'Contribuir com code reviews' de Lucas Pereira vence em 30/04/2026.",
        isRead: false,
        emailSent: true,
      },
    ],
  });

  console.log("Seed completed successfully!");
  console.log(`  Users created: 7`);
  console.log(`  Org units created: 4`);
  console.log(`  Hierarchies created: 5`);
  console.log(`  PDIs created: 1 (with 3 goals)`);
  console.log(`  Feedbacks created: 2`);
  console.log(`  Schedules created: 3`);
  console.log(`  Notifications created: 2`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
