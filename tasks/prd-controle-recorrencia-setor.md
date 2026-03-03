# PRD: Controle de Recorrência de PDIs e Feedbacks por Setor

## Introduction

Atualmente, o agendamento de PDIs e Feedbacks é configurado individualmente por colaborador e eventos são gerados automaticamente. Esta mudança centraliza o controle de recorrência no nível do setor (Unidade Organizacional), onde um admin define a frequência dos ciclos (mensal, bimestral, trimestral, semestral ou anual). O gestor (líder imediato) é responsável por programar manualmente os eventos dos seus colaboradores, escolhendo a cadência (1 ou 2 por dia útil) e a direção do agendamento (do fim do período para trás ou do início do último mês do período). O sistema controla quais colaboradores já realizaram o evento em cada período, quais estão pendentes, e indica ao gestor quando ele ainda não programou os eventos. Novos colaboradores recebem automaticamente feedbacks de 45 e 90 dias antes de entrar no ciclo regular.

## Goals

- Permitir que admins configurem a recorrência de PDIs e Feedbacks por unidade organizacional
- Manter a possibilidade de sobrescrita individual pelo líder do setor
- Dar ao gestor controle total sobre a programação dos eventos (sem criação automática)
- Indicar claramente ao gestor quais eventos ainda não foram programados
- Permitir que o gestor escolha a cadência e direção do agendamento ao programar eventos
- Rastrear automaticamente o status de realização (realizado/pendente) de cada colaborador em cada período
- Fornecer um painel de acompanhamento por setor com visão do ano corrente e um ano para trás
- Criar automaticamente feedbacks de 45 e 90 dias para novos colaboradores (onboarding)
- Garantir que mudanças de setor preservem histórico e recalibrem para o próximo período do novo setor

## User Stories

### US-001: Configurar recorrência de PDI e Feedback por setor (Admin)
**Description:** Como admin, quero definir a frequência de PDIs e Feedbacks para uma unidade organizacional, para que todos os colaboradores daquele setor sigam o mesmo ciclo.

**Acceptance Criteria:**
- [ ] Na tela de configurações (ou gestão de unidades organizacionais), admin pode selecionar uma unidade organizacional
- [ ] Admin pode definir a frequência de PDI: mensal (1), bimestral (2), trimestral (3), semestral (6) ou anual (12)
- [ ] Admin pode definir a frequência de Feedback separadamente (mesmas opções), podendo ser diferente da de PDI
- [ ] Admin pode definir a data de início do primeiro ciclo para cada tipo
- [ ] Admin pode ativar/desativar a recorrência do setor
- [ ] Ao salvar, o sistema registra a configuração na tabela `SectorSchedule`
- [ ] Nenhum evento é criado automaticamente — apenas a configuração de recorrência é salva
- [ ] Colaboradores do setor que não possuem configuração individual passam a seguir a configuração do setor
- [ ] Validação: impedir frequências inválidas e exigir `startDate` preenchida
- [ ] Typecheck/lint passa
- [ ] Verify in browser using dev-browser skill

### US-002: Sobrescrever configuração individual (Líder/Admin)
**Description:** Como líder imediato do setor ou admin, quero poder sobrescrever a configuração de recorrência para um colaborador específico, para atender casos excepcionais.

**Acceptance Criteria:**
- [ ] Na tela do colaborador (aba de agendamento existente), líder ou admin pode marcar "Usar configuração personalizada"
- [ ] Quando marcado, exibe os campos de frequência individual (comportamento atual)
- [ ] Quando desmarcado, exibe a configuração herdada do setor (somente leitura)
- [ ] Colaboradores com configuração individual ignoram a configuração do setor
- [ ] Líder imediato do setor e admins têm permissão para esta ação
- [ ] Typecheck/lint passa
- [ ] Verify in browser using dev-browser skill

### US-003: Cálculo automático de períodos do ciclo
**Description:** Como sistema, preciso calcular automaticamente os períodos de cada ciclo com base na frequência configurada, para saber quando cada colaborador deve realizar PDI/Feedback.

