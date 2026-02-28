# PRD: Sistema Corporativo de PDI e Feedback

## Introduction

Aplicação corporativa de Recursos Humanos focada no controle e acompanhamento de Planos de Desenvolvimento Individual (PDI) e Feedbacks de colaboradores. O sistema resolve o problema da falta de visibilidade e controle sobre o desenvolvimento dos colaboradores, garantindo que gestores realizem PDIs e feedbacks dentro dos prazos configurados, com respeito à hierarquia organizacional.

**Stack tecnológica:**
- **Frontend:** Next.js (App Router) + shadcn/ui + Tailwind CSS
- **Backend:** Next.js API Routes / Server Actions
- **Banco de dados:** PostgreSQL
- **ORM:** Prisma
- **Autenticação:** NextAuth.js (credenciais locais + Microsoft SSO via Azure AD)

## Goals

- Permitir autenticação de usuários via credenciais locais e SSO Microsoft (Azure AD)
- Modelar a estrutura organizacional hierárquica da empresa (árvore de gestores/colaboradores)
- Garantir que gestores só visualizem PDIs e feedbacks de colaboradores da sua árvore hierárquica
- Permitir que gestores criem e acompanhem feedbacks top-down dos seus colaboradores
- Permitir a criação e acompanhamento de PDIs com competências, evidências e comentários
- Configurar a frequência de PDI e feedback por colaborador
- Notificar gestores (no sistema e por e-mail) sobre PDIs e feedbacks pendentes no mês

## User Stories

### US-001: Modelagem do banco de dados
**Description:** Como desenvolvedor, preciso criar o schema do banco de dados PostgreSQL para suportar todas as entidades do sistema (usuários, estrutura organizacional, PDIs, feedbacks, agendamentos e notificações).

**Acceptance Criteria:**
- [ ] Schema Prisma criado com as tabelas: `User`, `OrganizationalUnit`, `EmployeeHierarchy`, `PDI`, `PDIGoal`, `PDIEvidence`, `PDIComment`, `Feedback`, `FeedbackSchedule`, `PDISchedule`, `Notification`
- [ ] Tabela `User` contém: id, name, email, password (hash), role (admin/manager/employee), avatarUrl, ssoProvider, ssoId, createdAt, updatedAt
- [ ] Tabela `OrganizationalUnit` contém: id, name, parentId (self-reference), createdAt
- [ ] Tabela `EmployeeHierarchy` contém: id, employeeId (FK User), managerId (FK User), organizationalUnitId (FK), startDate, endDate
- [ ] Tabela `PDI` contém: id, employeeId (FK), managerId (FK), status (draft/active/completed/cancelled), period, frequencyMonths, createdAt, updatedAt
- [ ] Tabela `PDIGoal` contém: id, pdiId (FK), title, description, competency, status (pending/in_progress/completed), dueDate, createdAt
- [ ] Tabela `PDIEvidence` contém: id, goalId (FK), description, fileUrl, createdAt
- [ ] Tabela `PDIComment` contém: id, pdiId (FK), authorId (FK User), content, createdAt
- [ ] Tabela `Feedback` contém: id, employeeId (FK), managerId (FK), period, content, strengths, improvements, rating, status (draft/submitted), frequencyMonths, createdAt, updatedAt
- [ ] Tabela `FeedbackSchedule` contém: id, employeeId (FK), managerId (FK), frequencyMonths, nextDueDate, isActive
- [ ] Tabela `PDISchedule` contém: id, employeeId (FK), managerId (FK), frequencyMonths, nextDueDate, isActive
- [ ] Tabela `Notification` contém: id, userId (FK), type (pdi_reminder/feedback_reminder/general), title, message, isRead, emailSent, createdAt
- [ ] Migration gerada e executada com sucesso
- [ ] Seed com dados de exemplo (empresa fictícia com 3 níveis hierárquicos)
- [ ] Typecheck passa

### US-002: Configuração de autenticação local (credenciais)
**Description:** Como administrador do sistema, quero que usuários possam fazer login com e-mail e senha para acessar o sistema sem depender de SSO.

**Acceptance Criteria:**
- [ ] Página de login com campos e-mail e senha
- [ ] Senhas armazenadas com hash bcrypt
- [ ] Sessão gerenciada via NextAuth.js com JWT
- [ ] Página de "esqueci minha senha" com envio de token por e-mail
- [ ] Redirecionamento para dashboard após login bem-sucedido
- [ ] Mensagem de erro clara para credenciais inválidas
- [ ] Typecheck passa
- [ ] Verify in browser using dev-browser skill

