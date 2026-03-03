# PRD: Plano de Testes de Controle de Acesso e Segurança de Dados

## Introduction

Esta PRD define o plano completo de testes para garantir que nenhum dado seja exposto fora da hierarquia organizacional permitida. A aplicação é corporativa e opera com três roles (`admin`, `manager`, `employee`), onde o acesso a PDIs, Feedbacks, Notificações e dados de colaboradores é restrito pela posição do usuário na hierarquia do modelo `EmployeeHierarchy`.

O objetivo é criar uma suíte de testes que sirva como **rede de segurança permanente**: qualquer alteração futura nas server actions, API routes ou na lógica de controle de acesso que introduza vazamento de dados deve ser detectada automaticamente pelos testes antes de chegar a produção.

**Regra de projeto:** Todo novo server action, API route ou modificação de acesso a dados criada daqui para frente DEVE vir acompanhada de testes correspondentes neste formato.

---

## Goals

- Cobrir 100% dos caminhos de acesso nas funções de `access-control.ts`
- Garantir que server actions filtrem dados corretamente por role em todos os cenários
- Garantir que a API de impersonação seja acessível apenas por admins
- Garantir que `getEffectiveAuth()` produza a sessão correta ao impersonar
- Cobrir edge cases: manager sem subordinados, admin impersonando manager, hierarquias multi-nível
- Estabelecer fixtures reutilizáveis baseadas nos dados do seed existente
- Garantir que componentes React não renderizem dados/ações fora do escopo da role

---

## Fixtures de Mock (Base para Todos os Testes)

Todos os testes devem usar as seguintes fixtures estáticas definidas em `src/lib/__tests__/fixtures.ts`. Elas espelham a estrutura do `prisma/seed.ts`:

```
Hierarquia de teste:
  admin_user (role: admin)
  manager_a  (role: manager)  → subordinates: coord_a, emp_a1, emp_a2
    coord_a    (role: manager)  → subordinates: emp_a1, emp_a2
      emp_a1   (role: employee)
      emp_a2   (role: employee)
  manager_b  (role: manager)  → subordinates: emp_b1
      emp_b1   (role: employee)
```

Fixtures:
- `ADMIN` — `{ id: "admin-1", role: "admin", ... }`
- `MANAGER_A` — `{ id: "mgr-a", role: "manager", ... }`
- `COORD_A` — `{ id: "coord-a", role: "manager", ... }` (subordinate de MANAGER_A)
- `EMP_A1`, `EMP_A2` — employees sob COORD_A
- `MANAGER_B` — manager em ramo diferente
- `EMP_B1` — employee sob MANAGER_B (invisível para MANAGER_A)

Hierarquias de mock (formato `EmployeeHierarchy`):
```ts
[
  { employeeId: "mgr-a",   managerId: "admin-1",  endDate: null },
  { employeeId: "coord-a", managerId: "mgr-a",    endDate: null },
  { employeeId: "emp-a1",  managerId: "coord-a",  endDate: null },
  { employeeId: "emp-a2",  managerId: "coord-a",  endDate: null },
  { employeeId: "mgr-b",   managerId: "admin-1",  endDate: null },
  { employeeId: "emp-b1",  managerId: "mgr-b",    endDate: null },
]
```

---

## User Stories

---

### US-001: Fixtures e factories de mock reutilizáveis

**Description:** As a developer, I want static fixtures and helper factories so that all tests share consistent, readable mock data without duplication.

**Acceptance Criteria:**
- [ ] Criar `src/lib/__tests__/fixtures.ts` com os objetos `ADMIN`, `MANAGER_A`, `COORD_A`, `EMP_A1`, `EMP_A2`, `MANAGER_B`, `EMP_B1` e o array `MOCK_HIERARCHIES`
- [ ] Cada fixture tem todos os campos do tipo `User` do Prisma (pode usar valores placeholder para campos não-críticos)
- [ ] Exportar helper `mockSession(user)` que retorna um objeto de sessão no formato NextAuth compatível com `getEffectiveAuth()`
- [ ] Exportar helper `mockPDI(overrides?)` e `mockFeedback(overrides?)` para criar registros de PDI e Feedback com defaults sensatos
- [ ] O arquivo não importa Prisma nem faz chamadas de rede
- [ ] `npm run test` passa sem erros

---