**Acceptance Criteria:**
- [ ] Dado um setor com frequência trimestral iniciando em Jan/2026, os períodos são: Jan-Mar/2026, Abr-Jun/2026, Jul-Set/2026, Out-Dez/2026
- [ ] Dado um setor com frequência semestral iniciando em Jan/2026, os períodos são: Jan-Jun/2026, Jul-Dez/2026
- [ ] Dado um setor com frequência mensal iniciando em Jan/2026, os períodos são: Jan/2026, Fev/2026, Mar/2026, ...
- [ ] O sistema identifica o período atual com base na data corrente
- [ ] O sistema gera períodos do ano corrente e um ano para trás (para histórico)
- [ ] Função utilitária `calculatePeriods(frequencyMonths, startDate, referenceDate?)` retorna lista de períodos
- [ ] Testes unitários cobrem todos os cenários de frequência
- [ ] Typecheck/lint passa

### US-004: Painel de acompanhamento por setor — indicação de eventos não programados
**Description:** Como gestor, quero ver claramente quais colaboradores do meu setor ainda não tiveram seus eventos programados no período atual, para que eu saiba que preciso agir.

**Acceptance Criteria:**
- [ ] No painel do setor, cada colaborador no período atual exibe um dos três estados:
  - **"Não programado"** (badge cinza): nenhum PDI/Feedback agendado para o período
  - **"Programado"** (badge azul): evento criado com status `scheduled` ou `draft` no período
  - **"Realizado"** (badge verde): PDI `active`/`completed` ou Feedback `submitted` no período
- [ ] Contador resumo no topo: "X não programados / Y programados / Z realizados de W total"
- [ ] Destaque visual (cor de fundo ou ícone de alerta) para colaboradores "Não programado"
- [ ] Typecheck/lint passa
- [ ] Verify in browser using dev-browser skill

### US-005: Programação de eventos pelo gestor (Wizard de agendamento)
**Description:** Como gestor, quero programar os eventos de PDI/Feedback dos colaboradores do meu setor de forma prática, escolhendo a cadência e a direção do agendamento.

**Acceptance Criteria:**
- [ ] No painel do setor, botão "Programar Eventos" disponível quando há colaboradores com status "Não programado"
- [ ] Ao clicar, abre um wizard/modal com as seguintes opções:
  - **Tipo:** PDI ou Feedback (pré-selecionado conforme aba ativa)
  - **Colaboradores:** lista dos colaboradores não programados do período (todos selecionados por padrão, gestor pode desmarcar)
  - **Eventos por dia:** 1 por dia ou 2 por dia (apenas dias úteis)
  - **Direção do agendamento:**
    - "Começar do fim do período" (agenda de trás pra frente, do último dia útil do período retrocedendo)
    - "Começar no início do último mês do período" (agenda a partir do 1º dia útil do último mês do período em diante)
- [ ] Ao confirmar, o sistema calcula as datas e cria os eventos (PDI com status `scheduled` ou Feedback com status `scheduled`) distribuindo os colaboradores nos dias úteis conforme cadência e direção escolhidos
- [ ] Preview das datas geradas antes de confirmar (lista: "Colaborador X → DD/MM/YYYY")
- [ ] Apenas dias úteis são considerados (seg-sex, sem feriados nesta versão)
- [ ] Gestor pode editar datas individuais no preview antes de confirmar
- [ ] Se o gestor editar uma data para um fim de semana, o sistema auto-corrige para o dia útil mais próximo (segunda seguinte)
- [ ] Typecheck/lint passa
- [ ] Verify in browser using dev-browser skill

### US-006: Determinar status de realização por colaborador e período
**Description:** Como sistema, preciso verificar automaticamente se cada colaborador realizou o evento (PDI ou Feedback) no período vigente, para alimentar o painel de acompanhamento.

**Acceptance Criteria:**
- [ ] Para PDI: colaborador tem status "realizado" se possui um PDI com status `active` ou `completed` cuja `scheduledAt` ou `conductedAt` cai dentro do período
- [ ] Para Feedback: colaborador tem status "realizado" se possui um Feedback com status `submitted` cuja `scheduledAt` ou `conductedAt` cai dentro do período
- [ ] Colaborador tem status "programado" se possui PDI/Feedback com status `scheduled` ou `draft` no período
- [ ] Colaboradores sem nenhum evento no período têm status "não programado"
- [ ] A verificação considera a configuração efetiva do colaborador (individual se existir, senão do setor)
- [ ] Server Action `getSectorComplianceStatus(unitId, periodStart, periodEnd, type)` retorna a lista com status por colaborador
- [ ] Testes unitários validam cenários de realizado/programado/não programado
- [ ] Typecheck/lint passa

