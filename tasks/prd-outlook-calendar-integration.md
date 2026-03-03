# PRD: Integração com Calendário do Outlook

## Introduction

Integrar o sistema com o Microsoft Outlook Calendar via Microsoft Graph API, criando automaticamente eventos de calendário para gestores e colaboradores sempre que um acompanhamento de PDI ou feedback futuro for agendado, atualizado ou cancelado. A integração usa o fluxo de autenticação Microsoft Entra ID (Azure AD SSO) já existente no sistema, armazenando tokens de acesso por usuário. Usuários sem conta Microsoft vinculada são ignorados silenciosamente.

---

## Goals

- Criar eventos no Outlook de gestor e colaborador automaticamente ao agendar follow-up de PDI ou feedback futuro
- Atualizar o evento quando a data for alterada
- Cancelar/deletar o evento quando o agendamento for cancelado
- Reutilizar o fluxo OAuth do Microsoft Entra ID já configurado, adicionando o scope `Calendars.ReadWrite`
- Não bloquear fluxos existentes: falhas na API do Outlook não devem impedir o agendamento no sistema

---

## User Stories

### US-001: Armazenar tokens Microsoft por usuário

**Description:** As a developer, I need to store each user's Microsoft access and refresh tokens so the system can call the Graph API on their behalf.

**Acceptance Criteria:**
- [ ] Adicionar campos ao modelo `User` no schema Prisma: `msAccessToken String?`, `msRefreshToken String?`, `msTokenExpiresAt DateTime?`
- [ ] Gerar e aplicar migração com `prisma:migrate`
- [ ] No callback `jwt` de `src/lib/auth.ts`, quando o provider for `microsoft-entra-id`, persistir `access_token`, `refresh_token` e `expires_at` no registro do usuário no banco
- [ ] Adicionar scope `Calendars.ReadWrite` ao provider Microsoft Entra ID em `src/lib/auth.ts`
- [ ] Typecheck passa

### US-002: Criar utilitário Microsoft Graph para calendário

**Description:** As a developer, I need a reusable Graph API client so all calendar operations share the same token refresh and HTTP logic.

**Acceptance Criteria:**
- [ ] Criar `src/lib/microsoft-graph.ts` com as funções:
  - `getUserToken(userId): Promise<string | null>` — retorna access token válido (renova via refresh token se expirado); retorna `null` se usuário sem token
  - `createCalendarEvent(accessToken, event): Promise<string | null>` — cria evento e retorna o `id` do evento no Graph; retorna `null` em erro
  - `updateCalendarEvent(accessToken, eventId, event): Promise<boolean>` — atualiza evento existente
  - `deleteCalendarEvent(accessToken, eventId): Promise<boolean>` — cancela/deleta evento
- [ ] Tipo `GraphCalendarEvent` com campos: `subject`, `start`, `end`, `body`, `attendees`
- [ ] Erros na API do Graph são capturados e logados (`console.error`), nunca propagados para cima
- [ ] Typecheck passa

### US-003: Armazenar ID do evento Outlook nos registros

**Description:** As a developer, I need to store the Outlook event IDs on follow-up and feedback records so I can update or delete them later.

**Acceptance Criteria:**
- [ ] Adicionar campo `outlookEventId String?` ao modelo `PDIFollowUp` no schema Prisma
- [ ] Adicionar campo `outlookEventId String?` ao modelo `Feedback` no schema Prisma
- [ ] Gerar e aplicar migração
- [ ] Typecheck passa

### US-004: Adicionar campo de horário nos formulários de agendamento

**Description:** As a gestor, I want to choose a start time when scheduling a PDI follow-up or future feedback so the Outlook event reflects the correct meeting time.

