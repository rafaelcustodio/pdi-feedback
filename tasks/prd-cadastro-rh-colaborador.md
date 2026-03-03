# PRD: Cadastro Completo de Colaborador para RH

## Introdução

Transformar o cadastro de colaborador (atualmente com ~15 campos básicos) em um sistema completo de gestão de dados para o RH, baseado no formulário "Talento I Narwal Sistemas". O cadastro será organizado em 5 sub-abas temáticas, com fluxo de aprovação para alterações feitas pelo colaborador via "Meu Perfil", e notificação por email ao RH quando solicitações de alteração forem criadas.

### Problema atual
O RH usa um formulário externo (Microsoft Forms) para coletar dados dos novos colaboradores e mantém essas informações fora do sistema. Não há centralização, controle de versão, nem fluxo de aprovação para alterações.

### Solução
Incorporar todos os campos relevantes do formulário ao cadastro do colaborador no sistema, permitir que o colaborador visualize e solicite alterações pelo "Meu Perfil", e dar ao RH controle sobre aprovação de mudanças em dados sensíveis.

## Objetivos

- Centralizar todos os dados do colaborador em uma única plataforma
- Organizar os ~30 campos em 5 sub-abas para melhor navegabilidade
- Permitir que colaboradores visualizem e solicitem alterações nos próprios dados via "Meu Perfil"
- Criar fluxo de aprovação pelo RH para dados pessoais e administrativos
- Permitir alteração livre (sem aprovação) para preferências pessoais (hobbies, gostos, redes sociais)
- Notificar o RH por email quando houver solicitação de alteração pendente
- Respeitar controle de acesso: admin vê tudo, gestor vê dados básicos de subordinados, colaborador vê apenas os próprios dados

## User Stories

### US-001: Adicionar novos campos ao modelo User no Prisma
**Descrição:** Como desenvolvedor, preciso estender o modelo User para armazenar todos os campos do formulário do RH.

**Acceptance Criteria:**
- [ ] Adicionar campos ao schema.prisma (ver seção Requisitos Funcionais para lista completa)
- [ ] Criar enum `Ethnicity` (branco, preto, amarelo, indigena, pardo)
- [ ] Criar enum `Gender` (masculino, feminino, outra)
- [ ] Criar enum `MaritalStatus` (solteiro, casado, outra)
- [ ] Criar enum `EducationLevel` (ensino_medio, ensino_tecnico, superior_incompleto, superior_completo, pos_graduado)
- [ ] Criar enum `ContractType` (efetivo, estagio)
- [ ] Criar enum `HealthPlanOption` (regional, nacional, nao)
- [ ] Criar enum `ShirtSize` (p_fem, m_fem, g_fem, gg_fem, xg_fem, p_masc, m_masc, g_masc, gg_masc, xg_masc)
- [ ] Criar modelo `Dependent` (nome, parentesco, cpf, relacionado ao User)
- [ ] Criar modelo `EmergencyContact` (nome, telefone, parentesco, relacionado ao User)
- [ ] Gerar e aplicar migration com sucesso
- [ ] Typecheck passa

### US-002: Criar modelo de Solicitação de Alteração (ChangeRequest)
**Descrição:** Como desenvolvedor, preciso de um modelo para registrar solicitações de alteração pendentes, com campos antigo/novo e status de aprovação.

**Acceptance Criteria:**
- [ ] Criar modelo `ChangeRequest` no Prisma com: id, userId, fieldName, oldValue, newValue, status (pending/approved/rejected), reviewedById, reviewedAt, createdAt
- [ ] Criar enum `ChangeRequestStatus` (pending, approved, rejected)
- [ ] Relação com User (solicitante) e User (revisor)
- [ ] Migration aplicada com sucesso
- [ ] Typecheck passa

### US-003: Reorganizar formulário de colaborador em 5 sub-abas (visão Admin)
**Descrição:** Como admin/RH, quero ver o cadastro do colaborador organizado em 5 abas temáticas para navegar rapidamente entre as seções.

