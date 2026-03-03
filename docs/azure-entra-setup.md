# Configuração do Aplicativo no Azure Entra ID

## Visão Geral

O aplicativo **PDI Feedback** precisa de um registro de aplicativo no Azure Entra ID para duas funcionalidades:

1. **SSO (Single Sign-On)** — Login dos usuários via conta corporativa Microsoft
2. **Integração com Outlook Calendar** — Criar/editar/excluir eventos no calendário dos usuários (agendamento de feedbacks e acompanhamentos de PDI)
3. **Envio de e-mails** — Via SMTP relay do Exchange Online (autenticação SMTP)

---

## Passo 1 — Registrar o Aplicativo

1. Acesse o [Portal Azure](https://portal.azure.com)
2. Navegue até **Microsoft Entra ID** → **App registrations** → **New registration**
3. Preencha:
   - **Name:** `PDI Feedback`
   - **Supported account types:** `Accounts in this organizational directory only` (single tenant)
   - **Redirect URI:**
     - Tipo: `Web`
     - URI de Produção: `https://<DOMINIO-PRODUCAO>/api/auth/callback/microsoft-entra-id`
     - *(o URI de dev pode ser adicionado depois: `http://localhost:3000/api/auth/callback/microsoft-entra-id`)*
4. Clique em **Register**

### Informações geradas (anotar):
| Campo | Variável de ambiente |
|-------|---------------------|
| **Application (client) ID** | `AZURE_AD_CLIENT_ID` |
| **Directory (tenant) ID** | `AZURE_AD_TENANT_ID` |

---

## Passo 2 — Criar Client Secret

1. No app registrado, vá em **Certificates & secrets** → **Client secrets** → **New client secret**
2. Preencha:
   - **Description:** `PDI Feedback Production`
   - **Expires:** Escolher prazo adequado (recomendado: 12 ou 24 meses)
3. Clique em **Add**
4. **COPIE O VALUE imediatamente** (não será exibido novamente)

| Campo | Variável de ambiente |
|-------|---------------------|
| **Value** (o secret gerado) | `AZURE_AD_CLIENT_SECRET` |

> ⚠️ **Importante:** Criar um lembrete para renovar o secret antes do vencimento, caso contrário o SSO e a integração com calendário param de funcionar.

---

## Passo 3 — Configurar Permissões da API (API Permissions)

1. No app registrado, vá em **API permissions** → **Add a permission**
2. Selecione **Microsoft Graph** → **Delegated permissions**
3. Adicione as seguintes permissões:

| Permissão | Tipo | Finalidade |
|-----------|------|------------|
| `openid` | Delegated | Autenticação OpenID Connect (login SSO) |
| `profile` | Delegated | Acesso ao nome e foto do perfil do usuário |
| `email` | Delegated | Acesso ao e-mail do usuário |
| `offline_access` | Delegated | Obter refresh token (manter sessão ativa sem re-login) |
| `Calendars.ReadWrite` | Delegated | Criar, editar e excluir eventos no calendário Outlook do usuário |

4. Após adicionar todas, clique em **Grant admin consent for [Sua Organização]**
   - Isso autoriza todas as permissões de uma vez para todos os usuários da organização
   - Sem o admin consent, cada usuário teria que aprovar individualmente no primeiro login

### Resultado esperado:
Todas as 5 permissões devem aparecer com status ✅ **Granted for [Sua Organização]**.

> ℹ️ **Nota:** Todas as permissões são do tipo **Delegated** (delegadas), ou seja, o aplicativo age em nome do usuário logado, nunca com permissões próprias. Ele só acessa o calendário do próprio usuário.

---

## Passo 4 — Configurar Authentication (Redirect URIs)

1. No app registrado, vá em **Authentication**
2. Em **Web** → **Redirect URIs**, confirme/adicione:
   - Produção: `https://<DOMINIO-PRODUCAO>/api/auth/callback/microsoft-entra-id`
   - Desenvolvimento (opcional): `http://localhost:3000/api/auth/callback/microsoft-entra-id`
3. Em **Implicit grant and hybrid flows**: **deixar tudo desmarcado** (não usamos implicit flow)
4. Em **Supported account types**: confirme que está como **Single tenant**
5. Clique em **Save**

---

## Passo 5 — Configurar SMTP para Envio de E-mails

O aplicativo envia e-mails (notificações, lembretes, convites Nine Box) via **SMTP**. Existem duas opções:

### Opção A — Exchange Online SMTP (Recomendado)

Para usar o SMTP autenticado do Exchange Online / Microsoft 365:

1. **Criar ou designar uma conta de serviço** (ex: `noreply@suaempresa.com`) com licença Exchange Online
2. **Habilitar SMTP AUTH** para essa conta:
   - Exchange Admin Center → Mailboxes → selecione a conta → Mail flow → **Manage email apps**
   - Marque ✅ **Authenticated SMTP**
3. **Se MFA estiver habilitado** na conta, será necessário criar uma **App Password**:
   - Portal MyAccount (https://mysignins.microsoft.com) → Security info → Add method → App password

As variáveis de ambiente serão:

```
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=noreply@suaempresa.com
SMTP_PASS=<senha ou app password>
SMTP_FROM=PDI Feedback <noreply@suaempresa.com>
```

### Opção B — Outro servidor SMTP

Se preferirem usar outro serviço (SendGrid, Amazon SES, servidor SMTP próprio), basta configurar as variáveis equivalentes.

---

## Passo 6 — Resumo das Variáveis de Ambiente

Após a configuração, fornecer os seguintes valores para a equipe de desenvolvimento:

```env
# === Azure Entra ID (SSO + Calendar) ===
AZURE_AD_CLIENT_ID=<Application (client) ID>
AZURE_AD_CLIENT_SECRET=<Client secret value>
AZURE_AD_TENANT_ID=<Directory (tenant) ID>

# === SMTP (Envio de e-mails) ===
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=<email da conta de serviço>
SMTP_PASS=<senha ou app password>
SMTP_FROM=PDI Feedback <email da conta de serviço>
```

---

## Checklist Final

- [ ] App registrado no Azure Entra ID
- [ ] Client ID e Tenant ID anotados
- [ ] Client Secret criado e valor copiado
- [ ] Redirect URI de produção configurado
- [ ] 5 permissões delegadas adicionadas (openid, profile, email, offline_access, Calendars.ReadWrite)
- [ ] Admin consent concedido para a organização
- [ ] Conta de serviço SMTP configurada com SMTP AUTH habilitado
- [ ] Todas as variáveis de ambiente entregues à equipe de desenvolvimento

---

## Referência Rápida — O Que Cada Permissão Faz

| Permissão | Para quê? |
|-----------|-----------|
| `openid` | Permite o login SSO (identifica o usuário) |
| `profile` | Traz nome e foto do perfil para exibir no app |
| `email` | Traz o e-mail corporativo para vincular à conta no sistema |
| `offline_access` | Permite renovar o token de acesso sem pedir login novamente (refresh token) |
| `Calendars.ReadWrite` | Permite criar eventos no Outlook quando um feedback ou acompanhamento PDI é agendado |

---

## Diagrama de Fluxo

```
Usuário clica "Entrar com Microsoft"
        ↓
Login no Azure Entra ID
        ↓
Azure redireciona para /api/auth/callback/microsoft-entra-id
        ↓
App recebe tokens (access + refresh)
        ↓
Tokens armazenados no banco (criptografados por sessão)
        ↓
Quando o gestor agenda um feedback/PDI:
  → App usa o access token do gestor
  → Chama Microsoft Graph API
  → Cria evento no calendário Outlook do gestor
  → Se token expirou, usa refresh token para renovar automaticamente
```
