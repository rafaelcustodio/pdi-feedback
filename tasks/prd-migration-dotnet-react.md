# PRD: Migração de Stack — Next.js → .NET 8 + React (Vite)

## Introduction

Este documento descreve o processo de reescrita completa do sistema pdi-feedback, substituindo a stack atual (Next.js 16 App Router + Prisma + NextAuth) por uma arquitetura desacoplada: **ASP.NET Core Web API (.NET 8)** no backend e **React SPA (Vite)** no frontend, mantendo PostgreSQL e feature parity total.

O banco de dados será resetado — não há migração de dados. O foco é entregar o mesmo produto com a nova stack, adequada ao ambiente corporativo .NET da organização.

---

## Goals

- Reescrever o backend como ASP.NET Core Web API com controllers, EF Core e ASP.NET Core Identity
- Reescrever o frontend como React SPA com Vite, mantendo Tailwind CSS
- Manter feature parity total: todas as telas, funcionalidades e regras de acesso
- Manter Azure AD SSO + login por email/senha
- Manter impersonação de admin, controle de acesso por hierarquia e Nine Box
- Garantir que testes de acesso e integração cubram o mesmo nível do projeto atual

---

## Estrutura de Projeto Recomendada

```
/backend                          # Solução .NET 8
  /src
    /PdiFeedback.Api              # Controllers, Middleware, Program.cs, DI
    /PdiFeedback.Application      # Services, DTOs, Interfaces, Validators
    /PdiFeedback.Domain           # Entities, Enums, Value Objects
    /PdiFeedback.Infrastructure   # EF Core DbContext, Repos, Email, Identity
  /tests
    /PdiFeedback.UnitTests
    /PdiFeedback.IntegrationTests

/frontend                         # Vite + React + TypeScript
  /src
    /api                          # Axios/fetch wrappers por domínio
    /components                   # Componentes reutilizáveis
    /pages                        # Uma pasta por rota
    /hooks                        # React Query hooks por domínio
    /lib                          # Auth helpers, formatadores, constantes
```

---

## Mapeamento de Stack

