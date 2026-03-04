# PRD: Agendamento de Feedbacks de Onboarding (45/90 dias) com Conversa RH

## Introduction

Reestruturar o fluxo de feedbacks de onboarding (45 e 90 dias) para incluir conversas do RH com o colaborador após cada feedback do gestor. Atualmente o sistema cria automaticamente os feedbacks de 45/90 dias no cadastro do colaborador. A mudança torna esse processo **100% manual e controlado pelo admin**, adicionando duas novas ocasiões (conversa RH) ao fluxo, totalizando 4 agendamentos por colaborador.

### Fluxo das 4 ocasiões (sem ordem fixa entre feedback e conversa no mesmo marco):

| Marco | Ocasião 1 | Ocasião 2 |
|-------|-----------|-----------|
| **45 dias** | Feedback do gestor ao colaborador | Conversa do RH com o colaborador |
| **90 dias** | Feedback do gestor ao colaborador | Conversa do RH com o colaborador |

As ocasiões de 45 dias (feedback gestor + conversa RH) acontecem independentemente entre si (sem ordem fixa). Idem para as de 90 dias.

## Goals

- Dar ao admin controle total sobre a criação dos agendamentos de onboarding
- Incluir conversas RH→colaborador como parte formal do processo de onboarding
- Garantir que agendamentos só sejam gerados para colaboradores com menos de 90 dias de casa
- Calcular automaticamente as 4 datas com base na data de admissão ao clicar um botão

## User Stories

### US-001: Remover criação automática de feedbacks de onboarding
**Description:** Como desenvolvedor, preciso remover a criação automática de feedbacks de 45/90 dias no cadastro/atualização de colaborador, para que o admin controle manualmente quando gerar.

**Acceptance Criteria:**
- [ ] `createEmployee` não chama mais `createOnboardingFeedbacks()` automaticamente
- [ ] `updateEmployee` não chama mais `updateOnboardingFeedbacks()` automaticamente
- [ ] Feedbacks de onboarding existentes (já criados) não são afetados
- [ ] Typecheck/lint passa
- [ ] Testes existentes atualizados para refletir a mudança

### US-002: Botão "Gerar Agendamentos de Onboarding" no cadastro do colaborador
**Description:** Como admin, quero um botão no cadastro do colaborador que gere automaticamente os 4 agendamentos de onboarding (feedback gestor 45d, conversa RH 45d, feedback gestor 90d, conversa RH 90d), para que eu controle quando isso acontece.

**Acceptance Criteria:**
- [ ] Botão visível apenas para usuários com role `admin`
- [ ] Botão só aparece/fica habilitado quando o colaborador tem menos de 90 dias de casa (baseado em `admissionDate`)
- [ ] Botão desabilitado/oculto se `admissionDate` não estiver preenchida
- [ ] Botão desabilitado/oculto se o colaborador não tiver gestor (`managerId`) atribuído
- [ ] Botão desabilitado/oculto se já existirem agendamentos de onboarding para o colaborador
- [ ] Ao clicar, o sistema calcula automaticamente as 4 datas baseadas na `admissionDate`
- [ ] Exibe preview das 4 datas antes de confirmar (dialog de confirmação)
- [ ] Feedback visual de sucesso após criação
- [ ] Dark mode aplicado corretamente
- [ ] Typecheck/lint passa
- [ ] Verify in browser using dev-browser skill

### US-003: Criar registro de conversa RH como feedback
**Description:** Como admin (RH), quero que a conversa RH→colaborador seja registrada como um feedback normal onde o autor é o admin/RH, para manter o histórico unificado.

**Acceptance Criteria:**
- [ ] Conversas RH criadas como registros `Feedback` com `isOnboarding: true`
- [ ] O `authorId` (quem dá o feedback) é o admin que está logado no momento da geração, ou o admin que gerou os agendamentos
- [ ] Diferenciar visualmente na listagem de feedbacks: "Feedback Gestor 45d", "Conversa RH 45d", "Feedback Gestor 90d", "Conversa RH 90d"
- [ ] Adicionar campo para distinguir tipo: feedback do gestor vs conversa RH (ex: novo campo ou convenção no modelo)
- [ ] Typecheck/lint passa

### US-004: Cálculo automático das 4 datas de onboarding
**Description:** Como sistema, preciso calcular as datas das 4 ocasiões com base na data de admissão, para que o admin não precise inserir datas manualmente.

**Acceptance Criteria:**
- [ ] Data do feedback gestor 45d = admissionDate + 45 dias (ajustada para próxima segunda se cair no fim de semana)
- [ ] Data da conversa RH 45d = admissionDate + 45 dias (mesma lógica de ajuste)
- [ ] Data do feedback gestor 90d = admissionDate + 90 dias (ajustada para próxima segunda se cair no fim de semana)
- [ ] Data da conversa RH 90d = admissionDate + 90 dias (mesma lógica de ajuste)
- [ ] Datas que já passaram não são criadas (apenas as futuras)
- [ ] Testes unitários cobrindo cenários de cálculo (dia útil, sábado, domingo, datas passadas)
- [ ] Typecheck/lint passa

### US-005: Validação — apenas colaboradores com menos de 90 dias de casa
**Description:** Como sistema, devo impedir a geração de agendamentos de onboarding para colaboradores com mais de 90 dias de casa, para evitar agendamentos retroativos.

