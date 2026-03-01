# PDI & Feedback — Sistema de Gestão de Desenvolvimento

Plataforma web para gestão de **PDIs (Planos de Desenvolvimento Individual)** e **feedbacks** corporativos. Permite que gestores criem e acompanhem planos de desenvolvimento, registrem evidências de progresso, troquem comentários e enviem feedbacks estruturados aos colaboradores.

---

## Funcionalidades

| Módulo | Descrição |
|---|---|
| **PDIs** | Criação, ativação, acompanhamento de metas e evidências |
| **Feedbacks** | Feedbacks estruturados com notas, pontos fortes e melhorias |
| **Colaboradores** | Cadastro de usuários e estrutura hierárquica |
| **Calendário** | Visualização de PDIs e feedbacks agendados |
| **Notificações** | Alertas in-app e e-mail para lembretes e eventos |
| **Configurações** | Unidades organizacionais, agendamentos e preferências |

### Controle de acesso por papel

- **admin** — acesso total
- **manager** — acesso a si mesmo e a todos os subordinados diretos/indiretos
- **employee** — acesso apenas aos próprios registros

---

## Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router) + TypeScript
- **Banco de dados:** PostgreSQL + [Prisma 7](https://www.prisma.io/)
- **Autenticação:** [NextAuth v5](https://authjs.dev/) — credenciais e Microsoft Entra ID (SSO)
- **Estilização:** [Tailwind CSS 4](https://tailwindcss.com/)
- **Testes:** [Vitest](https://vitest.dev/)
- **E-mail:** Nodemailer (SMTP)

---

## Pré-requisitos

- Node.js 20+
- PostgreSQL 14+ em execução localmente (ou em container)

---

## Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/rafaelcustodio/pdi-feedback.git
cd pdi-feedback

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais (veja seção "Variáveis de ambiente")

# 4. Aplique as migrations e gere o client Prisma
npm run prisma:migrate
npm run prisma:generate

# 5. (Opcional) Popule o banco com dados de demonstração
npm run prisma:seed

# 6. Inicie o servidor de desenvolvimento
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

---

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

```env
# Obrigatórias
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pdi_feedback?schema=public"
NEXTAUTH_SECRET="troque-por-string-aleatoria-segura"
NEXTAUTH_URL="http://localhost:3000"

# Microsoft Entra ID / Azure AD SSO (opcional)
AZURE_AD_CLIENT_ID=""
AZURE_AD_CLIENT_SECRET=""
AZURE_AD_TENANT_ID=""

# SMTP para envio de e-mails (opcional — usa console.log se não configurado)
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="PDI Feedback HR <noreply@example.com>"

# Proteção do cron job de lembretes (opcional)
CRON_SECRET=""
```

---

## Scripts disponíveis

```bash
npm run dev              # Servidor de desenvolvimento (Next.js)
npm run build            # Build de produção
npm run typecheck        # Verificação de tipos TypeScript (sem emitir arquivos)
npm run lint             # ESLint
npm run test             # Testes com Vitest

npm run prisma:generate  # Regenera o Prisma Client para src/generated/prisma/
npm run prisma:migrate   # Aplica migrations (modo dev)
npm run prisma:seed      # Popula o banco com dados de demonstração
```

---

## Estrutura do projeto

```
pdi-feedback/
├── prisma/
│   ├── schema.prisma          # Modelos do banco de dados
│   ├── migrations/            # Histórico de migrations
│   └── seed.ts                # Script de seed
├── src/
│   ├── app/
│   │   ├── (dashboard)/       # Rotas autenticadas (layout compartilhado)
│   │   │   ├── pdis/          # PDIs — page, actions (Server Actions)
│   │   │   ├── feedbacks/     # Feedbacks
│   │   │   ├── colaboradores/ # Colaboradores e hierarquia
│   │   │   ├── calendario/    # Calendário de eventos
│   │   │   ├── notificacoes/  # Central de notificações
│   │   │   ├── configuracoes/ # Unidades org. e agendamentos
│   │   │   └── perfil/        # Perfil do usuário
│   │   ├── login/             # Página pública de login
│   │   └── api/
│   │       ├── auth/          # NextAuth handlers
│   │       └── cron/          # Cron job de lembretes por e-mail
│   ├── components/            # Componentes React reutilizáveis
│   ├── lib/
│   │   ├── access-control.ts  # Lógica de controle de acesso por papel
│   │   ├── auth.ts            # Configuração NextAuth
│   │   ├── email.ts           # Envio de e-mails via Nodemailer
│   │   ├── email-templates.ts # Templates de e-mail
│   │   ├── prisma.ts          # Singleton do Prisma Client
│   │   ├── schedule-utils.ts  # Utilitários de agendamento
│   │   └── hierarchy-utils.ts # Resolução de hierarquia de colaboradores
│   └── generated/
│       └── prisma/            # Prisma Client gerado (gitignored)
├── .env.example
├── .gitattributes
└── CLAUDE.md                  # Instruções para Claude Code
```

### Padrão de dados

Cada feature segue o mesmo padrão sem camada de API separada:

```
src/app/(dashboard)/[feature]/
  ├── actions.ts   ← Server Actions (mutations + queries)
  └── page.tsx     ← Server Component (busca dados, passa para componentes)

src/components/
  ├── [feature]-form.tsx   ← Formulário (Client Component)
  └── [feature]-table.tsx  ← Tabela/listagem (Client Component)
```

---

## Banco de dados

Principais modelos:

| Modelo | Descrição |
|---|---|
| `User` | Usuários com papel (admin/manager/employee) e suporte a SSO |
| `OrganizationalUnit` | Unidades organizacionais hierárquicas |
| `EmployeeHierarchy` | Vínculos gestor–colaborador com datas de início/fim |
| `PDI` + `PDIGoal` + `PDIEvidence` + `PDIComment` | Planos de desenvolvimento e acompanhamento |
| `Feedback` | Feedbacks estruturados |
| `FeedbackSchedule` / `PDISchedule` | Agendamentos recorrentes |
| `Notification` | Notificações in-app e por e-mail |

> Após qualquer alteração no `schema.prisma`, execute `npm run prisma:migrate` seguido de `npm run prisma:generate`.

---

## Autenticação

Dois provedores suportados pelo NextAuth v5:

1. **Credenciais** — e-mail + senha (bcryptjs)
2. **Microsoft Entra ID** — SSO Azure AD, ativado quando as variáveis `AZURE_AD_*` estiverem preenchidas

No primeiro login via SSO, o usuário é criado automaticamente. Se o e-mail coincidir com uma conta de credenciais existente, as contas são vinculadas. O papel do usuário é armazenado no JWT e disponível via `session.user.role`.

---

## Dev Container

O projeto inclui configuração de Dev Container (`.devcontainer/`) com firewall init script. Scripts shell **devem usar terminações de linha LF** — CRLF do Windows causará erros `bad interpreter`. O `.gitattributes` aplica `*.sh eol=lf` automaticamente.

---

## Testes

```bash
npm run test
```

Os testes ficam em `src/**/*.test.ts` e cobrem principalmente a lógica de controle de acesso (`src/lib/__tests__/access-control.test.ts`).

---

## Cron job de lembretes

O endpoint `POST /api/cron/email-reminders` envia e-mails de lembrete para PDIs e feedbacks agendados. Deve ser chamado por um serviço externo (Vercel Cron, GitHub Actions, etc.) com o header:

```
Authorization: Bearer <CRON_SECRET>
```

---

## Licença

Este projeto é privado e de uso interno.
