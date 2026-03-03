# PRD: Calendário e Ciclo Unificado de Desenvolvimento (PDI & Feedback)

## Introduction

Reestruturação do fluxo de trabalho de PDIs e Feedbacks para seguir um ciclo de vida unificado — **agendar → preparar → executar → registrar** — com geração automática de eventos futuros e uma visão em calendário mensal. O sistema usará a `OrganizationalUnit` existente como "setor" para filtrar a visão do calendário.

Hoje, PDIs e Feedbacks têm ciclos de vida divergentes e os agendamentos (`PDISchedule`/`FeedbackSchedule`) apenas armazenam a próxima data sem criar registros reais. O gestor precisa criar manualmente cada PDI/Feedback. Com essa mudança, ao configurar a periodicidade de um colaborador, o sistema gera automaticamente os slots futuros (PDIs e Feedbacks com status `scheduled`) que aparecem no calendário, prontos para o gestor pré-preencher antes da reunião.

**Fluxo alvo:**
1. Colaborador entra na empresa → admin/gestor configura frequência de PDI e Feedback
2. Sistema gera automaticamente os eventos futuros no calendário (ex: feedback trimestral = 4 slots/ano)
3. Gestor vê no calendário mensal todos os eventos futuros com seus subordinados
4. Gestor clica no evento e pré-preenche o PDI/Feedback antes da reunião
5. Gestor conduz a reunião com o colaborador
6. Gestor finaliza o registro (o próprio preenchimento do formulário é o registro)

## Goals

- Unificar o ciclo de vida de PDI e Feedback em: `scheduled` → `draft` → `active`/`submitted` (conduzido)
- Gerar automaticamente registros futuros de PDI e Feedback quando a periodicidade for configurada
- Fornecer uma visão de calendário mensal (estilo Google Calendar) com todos os eventos de desenvolvimento
- Permitir filtrar o calendário por setor (OrganizationalUnit)
- Eliminar a necessidade do gestor criar manualmente cada PDI/Feedback — ele apenas preenche e conduz os eventos pré-agendados
- Manter compatibilidade com PDIs e Feedbacks já existentes no sistema

## User Stories

### US-001: Adicionar status `scheduled` e campo `scheduledAt` ao PDI
**Description:** Como desenvolvedor, preciso alinhar o modelo de PDI com o mesmo ciclo de vida do Feedback, adicionando o status `scheduled` e o campo `scheduledAt`, para que PDIs possam ser pré-agendados automaticamente.

**Acceptance Criteria:**
- [ ] Adicionar valor `scheduled` ao enum `PDIStatus` no schema Prisma
- [ ] Adicionar campo `scheduledAt DateTime?` ao model `PDI`
- [ ] Gerar e aplicar migration sem perda de dados existentes
- [ ] PDIs existentes (draft/active/completed/cancelled) não são afetados
- [ ] Regenerar Prisma Client (`prisma:generate`)
- [ ] Typecheck passa

### US-002: Geração automática de eventos ao configurar periodicidade
**Description:** Como gestor, quero que ao configurar a frequência de PDI e Feedback de um colaborador, o sistema crie automaticamente os registros futuros com status `scheduled` para os próximos 12 meses, para que eu veja no calendário todas as sessões planejadas.

**Acceptance Criteria:**
- [ ] Ao salvar uma frequência de PDI (ex: 3 meses), o sistema cria registros de PDI com status `scheduled` e `scheduledAt` espaçados pela frequência, cobrindo os próximos 12 meses a partir de hoje
- [ ] Ao salvar uma frequência de Feedback (ex: 6 meses), o sistema cria registros de Feedback com status `scheduled` e `scheduledAt` espaçados pela frequência, cobrindo os próximos 12 meses
- [ ] O campo `period` dos registros gerados é preenchido automaticamente (ex: "Mar/2026", "Jun/2026")
- [ ] O campo `managerId` é preenchido com o gestor direto atual do colaborador (via `EmployeeHierarchy`)
- [ ] Se já existem registros `scheduled` futuros para o mesmo colaborador/tipo, os existentes são removidos e substituídos pela nova programação (evita duplicatas)
- [ ] Se a frequência for removida (setada como "Nenhum"), os registros `scheduled` futuros são removidos
- [ ] A lógica de `recalculatePDISchedule` e `recalculateFeedbackSchedule` é atualizada para gerar o próximo evento `scheduled` ao completar/submeter um ciclo
- [ ] O `ScheduleSection` component continua funcionando, agora com feedback visual dos eventos gerados
- [ ] Typecheck passa