**Acceptance Criteria:**
- [ ] Aba 1 — **Dados Pessoais**: nome, data nascimento, idade (calculada), gênero, etnia, estado civil, CPF, RG, nível escolaridade, com quem mora
- [ ] Aba 2 — **Endereço e Contato**: endereço (rua, número, complemento), CEP, cidade, estado, email pessoal, telefone
- [ ] Aba 3 — **Financeiro e Benefícios**: conta Bradesco (sim/não/outra + agência/conta), outro emprego registrado, plano de saúde Unimed (regional/nacional/não), vale transporte (sim/não), formato contratação (efetivo/estágio), tamanho camiseta
- [ ] Aba 4 — **Família e Dependentes**: possui filhos (sim/não + idades), dependentes IR (lista com nome, parentesco, CPF), contato de emergência (nome, telefone, parentesco)
- [ ] Aba 5 — **Sobre Mim**: hobbies (multi-select), redes sociais (multi-select + handles), gênero livros/filmes, livro favorito, filme favorito, música/banda favorita, valores que admira, alergias/intolerâncias alimentares, animais de estimação, participação em vídeos institucionais
- [ ] Manter os campos existentes do sistema (role, evaluation mode, org unit, gestor, data admissão) em uma seção "Dados do Sistema" acima das abas ou como aba 0
- [ ] Navegação entre abas com estado preservado (não perde dados ao trocar de aba)
- [ ] Admin pode editar todos os campos diretamente (sem fluxo de aprovação)
- [ ] Dark mode em todas as abas
- [ ] Typecheck passa
- [ ] Verificar no browser usando dev-browser skill

### US-004: Expandir "Meu Perfil" com dados completos e edição
**Descrição:** Como colaborador, quero ver e editar meus dados pessoais no "Meu Perfil", organizados nas mesmas 5 sub-abas.

**Acceptance Criteria:**
- [ ] Página `/perfil` exibe os dados do colaborador logado nas 5 sub-abas (leitura)
- [ ] Botão "Editar" em cada aba habilita modo de edição inline
- [ ] Campos da aba "Sobre Mim" (aba 5) salvam diretamente sem aprovação
- [ ] Campos das abas 1-4 (Dados Pessoais, Endereço, Financeiro, Família) criam uma `ChangeRequest` ao salvar
- [ ] Ao submeter alteração pendente: mostrar mensagem "Alteração enviada para aprovação do RH"
- [ ] Campos com alteração pendente mostram indicador visual (badge/ícone amarelo)
- [ ] Colaborador não vê dados de outros colaboradores
- [ ] Dark mode
- [ ] Typecheck passa
- [ ] Verificar no browser usando dev-browser skill

### US-005: Painel de aprovação de alterações para o RH
**Descrição:** Como admin/RH, quero ver uma lista de solicitações de alteração pendentes e poder aprovar ou rejeitar cada uma.

**Acceptance Criteria:**
- [ ] Nova seção/aba "Solicitações de Alteração" na página de Colaboradores (ou em Configurações)
- [ ] Lista de ChangeRequests pendentes com: nome do colaborador, campo alterado, valor antigo, valor novo, data da solicitação
- [ ] Botões "Aprovar" e "Rejeitar" por solicitação
- [ ] Aprovar: atualiza o campo no User e marca ChangeRequest como approved
- [ ] Rejeitar: marca como rejected sem alterar o User
- [ ] Opção de aprovar/rejeitar em lote (selecionar múltiplas)
- [ ] Filtro por colaborador e por status (pendente/aprovado/rejeitado)
- [ ] Badge com contagem de pendentes na aba/menu
- [ ] Dark mode
- [ ] Typecheck passa
- [ ] Verificar no browser usando dev-browser skill

