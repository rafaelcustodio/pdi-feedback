# PRD: Nine Box Inbox — Avaliações Pendentes no Dashboard

## Introduction

Atualmente, avaliadores convidados para responder um formulário Nine Box só conseguem acessá-lo pelo link enviado por e-mail. Se o e-mail não for recebido, for ignorado ou o usuário simplesmente quiser acessar pela aplicação, não há nenhum caminho de entrada via UI.

Este PRD adiciona uma seção **"Avaliações Nine Box"** na página do Dashboard (`/dashboard`) que lista todos os formulários pendentes de resposta para o usuário logado, além de um histórico dos já respondidos — tudo isso sem adicionar nenhum item novo ao menu lateral.

---

## Goals

- Permitir que avaliadores encontrem e acessem formulários Nine Box pendentes diretamente pelo dashboard
- Exibir histórico de avaliações já respondidas pelo usuário
- Não alterar a navegação lateral (sem novo item de menu)
- Reutilizar a rota `/ninebox/[evaluatorId]` já existente

---

## User Stories

### US-001: Query de avaliações Nine Box do usuário logado
**Descrição:** Como desenvolvedor, preciso de uma server action que retorne os registros `NineBoxEvaluator` do usuário logado, separados em pendentes e respondidos.

**Acceptance Criteria:**
- [ ] Adicionar função `getMyNineBoxEvaluations()` em `src/app/(dashboard)/dashboard/actions.ts`
- [ ] Retornar dois arrays: `pending` e `completed`
- [ ] Cada item do array `pending` deve conter: `evaluatorId`, `evaluateeName` (nome do avaliado), `feedbackPeriod` (campo `period` do Feedback vinculado), `createdAt`
- [ ] Cada item do array `completed` deve conter os mesmos campos mais `completedAt`
- [ ] Filtrar apenas avaliações onde `NineBoxEvaluation.status = open` para o array `pending` (avaliações encerradas não aparecem como pendentes)
- [ ] Filtrar apenas registros onde `NineBoxEvaluator.evaluatorId = userId` (o usuário logado)
- [ ] Ordenar `pending` por `createdAt` ASC (mais antigas primeiro) e `completed` por `completedAt` DESC (mais recentes primeiro)
- [ ] Typecheck passes

### US-002: Seção "Avaliações Nine Box" no Dashboard
**Descrição:** Como avaliador, quero ver meus formulários Nine Box pendentes diretamente no dashboard para não depender do e-mail.

**Acceptance Criteria:**
- [ ] Adicionar seção "Avaliações Nine Box" na página `/dashboard` (`src/app/(dashboard)/dashboard/page.tsx`)
- [ ] A seção só é renderizada se houver ao menos 1 item em `pending` ou `completed`; se ambos vazios, a seção não aparece
- [ ] Subseção **"Pendentes"**: lista cada avaliação com nome do avaliado, período do feedback, data do convite e botão/link "Responder" que abre `/ninebox/[evaluatorId]`
- [ ] Badge de contagem no título da subseção "Pendentes" quando houver itens (ex: "Pendentes (2)")
- [ ] Subseção **"Respondidas"**: lista as avaliações já respondidas com nome do avaliado, período e data de resposta; sem botão de ação
- [ ] A subseção "Respondidas" é colapsável (collapsed por padrão) para não poluir a tela
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

## Functional Requirements

- **FR-1**: A função `getMyNineBoxEvaluations()` filtra por `NineBoxEvaluator.evaluatorId = userId` (usuário logado)
- **FR-2**: Itens pendentes são apenas os com `NineBoxEvaluator.status = pending` E `NineBoxEvaluation.status = open`; avaliações encerradas (`closed`) somem dos pendentes mesmo que o avaliador não tenha respondido
- **FR-3**: O link "Responder" aponta para `/ninebox/[evaluatorId]` — rota já existente, sem alterações nela
- **FR-4**: A seção inteira é omitida quando o usuário não tem nenhum registro (nem pendente, nem respondido)
- **FR-5**: A subseção "Respondidas" começa colapsada; o usuário pode expandir clicando no cabeçalho

---

## Non-Goals

- Não criar item novo no menu lateral
- Não criar página dedicada `/minhas-avaliacoes`
- Não alterar a rota `/ninebox/[evaluatorId]` nem o formulário
- Não enviar renotificação para avaliadores pendentes
- Não exibir resultado das avaliações respondidas (o avaliador vê apenas que respondeu, não o resultado)

---

## Design Considerations

- Seguir o padrão visual das outras seções do dashboard (cards com borda, título com ícone Lucide)
- Badge de contagem de pendentes pode reutilizar o padrão visual já usado em notificações
- A subseção "Respondidas" pode usar um `<details>`/`<summary>` nativo ou um simples toggle com estado local
- Ícone sugerido para a seção: `ClipboardCheck` (Lucide) — diferente dos já usados no dashboard

---

## Technical Considerations

- Adicionar `getMyNineBoxEvaluations()` em `dashboard/actions.ts` junto com as queries existentes
- Chamar a função no `DashboardPage` (server component) junto com `getDashboardData()`
- Não alterar o tipo `DashboardData` — passar os dados de Nine Box como prop separada para o componente da seção
- A query deve fazer join: `NineBoxEvaluator → NineBoxEvaluation → Feedback` (para obter `period`) e `NineBoxEvaluation → User` (para obter `evaluateeName`)

---

## Success Metrics

- Avaliador consegue encontrar e acessar formulários pendentes sem precisar do e-mail
- Seção não aparece para usuários sem nenhuma avaliação (sem ruído no dashboard)
- Avaliações de rodadas encerradas somem automaticamente dos pendentes

---

## Open Questions

- Exibir o período do Feedback como identificador (ex: "Q1/2026") ou o nome do avaliado é suficiente sozinho? Recomendação: exibir ambos.
- Limite de itens na subseção "Respondidas"? Sugestão: exibir as últimas 5, sem paginação na v1.