### US-007: Painel de acompanhamento por setor (Dashboard completo)
**Description:** Como líder ou admin, quero visualizar um painel que mostra, por setor e período, o status de todos os colaboradores em relação a PDIs e Feedbacks.

**Acceptance Criteria:**
- [ ] Nova página acessível via menu (ex: `/programacao` ou `/setores`)
- [ ] Seletor de unidade organizacional (filtrado conforme permissão do usuário)
- [ ] Seletor de período: lista períodos do ano corrente + um ano para trás
- [ ] Toggle ou abas para alternar entre PDI e Feedback
- [ ] Tabela exibindo: nome do colaborador, cargo, status (badge: "Não programado" cinza / "Programado" azul / "Realizado" verde), data agendada/realizada (se houver), link para o PDI/Feedback
- [ ] Barra de progresso resumo no topo com contadores por status
- [ ] Filtro por status (Todos / Não programado / Programado / Realizado)
- [ ] Líder vê apenas seus subordinados do setor; admin vê todos
- [ ] Typecheck/lint passa
- [ ] Verify in browser using dev-browser skill

### US-008: Indicadores visuais na listagem de setores
**Description:** Como líder ou admin, quero ver rapidamente o progresso de cada setor na listagem, para identificar setores que precisam de atenção.

**Acceptance Criteria:**
- [ ] Na listagem de unidades organizacionais (ou nova tela de setores), cada setor exibe:
  - Frequência configurada (ex: "PDI: Trimestral / Feedback: Mensal")
  - Progresso do período atual (ex: "8/12 PDIs realizados")
  - Quantidade de não programados (ex: "4 não programados" em destaque se > 0)
  - Indicador visual (barra de progresso ou percentual)
- [ ] Setores sem configuração exibem "Não configurado"
- [ ] Ordenação por progresso (menor primeiro) disponível
- [ ] Typecheck/lint passa
- [ ] Verify in browser using dev-browser skill

### US-009: Feedbacks automáticos de onboarding (45 e 90 dias)
**Description:** Como sistema, quero criar automaticamente feedbacks de 45 e 90 dias para novos colaboradores com base na data de admissão, antes que eles entrem no ciclo regular de feedbacks do setor.

**Acceptance Criteria:**
- [ ] Novo campo `admissionDate` (data de admissão) no modelo `User` (ou `Employee`)
- [ ] Tela de cadastro/edição de colaborador inclui campo de data de admissão
- [ ] Ao cadastrar um colaborador com data de admissão, o sistema cria automaticamente 2 feedbacks com status `scheduled`:
  - Feedback de 45 dias: `scheduledAt` = admissionDate + 45 dias
  - Feedback de 90 dias: `scheduledAt` = admissionDate + 90 dias
- [ ] Esses feedbacks são marcados com um campo/tag `onboarding: true` para diferenciá-los dos feedbacks regulares
- [ ] O colaborador só entra no ciclo regular de feedbacks do setor após o feedback de 90 dias (ou seja, a partir do próximo período completo após a data de 90 dias)
- [ ] Se a data de admissão for editada, os feedbacks de onboarding pendentes são recalculados
- [ ] No painel do setor, feedbacks de onboarding aparecem com badge "Onboarding 45d" / "Onboarding 90d"
- [ ] Typecheck/lint passa
- [ ] Verify in browser using dev-browser skill

### US-010: Transferência de setor — recalibração e preservação de histórico
**Description:** Como sistema, quando um colaborador muda de setor, preciso recalibrar os eventos futuros para o ciclo do novo setor e preservar o histórico completo para visibilidade do novo gestor.

**Acceptance Criteria:**
- [ ] Ao transferir um colaborador para outro setor (mudança de `OrganizationalUnit`):
  - Eventos futuros com status `scheduled` do setor antigo são cancelados
  - O colaborador é calibrado para iniciar no **próximo período** do novo setor (não no período atual parcial)
  - O histórico de PDIs e Feedbacks anteriores permanece intacto e acessível
- [ ] No painel do novo setor, o gestor pode ver o histórico completo do colaborador (incluindo eventos do setor anterior)
- [ ] Na visualização do histórico, eventos do setor anterior exibem label indicando o setor de origem
- [ ] Se o colaborador tinha configuração individual, ela é preservada na transferência (continua sobrescrevendo)
- [ ] Testes unitários validam: cancelamento de eventos futuros, recalibração, preservação de histórico
- [ ] Typecheck/lint passa