### US-006: Notificação por email ao RH para solicitações de alteração
**Descrição:** Como RH, quero receber um email quando um colaborador solicitar alteração em dados que precisam de aprovação.

**Acceptance Criteria:**
- [ ] Ao criar ChangeRequest (abas 1-4), enviar email para todos os admins ativos
- [ ] Email contém: nome do colaborador, campo(s) alterado(s), valor antigo → valor novo
- [ ] Template de email em `src/lib/email-templates.ts`
- [ ] Criar notificação interna no sistema (modelo Notification existente) também
- [ ] Fallback para console.log se SMTP não configurado (padrão do projeto)
- [ ] Typecheck passa

### US-007: Controle de visibilidade por role para dados do colaborador
**Descrição:** Como gestor, quero ver dados básicos dos meus subordinados (nome, contato, emergência), mas sem acesso a dados sensíveis (CPF, banco, dependentes IR).

**Acceptance Criteria:**
- [ ] Admin: vê e edita TODOS os campos de todos os colaboradores
- [ ] Manager: na lista de subordinados, vê nome, email, telefone, cargo, contato de emergência. NÃO vê: CPF, RG, banco, dependentes IR, plano saúde, vale transporte
- [ ] Employee: vê apenas os próprios dados completos (via /perfil)
- [ ] Server Actions filtram campos sensíveis antes de retornar para managers
- [ ] Typecheck passa

### US-008: Importação de respostas do Microsoft Forms (Excel)
**Descrição:** Como RH, quero importar o arquivo Excel exportado do Microsoft Forms para pré-preencher o cadastro de um novo colaborador, evitando digitação manual.

**Fluxo:**
1. RH exporta respostas do Microsoft Forms (botão "Abrir no Excel" → gera `.xlsx`)
2. No sistema, na página de Colaboradores, clica em "Importar do Forms"
3. Faz upload do arquivo `.xlsx`
4. Sistema lê o arquivo, mostra preview com as respostas encontradas (uma linha por respondente)
5. RH seleciona a linha do colaborador desejado
6. Sistema abre o formulário de cadastro pré-preenchido com os dados mapeados
7. RH confere, preenche a **data de admissão** e os campos do sistema (role, org unit, gestor)
8. RH salva — colaborador é criado com todos os dados já preenchidos

**Acceptance Criteria:**
- [ ] Botão "Importar do Forms" na página de Colaboradores (visível apenas para admin)
- [ ] Modal de upload aceita arquivos `.xlsx` (validação de extensão)
- [ ] Parse do Excel usando biblioteca `xlsx` (SheetJS) — sem dependência de servidor externo
- [ ] Mapeamento automático das colunas do Forms para os campos do sistema (por título da pergunta)
- [ ] Tela de preview mostrando as respostas encontradas no Excel em formato de tabela
- [ ] Seleção de linha individual para importar
- [ ] Formulário de cadastro abre pré-preenchido com os dados mapeados
- [ ] Campos obrigatórios do sistema (role, data admissão) ficam vazios para o RH completar
- [ ] Campos de admissão do Forms são ignorados (Q1-consentimento, Q10-iniciando, Q13-Becomex)
- [ ] Tratamento de valores enum: mapear textos do Forms para enums do sistema (ex: "Branco" → `branco`, "Ensino Médio" → `ensino_medio`)
- [ ] Tratamento de multi-select: campos como hobbies vêm separados por ";" no Excel — converter para array
- [ ] Validação de CPF no preview (highlight de CPFs inválidos)
- [ ] Se já existir usuário com mesmo email ou CPF, mostrar aviso (possível duplicata)
- [ ] Dark mode
- [ ] Typecheck passa
- [ ] Verificar no browser usando dev-browser skill

### US-009: Seed de dados de exemplo para os novos campos
**Descrição:** Como desenvolvedor, quero que o seed inclua dados de exemplo para os novos campos para facilitar testes.