### US-002: Testes unitários de `access-control.ts` — leitura por role

**Description:** As a developer, I want unit tests for `getAccessibleEmployeeIds` and `canAccessEmployee` so that I know the core access logic is correct for all role/hierarchy combinations.

**Acceptance Criteria:**
- [ ] Estender `src/lib/__tests__/access-control.test.ts` com bloco `describe("getAccessibleEmployeeIds")`
- [ ] `admin` retorna `"all"`
- [ ] `employee` retorna somente `[userId]`
- [ ] `manager` retorna `[self, coord_a, emp_a1, emp_a2]` quando há subordinados
- [ ] `manager` sem nenhum subordinado retorna `[self]`
- [ ] Adicionar bloco `describe("canAccessEmployee")`
- [ ] `admin` pode acessar qualquer employeeId
- [ ] `employee` pode acessar apenas próprio id
- [ ] `employee` NÃO pode acessar outro employee
- [ ] `manager_a` pode acessar `coord_a`, `emp_a1`, `emp_a2`
- [ ] `manager_a` NÃO pode acessar `emp_b1` (ramo diferente)
- [ ] `manager_a` NÃO pode acessar `manager_b` (peer, mesmo nível)
- [ ] Adicionar bloco `describe("getPDIAccessFilter")` e `describe("getFeedbackAccessFilter")`
- [ ] `admin` retorna `{}` (sem filtro)
- [ ] `employee` retorna `{ employeeId: { in: ["emp-a1"] } }`
- [ ] `manager_a` retorna `{ employeeId: { in: ["mgr-a", "coord-a", "emp-a1", "emp-a2"] } }`
- [ ] Todos os testes mockam `prisma.employeeHierarchy.findMany` via `vi.mock`
- [ ] `npm run test` passa

---

### US-003: Testes unitários de `getEffectiveAuth()` e `getImpersonationInfo()`

**Description:** As a developer, I want unit tests for impersonation logic so that I know the session override works correctly and is strictly limited to admins.

**Acceptance Criteria:**
- [ ] Criar `src/lib/__tests__/impersonation.test.ts`
- [ ] Mockar `@/lib/auth` (retorna sessão configurável) e `@/lib/prisma`
- [ ] Mockar `next/headers` para simular o cookie `__impersonate`
- [ ] Cenários de `getEffectiveAuth()`:
  - [ ] Sessão `null` → retorna `null`
  - [ ] Role `employee` → retorna sessão original (sem ler cookie)
  - [ ] Role `manager` → retorna sessão original (sem ler cookie)
  - [ ] Role `admin`, cookie ausente → retorna sessão original
  - [ ] Role `admin`, cookie presente com userId válido → retorna sessão com dados do usuário-alvo (`id`, `name`, `email`, `role`, `evaluationMode`)
  - [ ] Role `admin`, cookie com userId inválido (não existe no DB) → retorna sessão original
- [ ] Cenários de `getImpersonationInfo()`:
  - [ ] Role `employee` → retorna `null`
  - [ ] Role `admin`, cookie ausente → retorna `null`
  - [ ] Role `admin`, cookie presente → retorna `{ id, name, role }` do usuário-alvo
- [ ] `npm run test` passa

---

### US-004: Testes da API route `/api/impersonate` (POST e DELETE)

**Description:** As a developer, I want tests for the impersonation API routes so that I know only admins can activate impersonation and the cookie is set/cleared correctly.

**Acceptance Criteria:**
- [ ] Criar `src/app/api/impersonate/__tests__/route.test.ts`
- [ ] Mockar `@/lib/auth` e `@/lib/prisma`
- [ ] **POST — cenários:**
  - [ ] Sem sessão (não autenticado) → retorna 403
  - [ ] Sessão com role `employee` → retorna 403
  - [ ] Sessão com role `manager` → retorna 403
  - [ ] Sessão `admin`, body sem `userId` → retorna 400
  - [ ] Sessão `admin`, `userId` === próprio id → retorna 400 com mensagem "Cannot impersonate yourself"
  - [ ] Sessão `admin`, `userId` de usuário inexistente → retorna 404
  - [ ] Sessão `admin`, `userId` válido → retorna 200 `{ ok: true }` e cookie `__impersonate` é setado