### US-003: Configuração de autenticação via SSO Microsoft
**Description:** Como colaborador da empresa, quero fazer login usando minha conta corporativa Microsoft para não precisar gerenciar outra senha.

**Acceptance Criteria:**
- [ ] Botão "Entrar com Microsoft" na página de login
- [ ] Integração com Azure AD via NextAuth.js provider (Microsoft)
- [ ] Na primeira autenticação SSO, o sistema cria o usuário automaticamente se o e-mail não existir
- [ ] Se o e-mail já existir, vincula a conta SSO ao usuário existente
- [ ] Sessão JWT contém id, name, email e role do usuário
- [ ] Typecheck passa
- [ ] Verify in browser using dev-browser skill

### US-004: CRUD de estrutura organizacional
**Description:** Como administrador, quero cadastrar e editar a estrutura organizacional (departamentos, áreas, equipes) em formato de árvore para que o sistema reflita a hierarquia da empresa.

**Acceptance Criteria:**
- [ ] Página admin para gerenciar unidades organizacionais
- [ ] Formulário para criar unidade com nome e unidade-pai (dropdown)
- [ ] Visualização da estrutura em formato de árvore (tree view)
- [ ] Edição inline do nome da unidade
- [ ] Exclusão de unidade (somente se não tiver filhos ou colaboradores vinculados)
- [ ] Typecheck passa
- [ ] Verify in browser using dev-browser skill

### US-005: Gestão de colaboradores e vínculos hierárquicos
**Description:** Como administrador, quero cadastrar colaboradores e definir seus gestores e unidades organizacionais para que o sistema saiba quem gerencia quem.

**Acceptance Criteria:**
- [ ] Página admin com lista de colaboradores (tabela com busca e paginação)
- [ ] Formulário para criar/editar colaborador: nome, e-mail, role (admin/manager/employee), unidade organizacional, gestor direto
- [ ] Dropdown de gestor filtrado por unidade organizacional
- [ ] Visualização da árvore hierárquica de um colaborador específico
- [ ] Desativação de colaborador (soft delete) sem perder histórico
- [ ] Typecheck passa
- [ ] Verify in browser using dev-browser skill

### US-006: Controle de acesso por hierarquia
**Description:** Como gestor, quero visualizar apenas os PDIs e feedbacks dos colaboradores da minha árvore hierárquica para garantir a privacidade dos dados.

**Acceptance Criteria:**
- [ ] Função utilitária `getSubordinates(managerId)` que retorna todos os colaboradores diretos e indiretos (recursivo)
- [ ] Middleware/hook que filtra consultas de PDI e Feedback pelo resultado de `getSubordinates`
- [ ] Gestor nível 1 vê colaboradores dos gestores nível 2 abaixo dele
- [ ] Colaborador comum vê apenas seus próprios PDIs e feedbacks
- [ ] Admin vê todos os PDIs e feedbacks de toda a empresa
- [ ] Teste unitário para a função `getSubordinates` com árvore de 3 níveis
- [ ] Typecheck passa

### US-007: Dashboard principal
**Description:** Como gestor, quero ver um painel com resumo das pendências de PDI e feedback dos meus colaboradores para saber o que precisa de atenção.

**Acceptance Criteria:**
- [ ] Card com total de colaboradores diretos e indiretos
- [ ] Card com PDIs pendentes/atrasados no mês atual
- [ ] Card com feedbacks pendentes/atrasados no mês atual
- [ ] Lista resumida dos próximos 5 PDIs/feedbacks a vencer
- [ ] Link direto para o PDI ou feedback pendente ao clicar no item
- [ ] Layout responsivo (desktop e tablet)
- [ ] Typecheck passa
- [ ] Verify in browser using dev-browser skill

### US-008: Criar e editar feedback (top-down)
**Description:** Como gestor, quero criar um feedback para meu colaborador, preenchendo pontos fortes, pontos de melhoria e avaliação geral, para documentar o desempenho.

**Acceptance Criteria:**
- [ ] Página de criação de feedback com campos: colaborador (dropdown dos subordinados), período, pontos fortes (textarea), pontos de melhoria (textarea), conteúdo geral (textarea), rating (1-5 estrelas)
- [ ] Feedback criado com status "rascunho" por padrão
- [ ] Botão "Salvar rascunho" e "Submeter feedback"
- [ ] Após submissão, feedback fica visível para o colaborador (somente leitura)
- [ ] Edição permitida apenas enquanto status for "rascunho"
- [ ] Validação: todos os campos obrigatórios preenchidos antes de submeter
- [ ] Typecheck passa
- [ ] Verify in browser using dev-browser skill