### US-011: Notificações de eventos não programados e ciclo pendente
**Description:** Como gestor, quero receber notificações quando tenho colaboradores não programados ou com eventos pendentes próximos ao fim do período.

**Acceptance Criteria:**
- [ ] Cron job existente (`email-reminders`) inclui verificação de ciclos por setor
- [ ] No início de cada período, gera notificação para o gestor informando quantos colaboradores precisam ser programados
- [ ] Quando faltam 7 dias para o fim do período, gera notificação para o gestor listando colaboradores pendentes (programados mas não realizados) e não programados
- [ ] Quando o período encerra com colaboradores pendentes/não programados, gera notificação de "período encerrado com pendências"
- [ ] Notificações respeitam idempotência (não duplicam)
- [ ] Typecheck/lint passa

### US-012: Migração e compatibilidade com agendamentos existentes
**Description:** Como sistema, preciso garantir que agendamentos individuais existentes continuem funcionando e que a nova funcionalidade de setor se integre sem quebrar o comportamento atual.

**Acceptance Criteria:**
- [ ] Colaboradores com `PDISchedule` ou `FeedbackSchedule` individual ativo mantêm sua configuração (considerados como "sobrescrita individual")
- [ ] Colaboradores sem agendamento individual passam a herdar do setor quando este for configurado
- [ ] A geração automática de eventos (cron `generate-events`) é desativada para colaboradores que seguem configuração de setor — o gestor programa manualmente
- [ ] A geração automática de eventos continua funcionando para colaboradores com configuração individual (retrocompatibilidade)
- [ ] Migration Prisma cria as novas tabelas/campos sem alterar tabelas existentes
- [ ] Seed atualizado para incluir exemplos de configuração por setor
- [ ] Testes de integração validam a coexistência dos dois modos
- [ ] Typecheck/lint passa

## Functional Requirements

- **FR-1:** Criar modelo `SectorSchedule` no Prisma com campos: `id`, `organizationalUnitId` (FK unique com type), `type` (enum: `pdi` | `feedback`), `frequencyMonths` (1, 2, 3, 6 ou 12), `startDate` (data de início do primeiro ciclo), `isActive` (boolean), `createdAt`, `updatedAt`. Constraint unique em `(organizationalUnitId, type)`.
- **FR-2:** Adicionar campo `admissionDate` (DateTime, opcional) ao modelo `User`.
- **FR-3:** Adicionar campo `isOnboarding` (Boolean, default false) ao modelo `Feedback` para marcar feedbacks de 45/90 dias.
- **FR-4:** Na resolução da configuração efetiva de um colaborador, o sistema deve priorizar: (1) configuração individual (`PDISchedule`/`FeedbackSchedule` com `isActive: true`) se existir, senão (2) configuração do setor (`SectorSchedule` da `OrganizationalUnit` do colaborador).
- **FR-5:** O cálculo de períodos deve gerar intervalos contíguos a partir da `startDate` com duração de `frequencyMonths` meses. Gerar períodos do ano corrente + um ano para trás.
- **FR-6:** O status de realização de um colaborador em um período possui 3 estados: "não programado" (sem evento), "programado" (evento `scheduled`/`draft`), "realizado" (PDI `active`/`completed` ou Feedback `submitted`).
- **FR-7:** O gestor programa eventos manualmente via wizard. O sistema **não** cria eventos automaticamente para colaboradores sob configuração de setor.
- **FR-8:** O wizard de programação distribui colaboradores em dias úteis (seg-sex) conforme: cadência (1 ou 2 por dia) e direção (do fim do período para trás, ou do início do último mês do período em diante). Se uma data editada manualmente cair em fim de semana, auto-corrigir para a segunda-feira seguinte.
- **FR-9:** O painel de acompanhamento é acessível apenas por admins e líderes imediatos do setor, respeitando `getAccessibleEmployeeIds()`.
- **FR-10:** Admin pode criar, editar e desativar configurações de recorrência para qualquer unidade organizacional. Líder imediato pode visualizar o painel e programar eventos.
- **FR-11:** Ao cadastrar colaborador com `admissionDate`, criar automaticamente 2 feedbacks de onboarding (45d e 90d). Colaborador entra no ciclo regular de feedback do setor somente a partir do próximo período completo após 90 dias da admissão.
- **FR-12:** Ao transferir colaborador de setor: cancelar eventos `scheduled` futuros do setor antigo, calibrar para próximo período do novo setor, preservar histórico completo.
- **FR-13:** A geração automática de eventos (cron `generate-events`) fica restrita a colaboradores com configuração individual. Colaboradores sob configuração de setor dependem da programação manual do gestor.
- **FR-14:** Notificações automáticas: início do período (avisar gestor para programar), 7 dias antes do fim (listar pendentes), fim do período (relatório de pendências).