- [ ] **DELETE — cenários:**
  - [ ] Sem sessão → retorna 403
  - [ ] Sessão `employee` → retorna 403
  - [ ] Sessão `admin` → retorna 200 `{ ok: true }` e cookie é deletado
- [ ] `npm run test` passa

---

### US-005: Testes da API route `/api/impersonate/users` (GET)

**Description:** As a developer, I want tests for the users listing route so that I know it only returns data to admins and excludes the admin themselves from the list.

**Acceptance Criteria:**
- [ ] Criar `src/app/api/impersonate/users/__tests__/route.test.ts`
- [ ] Sessão `employee` → retorna 403
- [ ] Sessão `manager` → retorna 403
- [ ] Sessão `admin` → retorna 200 com array de usuários
- [ ] O próprio admin NÃO aparece na lista (verificar que a query inclui `where: { id: { not: session.user.id } }`)
- [ ] `npm run test` passa

---

### US-006: Testes de server action — Dashboard (`getDashboardData`)

**Description:** As a developer, I want tests for the dashboard action so that I know each role only receives aggregated data within their access scope.

**Acceptance Criteria:**
- [ ] Criar `src/app/(dashboard)/dashboard/__tests__/actions.test.ts`
- [ ] Mockar `@/lib/impersonation` (getEffectiveAuth) e `@/lib/prisma`
- [ ] Sessão `null` → action retorna `null`
- [ ] Sessão `employee` → query de PDIs/Feedbacks inclui filtro `{ employeeId: userId }`
- [ ] Sessão `manager_a` → query inclui `{ employeeId: { in: [mgr-a, coord-a, emp-a1, emp-a2] } }`
- [ ] Sessão `admin` → query sem filtro de employeeId (`{}`)
- [ ] `npm run test` passa

---

### US-007: Testes de server action — PDIs (`getPDIs`, `createPDI`, `updatePDI`)

**Description:** As a developer, I want tests for the PDI actions so that I know employees cannot read or modify PDIs outside their access scope.

**Acceptance Criteria:**
- [ ] Criar `src/app/(dashboard)/pdis/__tests__/actions.test.ts`
- [ ] Mockar `@/lib/impersonation` e `@/lib/prisma`
- [ ] **Leitura (`getPDIs` ou equivalente):**
  - [ ] `employee` → filtra por `employeeId = userId`
  - [ ] `manager_a` → filtra por `employeeId in [self + subordinates]`
  - [ ] `admin` → sem filtro
- [ ] **Criação (`createPDI`):**
  - [ ] `employee` tentando criar PDI para outro employee → retorna erro de autorização
  - [ ] `manager_a` criando PDI para `emp_b1` (fora da hierarquia) → retorna erro
  - [ ] `manager_a` criando PDI para `emp_a1` → sucesso
  - [ ] `admin` criando PDI para qualquer usuário → sucesso
- [ ] **Atualização (`updatePDI`):**
  - [ ] `employee` tentando atualizar PDI de outro employee → retorna erro
  - [ ] `manager_a` atualizando PDI de `emp_b1` → retorna erro
- [ ] `npm run test` passa

---

### US-008: Testes de server action — Feedbacks (`getFeedbacks`, `createFeedback`, `submitFeedback`)

**Description:** As a developer, I want tests for the feedback actions so that feedback data cannot be accessed across organizational branches.

**Acceptance Criteria:**
- [ ] Criar `src/app/(dashboard)/feedbacks/__tests__/actions.test.ts`
- [ ] Mockar `@/lib/impersonation` e `@/lib/prisma`
- [ ] **Leitura:**
  - [ ] `employee` → só vê feedbacks onde `employeeId = userId`
  - [ ] `manager_a` → vê feedbacks de `[self + coord_a + emp_a1 + emp_a2]`
  - [ ] `manager_a` NÃO vê feedbacks de `emp_b1`
  - [ ] `admin` → sem filtro
- [ ] **Criação (`createFeedback` / agendamento):**
  - [ ] `manager_a` tentando criar feedback para `emp_b1` → retorna erro
  - [ ] `employee` tentando criar feedback → retorna erro (employee não cria feedback)
  - [ ] `manager_a` criando feedback para `emp_a1` → sucesso
- [ ] **Submissão (`submitFeedback`):**
  - [ ] Usuário sem acesso ao feedback → retorna erro
- [ ] `npm run test` passa

---

### US-009: Testes de server action — Colaboradores (`getColaboradores`)