### US-009: Visualizar histórico de feedbacks
**Description:** Como colaborador, quero ver o histórico de todos os feedbacks que recebi para acompanhar minha evolução ao longo do tempo.

**Acceptance Criteria:**
- [ ] Página "Meus Feedbacks" com lista de feedbacks recebidos (ordenados por data, mais recente primeiro)
- [ ] Cada item mostra: período, data de submissão, nome do gestor, rating
- [ ] Ao clicar, abre o feedback completo em modo somente leitura
- [ ] Filtro por período/ano
- [ ] Typecheck passa
- [ ] Verify in browser using dev-browser skill

### US-010: Criar e editar PDI
**Description:** Como gestor, quero criar um PDI para meu colaborador com metas vinculadas a competências específicas para direcionar seu desenvolvimento.

**Acceptance Criteria:**
- [ ] Página de criação de PDI com: colaborador (dropdown dos subordinados), período, status (draft/active)
- [ ] Seção para adicionar metas (goals): título, descrição, competência associada (dropdown), prazo, status (pending/in_progress/completed)
- [ ] Possibilidade de adicionar múltiplas metas ao mesmo PDI
- [ ] Botão para adicionar/remover metas dinamicamente
- [ ] PDI criado como "rascunho" por padrão, com botão "Ativar PDI"
- [ ] Typecheck passa
- [ ] Verify in browser using dev-browser skill

### US-011: Acompanhar PDI (evidências e comentários)
**Description:** Como colaborador, quero adicionar evidências de progresso e comentários às metas do meu PDI para demonstrar minha evolução.

**Acceptance Criteria:**
- [ ] Página de detalhe do PDI mostrando todas as metas e seus status
- [ ] Botão "Adicionar evidência" em cada meta: campo de descrição e upload de arquivo (opcional)
- [ ] Seção de comentários no PDI (tipo chat): gestor e colaborador podem comentar
- [ ] Colaborador pode alterar status da meta para "em andamento" ou "concluído"
- [ ] Gestor pode aprovar ou rejeitar a conclusão de uma meta
- [ ] Barra de progresso visual do PDI (% de metas concluídas)
- [ ] Typecheck passa
- [ ] Verify in browser using dev-browser skill

### US-012: Configurar frequência de PDI e feedback por colaborador
**Description:** Como gestor, quero definir a frequência com que PDIs e feedbacks devem ser realizados para cada colaborador, para que o sistema me lembre automaticamente.

**Acceptance Criteria:**
- [ ] Na página do colaborador, seção "Agendamento" com dois campos: frequência do PDI (em meses) e frequência do feedback (em meses)
- [ ] Opções de frequência: 1, 2, 3, 6 ou 12 meses
- [ ] Ao salvar, o sistema calcula a próxima data de vencimento (nextDueDate) baseada na data atual
- [ ] Exibir próxima data prevista para PDI e feedback na página do colaborador
- [ ] Após completar um PDI ou feedback, o sistema recalcula automaticamente a próxima data
- [ ] Typecheck passa
- [ ] Verify in browser using dev-browser skill

### US-013: Sistema de notificações internas
**Description:** Como gestor, quero receber notificações dentro do sistema quando houver PDIs ou feedbacks pendentes para não esquecer de realizá-los.

**Acceptance Criteria:**
- [ ] Ícone de sino (bell) no header com badge de contagem de notificações não lidas
- [ ] Dropdown ao clicar no sino mostrando últimas 10 notificações
- [ ] Página "Notificações" com lista completa e paginação
- [ ] Marcar como lida ao clicar na notificação
- [ ] Botão "Marcar todas como lidas"
- [ ] Notificação criada automaticamente quando faltam 7 dias para o vencimento de um PDI ou feedback
- [ ] Notificação criada automaticamente quando um PDI ou feedback está atrasado
- [ ] Typecheck passa
- [ ] Verify in browser using dev-browser skill

### US-014: Envio de lembretes por e-mail
**Description:** Como gestor, quero receber e-mails de lembrete sobre PDIs e feedbacks pendentes para ser notificado mesmo quando não estou logado no sistema.

**Acceptance Criteria:**
- [ ] Job agendado (cron) que roda diariamente verificando schedules com nextDueDate nos próximos 7 dias
- [ ] E-mail enviado ao gestor com lista de PDIs e feedbacks pendentes para o mês
- [ ] Template de e-mail HTML com: nome do colaborador, tipo (PDI ou Feedback), data de vencimento, link direto para o sistema
- [ ] E-mail enviado novamente se a atividade ficar atrasada (1 lembrete extra após vencimento)
- [ ] Campo `emailSent` na tabela Notification atualizado para evitar duplicatas
- [ ] Integração com serviço de e-mail (Resend, Nodemailer ou similar)
- [ ] Typecheck passa