### US-003: Página de calendário mensal
**Description:** Como gestor, quero uma página de calendário mensal que mostre todos os PDIs e Feedbacks agendados dos meus subordinados, para que eu tenha uma visão clara da minha agenda de desenvolvimento.

**Acceptance Criteria:**
- [ ] Nova rota `/calendario` acessível via sidebar (ícone de calendário, label "Calendário")
- [ ] Visão mensal em grid (7 colunas × 5-6 linhas), similar ao Google Calendar
- [ ] Navegação entre meses (setas esquerda/direita + indicador do mês/ano atual)
- [ ] Botão "Hoje" para voltar ao mês atual
- [ ] Cada dia mostra os eventos agendados para aquela data como badges coloridos
- [ ] PDIs exibidos com badge azul; Feedbacks com badge verde
- [ ] Cada badge mostra o nome do colaborador (truncado se necessário)
- [ ] Ao clicar em um evento, redireciona para a página de detalhe do PDI ou Feedback correspondente
- [ ] Dias com mais de 3 eventos mostram "+N mais" com tooltip ou popover listando todos
- [ ] Dia atual destacado visualmente (borda ou fundo diferente)
- [ ] Layout responsivo: em telas menores, mudar para formato de lista/agenda do mês
- [ ] Gestor vê apenas eventos dos seus subordinados (diretos e indiretos)
- [ ] Admin vê todos os eventos
- [ ] Colaborador vê apenas seus próprios eventos (PDIs ativos e feedbacks submetidos)
- [ ] Typecheck passa
- [ ] Verify in browser using dev-browser skill

### US-004: Filtros do calendário por setor e tipo
**Description:** Como gestor, quero filtrar o calendário por setor (unidade organizacional) e por tipo de evento (PDI/Feedback/Todos), para focar na equipe ou atividade relevante.

**Acceptance Criteria:**
- [ ] Dropdown de filtro "Setor" acima do calendário, listando todas as `OrganizationalUnit` acessíveis ao usuário
- [ ] Opção "Todos os setores" como padrão
- [ ] Dropdown de filtro "Tipo" com opções: "Todos", "PDI", "Feedback"
- [ ] Filtros aplicados via URL search params (ex: `?setor=xxx&tipo=pdi`) para permitir compartilhamento de links
- [ ] Ao selecionar um setor, calendário mostra apenas eventos de colaboradores vinculados àquela unidade organizacional
- [ ] Filtros persistem na navegação entre meses
- [ ] Contagem de eventos no mês atual exibida ao lado dos filtros (ex: "12 eventos em Março/2026")
- [ ] Typecheck passa
- [ ] Verify in browser using dev-browser skill

### US-005: Transição de status `scheduled` → `draft` (gestor começa a pré-preencher)
**Description:** Como gestor, quero clicar em um evento `scheduled` no calendário e começar a preencher o PDI ou Feedback antes da reunião, para me preparar com antecedência.

**Acceptance Criteria:**
- [ ] Ao abrir um PDI com status `scheduled`, exibe o formulário de edição (mesmo de criação) com campos editáveis
- [ ] Ao abrir um Feedback com status `scheduled`, exibe o formulário de edição com campos editáveis
- [ ] Ao salvar a primeira edição, o status muda automaticamente de `scheduled` para `draft`
- [ ] Campos `employeeId`, `managerId` e `scheduledAt` já estão pré-preenchidos (vindos da geração automática)
- [ ] Campo `period` já está pré-preenchido mas é editável
- [ ] Para PDI: gestor pode adicionar/editar metas (goals) normalmente
- [ ] Para Feedback: gestor pode preencher conteúdo, pontos fortes, melhorias e rating
- [ ] Banner informativo no topo: "Este [PDI/Feedback] está agendado para [data]. Preencha antes da reunião."
- [ ] Typecheck passa
- [ ] Verify in browser using dev-browser skill