| Atual (Next.js) | Novo (.NET + React) |
|---|---|
| Next.js App Router | ASP.NET Core Web API |
| Prisma ORM | Entity Framework Core 8 |
| NextAuth v5 | ASP.NET Core Identity + MSAL (Azure AD) |
| Server Actions | API Controllers (REST) |
| `src/lib/access-control.ts` | `AccessControlService` (C#) |
| `src/lib/impersonation.ts` | `ImpersonationService` + cookie HTTP-only |
| Vitest | xUnit + Moq (backend) / Vitest (frontend) |
| Tailwind CSS 4 | Tailwind CSS 4 (mantém) |
| Nodemailer | MailKit ou SmtpClient (.NET) |
| Cron route | `IHostedService` (BackgroundService) |

---

## User Stories

### FASE 1 — Infraestrutura e Setup

---

### US-001: Setup da solução .NET 8 com estrutura de camadas
**Description:** As a developer, I want a .NET 8 solution with clean layer separation so that the codebase is maintainable and testable from day one.

**Acceptance Criteria:**
- [ ] Solução criada com 4 projetos: `Api`, `Application`, `Domain`, `Infrastructure`
- [ ] `Api` referencia `Application`; `Application` referencia `Domain`; `Infrastructure` referencia `Application` e `Domain`
- [ ] `Program.cs` configurado com CORS permitindo o frontend Vite (localhost:5173)
- [ ] `appsettings.json` + `appsettings.Development.json` com seções: `ConnectionStrings`, `Jwt`, `AzureAd`, `Smtp`
- [ ] `.env` equivalente documentado em `README.md`
- [ ] `dotnet build` passa sem erros

---

### US-002: Setup do frontend Vite + React + TypeScript
**Description:** As a developer, I want a Vite React project configured with Tailwind and an Axios client pointing to the .NET API so that frontend development can start immediately.

**Acceptance Criteria:**
- [ ] Projeto criado com `npm create vite@latest frontend -- --template react-ts`
- [ ] Tailwind CSS 4 instalado e configurado
- [ ] Axios instalado com instância base apontando para `VITE_API_URL`
- [ ] React Query (`@tanstack/react-query`) instalado e `QueryClientProvider` configurado no `main.tsx`
- [ ] React Router v6 instalado com estrutura de rotas definida (mesmo conjunto de rotas do projeto atual)
- [ ] `npm run dev` sobe em `localhost:5173` sem erros
- [ ] Verificar no browser: página inicial renderiza sem erros de console

---

### US-003: Mapeamento do schema — EF Core + PostgreSQL
**Description:** As a developer, I want all domain entities mapped in EF Core so that the database schema is equivalent to the current Prisma schema.

**Acceptance Criteria:**
- [ ] Entidades mapeadas no `Domain`: `User`, `OrganizationalUnit`, `EmployeeHierarchy`, `PDI`, `PDIGoal`, `PDIEvidence`, `PDIComment`, `Feedback`, `FeedbackSchedule`, `NineBoxEvaluation`, `NineBoxResponse`, `Notification`
- [ ] `UserRole` enum: `Admin`, `Manager`, `Employee`
- [ ] `DbContext` configurado em `Infrastructure` com `Npgsql.EntityFrameworkCore.PostgreSQL`
- [ ] Migration inicial gerada e aplicável com `dotnet ef database update`
- [ ] Seed de dados de demo equivalente ao `prisma:seed` atual (mesmos usuários e hierarquia)
- [ ] `dotnet build` e migration passam sem erros

---

### US-004: Autenticação — Login por email/senha (Identity)
**Description:** As a user, I want to log in with email and password so that I can access the system without SSO.

**Acceptance Criteria:**
- [ ] `POST /api/auth/login` recebe `{ email, password }` e retorna JWT + refresh token
- [ ] JWT contém claims: `sub` (userId), `email`, `role`, `name`
- [ ] Senha validada com `PasswordHasher<User>` do ASP.NET Core Identity (sem usar o IdentityDbContext completo — apenas os utilitários de hash)
- [ ] Retorna 401 com mensagem genérica em caso de credenciais inválidas
- [ ] Token expira em 8h; refresh token em 7 dias
- [ ] `POST /api/auth/refresh` renova o JWT com refresh token válido
- [ ] `POST /api/auth/logout` invalida o refresh token
- [ ] Tela de login no React consome este endpoint
- [ ] Verificar no browser: login funciona e redireciona para dashboard

---

### US-005: Autenticação — Azure AD SSO (MSAL)
**Description:** As a corporate user, I want to log in with my Microsoft account so that I don't need a separate password.

**Acceptance Criteria:**
- [ ] `GET /api/auth/azure` inicia o fluxo OAuth com Azure AD (redirect)
- [ ] `GET /api/auth/azure/callback` valida o token, cria user se não existir, vincula a credentials user existente pelo email
- [ ] Retorna JWT da aplicação (mesmo formato do US-004)
- [ ] Configurável via `appsettings`: `AzureAd:ClientId`, `TenantId`, `ClientSecret` — desabilitado graciosamente se vazio
- [ ] Frontend exibe botão "Entrar com Microsoft" somente se SSO estiver habilitado (`GET /api/auth/config` retorna `{ ssoEnabled: bool }`)
- [ ] Verificar no browser: fluxo SSO completo funciona

---

### US-006: Middleware de autorização + controle de acesso por hierarquia
**Description:** As a developer, I want an `AccessControlService` that replicates the current `access-control.ts` logic so that all endpoints enforce the same role-based rules.

**Acceptance Criteria:**
- [ ] `AccessControlService` com métodos: `GetAccessibleEmployeeIds(userId)`, `CanAccessEmployee(requesterId, targetId)`, `GetPDIAccessFilter(userId)`, `GetFeedbackAccessFilter(userId)`
- [ ] Regras: admin vê tudo; manager vê self + subordinados diretos/indiretos (via `EmployeeHierarchy`); employee vê só self
- [ ] `[Authorize]` aplicado em todos os controllers; `AccessControlService` injetado nos controllers que precisam filtrar dados
- [ ] Testes unitários cobrindo as mesmas combinações dos testes atuais (`access-control.test.ts`)
- [ ] `dotnet test` passa

---

### US-007: Impersonação de admin
**Description:** As an admin, I want to impersonate any user to see the application from their perspective so that I can debug access issues.

**Acceptance Criteria:**
- [ ] `POST /api/impersonate` recebe `{ userId }`, valida que o caller é admin, salva userId em cookie HTTP-only `__impersonate`
- [ ] `DELETE /api/impersonate` remove o cookie
- [ ] `GET /api/impersonate/users` retorna lista de usuários disponíveis (apenas para admins)
- [ ] `ImpersonationService.GetEffectiveUserId(HttpContext)` retorna o userId do cookie se presente, senão o userId do JWT — todos os services chamam este método
- [ ] Banner amarelo no frontend quando impersonação está ativa, com botão "Sair da visualização"
- [ ] Testes unitários para `ImpersonationService`
- [ ] Verificar no browser: admin pode impersonar, ver dados do usuário e sair

---

### FASE 2 — Features Core

---

### US-008: CRUD de Colaboradores
**Description:** As an admin/manager, I want to manage employees so that the organizational structure is maintained.

**Acceptance Criteria:**
- [ ] `GET /api/colaboradores` — lista filtrada por `AccessControlService`
- [ ] `GET /api/colaboradores/{id}` — retorna detalhes; valida acesso
- [ ] `POST /api/colaboradores` — cria usuário (admin only)
- [ ] `PUT /api/colaboradores/{id}` — edita (admin only)
- [ ] `DELETE /api/colaboradores/{id}` — desativa (admin only)
- [ ] `GET /api/colaboradores/{id}/hierarquia` — retorna manager + subordinados diretos
- [ ] Frontend: tela de listagem, modal de criação/edição, equivalente ao atual
- [ ] Verificar no browser: CRUD funciona para admin e manager vê apenas seus subordinados

---

### US-009: PDIs — CRUD + Goals + Evidence + Comments
**Description:** As a manager/employee, I want to create and manage PDIs with goals, evidence, and comments so that development plans are tracked.

**Acceptance Criteria:**
- [ ] `GET /api/pdis`, `POST`, `PUT /api/pdis/{id}`, `DELETE /api/pdis/{id}` — com filtro de acesso
- [ ] `POST /api/pdis/{id}/goals`, `PUT /api/pdis/{id}/goals/{goalId}`, `DELETE` — CRUD de objetivos
- [ ] `POST /api/pdis/{id}/goals/{goalId}/evidences` — upload/link de evidência
- [ ] `POST /api/pdis/{id}/comments`, `DELETE /api/pdis/{id}/comments/{commentId}` — comentários
- [ ] Frontend: todas as telas equivalentes às atuais (listagem, detalhe, tracking, read-only)
- [ ] Datas retornadas como `YYYY-MM-DD` (sem timezone shift) para campos de data pura
- [ ] Verificar no browser: fluxo completo de PDI funciona

---

### US-010: Feedbacks + Agendamentos
**Description:** As a manager, I want to schedule and record feedback sessions so that employee development is documented.

**Acceptance Criteria:**
- [ ] `GET /api/feedbacks`, `POST`, `PUT /api/feedbacks/{id}`, `DELETE` — com filtro de acesso
- [ ] `POST /api/feedbacks/{id}/schedule` — cria/atualiza agendamento (`FeedbackSchedule`)
- [ ] `PUT /api/feedbacks/{id}/schedule/conduct` — marca como realizado
- [ ] Frontend: todas as telas equivalentes (listagem, formulário, read-only, seção de programação)
- [ ] Verificar no browser: fluxo completo de feedback funciona

---

### US-011: Nine Box
**Description:** As a manager, I want to trigger Nine Box evaluations from a Feedback and see results so that employee performance is mapped.

**Acceptance Criteria:**
- [ ] `POST /api/feedbacks/{id}/ninebox` — dispara avaliação Nine Box, envia notificações e e-mail aos avaliadores
- [ ] `GET /api/ninebox/{evaluationId}` — detalhe da avaliação (manager/admin)
- [ ] `POST /api/ninebox/{evaluationId}/respond` — avaliador submete resposta (`NineBoxResponse`)
- [ ] `GET /api/ninebox/{evaluationId}/result` — resultado agregado (manager + colaborador avaliado, read-only)
- [ ] `GET /api/dashboard/ninebox` — avaliações Nine Box do usuário logado (para o dashboard)
- [ ] Frontend: formulário de avaliação, dashboard do gestor, view read-only do colaborador
- [ ] Verificar no browser: fluxo completo funciona

---

### US-012: Notificações
**Description:** As a user, I want to receive and manage internal notifications so that I'm aware of actions that require my attention.

**Acceptance Criteria:**
- [ ] `GET /api/notificacoes` — lista notificações do usuário autenticado (efetivo, respeita impersonação)
- [ ] `PUT /api/notificacoes/{id}/read` — marca como lida
- [ ] `PUT /api/notificacoes/read-all` — marca todas como lidas
- [ ] Contagem de não lidas disponível em `GET /api/notificacoes/count`
- [ ] Frontend: sino com badge, painel de notificações, tela `/notificacoes`
- [ ] Verificar no browser: notificações aparecem e são marcadas como lidas

---

### US-013: Dashboard
**Description:** As any user, I want a dashboard that shows relevant KPIs and shortcuts based on my role so that I have an overview at a glance.

**Acceptance Criteria:**
- [ ] `GET /api/dashboard` — retorna dados agregados filtrados por papel do usuário (PDIs ativos, feedbacks pendentes, avaliações Nine Box pendentes)
- [ ] Frontend: cards de KPI, atalhos para ações rápidas, seção Nine Box — equivalente ao atual
- [ ] Verificar no browser: dashboard renderiza corretamente para admin, manager e employee

---

### FASE 3 — Features Secundárias

---

### US-014: Calendário e Programação
**Description:** As a manager, I want a calendar view of scheduled feedback sessions and events so that I can plan my agenda.

**Acceptance Criteria:**
- [ ] `GET /api/programacao` — retorna agendamentos e eventos do período filtrado por acesso
- [ ] `GET /api/calendario` — retorna eventos em formato compatível com o componente de calendário atual
- [ ] Frontend: telas `/programacao` e `/calendario` equivalentes às atuais
- [ ] Verificar no browser: calendário exibe eventos corretamente

---

### US-015: E-mail e lembretes automáticos
**Description:** As the system, I want to send scheduled email reminders so that users don't miss deadlines.

**Acceptance Criteria:**
- [ ] `BackgroundService` implementado que dispara na frequência configurada (padrão: diário)
- [ ] Envia lembretes para feedbacks e PDIs com datas próximas (mesma lógica do cron atual)
- [ ] Usa MailKit para envio SMTP; faz log no console se SMTP não configurado
- [ ] Templates de e-mail equivalentes aos atuais (`email-templates.ts` → classes C# ou Razor templates)
- [ ] Protegido por `CRON_SECRET` equivalente (via header ou configuração)

---

### US-016: Configurações e Perfil
**Description:** As a user, I want to manage my profile and application settings so that my preferences are persisted.

**Acceptance Criteria:**
- [ ] `GET /api/perfil`, `PUT /api/perfil` — dados do usuário logado
- [ ] `PUT /api/perfil/password` — troca de senha (apenas para usuários credentials)
- [ ] `GET /api/configuracoes`, `PUT /api/configuracoes` — configurações da aplicação (admin only)
- [ ] Frontend: telas `/perfil` e `/configuracoes` equivalentes
- [ ] Verificar no browser: perfil salva e exibe dados corretamente

---

### US-017: Testes de integração — Controle de Acesso (backend)
**Description:** As a developer, I want integration tests for all access-controlled endpoints so that regressions in permissions are caught automatically.

**Acceptance Criteria:**
- [ ] Projeto `PdiFeedback.IntegrationTests` com `WebApplicationFactory<Program>`
- [ ] Banco de dados de teste isolado (SQLite in-memory ou PostgreSQL de teste)
- [ ] Fixtures equivalentes ao `src/lib/__tests__/fixtures.ts` atual (mesma hierarquia: admin-1, mgr-a, mgr-b, emp-a1, emp-a2, emp-b1)
- [ ] Testes cobrindo: admin vê tudo; manager vê só seus subordinados; employee vê só self; impersonação funciona corretamente
- [ ] `dotnet test` passa com todos os testes

---

## Functional Requirements

- FR-1: Todos os endpoints protegidos exigem JWT válido (`[Authorize]`)
- FR-2: Todos os endpoints de dados filtram pelo `AccessControlService` antes de retornar dados
- FR-3: `ImpersonationService.GetEffectiveUserId()` deve ser chamado em vez de ler `User.Identity` diretamente em controllers e services
- FR-4: Datas puras (dueDate, scheduledAt, conductedAt, startDate) devem ser retornadas como `YYYY-MM-DD` pela API para evitar timezone shift no frontend
- FR-5: Azure AD SSO é opcional — sistema funciona completamente sem as env vars do Azure
- FR-6: CORS configurado para permitir apenas a origem do frontend
- FR-7: Respostas de erro seguem formato padronizado: `{ error: string, details?: string }`
- FR-8: Paginação em todos os endpoints de listagem (`?page=1&pageSize=20`)

---

## Non-Goals

- Não migrar dados do banco atual — banco será resetado do zero
- Não implementar features novas além das existentes no projeto atual
- Não usar Blazor ou SSR no frontend — SPA puro com Vite
- Não usar o IdentityDbContext completo do ASP.NET Core Identity — apenas os utilitários de hash de senha
- Não implementar WebSockets ou notificações em tempo real (manter polling ou refresh manual como hoje)
- Não implementar CI/CD neste PRD

---

## Technical Considerations

- **Autenticação JWT:** usar `Microsoft.AspNetCore.Authentication.JwtBearer`; configurar `JwtSecurityTokenHandler` com claims customizados
- **Azure AD:** usar `Microsoft.Identity.Web` para o fluxo OAuth; manter compatível com o fluxo atual do NextAuth
- **EF Core migrations:** usar `dotnet ef migrations add` e `dotnet ef database update`; nunca editar migrations manualmente
- **Timezone:** datas puras devem ser armazenadas como `DateOnly` no .NET e serializadas como `YYYY-MM-DD` (sem componente de hora), evitando o bug de UTC-3 já documentado
- **React Query:** usar para todas as chamadas de API — simplifica cache, loading states e refetch
- **Tailwind CSS 4:** manter mesma configuração do projeto atual para facilitar port do CSS
- **IIS / Static Files:** prefixar todas as rotas de API com `/api/`; configurar `app.MapFallbackToFile("index.html")` para o React Router funcionar; `UseStaticFiles()` antes do `UseRouting()`
- **Publicação:** `dotnet publish -c Release` gera `web.config` automaticamente; ASP.NET Core Hosting Bundle deve estar instalado no servidor
- **Ordem de implementação sugerida:** Fase 1 completa → US-008 (Colaboradores) → US-009 (PDIs) → US-010 (Feedbacks) → US-011 (Nine Box) → US-012 (Notificações) → US-013 (Dashboard) → Fase 3 → US-018 (Publicação IIS)

---

## Success Metrics

- Feature parity verificada: todas as rotas do projeto atual têm equivalente funcional
- `dotnet test` passa com cobertura de controle de acesso equivalente ao projeto atual (64+ testes)
- Nenhuma regressão de timezone em campos de data
- Admin impersonation funciona em todos os endpoints
- Login por email/senha e Azure AD SSO funcionam de ponta a ponta

---

## Decisões de Deploy (Resolvidas)

- **Frontend:** Build do Vite (`dist/`) copiado para `wwwroot/` da API; .NET serve os arquivos estáticos. Um único processo, uma única publicação.
- **MFA:** Não implementar.
- **Background Service:** `BackgroundService` de e-mails roda dentro da mesma API (não worker service separado).
- **Ambiente:** IIS no Windows Server.

### Implicações técnicas do deploy IIS

- Adicionar `web.config` com handler `aspNetCore` e `processPath dotnet`; configurar `stdoutLogEnabled` para diagnóstico
- Instalar o **ASP.NET Core Hosting Bundle** no servidor IIS
- `Program.cs` deve chamar `builder.WebHost.UseIIS()` (ou `UseIISIntegration()`)
- Build do frontend integrado ao pipeline de publicação: `npm run build` → copia `dist/` para `wwwroot/` antes do `dotnet publish`
- Configurar fallback de rota no .NET para servir `index.html` em qualquer rota não-API (necessário para o React Router funcionar no IIS):
  ```csharp
  app.MapFallbackToFile("index.html");
  ```
- Variáveis de ambiente configuradas via IIS Application Pool ou `web.config` `<environmentVariables>`
- Adicionar `US-018` (ver abaixo) para cobrir o setup de publicação

---

### US-018: Pipeline de build e publicação IIS
**Description:** As a developer, I want a single publish command that builds the frontend, copies it to wwwroot, and produces a self-contained .NET package so that deployment to IIS is simple and repeatable.

**Acceptance Criteria:**
- [ ] Script `publish.sh` (ou target MSBuild) que executa: `npm run build` no `/frontend` → copia `dist/` para `Api/wwwroot/` → executa `dotnet publish -c Release`
- [ ] `web.config` gerado automaticamente pelo `dotnet publish` com handler `aspNetCore` correto
- [ ] `app.UseStaticFiles()` e `app.MapFallbackToFile("index.html")` configurados em `Program.cs`
- [ ] Rotas de API prefixadas com `/api/` para não colidir com as rotas do React Router
- [ ] Deploy manual testado: copiar pasta de publicação para `wwwroot` do IIS → aplicação sobe sem erros
- [ ] `README.md` documentando os passos de publicação e requisitos do servidor (Hosting Bundle, versão do .NET)