**Acceptance Criteria:**
- [ ] No modal de agendar follow-up de PDI (`FollowUpsSection` em `src/components/pdi-tracking.tsx`), adicionar campo `<input type="time">` com label "Horário de início" e valor padrão `09:00`
- [ ] No modal de feedback futuro (`FeedbackTable` em `src/components/feedback-table.tsx`), adicionar campo `<input type="time">` com label "Horário de início" e valor padrão `09:00`
- [ ] O horário selecionado é enviado junto com a data para as respectivas server actions (`scheduleFollowUp` e `createFutureFeedback`)
- [ ] As actions devem aceitar o novo parâmetro `scheduledTime: string` (formato `"HH:MM"`) e combinar com a data para montar o `DateTime` completo: `"[date]T[time]:00"`
- [ ] Se `scheduledTime` não for fornecido, usar `"09:00"` como fallback
- [ ] Typecheck passa
- [ ] Verificar layout no browser

### US-005: Criar evento no Outlook ao agendar follow-up de PDI

**Description:** As a gestor, I want a calendar event to be created in mine and the employee's Outlook when I schedule a PDI follow-up so that both parties are reminded automatically.

**Acceptance Criteria:**
- [ ] Em `scheduleFollowUp` (`src/app/(dashboard)/pdis/actions.ts`), após salvar no banco, chamar `createCalendarEvent` para o gestor e para o colaborador (em paralelo com `Promise.allSettled`)
- [ ] Título do evento: `"Acompanhamento PDI — [Nome do Colaborador]"`
- [ ] Corpo do evento: `"Acompanhamento de PDI agendado pelo sistema. Acesse: [NEXTAUTH_URL]/pdis/[pdiId]"`
- [ ] Início: data + horário escolhido pelo usuário (ex: `2026-03-10T09:00:00`); fim: início + 1 hora
- [ ] Timezone fixo: `America/Sao_Paulo`
- [ ] Salvar o `outlookEventId` retornado no registro `PDIFollowUp`
- [ ] Se o usuário não tiver token Microsoft, ignorar silenciosamente
- [ ] Falha na criação do evento Outlook não reverte o agendamento no banco
- [ ] Typecheck passa

### US-006: Criar evento no Outlook ao agendar feedback futuro

**Description:** As a gestor, I want a calendar event to be created when I schedule a future feedback so both parties have it in their Outlook.

**Acceptance Criteria:**
- [ ] Em `createFutureFeedback` (`src/app/(dashboard)/feedbacks/actions.ts`), após salvar no banco, chamar `createCalendarEvent` para gestor e colaborador
- [ ] Título do evento: `"Feedback — [Nome do Colaborador]"`
- [ ] Corpo do evento: `"Feedback agendado pelo sistema. Acesse: [NEXTAUTH_URL]/feedbacks/[feedbackId]"`
- [ ] Início: data + horário escolhido; fim: início + 1 hora; timezone `America/Sao_Paulo`
- [ ] Salvar `outlookEventId` no registro `Feedback`
- [ ] Se o usuário não tiver token Microsoft, ignorar silenciosamente
- [ ] Falha no Outlook não reverte criação do feedback
- [ ] Typecheck passa

### US-007: Cancelar evento no Outlook ao cancelar follow-up de PDI

**Description:** As a gestor, I want the Outlook event to be deleted when I cancel a PDI follow-up so it disappears from both calendars.

**Acceptance Criteria:**
- [ ] Em `cancelFollowUp` (`src/app/(dashboard)/pdis/actions.ts`), se o registro tiver `outlookEventId`, chamar `deleteCalendarEvent` para o gestor
- [ ] Falha na deleção do evento Outlook não reverte o cancelamento no banco
- [ ] Typecheck passa

### US-008: Cancelar evento no Outlook ao cancelar/alterar feedback

**Description:** As a gestor, I want the Outlook event to be removed or updated when a feedback is cancelled or its date changes.

**Acceptance Criteria:**
- [ ] Identificar as actions de feedback que cancelam ou alteram a data (`cancelFeedback` ou equivalente em `src/app/(dashboard)/feedbacks/actions.ts`)
- [ ] Ao cancelar: chamar `deleteCalendarEvent` se `outlookEventId` existir
- [ ] Ao alterar data: chamar `updateCalendarEvent` com a nova `scheduledAt`
- [ ] Falhas no Outlook não revertem operações no banco
- [ ] Typecheck passa

---

## Functional Requirements