### US-006: Indicadores visuais de status no calendário
**Description:** Como gestor, quero distinguir visualmente no calendário quais eventos estão agendados (pendentes), em preparação (rascunho), e já conduzidos, para saber o que precisa de atenção.

**Acceptance Criteria:**
- [ ] Eventos `scheduled` exibidos com badge de cor neutra/cinza e ícone de relógio (pendente de preparação)
- [ ] Eventos `draft` exibidos com badge de cor amarela e ícone de lápis (em preparação)
- [ ] Eventos `active` (PDI) exibidos com badge de cor azul e ícone de play (em andamento)
- [ ] Eventos `submitted` (Feedback) exibidos com badge de cor verde e ícone de check (concluído)
- [ ] Eventos `completed` (PDI) exibidos com badge de cor verde e ícone de check (concluído)
- [ ] Legenda de cores exibida abaixo dos filtros do calendário
- [ ] Typecheck passa
- [ ] Verify in browser using dev-browser skill

### US-007: Atualizar listagens de PDI e Feedback para incluir status `scheduled`
**Description:** Como gestor, quero ver os PDIs e Feedbacks com status `scheduled` nas listagens existentes, para ter visibilidade completa do pipeline.

**Acceptance Criteria:**
- [ ] Listagem de PDIs (`/pdis`) inclui PDIs com status `scheduled` para gestores/admins
- [ ] Listagem de Feedbacks (`/feedbacks`) inclui Feedbacks com status `scheduled` para gestores/admins
- [ ] Colaboradores NÃO veem registros com status `scheduled` nas suas listagens
- [ ] Novo badge "Agendado" (cinza) exibido na coluna de status para registros `scheduled`
- [ ] Filtro de status nas tabelas atualizado para incluir opção "Agendado"
- [ ] Ordenação padrão: `scheduled` primeiro (por `scheduledAt`), depois `draft`, depois outros
- [ ] Typecheck passa
- [ ] Verify in browser using dev-browser skill

### US-008: Atualizar dashboard com visão de calendário resumida
**Description:** Como gestor, quero ver no dashboard um resumo dos próximos eventos do calendário, para ter uma visão rápida da minha agenda sem precisar ir à página de calendário.

**Acceptance Criteria:**
- [ ] Seção "Próximos Eventos" no dashboard substituindo ou complementando a seção "Próximos Vencimentos"
- [ ] Exibe os próximos 7 eventos (PDI + Feedback) ordenados por `scheduledAt`
- [ ] Cada item mostra: tipo (PDI/Feedback com ícone), nome do colaborador, data agendada, status (scheduled/draft)
- [ ] Eventos `scheduled` (não preparados) destacados com indicador visual de alerta
- [ ] Link "Ver calendário completo" apontando para `/calendario`
- [ ] Clique em cada item redireciona para o detalhe do PDI/Feedback
- [ ] Typecheck passa
- [ ] Verify in browser using dev-browser skill

### US-009: Reagendar ou cancelar evento do calendário
**Description:** Como gestor, quero poder alterar a data ou cancelar um evento agendado no calendário, para acomodar mudanças de agenda.

**Acceptance Criteria:**
- [ ] Na página de detalhe de um PDI/Feedback com status `scheduled` ou `draft`, botão "Reagendar" que abre date picker para nova data
- [ ] Ao reagendar, o campo `scheduledAt` é atualizado e o evento aparece na nova data no calendário
- [ ] Botão "Cancelar evento" que remove o registro `scheduled` (se nunca foi preenchido) ou muda para `cancelled` (se já tem conteúdo)
- [ ] Confirmação antes de cancelar: "Tem certeza que deseja cancelar este [PDI/Feedback] agendado?"
- [ ] Ao cancelar um evento de uma série periódica, apenas o evento individual é cancelado (não a série toda)
- [ ] Notificação enviada ao colaborador se o evento for reagendado ou cancelado
- [ ] Typecheck passa
- [ ] Verify in browser using dev-browser skill

