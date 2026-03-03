import { PrismaClient, UserRole } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const connectionString = process.env.DATABASE_URL!;
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  console.log("Seeding database...");

  // ============================================================
  // Clean existing data (FK-safe order)
  // ============================================================
  await prisma.notification.deleteMany();
  await prisma.nineBoxEvaluator.deleteMany();
  await prisma.nineBoxEvaluation.deleteMany();
  await prisma.feedbackSchedule.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.pDIFollowUp.deleteMany();
  await prisma.pDIEvidence.deleteMany();
  await prisma.pDIComment.deleteMany();
  await prisma.pDIGoal.deleteMany();
  await prisma.pDI.deleteMany();
  await prisma.employeeHierarchy.deleteMany();
  await prisma.sectorSchedule.deleteMany();
  await prisma.organizationalUnit.deleteMany();
  await prisma.user.deleteMany();

  const pw = await hash("senha123", 10);

  // ============================================================
  // Users — Estrutura real Narwal
  // ============================================================

  // Admin (acesso total, fora da hierarquia)
  await prisma.user.create({
    data: {
      name: "Admin Sistema",
      email: "admin@narwal.com.br",
      password: pw,
      role: UserRole.admin,
    },
  });

  // CEO
  const ceo = await prisma.user.create({
    data: {
      name: "Rogério Borili",
      email: "rogerio.borili@narwal.com.br",
      password: pw,
      role: UserRole.manager,
    },
  });

  // Diretores
  const dirComMktCS = await prisma.user.create({
    data: {
      name: "Vinicius Pacheco",
      email: "vinicius.pacheco@narwal.com.br",
      password: pw,
      role: UserRole.manager,
    },
  });

  const dirSupAMS = await prisma.user.create({
    data: {
      name: "Eliziel Rodrigues",
      email: "eliziel.rodrigues@narwal.com.br",
      password: pw,
      role: UserRole.manager,
    },
  });

  const dirProdEng = await prisma.user.create({
    data: {
      name: "Rafael Custódio",
      email: "rafael.custodio@narwal.com.br",
      password: pw,
      role: UserRole.manager,
    },
  });

  const dirPS = await prisma.user.create({
    data: {
      name: "Danilo de Freitas",
      email: "danilo.freitas@narwal.com.br",
      password: pw,
      role: UserRole.manager,
    },
  });

  // Gerentes
  const gerComMkt = await prisma.user.create({
    data: {
      name: "Paula Mariot",
      email: "paula.mariot@narwal.com.br",
      password: pw,
      role: UserRole.manager,
    },
  });

  const gerCS = await prisma.user.create({
    data: {
      name: "Rosane Campos",
      email: "rosane.campos@narwal.com.br",
      password: pw,
      role: UserRole.manager,
    },
  });

  const gerPeC = await prisma.user.create({
    data: {
      name: "Bruna Custódio",
      email: "bruna.custodio@narwal.com.br",
      password: pw,
      role: UserRole.manager,
    },
  });

  // Coordenadores
  const coordEng = await prisma.user.create({
    data: {
      name: "Mauricio Cardoso",
      email: "mauricio.cardoso@narwal.com.br",
      password: pw,
      role: UserRole.manager,
    },
  });

  const coordProd = await prisma.user.create({
    data: {
      name: "Camila Ribeiro",
      email: "camila.ribeiro@narwal.com.br",
      password: pw,
      role: UserRole.manager,
    },
  });

  const coordQual = await prisma.user.create({
    data: {
      name: "Anmer Machado",
      email: "anmer.machado@narwal.com.br",
      password: pw,
      role: UserRole.manager,
    },
  });

  const coordSup = await prisma.user.create({
    data: {
      name: "Dailton Ronchi",
      email: "dailton.ronchi@narwal.com.br",
      password: pw,
      role: UserRole.manager,
    },
  });

  const coordAMS = await prisma.user.create({
    data: {
      name: "Renata Topanotti",
      email: "renata.topanotti@narwal.com.br",
      password: pw,
      role: UserRole.manager,
    },
  });

  // ============================================================
  // Funcionários — 66 no total
  //
  // Distribuição:
  //   Engenharia:           15  (1-15)
  //   Suporte:              15  (16-30)
  //   AMS:                   8  (31-38)
  //   Produto:               6  (39-44)
  //   CS:                    6  (45-50)
  //   Comercial & Marketing: 5  (51-55)
  //   Qualidade:             5  (56-60)
  //   Pessoas & Cultura:     3  (61-63)
  //   Partner Success:       3  (64-66)
  // ============================================================

  const funcionarios: { id: string }[] = [];
  for (let i = 1; i <= 66; i++) {
    const f = await prisma.user.create({
      data: {
        name: `Funcionário ${i}`,
        email: `funcionario${i}@narwal.com.br`,
        password: pw,
        role: UserRole.employee,
      },
    });
    funcionarios.push(f);
  }
  const f = (i: number) => funcionarios[i - 1]; // helper 1-based

  // ============================================================
  // Unidades Organizacionais
  //
  // Estrutura:
  //   Narwal (raiz)
  //   ├── Diretoria              ← CEO gerencia diretores + gerente P&C
  //   ├── Comercial, Mkt & CS    ← Vinicius gerencia Paula e Rosane
  //   │   ├── Comercial & Marketing  ← Paula gerencia funcionários
  //   │   └── CS                     ← Rosane gerencia funcionários
  //   ├── Suporte e AMS          ← Eliziel gerencia Christian e Renata
  //   │   ├── Suporte                ← Christian gerencia funcionários
  //   │   └── AMS                    ← Renata gerencia funcionários
  //   ├── Pessoas & Cultura      ← Bruna gerencia funcionários diretamente
  //   ├── Produto & Engenharia   ← Rafael gerencia Mauricio e Camila
  //   │   ├── Engenharia             ← Mauricio gerencia funcionários
  //   │   └── Produto                ← Camila gerencia funcionários
  //   ├── Qualidade              ← Eliziel gerencia Anmer
  //   │   └── QA                     ← Anmer gerencia funcionários
  //   └── Partner Success        ← Danilo gerencia funcionários diretamente
  // ============================================================

  const narwal = await prisma.organizationalUnit.create({
    data: { name: "Narwal" },
  });

  const unDiretoria = await prisma.organizationalUnit.create({
    data: { name: "Diretoria", parentId: narwal.id },
  });

  // Grupo Comercial, Marketing & CS
  const unComMktCS = await prisma.organizationalUnit.create({
    data: { name: "Comercial, Marketing & CS", parentId: narwal.id },
  });
  const unComMkt = await prisma.organizationalUnit.create({
    data: { name: "Comercial & Marketing", parentId: unComMktCS.id },
  });
  const unCS = await prisma.organizationalUnit.create({
    data: { name: "CS", parentId: unComMktCS.id },
  });

  // Grupo Suporte e AMS
  const unSupAMS = await prisma.organizationalUnit.create({
    data: { name: "Suporte e AMS", parentId: narwal.id },
  });
  const unSuporte = await prisma.organizationalUnit.create({
    data: { name: "Suporte", parentId: unSupAMS.id },
  });
  const unAMS = await prisma.organizationalUnit.create({
    data: { name: "AMS", parentId: unSupAMS.id },
  });

  // Pessoas & Cultura (folha — gerente reporta direto ao CEO)
  const unPeC = await prisma.organizationalUnit.create({
    data: { name: "Pessoas & Cultura", parentId: narwal.id },
  });

  // Grupo Produto & Engenharia
  const unProdEng = await prisma.organizationalUnit.create({
    data: { name: "Produto & Engenharia", parentId: narwal.id },
  });
  const unEngenharia = await prisma.organizationalUnit.create({
    data: { name: "Engenharia", parentId: unProdEng.id },
  });
  const unProduto = await prisma.organizationalUnit.create({
    data: { name: "Produto", parentId: unProdEng.id },
  });

  // Grupo Qualidade
  const unQualDir = await prisma.organizationalUnit.create({
    data: { name: "Qualidade", parentId: narwal.id },
  });
  const unQA = await prisma.organizationalUnit.create({
    data: { name: "QA", parentId: unQualDir.id },
  });

  // Partner Success (folha — diretor reporta direto ao CEO)
  const unPS = await prisma.organizationalUnit.create({
    data: { name: "Partner Success", parentId: narwal.id },
  });

  // ============================================================
  // Sector Schedules
  //
  // Intermediárias (diretor → coord/gerente): PDI mensal + Feedback trimestral
  // Folha (coord/gerente → funcionários): PDI bimestral + Feedback trimestral
  // ============================================================

  const startDate = new Date("2026-01-01");

  const intermediateUnits = [
    unDiretoria,   // CEO → Diretores/Gerente
    unComMktCS,    // Vinicius → Paula, Rosane
    unSupAMS,      // Eliziel → Christian, Renata
    unProdEng,     // Rafael → Mauricio, Camila
    unQualDir,     // Eliziel → Anmer
  ];

  const leafUnits = [
    unComMkt, unCS,
    unSuporte, unAMS,
    unPeC,
    unEngenharia, unProduto,
    unQA,
    unPS,
  ];

  for (const unit of intermediateUnits) {
    await prisma.sectorSchedule.createMany({
      data: [
        { organizationalUnitId: unit.id, type: "pdi", frequencyMonths: 1, startDate, isActive: true },
        { organizationalUnitId: unit.id, type: "feedback", frequencyMonths: 3, startDate, isActive: true },
      ],
    });
  }

  for (const unit of leafUnits) {
    await prisma.sectorSchedule.createMany({
      data: [
        { organizationalUnitId: unit.id, type: "pdi", frequencyMonths: 2, startDate, isActive: true },
        { organizationalUnitId: unit.id, type: "feedback", frequencyMonths: 3, startDate, isActive: true },
      ],
    });
  }

  // ============================================================
  // Employee Hierarchy
  // ============================================================

  // Diretores + Gerente P&C → CEO (na unidade Diretoria)
  await prisma.employeeHierarchy.createMany({
    data: [
      { employeeId: dirComMktCS.id, managerId: ceo.id, organizationalUnitId: unDiretoria.id },
      { employeeId: dirSupAMS.id,   managerId: ceo.id, organizationalUnitId: unDiretoria.id },
      { employeeId: dirProdEng.id,  managerId: ceo.id, organizationalUnitId: unDiretoria.id },
      { employeeId: dirPS.id,       managerId: ceo.id, organizationalUnitId: unDiretoria.id },
      { employeeId: gerPeC.id,      managerId: ceo.id, organizationalUnitId: unDiretoria.id },
    ],
  });

  // Gerentes → Diretor Comercial, Mkt & CS
  await prisma.employeeHierarchy.createMany({
    data: [
      { employeeId: gerComMkt.id, managerId: dirComMktCS.id, organizationalUnitId: unComMktCS.id },
      { employeeId: gerCS.id,     managerId: dirComMktCS.id, organizationalUnitId: unComMktCS.id },
    ],
  });

  // Coordenadores → Diretor Suporte e AMS
  await prisma.employeeHierarchy.createMany({
    data: [
      { employeeId: coordSup.id, managerId: dirSupAMS.id, organizationalUnitId: unSupAMS.id },
      { employeeId: coordAMS.id, managerId: dirSupAMS.id, organizationalUnitId: unSupAMS.id },
    ],
  });

  // Coordenadores → Diretor Produto & Engenharia
  await prisma.employeeHierarchy.createMany({
    data: [
      { employeeId: coordEng.id,  managerId: dirProdEng.id, organizationalUnitId: unProdEng.id },
      { employeeId: coordProd.id, managerId: dirProdEng.id, organizationalUnitId: unProdEng.id },
    ],
  });

  // Coordenador → Diretor Qualidade (Eliziel acumula Suporte/AMS e Qualidade)
  await prisma.employeeHierarchy.createMany({
    data: [
      { employeeId: coordQual.id, managerId: dirSupAMS.id, organizationalUnitId: unQualDir.id },
    ],
  });

  // Funcionários → Coordenadores/Gerentes (nas unidades folha)
  await prisma.employeeHierarchy.createMany({
    data: [
      // Engenharia (1-15) → Mauricio Cardoso
      ...Array.from({ length: 15 }, (_, i) => ({
        employeeId: f(i + 1).id,
        managerId: coordEng.id,
        organizationalUnitId: unEngenharia.id,
      })),
      // Suporte (16-30) → Christian Teste
      ...Array.from({ length: 15 }, (_, i) => ({
        employeeId: f(i + 16).id,
        managerId: coordSup.id,
        organizationalUnitId: unSuporte.id,
      })),
      // AMS (31-38) → Renata Topanotti
      ...Array.from({ length: 8 }, (_, i) => ({
        employeeId: f(i + 31).id,
        managerId: coordAMS.id,
        organizationalUnitId: unAMS.id,
      })),
      // Produto (39-44) → Camila Ribeiro
      ...Array.from({ length: 6 }, (_, i) => ({
        employeeId: f(i + 39).id,
        managerId: coordProd.id,
        organizationalUnitId: unProduto.id,
      })),
      // CS (45-50) → Rosane Campos
      ...Array.from({ length: 6 }, (_, i) => ({
        employeeId: f(i + 45).id,
        managerId: gerCS.id,
        organizationalUnitId: unCS.id,
      })),
      // Comercial & Marketing (51-55) → Paula Mariot
      ...Array.from({ length: 5 }, (_, i) => ({
        employeeId: f(i + 51).id,
        managerId: gerComMkt.id,
        organizationalUnitId: unComMkt.id,
      })),
      // Qualidade (56-60) → Anmer Machado
      ...Array.from({ length: 5 }, (_, i) => ({
        employeeId: f(i + 56).id,
        managerId: coordQual.id,
        organizationalUnitId: unQA.id,
      })),
      // Pessoas & Cultura (61-63) → Bruna Custódio
      ...Array.from({ length: 3 }, (_, i) => ({
        employeeId: f(i + 61).id,
        managerId: gerPeC.id,
        organizationalUnitId: unPeC.id,
      })),
      // Partner Success (64-66) → Danilo de Freitas
      ...Array.from({ length: 3 }, (_, i) => ({
        employeeId: f(i + 64).id,
        managerId: dirPS.id,
        organizationalUnitId: unPS.id,
      })),
    ],
  });

  // ============================================================
  // Summary
  // ============================================================
  const userCount     = await prisma.user.count();
  const unitCount     = await prisma.organizationalUnit.count();
  const hierCount     = await prisma.employeeHierarchy.count();
  const scheduleCount = await prisma.sectorSchedule.count();

  console.log("Seed completed successfully!");
  console.log(`  Usuários:              ${userCount}  (1 admin, 1 CEO, 4 diretores, 3 gerentes, 5 coordenadores, 66 funcionários)`);
  console.log(`  Unidades org:          ${unitCount}  (1 raiz, 1 diretoria, 4 intermediárias, 9 setores folha)`);
  console.log(`  Hierarquias:           ${hierCount}`);
  console.log(`  Agendamentos de setor: ${scheduleCount}`);
  console.log("");
  console.log("  Senha padrão: senha123");
  console.log("  Logins de exemplo:");
  console.log("    admin@narwal.com.br                (Admin)");
  console.log("    rogerio.borili@narwal.com.br        (CEO)");
  console.log("    rafael.custodio@narwal.com.br       (Diretor Produto & Engenharia)");
  console.log("    eliziel.rodrigues@narwal.com.br     (Diretor Suporte/AMS + Qualidade)");
  console.log("    vinicius.pacheco@narwal.com.br      (Diretor Comercial, Mkt & CS)");
  console.log("    mauricio.cardoso@narwal.com.br      (Coord. Engenharia)");
  console.log("    bruna.custodio@narwal.com.br        (Gerente Pessoas & Cultura)");
  console.log("    funcionario1@narwal.com.br             (Funcionário 1 — Engenharia)");
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