**Acceptance Criteria:**
- [ ] Server Action valida que `today - admissionDate <= 90 dias` antes de criar
- [ ] Retorna erro claro se colaborador tem mais de 90 dias de casa
- [ ] UI desabilita o botão e mostra tooltip explicativo quando fora do período
- [ ] Typecheck/lint passa

### US-006: Atualizar listagem de feedbacks para exibir tipo de onboarding
**Description:** Como usuário, quero ver claramente na lista de feedbacks se é um "Feedback Gestor" ou "Conversa RH", para diferenciar as ocasiões de onboarding.

**Acceptance Criteria:**
- [ ] Badge ou label diferenciado na tabela/lista de feedbacks para itens de onboarding
- [ ] Textos: "Feedback Gestor 45d", "Conversa RH 45d", "Feedback Gestor 90d", "Conversa RH 90d"
- [ ] Filtro existente de feedbacks continua funcionando corretamente
- [ ] Dark mode aplicado
- [ ] Typecheck/lint passa
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- **FR-1:** Remover chamadas automáticas a `createOnboardingFeedbacks()` e `updateOnboardingFeedbacks()` dos fluxos de criação/atualização de colaborador
- **FR-2:** Adicionar campo ao modelo `Feedback` para distinguir feedback do gestor vs conversa RH (sugestão: `onboardingType` enum com valores `manager_feedback` | `hr_conversation` | `null`)
- **FR-3:** Criar Server Action `generateOnboardingSchedules(employeeId)` que:
  - Valida que o colaborador tem menos de 90 dias de casa
  - Valida que tem `admissionDate` e `managerId`
  - Valida que não existem agendamentos de onboarding pendentes
  - Calcula as 4 datas automaticamente
  - Cria 4 registros de `Feedback` com status `scheduled`, `isOnboarding: true`
  - Define `onboardingType` adequado para cada registro
  - Para feedbacks do gestor: `authorId` = gestor do colaborador
  - Para conversas RH: `authorId` = admin que está gerando
- **FR-4:** Botão "Gerar Agendamentos de Onboarding" no formulário do colaborador (visível apenas para admin)
- **FR-5:** Dialog de confirmação mostrando preview das 4 datas antes de criar
- **FR-6:** Ajuste de datas para próxima segunda-feira se cair em fim de semana (manter lógica existente)
- **FR-7:** Não criar agendamentos para datas que já passaram
- **FR-8:** Exibir tipo de onboarding na listagem de feedbacks com labels diferenciados
- **FR-9:** Respeitar controle de acesso: apenas admin pode gerar agendamentos de onboarding
- **FR-10:** Conversa RH usa o mesmo formulário/campos do feedback do gestor (mesmo modelo `Feedback`)
- **FR-11:** `authorId` da conversa RH = admin logado no momento da geração dos agendamentos
- **FR-12:** Enviar notificação por email ao admin/RH que gerou quando a data da conversa RH se aproxima (usar sistema de email reminders existente)
- **FR-13:** Se o gestor do colaborador mudar (via `EmployeeHierarchy`), reatribuir feedbacks de onboarding pendentes (`status: scheduled`) do gestor antigo para o novo gestor

## Non-Goals

- Não alterar feedbacks de onboarding já existentes/submetidos no sistema
- Não criar fluxo de agendamento em lote (é por colaborador individual)
- Não adicionar novo modelo/tabela — reutilizar o modelo `Feedback` existente
- Não integrar com calendário Outlook nesta fase (pode ser adição futura)
- Não alterar o fluxo de feedbacks regulares (não-onboarding)
- Não permitir que o admin edite as datas calculadas (são automáticas com base na admissão)

## Technical Considerations

- **Schema change:** Adicionar campo `onboardingType` (enum ou string) ao modelo `Feedback` no Prisma. Requer migration.
- **Reutilizar:** lógica de ajuste de fim de semana já existente em `src/lib/sector-schedule-utils.ts` (`adjustToNextMonday`)
- **Impersonation:** A Server Action deve usar `getEffectiveAuth()` para respeitar impersonation
- **Timezone:** Datas calculadas devem seguir padrão UTC do projeto (ver MEMORY.md)
- **Arquivos principais a modificar:**
  - `prisma/schema.prisma` — novo campo `onboardingType`
  - `src/lib/sector-schedule-utils.ts` — nova função de geração, remover auto-criação
  - `src/app/(dashboard)/colaboradores/actions.ts` — remover chamadas automáticas, nova Server Action
  - `src/components/employee-form.tsx` — botão e dialog de confirmação
  - `src/components/feedback-table.tsx` ou equivalente — labels de tipo de onboarding

## Success Metrics

- Admin consegue gerar os 4 agendamentos de onboarding em menos de 3 cliques
- Conversas RH ficam registradas no histórico de feedbacks do colaborador
- Zero agendamentos gerados para colaboradores com mais de 90 dias de casa
- Nenhum agendamento automático indesejado no cadastro de colaborador

## Decisões Confirmadas

1. **Formulário da conversa RH:** Usa o mesmo formulário/campos do feedback do gestor (sem simplificação)
2. **Author da conversa RH:** `authorId` = admin logado no momento da geração dos agendamentos
3. **Notificação por email:** Sim, enviar notificação por email ao RH quando a data da conversa se aproxima
4. **Reatribuição de gestor:** Se o gestor do colaborador mudar antes da data do feedback 90d, o feedback deve ser reatribuído ao novo gestor

## Open Questions

Nenhuma pendência.
