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
  await prisma.feedbackSchedule.deleteMany();
  await prisma.feedback.deleteMany();
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
  // Users
  // ============================================================

  // Admin (acesso total, fora da hierarquia)
  await prisma.user.create({
    data: {
      name: "Ana Silva",
      email: "admin@empresa.com",
      password: pw,
      role: UserRole.admin,
    },
  });

  // CEO
  const ceo = await prisma.user.create({
    data: {
      name: "Renata Duarte",
      email: "ceo@empresa.com",
      password: pw,
      role: UserRole.manager,
    },
  });

  // Diretores
  const dirTech = await prisma.user.create({
    data: {
      name: "Carlos Oliveira",
      email: "carlos.oliveira@empresa.com",
      password: pw,
      role: UserRole.manager,
    },
  });

  const dirQual = await prisma.user.create({
    data: {
      name: "Fernanda Lima",
      email: "fernanda.lima@empresa.com",
      password: pw,
      role: UserRole.manager,
    },
  });

  const dirCS = await prisma.user.create({
    data: {
      name: "Marcelo Santos",
      email: "marcelo.santos@empresa.com",
      password: pw,
      role: UserRole.manager,
    },
  });

  const dirPS = await prisma.user.create({
    data: {
      name: "Patricia Souza",
      email: "patricia.souza@empresa.com",
      password: pw,
      role: UserRole.manager,
    },
  });

  // Coordenadores
  const coordDev = await prisma.user.create({
    data: {
      name: "Bruno Costa",
      email: "coord.dev@empresa.com",
      password: pw,
      role: UserRole.manager,
    },
  });

  const coordProd = await prisma.user.create({
    data: {
      name: "Juliana Ferreira",
      email: "coord.produto@empresa.com",
      password: pw,
      role: UserRole.manager,
    },
  });

  const coordDesign = await prisma.user.create({
    data: {
      name: "Rafael Alves",
      email: "coord.design@empresa.com",
      password: pw,
      role: UserRole.manager,
    },
  });

  const coordSup = await prisma.user.create({
    data: {
      name: "Camila Rocha",
      email: "coord.suporte@empresa.com",
      password: pw,
      role: UserRole.manager,
    },
  });

  const coordQual = await prisma.user.create({
    data: {
      name: "Diego Martins",
      email: "coord.qualidade@empresa.com",
      password: pw,
      role: UserRole.manager,
    },
  });

  const coordCS = await prisma.user.create({
    data: {
      name: "Leticia Carvalho",
      email: "coord.cs@empresa.com",
      password: pw,
      role: UserRole.manager,
    },
  });

  const coordCom = await prisma.user.create({
    data: {
      name: "Paulo Ribeiro",
      email: "coord.comercial@empresa.com",
      password: pw,
      role: UserRole.manager,
    },
  });

  const coordPS = await prisma.user.create({
    data: {
      name: "Vanessa Cruz",
      email: "coord.ps@empresa.com",
      password: pw,
      role: UserRole.manager,
    },
  });

  // Funcionários genéricos (3 por setor, 8 setores = 24)
  const funcionarios: { id: string }[] = [];
  for (let i = 1; i <= 24; i++) {
    const f = await prisma.user.create({
      data: {
        name: `Funcionário ${i}`,
        email: `funcionario${i}@empresa.com`,
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
  //   Empresa
  //   ├── Diretoria           ← CEO gerencia diretores aqui
  //   ├── TechProd            ← Dir Tech gerencia coordenadores aqui
  //   │   ├── Desenvolvimento ← Coord Dev gerencia funcionários aqui
  //   │   ├── Produto
  //   │   └── Design
  //   ├── QualSup             ← Dir Qual gerencia coordenadores aqui
  //   │   ├── Suporte
  //   │   └── Qualidade
  //   ├── CSCOM               ← Dir CS gerencia coordenadores aqui
  //   │   ├── CS
  //   │   └── Comercial
  //   └── PS Liderança        ← Dir PS gerencia coordenador aqui
  //       └── PS
  // ============================================================

  const empresa = await prisma.organizationalUnit.create({
    data: { name: "Empresa" },
  });

  const unDiretoria = await prisma.organizationalUnit.create({
    data: { name: "Diretoria", parentId: empresa.id },
  });

  // Grupo TechProd
  const unTechProd = await prisma.organizationalUnit.create({
    data: { name: "TechProd", parentId: empresa.id },
  });
  const unDesenvolvimento = await prisma.organizationalUnit.create({
    data: { name: "Desenvolvimento", parentId: unTechProd.id },
  });
  const unProduto = await prisma.organizationalUnit.create({
    data: { name: "Produto", parentId: unTechProd.id },
  });
  const unDesign = await prisma.organizationalUnit.create({
    data: { name: "Design", parentId: unTechProd.id },
  });

  // Grupo QualSup
  const unQualSup = await prisma.organizationalUnit.create({
    data: { name: "QualSup", parentId: empresa.id },
  });
  const unSuporte = await prisma.organizationalUnit.create({
    data: { name: "Suporte", parentId: unQualSup.id },
  });
  const unQualidade = await prisma.organizationalUnit.create({
    data: { name: "Qualidade", parentId: unQualSup.id },
  });

  // Grupo CSCOM
  const unCSCOM = await prisma.organizationalUnit.create({
    data: { name: "CSCOM", parentId: empresa.id },
  });
  const unCS = await prisma.organizationalUnit.create({
    data: { name: "CS", parentId: unCSCOM.id },
  });
  const unComercial = await prisma.organizationalUnit.create({
    data: { name: "Comercial", parentId: unCSCOM.id },
  });

  // Grupo PS
  const unPSLideranca = await prisma.organizationalUnit.create({
    data: { name: "PS Liderança", parentId: empresa.id },
  });
  const unPS = await prisma.organizationalUnit.create({
    data: { name: "PS", parentId: unPSLideranca.id },
  });

  // ============================================================
  // Sector Schedules
  //
  // Unidades intermediárias (diretor → coordenador):
  //   PDI mensal (1m) + Feedback trimestral (3m)
  //
  // Unidades folha (coordenador → funcionário):
  //   PDI bimestral (2m) + Feedback trimestral (3m)
  // ============================================================

  const startDate = new Date("2026-01-01");

  const intermediateUnits = [
    unDiretoria,   // CEO → Diretores
    unTechProd,    // Dir Tech → Coords (Dev, Produto, Design)
    unQualSup,     // Dir Qual → Coords (Suporte, Qualidade)
    unCSCOM,       // Dir CS → Coords (CS, Comercial)
    unPSLideranca, // Dir PS → Coord PS
  ];

  const leafUnits = [
    unDesenvolvimento,
    unProduto,
    unDesign,
    unSuporte,
    unQualidade,
    unCS,
    unComercial,
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

  // Diretores → CEO (na unidade Diretoria)
  await prisma.employeeHierarchy.createMany({
    data: [
      { employeeId: dirTech.id,  managerId: ceo.id, organizationalUnitId: unDiretoria.id },
      { employeeId: dirQual.id,  managerId: ceo.id, organizationalUnitId: unDiretoria.id },
      { employeeId: dirCS.id,    managerId: ceo.id, organizationalUnitId: unDiretoria.id },
      { employeeId: dirPS.id,    managerId: ceo.id, organizationalUnitId: unDiretoria.id },
    ],
  });

  // Coordenadores → Diretores (nas unidades intermediárias)
  await prisma.employeeHierarchy.createMany({
    data: [
      { employeeId: coordDev.id,    managerId: dirTech.id, organizationalUnitId: unTechProd.id },
      { employeeId: coordProd.id,   managerId: dirTech.id, organizationalUnitId: unTechProd.id },
      { employeeId: coordDesign.id, managerId: dirTech.id, organizationalUnitId: unTechProd.id },
      { employeeId: coordSup.id,    managerId: dirQual.id, organizationalUnitId: unQualSup.id },
      { employeeId: coordQual.id,   managerId: dirQual.id, organizationalUnitId: unQualSup.id },
      { employeeId: coordCS.id,     managerId: dirCS.id,   organizationalUnitId: unCSCOM.id },
      { employeeId: coordCom.id,    managerId: dirCS.id,   organizationalUnitId: unCSCOM.id },
      { employeeId: coordPS.id,     managerId: dirPS.id,   organizationalUnitId: unPSLideranca.id },
    ],
  });

  // Funcionários → Coordenadores (nas unidades folha)
  await prisma.employeeHierarchy.createMany({
    data: [
      // Desenvolvimento: func 1, 2, 3
      { employeeId: f(1).id,  managerId: coordDev.id,    organizationalUnitId: unDesenvolvimento.id },
      { employeeId: f(2).id,  managerId: coordDev.id,    organizationalUnitId: unDesenvolvimento.id },
      { employeeId: f(3).id,  managerId: coordDev.id,    organizationalUnitId: unDesenvolvimento.id },
      // Produto: func 4, 5, 6
      { employeeId: f(4).id,  managerId: coordProd.id,   organizationalUnitId: unProduto.id },
      { employeeId: f(5).id,  managerId: coordProd.id,   organizationalUnitId: unProduto.id },
      { employeeId: f(6).id,  managerId: coordProd.id,   organizationalUnitId: unProduto.id },
      // Design: func 7, 8, 9
      { employeeId: f(7).id,  managerId: coordDesign.id, organizationalUnitId: unDesign.id },
      { employeeId: f(8).id,  managerId: coordDesign.id, organizationalUnitId: unDesign.id },
      { employeeId: f(9).id,  managerId: coordDesign.id, organizationalUnitId: unDesign.id },
      // Suporte: func 10, 11, 12
      { employeeId: f(10).id, managerId: coordSup.id,    organizationalUnitId: unSuporte.id },
      { employeeId: f(11).id, managerId: coordSup.id,    organizationalUnitId: unSuporte.id },
      { employeeId: f(12).id, managerId: coordSup.id,    organizationalUnitId: unSuporte.id },
      // Qualidade: func 13, 14, 15
      { employeeId: f(13).id, managerId: coordQual.id,   organizationalUnitId: unQualidade.id },
      { employeeId: f(14).id, managerId: coordQual.id,   organizationalUnitId: unQualidade.id },
      { employeeId: f(15).id, managerId: coordQual.id,   organizationalUnitId: unQualidade.id },
      // CS: func 16, 17, 18
      { employeeId: f(16).id, managerId: coordCS.id,     organizationalUnitId: unCS.id },
      { employeeId: f(17).id, managerId: coordCS.id,     organizationalUnitId: unCS.id },
      { employeeId: f(18).id, managerId: coordCS.id,     organizationalUnitId: unCS.id },
      // Comercial: func 19, 20, 21
      { employeeId: f(19).id, managerId: coordCom.id,    organizationalUnitId: unComercial.id },
      { employeeId: f(20).id, managerId: coordCom.id,    organizationalUnitId: unComercial.id },
      { employeeId: f(21).id, managerId: coordCom.id,    organizationalUnitId: unComercial.id },
      // PS: func 22, 23, 24
      { employeeId: f(22).id, managerId: coordPS.id,     organizationalUnitId: unPS.id },
      { employeeId: f(23).id, managerId: coordPS.id,     organizationalUnitId: unPS.id },
      { employeeId: f(24).id, managerId: coordPS.id,     organizationalUnitId: unPS.id },
    ],
  });

  // ============================================================
  // Summary
  // ============================================================
  const userCount      = await prisma.user.count();
  const unitCount      = await prisma.organizationalUnit.count();
  const hierCount      = await prisma.employeeHierarchy.count();
  const scheduleCount  = await prisma.sectorSchedule.count();

  console.log("Seed completed successfully!");
  console.log(`  Usuários:              ${userCount}  (1 admin, 1 CEO, 4 diretores, 8 coordenadores, 24 funcionários)`);
  console.log(`  Unidades org:          ${unitCount}  (1 raiz, 1 diretoria, 4 intermediárias, 8 setores folha)`);
  console.log(`  Hierarquias:           ${hierCount}  (4 dir→CEO, 8 coord→dir, 24 func→coord)`);
  console.log(`  Agendamentos de setor: ${scheduleCount}  (PDI+Feedback por unidade, mensal/bimestral/trimestral)`);
  console.log("");
  console.log("  Senha padrão: senha123");
  console.log("  Logins de exemplo:");
  console.log("    admin@empresa.com  (admin)");
  console.log("    ceo@empresa.com    (CEO — gerencia diretores)");
  console.log("    carlos.oliveira@empresa.com  (Diretor TechProd — Dev, Produto, Design)");
  console.log("    coord.dev@empresa.com        (Coord Desenvolvimento)");
  console.log("    funcionario1@empresa.com     (Funcionário 1 — Desenvolvimento)");
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