### US-015: Layout base e navegação
**Description:** Como usuário do sistema, quero uma interface limpa e consistente com menu lateral e header para navegar facilmente entre as seções.

**Acceptance Criteria:**
- [ ] Layout com sidebar (menu lateral) colapsável e header fixo
- [ ] Sidebar com itens: Dashboard, Colaboradores, PDIs, Feedbacks, Notificações, Configurações (admin only)
- [ ] Header com: logo, nome do usuário logado, avatar, botão de sino (notificações), menu dropdown com "Meu Perfil" e "Sair"
- [ ] Itens do menu destacam a seção ativa
- [ ] Layout responsivo: sidebar vira hamburger menu em telas menores
- [ ] Tema claro com cores corporativas neutras (customizável via Tailwind)
- [ ] Typecheck passa
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- **FR-01:** O sistema deve permitir login via e-mail/senha e via SSO Microsoft (Azure AD) usando NextAuth.js
- **FR-02:** O sistema deve armazenar senhas com hash bcrypt e gerenciar sessões via JWT
- **FR-03:** O sistema deve modelar a estrutura organizacional como uma árvore hierárquica (unidades com auto-referência)
- **FR-04:** O sistema deve vincular cada colaborador a um gestor direto e a uma unidade organizacional
- **FR-05:** O sistema deve calcular a árvore completa de subordinados de um gestor (recursivo) para controle de acesso
- **FR-06:** Gestores só podem visualizar/criar PDIs e feedbacks para colaboradores da sua árvore hierárquica
- **FR-07:** Colaboradores comuns só podem visualizar seus próprios PDIs e feedbacks
- **FR-08:** Administradores têm acesso irrestrito a todos os dados
- **FR-09:** O sistema deve permitir a criação de feedbacks top-down com campos: pontos fortes, pontos de melhoria, conteúdo geral e rating (1-5)
- **FR-10:** Feedbacks devem ter dois status: rascunho (editável) e submetido (somente leitura)
- **FR-11:** O sistema deve permitir a criação de PDIs com múltiplas metas, cada uma vinculada a uma competência
- **FR-12:** Metas do PDI devem ter status: pendente, em andamento e concluída
- **FR-13:** Colaboradores devem poder adicionar evidências (texto e arquivo) às metas do PDI
- **FR-14:** Gestor e colaborador devem poder trocar comentários dentro de um PDI
- **FR-15:** O sistema deve permitir configurar a frequência (em meses) de PDI e feedback por colaborador
- **FR-16:** O sistema deve calcular automaticamente a próxima data de vencimento ao concluir um ciclo
- **FR-17:** O sistema deve gerar notificações internas 7 dias antes do vencimento e na data de atraso
- **FR-18:** O sistema deve enviar e-mails de lembrete diários para gestores com atividades pendentes nos próximos 7 dias
- **FR-19:** O sistema deve exibir um dashboard com resumo de pendências de PDI e feedback para o gestor
- **FR-20:** O sistema deve ter paginação e busca em todas as listagens de dados

## Non-Goals (Out of Scope)

- **Feedback 360** ou avaliação por pares (apenas top-down nesta versão)
- **Integração com Microsoft Teams** para notificações
- **Importação automática de colaboradores** via API do Azure AD/Microsoft Graph
- **Dashboards analíticos avançados** com gráficos e relatórios exportáveis
- **Aplicativo mobile** nativo (PWA ou app stores)
- **Gestão de competências organizacionais** (catálogo de competências da empresa)
- **Trilhas de aprendizado** ou integração com LMS
- **OKRs** vinculados aos PDIs
- **Workflow de aprovação** multi-nível para PDIs ou feedbacks
- **Avaliação de desempenho** com notas formais e calibração
- **Multi-idioma** (i18n) — a primeira versão será em português (pt-BR)
- **Multi-tenant** — a aplicação atenderá uma única empresa

## Design Considerations

- **UI Framework:** shadcn/ui + Tailwind CSS para componentes consistentes e profissionais
- **Tema:** Cores neutras corporativas (cinza, azul, branco). Customizar via `tailwind.config`
- **Tipografia:** Font Inter (padrão do shadcn/ui)
- **Componentes principais a usar do shadcn/ui:**
  - `DataTable` para listagens com ordenação, busca e paginação
  - `Sheet` ou `Dialog` para formulários modais
  - `Command` para busca rápida de colaboradores
  - `Breadcrumb` para navegação contextual
  - `Badge` para status (cores: verde=concluído, amarelo=em andamento, vermelho=atrasado, cinza=rascunho)
  - `Progress` para barra de progresso do PDI
  - `Calendar` para seleção de datas
  - `DropdownMenu` para ações em tabelas