## Non-Goals

- Não haverá herança de configuração entre unidades organizacionais pai/filho (cada setor configura independentemente)
- Não será implementada aprovação/workflow para mudança de configuração de setor
- Não haverá integração com calendário externo (Google Calendar, Outlook)
- O painel não terá exportação para Excel/PDF nesta versão
- Dias úteis = segunda a sexta, sem considerar feriados nesta versão
- Não haverá programação automática de eventos — o gestor sempre decide quando programar

## Design Considerations

- Reutilizar componentes existentes de tabela e badges do sistema
- O painel de acompanhamento deve seguir o mesmo layout do dashboard existente
- Badges de status: cinza "Não programado", azul "Programado", verde "Realizado", roxo/especial "Onboarding 45d" / "Onboarding 90d"
- O wizard de programação deve ser um modal/dialog com preview das datas antes de confirmar
- A barra de progresso segmentada (3 cores) mostra a proporção de cada status
- A configuração por setor deve ficar na área de Configurações ou como nova seção em Unidades Organizacionais
- Nova entrada no menu lateral para o painel de programação/acompanhamento

## Technical Considerations

- **Modelo de dados:** Nova tabela `SectorSchedule` com FK para `OrganizationalUnit`. Campo `admissionDate` em `User`. Campo `isOnboarding` em `Feedback`. Não altera tabelas existentes de forma destrutiva.
- **Resolução de configuração:** Helper `getEffectiveSchedule(employeeId, type)` retorna configuração individual ou do setor conforme prioridade.
- **Cálculo de dias úteis:** Função `getBusinessDays(startDate, endDate)` retorna array de datas seg-sex. Função `distributeEvents(employees, businessDays, perDay, direction)` distribui colaboradores nas datas.
- **Performance:** Indexar `SectorSchedule(organizationalUnitId, type)`. Considerar índice em `PDI(scheduledAt)` e `Feedback(scheduledAt)` para consultas por intervalo.
- **Cron jobs:** Adaptar `generate-events` para pular colaboradores sob configuração de setor. Adaptar `email-reminders` para incluir notificações de setor. Manter retrocompatibilidade para agendamentos individuais.
- **Access control:** O painel de setor utiliza `getAccessibleEmployeeIds()` existente para filtrar colaboradores visíveis.
- **Períodos:** Formato `{start: Date, end: Date, label: string}`. Label: "Jan-Mar/2026" (trimestral), "Jan-Jun/2026" (semestral), "Mar/2026" (mensal).
- **Onboarding:** Trigger de criação de feedbacks 45/90d pode ser no Server Action de salvar colaborador. Verificar se já existem antes de duplicar.

## Success Metrics

- Admin consegue configurar recorrência de um setor em menos de 1 minuto
- Gestor consegue programar todos os eventos de um período em menos de 2 minutos via wizard
- Líder visualiza o status de todos os colaboradores do setor em uma única tela
- 100% dos colaboradores de um setor configurado aparecem no painel de acompanhamento
- Redução do tempo de gestão: de N configurações individuais para 1 configuração por setor + 1 programação por período
- Novos colaboradores recebem feedbacks de onboarding sem intervenção manual
- Notificações enviadas com pelo menos 7 dias de antecedência do fim do período

## Open Questions

Todas as questões foram resolvidas:

- (Resolvido) Mudança de setor: segue novo setor, recalibra para próximo período, preserva histórico completo.
- (Resolvido) Carência para novos: feedbacks de onboarding 45d e 90d antes do ciclo regular.
- (Resolvido) Histórico: ano corrente + um ano para trás.
- (Resolvido) Dias úteis: seg-sex, sem feriados nesta versão.
- (Resolvido) Auto-correção de datas em fim de semana: sim, corrige para segunda-feira seguinte.