**Description:** As a developer, I want tests for the collaborators action so that employees cannot list other employees outside their scope.

**Acceptance Criteria:**
- [ ] Criar `src/app/(dashboard)/colaboradores/__tests__/actions.test.ts`
- [ ] `employee` → lista contém apenas o próprio usuário (ou retorna erro/lista vazia dependendo da implementação)
- [ ] `manager_a` → lista contém apenas `[self, coord_a, emp_a1, emp_a2]`
- [ ] `manager_a` NÃO recebe `emp_b1` ou `manager_b` na lista
- [ ] `admin` → recebe todos os usuários
- [ ] `npm run test` passa

---

### US-010: Testes de server action — Notificações (`getNotifications`, `markAsRead`)

**Description:** As a developer, I want tests for the notifications action so that users can only see and modify their own notifications.

**Acceptance Criteria:**
- [ ] Criar `src/app/(dashboard)/notificacoes/__tests__/actions.test.ts`
- [ ] Leitura sempre filtra por `userId = session.user.id` (independente de role)
- [ ] `employee_a1` não vê notificações de `employee_a2`
- [ ] `markAsRead` de notificação de outro usuário → retorna erro
- [ ] `admin` vê apenas suas próprias notificações (notificações não são globais por role)
- [ ] `npm run test` passa

---

### US-011: Testes de impersonação ponta-a-ponta (unit com mocks)

**Description:** As a developer, I want tests that simulate the full impersonation flow so that I know an admin impersonating an employee sees exactly what that employee would see.

**Acceptance Criteria:**
- [ ] Criar `src/lib/__tests__/impersonation-flow.test.ts`
- [ ] **Admin impersonando `employee` (`emp_a1`):**
  - [ ] `getEffectiveAuth()` retorna sessão com `id = emp_a1`, `role = employee`
  - [ ] `getAccessibleEmployeeIds` com sessão efetiva retorna `["emp-a1"]`
  - [ ] `getPDIAccessFilter` retorna `{ employeeId: { in: ["emp-a1"] } }`
- [ ] **Admin impersonando `manager_a`:**
  - [ ] `getEffectiveAuth()` retorna sessão com `id = mgr-a`, `role = manager`
  - [ ] `getAccessibleEmployeeIds` retorna `[mgr-a, coord-a, emp-a1, emp-a2]`
  - [ ] NÃO inclui `emp_b1`
- [ ] **Admin SEM impersonação:**
  - [ ] `getEffectiveAuth()` retorna sessão original com `role = admin`
  - [ ] `getAccessibleEmployeeIds` retorna `"all"`
- [ ] `npm run test` passa

---

### US-012: Testes de integração — acesso a dados com banco real (opcional, ambiente CI)

**Description:** As a developer, I want integration tests that run against a real test database so that I know the Prisma filters actually restrict data at the query level.

**Acceptance Criteria:**
- [ ] Criar `src/lib/__tests__/integration/access-control.integration.test.ts`
- [ ] Configurar banco de dados de teste separado (variável `DATABASE_URL_TEST`)
- [ ] Usar dados do seed (`prisma/seed.ts`) como base
- [ ] Verificar que query real de PDIs com filtro de `employee` não retorna PDIs de outros usuários
- [ ] Verificar que query real de PDIs com filtro de `manager_a` não retorna PDIs de `emp_b1`
- [ ] Verificar que `admin` recebe todos os PDIs
- [ ] Estes testes só rodam quando `DATABASE_URL_TEST` está definida (skip automático caso contrário)
- [ ] `npm run test` inclui estes testes quando a variável está presente

---

### US-013: Testes de componente React — renderização condicional por role

**Description:** As a developer, I want component tests so that I know UI elements that should be hidden for certain roles are actually not rendered.

**Acceptance Criteria:**
- [ ] Criar `src/components/__tests__/impersonation-banner.test.tsx`
  - [ ] Renderiza o nome do usuário impersonado e seu role em português
  - [ ] Botão "Sair da visualização" chama `DELETE /api/impersonate` ao clicar
  - [ ] Após clique, `router.refresh()` é chamado
- [ ] Criar `src/components/__tests__/impersonation-selector.test.tsx`
  - [ ] Botão "Simular usuário" abre modal ao clicar
  - [ ] Modal exibe lista de usuários retornada pela API
  - [ ] Campo de busca filtra a lista por nome/email/cargo
  - [ ] Selecionar usuário chama `POST /api/impersonate` com o userId correto
  - [ ] Após seleção, `router.refresh()` é chamado