### US-010: Job de manutenção do calendário (geração de novos slots)
**Description:** Como sistema, preciso gerar automaticamente novos slots de eventos quando os existentes são consumidos ou quando o horizonte de 12 meses avança, para que o calendário sempre tenha eventos futuros.

**Acceptance Criteria:**
- [ ] Job (cron) que roda semanalmente verificando todos os `PDISchedule` e `FeedbackSchedule` ativos
- [ ] Para cada schedule ativo, verifica se há registros `scheduled` cobrindo os próximos 12 meses
- [ ] Se houver lacunas (ex: o último `scheduled` é daqui a 3 meses mas a frequência é trimestral), gera os registros faltantes
- [ ] Job atualiza `nextDueDate` no schedule para refletir a próxima data sem registro
- [ ] Ao completar um PDI (`active` → `completed`) ou submeter um Feedback (`draft` → `submitted`), verificar e gerar próximo slot se necessário
- [ ] Endpoint em `/api/cron/generate-events` protegido por `CRON_SECRET`
- [ ] Log de execução com quantidade de eventos gerados
- [ ] Typecheck passa

### US-011: Sidebar — adicionar item "Calendário"
**Description:** Como usuário, quero acessar o calendário pelo menu lateral para navegar facilmente até a visão de agenda.

**Acceptance Criteria:**
- [ ] Novo item "Calendário" na sidebar, entre "Dashboard" e "Colaboradores"
- [ ] Ícone: `Calendar` do lucide-react
- [ ] Item destaca quando a rota ativa é `/calendario`
- [ ] Visível para todos os roles (admin, manager, employee)
- [ ] Typecheck passa
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- **FR-01:** Adicionar `scheduled` ao enum `PDIStatus` e campo `scheduledAt DateTime?` ao model `PDI`
- **FR-02:** Ao configurar periodicidade de PDI/Feedback para um colaborador, o sistema deve gerar registros com status `scheduled` espaçados pela frequência, cobrindo os próximos 12 meses
- **FR-03:** Registros gerados automaticamente devem ter `period`, `managerId`, `employeeId` e `scheduledAt` preenchidos
- **FR-04:** Se a frequência for alterada, os registros `scheduled` futuros devem ser recriados conforme a nova frequência
- **FR-05:** Se a frequência for removida, os registros `scheduled` futuros devem ser excluídos
- **FR-06:** A página `/calendario` deve exibir uma visão mensal com grid de 7 colunas e navegação entre meses
- **FR-07:** O calendário deve respeitar o controle de acesso hierárquico existente (gestor vê subordinados, admin vê todos, employee vê apenas seus)
- **FR-08:** O calendário deve permitir filtrar por `OrganizationalUnit` (setor) e por tipo de evento (PDI/Feedback)
- **FR-09:** Ao abrir um registro `scheduled` para edição, o status deve mudar para `draft` no primeiro save
- **FR-10:** Listagens existentes de PDI e Feedback devem incluir registros `scheduled` para gestores/admins
- **FR-11:** Colaboradores NÃO devem ver registros com status `scheduled` ou `draft` de Feedback
- **FR-12:** Job cron semanal deve manter o horizonte de 12 meses de eventos `scheduled` para todos os schedules ativos
- **FR-13:** Ao completar um ciclo (PDI completed ou Feedback submitted), o sistema deve verificar e gerar o próximo slot `scheduled` se necessário
- **FR-14:** Gestor pode reagendar (alterar `scheduledAt`) ou cancelar eventos `scheduled`/`draft`
- **FR-15:** Dashboard deve exibir seção "Próximos Eventos" com os próximos 7 PDIs/Feedbacks agendados

## Non-Goals (Out of Scope)