**Acceptance Criteria:**
- [ ] Atualizar `prisma/seed.ts` para incluir dados dos novos campos nos usuários de exemplo
- [ ] Incluir pelo menos 2 dependentes e 1 contato de emergência por usuário
- [ ] Seed roda sem erros
- [ ] Typecheck passa

## Requisitos Funcionais

### Novos campos do User (schema.prisma)

**Dados Pessoais (aba 1):**
- FR-01: `rg` (String, opcional)
- FR-02: `ethnicity` (enum Ethnicity, opcional)
- FR-03: `gender` (enum Gender, opcional)
- FR-04: `maritalStatus` (enum MaritalStatus, opcional)
- FR-05: `educationLevel` (enum EducationLevel, opcional)
- FR-06: `livesWithDescription` (String, opcional) — "com quem mora"

**Endereço e Contato (aba 2) — campos existentes + novos:**
- FR-07: `personalEmail` (String, opcional) — email pessoal separado do email corporativo
- FR-08: `addressNumber` (String, opcional) — número do endereço (hoje `address` é campo único)
- FR-09: `addressComplement` (String, opcional)

**Financeiro e Benefícios (aba 3):**
- FR-10: `hasBradescoAccount` (enum: sim/nao/outra, opcional)
- FR-11: `bankAgency` (String, opcional)
- FR-12: `bankAccount` (String, opcional)
- FR-13: `hasOtherEmployment` (Boolean, opcional)
- FR-14: `healthPlanOption` (enum HealthPlanOption, opcional)
- FR-15: `wantsTransportVoucher` (Boolean, opcional)
- FR-16: `contractType` (enum ContractType, opcional)
- FR-17: `shirtSize` (enum ShirtSize, opcional)

**Família e Dependentes (aba 4):**
- FR-18: `hasChildren` (Boolean, opcional)
- FR-19: `childrenAges` (String, opcional) — texto livre com idades
- FR-20: `hasIRDependents` (Boolean, opcional)
- FR-21: Modelo `Dependent` (nome, parentesco, cpf) — relação 1:N com User
- FR-22: Modelo `EmergencyContact` (nome, telefone, parentesco) — relação 1:N com User

**Sobre Mim (aba 5):**
- FR-23: `hobbies` (String[], array de strings — multi-select)
- FR-24: `socialNetworks` (Json, opcional) — objeto com handles por rede
- FR-25: `favoriteBookMovieGenres` (String, opcional)
- FR-26: `favoriteBooks` (String, opcional)
- FR-27: `favoriteMovies` (String, opcional)
- FR-28: `favoriteMusic` (String, opcional)
- FR-29: `admiredValues` (String, opcional)
- FR-30: `foodAllergies` (String, opcional)
- FR-31: `hasPets` (String, opcional) — "não", "sim, cachorros", "sim, gatos", texto livre
- FR-32: `participateInVideos` (Boolean, opcional)

### ChangeRequest
- FR-33: Ao colaborador alterar campos das abas 1-4 no "Meu Perfil", o sistema cria um `ChangeRequest` em vez de salvar diretamente
- FR-34: Alterações na aba 5 ("Sobre Mim") salvam diretamente, sem ChangeRequest
- FR-35: Admin pode aprovar ou rejeitar ChangeRequests. Aprovar aplica o valor no User
- FR-36: Email enviado ao RH (admins) ao criar ChangeRequest
- FR-37: Notificação interna criada ao criar ChangeRequest
- FR-38: Admin editando o cadastro do colaborador salva diretamente (sem fluxo de aprovação)

### Importação Excel (Microsoft Forms)
- FR-39: Upload de arquivo `.xlsx` exportado do Microsoft Forms
- FR-40: Parse client-side usando SheetJS (`xlsx`) — sem enviar arquivo para o servidor
- FR-41: Mapeamento de colunas do Forms para campos do sistema baseado em tabela de correspondência fixa (título da pergunta → campo do modelo)
- FR-42: Preview das respostas em tabela com seleção de linha
- FR-43: Detecção de duplicatas por email ou CPF antes de criar
- FR-44: Formulário pré-preenchido com campos do sistema vazios (role, org unit, gestor, data admissão) para o RH completar
- FR-45: Conversão automática de valores texto para enums do sistema
- FR-46: Conversão de multi-select (separados por ";") para arrays