- **Layout:** Sidebar fixa à esquerda (240px) + área de conteúdo principal
- **Responsividade:** Breakpoints em 768px (tablet) e 1024px (desktop)

## Technical Considerations

- **Next.js 14+ (App Router):** Usar Server Components por padrão, Client Components apenas quando necessário (interatividade)
- **Prisma ORM:** Schema centralizado, migrations versionadas, seed para desenvolvimento
- **NextAuth.js v5:** Provider de credenciais + provider Microsoft Azure AD
- **Consulta recursiva de hierarquia:** Usar CTE (Common Table Expression) no PostgreSQL via `$queryRaw` do Prisma para buscar subordinados recursivamente. Exemplo:
  ```sql
  WITH RECURSIVE subordinates AS (
    SELECT id, "managerId" FROM "EmployeeHierarchy" WHERE "managerId" = $1
    UNION ALL
    SELECT e.id, e."managerId" FROM "EmployeeHierarchy" e
    INNER JOIN subordinates s ON s.id = e."managerId"
  )
  SELECT * FROM subordinates;
  ```
- **E-mail:** Usar Resend (API simples) ou Nodemailer com SMTP corporativo
- **Cron job para lembretes:** Usar API Route com Vercel Cron ou node-cron em ambiente self-hosted
- **Upload de arquivos (evidências PDI):** Upload para storage local (`/public/uploads`) no MVP, com migração futura para S3/Azure Blob
- **Variáveis de ambiente necessárias:**
  - `DATABASE_URL` — conexão PostgreSQL
  - `NEXTAUTH_SECRET` — segredo JWT
  - `NEXTAUTH_URL` — URL base da aplicação
  - `AZURE_AD_CLIENT_ID` — Client ID do app registrado no Azure AD
  - `AZURE_AD_CLIENT_SECRET` — Client Secret do Azure AD
  - `AZURE_AD_TENANT_ID` — Tenant ID do Azure AD
  - `RESEND_API_KEY` ou `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` — configuração de e-mail
- **Estrutura de pastas sugerida:**
  ```
  src/
  ├── app/
  │   ├── (auth)/login/page.tsx
  │   ├── (dashboard)/
  │   │   ├── layout.tsx          # Layout com sidebar
  │   │   ├── page.tsx            # Dashboard principal
  │   │   ├── colaboradores/      # CRUD colaboradores
  │   │   ├── pdis/               # Listagem e detalhe PDI
  │   │   ├── feedbacks/          # Listagem e detalhe Feedback
  │   │   ├── notificacoes/       # Centro de notificações
  │   │   └── configuracoes/      # Admin: estrutura org, agendamentos
  │   └── api/
  │       ├── auth/[...nextauth]/ # NextAuth config
  │       ├── cron/reminders/     # Cron endpoint para lembretes
  │       └── ...                 # Demais API routes
  ├── components/
  │   ├── ui/                     # shadcn/ui components
  │   ├── layout/                 # Sidebar, Header, etc.
  │   └── features/               # Componentes de domínio
  ├── lib/
  │   ├── prisma.ts               # Prisma client singleton
  │   ├── auth.ts                 # NextAuth config
  │   ├── hierarchy.ts            # Funções de hierarquia
  │   ├── notifications.ts        # Lógica de notificações
  │   └── email.ts                # Serviço de envio de e-mail
  └── prisma/
      ├── schema.prisma
      ├── migrations/
      └── seed.ts
  ```

## Success Metrics

- Gestor consegue criar um feedback completo em menos de 5 minutos
- Gestor consegue criar um PDI com 3 metas em menos de 10 minutos
- 100% dos gestores recebem lembrete por e-mail antes do vencimento de PDI/feedback
- Controle de acesso hierárquico funciona corretamente (zero vazamento de dados entre árvores)
- Tempo de carregamento de qualquer página inferior a 2 segundos
- Sistema suporta pelo menos 500 colaboradores sem degradação de performance

## Open Questions

- Qual serviço de e-mail será utilizado? (Resend, SendGrid, SMTP corporativo?)
- Existe um catálogo fixo de competências ou o gestor pode digitar livremente?
- O upload de evidências terá limite de tamanho? (sugestão: 10MB por arquivo)
- O sistema será hospedado em Vercel, Azure ou infraestrutura própria?
- Será necessário um perfil de "RH" com acesso a relatórios sem ser admin completo?
- O colaborador pode adicionar metas ao seu próprio PDI ou somente o gestor?