- **Integração com calendários externos** (Google Calendar, Outlook) — apenas calendário interno
- **Drag-and-drop** para reagendar eventos no calendário (usar formulário)
- **Recorrência customizada** (ex: "toda segunda terça-feira") — apenas frequência em meses
- **Visão semanal ou diária** do calendário — apenas visão mensal (com fallback para lista em mobile)
- **Convites de reunião** por e-mail com arquivo .ics
- **Agendamento de horário** (hora específica do dia) — apenas data
- **Criação de novos tipos de evento** além de PDI e Feedback
- **Refatoração dos formulários existentes** de PDI e Feedback — apenas adaptar para aceitar o status `scheduled`

## Design Considerations

- **Calendário:** Construir com CSS Grid nativo (7 colunas). Não usar biblioteca de calendário pesada. Referência visual: Google Calendar em visão mensal
- **Badges de evento:** Usar o componente `Badge` existente do shadcn/ui com variantes de cor:
  - Cinza: `scheduled` (agendado, pendente de preparação)
  - Amarelo: `draft` (em preparação)
  - Azul: `active` (PDI em andamento)
  - Verde: `submitted`/`completed` (concluído)
- **Responsividade:** Em telas < 768px, o calendário mensal muda para uma lista cronológica (tipo agenda) mostrando eventos dia a dia
- **Filtros:** Usar os componentes de `Select` do shadcn/ui para os dropdowns de setor e tipo
- **Navegação entre meses:** Botões com ícones `ChevronLeft`/`ChevronRight` do lucide-react e label "Março 2026" centralizado
- **Popover de dia:** Ao clicar em um dia com muitos eventos, usar `Popover` do shadcn/ui para listar todos

## Technical Considerations

- **Migration:** A adição de `scheduled` ao enum `PDIStatus` e do campo `scheduledAt` ao PDI requer uma migration Prisma. Usar `ALTER TYPE` para enums existentes no PostgreSQL
- **Geração de eventos:** A função `generateScheduledEvents(employeeId, type, frequencyMonths)` deve:
  1. Buscar o gestor atual via `EmployeeHierarchy` (onde `endDate` é null)
  2. Calcular datas: hoje + frequência, hoje + 2×frequência, ... até cobrir 12 meses
  3. Criar registros em batch com `createMany`
  4. Não duplicar: antes de criar, remover `scheduled` futuros existentes do mesmo tipo/colaborador
- **Performance do calendário:** A query do calendário filtra por `scheduledAt` BETWEEN início e fim do mês. Garantir índice em `scheduledAt` tanto em PDI quanto em Feedback
- **Controle de acesso:** Reutilizar `getAccessibleEmployeeIds()` e filtros existentes para o calendário
- **Índices adicionais necessários:**
  - `PDI.scheduledAt` — para queries do calendário
  - `Feedback.scheduledAt` — já existe, verificar índice
- **Server Actions:** Nova action `getCalendarEvents(month, year, filters)` retornando array de eventos normalizados para o componente de calendário
- **Compatibilidade:** PDIs existentes (sem `scheduledAt`) continuam funcionando normalmente; `scheduledAt` é nullable

## Success Metrics

- Gestor consegue visualizar toda a agenda do mês em menos de 3 segundos
- 100% dos eventos gerados automaticamente aparecem no calendário na data correta
- Gestor consegue pré-preencher um evento agendado em menos de 2 cliques a partir do calendário
- Filtro por setor reduz a visualização apenas aos colaboradores daquele setor
- Zero registros `scheduled` visíveis para colaboradores nas listagens
- Ao configurar frequência trimestral, 4 eventos são gerados automaticamente para os próximos 12 meses

## Open Questions

- Quando o gestor de um colaborador muda, os eventos `scheduled` futuros devem ser re-atribuídos ao novo gestor automaticamente?
- Deve haver um limite máximo de horizonte de geração (12 meses sugerido) ou o admin deve poder configurar?
- Ao reagendar um evento, deve-se manter um histórico de datas anteriores ou apenas atualizar a data?
- O colaborador deve poder ver no calendário os eventos `scheduled` (sem conteúdo, apenas a data) ou nem isso?