- [ ] Configurar `@testing-library/react` no projeto se ainda não estiver instalado
- [ ] `npm run test` passa

---

## Functional Requirements

- **FR-1:** Todo teste de acesso deve usar os fixtures de `fixtures.ts` — nunca definir usuários ad-hoc inline
- **FR-2:** Testes de server actions devem mockar `@/lib/impersonation` (não `@/lib/auth`) para simular diferentes sessões
- **FR-3:** Cada cenário de "acesso negado" deve verificar que um erro é retornado (não silêncio ou dados parciais)
- **FR-4:** Testes de leitura devem verificar o **filtro passado ao Prisma** (via spy em `prisma.model.findMany`), não apenas o resultado retornado
- **FR-5:** Testes de escrita devem verificar que `prisma.model.create/update` NÃO é chamado quando o acesso é negado
- **FR-6:** Todo novo server action criado no projeto deve ter testes correspondentes em `__tests__/actions.test.ts` dentro da mesma feature folder
- **FR-7:** Os testes de integração devem usar `vi.importActual` para não mockar o Prisma real
- **FR-8:** O arquivo `fixtures.ts` deve ser a única fonte de verdade para IDs e estrutura de hierarquia nos testes
- **FR-9:** Testes de componente devem mockar chamadas fetch com `vi.stubGlobal("fetch", ...)` ou `msw`
- **FR-10:** Nenhum teste deve depender de ordem de execução — cada teste deve ser isolado via `beforeEach`/`afterEach`

---

## Non-Goals

- Não cobriremos testes E2E com Playwright/Cypress nesta PRD (pode ser PRD separada)
- Não testaremos performance ou carga
- Não testaremos upload de arquivos (PDIEvidence)
- Não testaremos fluxo completo de email/cron
- Não testaremos o formulário de login em si (autenticação NextAuth é testada pela própria lib)
- Não testaremos SSO (Microsoft Entra ID)

---

## Technical Considerations

- **Framework de testes:** Vitest (já configurado em `vitest.config.ts`)
- **Mocking Prisma:** Usar `vi.mock("@/lib/prisma", () => ({ prisma: { ... } }))` — seguir o padrão já estabelecido em `effective-schedule.test.ts`
- **Mocking cookies (Next.js):** `vi.mock("next/headers", () => ({ cookies: vi.fn() }))` — `cookies()` retorna um objeto com `.get()` e `.set()` mockados
- **Mocking auth:** `vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))` — retornar sessão configurável por teste
- **Mocking impersonation:** `vi.mock("@/lib/impersonation", () => ({ getEffectiveAuth: vi.fn() }))` — controlar sessão efetiva
- **Testing Library:** Instalar `@testing-library/react` e `@testing-library/user-event` para testes de componente
- **Convenção de localização:**
  - Testes de `src/lib/` → `src/lib/__tests__/`
  - Testes de server actions → `src/app/(dashboard)/[feature]/__tests__/actions.test.ts`
  - Testes de API routes → `src/app/api/[route]/__tests__/route.test.ts`
  - Testes de componentes → `src/components/__tests__/[component].test.tsx`
- **Dados de integração:** Usar `prisma/seed.ts` como script de setup do banco de teste

---

## Success Metrics

- `npm run test` passa com 0 falhas em ambiente limpo
- Cobertura de branches em `src/lib/access-control.ts` ≥ 95%
- Cobertura de branches em `src/lib/impersonation.ts` ≥ 95%
- Cada server action crítica (dashboard, pdis, feedbacks, colaboradores, notificações) tem ao menos 1 teste por role (admin/manager/employee)
- Nenhum teste com duração > 500ms (todos são unitários com mocks)

---

## Open Questions

- Os testes de integração serão rodados apenas em CI (GitHub Actions) ou também localmente? Isso define se precisamos de um `docker-compose.test.yml`
- `@testing-library/react` já está instalado? Se não, precisa ser adicionado ao `devDependencies` antes da US-013
- As server actions retornam erros como `throw new Error(...)`, como `null`, ou como `{ error: string }`? Isso impacta o que os testes verificam nas asserções de "acesso negado"