### Visibilidade
- FR-47: Admin vê todos os campos de todos os colaboradores
- FR-48: Manager vê apenas: nome, email, telefone, cargo, contato de emergência dos subordinados
- FR-49: Employee vê apenas os próprios dados via /perfil

## Não-Objetivos (Fora do Escopo)

- Não incluir campos de admissão (consentimento LGPD, "está iniciando na Narwal?", "já é colaborador Becomex?")
- Não criar formulário de onboarding separado (manter o fluxo existente de cadastro pendente)
- Não implementar versionamento/histórico completo de alterações (apenas ChangeRequest com status)
- Não criar relatórios/exportação de dados de RH
- Não implementar upload de documentos (RG, comprovante de residência, etc.)
- Não alterar o fluxo de autenticação ou SSO existente
- Idade não será armazenada — será calculada a partir da data de nascimento

## Considerações de Design

- Usar componente de tabs existente (ou shadcn Tabs) para as 5 sub-abas
- Manter consistência visual com o formulário atual (`employee-form.tsx`)
- Reutilizar componentes de máscara de input existentes (CPF, telefone, CEP)
- Multi-select para hobbies e redes sociais: usar checkboxes ou combobox multi-select
- Indicador visual de "alteração pendente" em campos: badge amarelo com tooltip "Aguardando aprovação"
- Badge de contagem de pendentes no menu/aba de solicitações

## Considerações Técnicas

- **Prisma migration:** Todos os novos campos devem ser opcionais para não quebrar dados existentes
- **Dados sensíveis:** CPF, RG, banco devem ser filtrados no Server Action antes de retornar para roles sem permissão (não confiar apenas no frontend)
- **ChangeRequest armazena campo como string:** `fieldName` identifica o campo, `oldValue`/`newValue` são strings serializadas. Para dependentes/emergência, considerar agrupar como JSON
- **Email:** Reutilizar infraestrutura existente em `src/lib/email.ts` e `src/lib/email-templates.ts`
- **Impersonation:** Todas as novas Server Actions devem usar `getEffectiveAuth()` (nunca `auth()` direto)
- **Timezone:** Aplicar regras UTC conforme MEMORY.md para datas (nascimento, etc.)
- **Importação Excel:** Usar biblioteca `xlsx` (SheetJS) para parse client-side. O arquivo não é enviado ao servidor — parse acontece no browser e os dados mapeados são passados ao formulário como estado inicial. Tabela de mapeamento hardcoded (título da pergunta do Forms → campo do sistema) em arquivo separado para fácil manutenção
- **Dependência nova:** `npm install xlsx` — biblioteca leve (~400KB gzipped), sem dependências

## Métricas de Sucesso

- RH consegue cadastrar colaborador com todos os campos sem sair do sistema
- Colaborador visualiza e solicita alterações pelo "Meu Perfil" sem contatar RH diretamente
- Aprovação/rejeição de alterações em menos de 3 cliques
- Tempo de cadastro completo < formulário externo atual
- Zero dados sensíveis vazando para roles sem permissão

## Questões em Aberto

1. O campo `address` atual é um campo único de texto livre. Devemos manter assim ou separar em rua + número + complemento + bairro? (PRD assume separar número e complemento)
2. Para dependentes IR, quantos no máximo o sistema deve suportar? (PRD assume sem limite)
3. O painel de aprovação deve ficar na página de Colaboradores ou em Configurações?
4. Devemos permitir que o gestor veja a aba "Sobre Mim" dos subordinados (para ações de engajamento/team building)?