- **FR-1:** O scope `Calendars.ReadWrite` deve ser solicitado ao Microsoft Entra ID durante o login SSO
- **FR-2:** `access_token`, `refresh_token` e `expires_at` devem ser persistidos na tabela `User` após login SSO
- **FR-3:** Antes de cada chamada Graph, verificar se o token está expirado e renovar via `refresh_token` se necessário
- **FR-4:** Eventos criados devem ter ambos gestor e colaborador como participantes (`attendees`) se ambos tiverem tokens
- **FR-5:** O `outlookEventId` deve ser salvo em `PDIFollowUp.outlookEventId` e `Feedback.outlookEventId`
- **FR-6:** Todas as chamadas ao Graph API devem ser feitas de forma assíncrona e não-bloqueante usando `Promise.allSettled` (nunca `Promise.all` que falha em cadeia)
- **FR-7:** Erros da Graph API devem ser logados com `console.error` mas não devem lançar exceção para o fluxo principal
- **FR-8:** Usuários sem `msAccessToken` no banco são silenciosamente ignorados em todas as operações
- **FR-9:** Timezone fixo `America/Sao_Paulo` em todos os eventos criados no Outlook
- **FR-10:** Horário padrão `09:00–10:00`; usuário pode alterar via `<input type="time">` nos formulários de agendamento
- **FR-11:** As actions `scheduleFollowUp` e `createFutureFeedback` devem aceitar o parâmetro `scheduledTime: string` e combiná-lo com a data para montar o datetime completo do evento

---

## Non-Goals

- Sincronização bidirecional (mudanças feitas no Outlook não refletem no sistema)
- Suporte a outros provedores de calendário (Google Calendar, Apple Calendar)
- Interface para o usuário autorizar/desautorizar o acesso ao calendário
- Envio de arquivo `.ics` por e-mail como fallback
- Criação de eventos para usuários que fazem login apenas por credenciais (sem SSO)
- Leitura de disponibilidade do calendário para sugerir horários

---

## Technical Considerations

### Autenticação
- O provider `MicrosoftEntraID` já existe em `src/lib/auth.ts`
- Adicionar `authorization: { params: { scope: "openid profile email Calendars.ReadWrite offline_access" } }` ao provider
- `offline_access` é necessário para receber `refresh_token`
- No callback `jwt`, o `account.access_token`, `account.refresh_token` e `account.expires_at` estão disponíveis quando o provider é `microsoft-entra-id`
- Persistir esses valores no banco via `prisma.user.update`

### Microsoft Graph API
- Endpoint de criação: `POST https://graph.microsoft.com/v1.0/me/events`
- Endpoint de atualização: `PATCH https://graph.microsoft.com/v1.0/me/events/{id}`
- Endpoint de deleção: `DELETE https://graph.microsoft.com/v1.0/me/events/{id}`
- Renovação de token: `POST https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token` com `grant_type=refresh_token`
- Formato de data: ISO 8601 com timezone, ex: `{ dateTime: "2026-03-02T09:00:00", timeZone: "America/Sao_Paulo" }`

### Variáveis de ambiente já existentes
```
AZURE_AD_CLIENT_ID
AZURE_AD_CLIENT_SECRET
AZURE_AD_TENANT_ID
NEXTAUTH_URL  # usar para montar a URL do evento
```

### Schema Prisma — mudanças
```prisma
model User {
  // campos existentes...
  msAccessToken   String?
  msRefreshToken  String?
  msTokenExpiresAt DateTime?
}

model PDIFollowUp {
  // campos existentes...
  outlookEventId  String?
}

model Feedback {
  // campos existentes...
  outlookEventId  String?
}
```

---

## Success Metrics

- Ao agendar um follow-up ou feedback futuro com usuários SSO, o evento aparece no Outlook de ambos em menos de 5 segundos
- Ao cancelar, o evento desaparece do Outlook
- Zero impacto nos fluxos existentes quando o Graph API está indisponível ou o usuário não tem conta Microsoft

---

## Open Questions

- Usuários que já existem no banco e fazem login SSO após o deploy precisarão relogar para que os tokens sejam capturados — comunicar isso no deploy.
