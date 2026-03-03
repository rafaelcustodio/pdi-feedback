# PRD: Nine Box

## Introdução

O Nine Box é uma ferramenta de avaliação de desempenho e potencial do colaborador. No contexto desta aplicação, o gestor pode optar por disparar uma rodada de Nine Box vinculada a um Feedback existente. Colegas de trabalho selecionados pelo gestor respondem um formulário de 14 perguntas (anônimo para o avaliado) avaliando o profissional. As respostas são agregadas em médias que posicionam o colaborador em um dos 9 quadrantes da matriz (eixo X = Desempenho, eixo Y = Potencial). O gestor vê o resultado completo; o colaborador vê apenas as médias finais, sem acesso a comentários ou notas individuais.

---

## Goals

- Permitir ao gestor disparar uma avaliação Nine Box vinculada a um Feedback existente
- Permitir ao gestor selecionar os avaliadores (colegas cadastrados no sistema)
- Notificar os avaliadores via notificação interna + e-mail
- Coletar as 14 respostas do formulário de forma autenticada
- Calcular automaticamente médias de Desempenho e Potencial e determinar o quadrante
- Exibir dashboard com KPIs, matriz 3×3 e movimentação histórica para o gestor
- Exibir resultado resumido (médias apenas) para o colaborador avaliado
- Manter histórico de avaliações vinculadas ao colaborador para comparação ao longo do tempo

---

## Glossário

- **NineBoxEvaluation**: rodada de avaliação Nine Box vinculada a um Feedback
- **NineBoxEvaluator**: cada colega convidado a responder (um registro por pessoa convidada)
- **Desempenho**: média das questões 1–6 (escala 1–5)
- **Potencial**: média das questões 7–12 (escala 1–5)
- **Quadrante**: posição na matriz 3×3 determinada por faixas de Desempenho (X) e Potencial (Y)
- **Faixas**: Baixo = 1,00–2,33 | Médio = 2,34–3,66 | Alto = 3,67–5,00

---

## Mapeamento dos 9 Quadrantes

| Potencial ↓ \ Desempenho → | Baixo       | Médio              | Alto           |
|---------------------------|-------------|--------------------|----------------|
| **Alto**                  | Forte Potencial | Alto Potencial | Top Performer  |
| **Médio**                 | Enigma      | Profissional Chave | Alto Desempenho|
| **Baixo**                 | Insuficiente| Eficaz             | Comprometido   |

---

## Formulário (14 perguntas)

### Seção Desempenho (questões 1–6, escala 1–5)
1. Quantidade e ritmo de trabalho
2. Qualidade de entrega
3. Entregas dentro do prazo
4. Autogestão
5. Conhecimento técnico ou de negócio
6. Visão macro

### Seção Potencial (questões 7–12, escala 1–5)
7. Interesse e iniciativa
8. Capacidade lógica e de aprendizagem
9. Persistência
10. Senso de dono(a)
11. Relacionamento interpessoal
12. Comunicação

### Seção Descritiva (questões 13–14, texto livre)
13. Pontos fortes
14. Oportunidade de desenvolvimento

---

## User Stories

### US-001: Adicionar modelos NineBoxEvaluation e NineBoxEvaluator ao schema
**Descrição:** Como desenvolvedor, preciso persistir as avaliações Nine Box e as respostas de cada avaliador no banco de dados.

**Acceptance Criteria:**
- [ ] Adicionar modelo `NineBoxEvaluation` com campos:
  - `id` (cuid)
  - `feedbackId` (FK → Feedback, unique — um feedback tem no máximo uma avaliação Nine Box)
  - `evaluateeId` (FK → User — o colaborador sendo avaliado)
  - `createdById` (FK → User — o gestor que disparou)
  - `status`: enum `NineBoxStatus` com valores `open` e `closed`
  - `createdAt`, `updatedAt`
- [ ] Adicionar modelo `NineBoxEvaluator` com campos:
  - `id` (cuid)
  - `evaluationId` (FK → NineBoxEvaluation, onDelete: Cascade)
  - `evaluatorId` (FK → User — o colega que responde)
  - `status`: enum `NineBoxEvaluatorStatus` com valores `pending` e `completed`
  - Questões numéricas (Int, nullable): `q1`, `q2`, `q3`, `q4`, `q5`, `q6` (Desempenho) e `q7`, `q8`, `q9`, `q10`, `q11`, `q12` (Potencial)
  - Questões abertas (String?, nullable): `q13PontosFortes`, `q14Oportunidade`
  - `completedAt` (DateTime?)
  - `createdAt`
  - Constraint `@@unique([evaluationId, evaluatorId])` — um avaliador por rodada
- [ ] Adicionar enum `NineBoxStatus` (`open`, `closed`) ao schema
- [ ] Adicionar enum `NineBoxEvaluatorStatus` (`pending`, `completed`) ao schema
- [ ] Adicionar enum `ninebox_invite` ao `NotificationType`
- [ ] Adicionar relação `nineBoxEvaluation NineBoxEvaluation?` ao modelo `Feedback`
- [ ] Adicionar relações em `User`: `nineBoxEvaluationsReceived`, `nineBoxEvaluationsCreated`, `nineBoxResponses`
- [ ] Gerar migration e aplicar com `prisma:migrate` sem erros
- [ ] `prisma:generate` executa sem erros
- [ ] Typecheck passa

### US-002: Gestor dispara o Nine Box dentro de um Feedback
**Descrição:** Como gestor, quero poder ativar a avaliação Nine Box dentro de um Feedback específico e selecionar os colegas avaliadores.

**Acceptance Criteria:**
- [ ] Na página de detalhes do Feedback (`/feedbacks/[id]`), exibir botão "Iniciar Nine Box" apenas se:
  - O usuário logado é o gestor do feedback (`feedback.managerId === session.user.id`)
  - O feedback ainda não possui uma `NineBoxEvaluation` vinculada
  - O feedback **não** está com status `cancelled`
- [ ] Ao clicar em "Iniciar Nine Box", abrir modal com:
  - Título: "Iniciar Avaliação Nine Box"
  - Campo de busca/seleção múltipla de usuários do sistema (excluindo o próprio avaliado e o gestor)
  - Mínimo de 1 avaliador deve ser selecionado para habilitar o botão de confirmação
  - Botão "Cancelar" e botão "Disparar Avaliação"
- [ ] Server Action `startNineBoxEvaluation(feedbackId, evaluatorIds[])`:
  - Verifica acesso (gestor do feedback ou admin)
  - Cria `NineBoxEvaluation` com `status: open`
  - Cria um `NineBoxEvaluator` (status `pending`) para cada `evaluatorId`
  - Não envia notificações ainda (isso é feito na US-003)
  - Retorna o `NineBoxEvaluation` criado
- [ ] Após disparar, o botão "Iniciar Nine Box" desaparece e é substituído pelo status da avaliação (ex: "Nine Box em andamento — 2/5 respondidos")
- [ ] Typecheck/lint passam
- [ ] Verificar no browser usando dev-browser skill

### US-003: Enviar notificação interna e e-mail aos avaliadores
**Descrição:** Como sistema, preciso notificar cada avaliador convidado para que ele saiba que deve responder o formulário.

**Acceptance Criteria:**
- [ ] Após criar os registros `NineBoxEvaluator`, enviar para cada avaliador:
  - Notificação interna (`Notification`) com:
    - `type: ninebox_invite`
    - `title`: "Avaliação Nine Box — [Nome do Avaliado]"
    - `message`: "Você foi convidado para avaliar [Nome do Avaliado]. Acesse o formulário para responder."
  - E-mail (via `src/lib/email.ts`) com:
    - Assunto: "Convite: Avaliação Nine Box de [Nome do Avaliado]"
    - Corpo contendo link para `/ninebox/[evaluatorRecordId]` onde o avaliador pode responder
- [ ] Se SMTP não estiver configurado, o e-mail é logado no console (comportamento padrão existente)
- [ ] Typecheck passa

### US-004: Avaliador responde o formulário Nine Box
**Descrição:** Como avaliador convidado, quero preencher o formulário de 14 perguntas sobre meu colega.

**Acceptance Criteria:**
- [ ] Criar rota pública-mas-autenticada `/ninebox/[evaluatorId]` (fora do layout `(dashboard)`, mas requer login)
- [ ] Se o usuário não estiver logado, redirecionar para `/login?callbackUrl=/ninebox/[evaluatorId]`
- [ ] Se o `evaluatorId` não pertencer ao usuário logado, exibir erro "Acesso não autorizado"
- [ ] Se o `NineBoxEvaluator.status` já for `completed`, exibir mensagem "Você já respondeu esta avaliação. Obrigado!"
- [ ] Se a `NineBoxEvaluation` pai tiver `status: closed`, exibir mensagem "Esta avaliação foi encerrada."
- [ ] Exibir formulário com:
  - Header: "Avaliação Nine Box — [Nome do Avaliado]" e nome do período do Feedback (ex: "Q4/2025")
  - Seção "Desempenho" com questões 1–6, cada uma com escala de botões 1 a 5 (labels: 1=Ruim, 2=Regular, 3=Bom, 4=Muito Bom, 5=Ótimo)
  - Seção "Potencial" com questões 7–12, mesma escala
  - Seção "Descritiva" com questões 13 e 14 como `<textarea>` obrigatórios
  - Botão "Enviar Avaliação" (desabilitado até todas as questões 1–14 estarem preenchidas)
- [ ] Server Action `submitNineBoxResponse(evaluatorId, respostas)`:
  - Valida que todas as questões 1–12 têm valor entre 1 e 5
  - Valida que q13 e q14 não estão vazias
  - Salva as respostas no `NineBoxEvaluator`
  - Atualiza `status: completed` e `completedAt: now()`
- [ ] Após envio, exibir tela de confirmação: "Obrigado! Sua avaliação foi registrada."
- [ ] Typecheck/lint passam
- [ ] Verificar no browser usando dev-browser skill

### US-005: Gestor acompanha status dos avaliadores
**Descrição:** Como gestor, quero ver quantos avaliadores já responderam e quem ainda está pendente.

**Acceptance Criteria:**
- [ ] Na página de detalhes do Feedback, quando há `NineBoxEvaluation` vinculada, exibir seção "Nine Box" com:
  - Badge de status: "Em andamento" (laranja) ou "Encerrado" (cinza)
  - Contador: "X de Y avaliadores responderam"
  - Lista dos avaliadores com nome e status individual: "Respondido" (verde) ou "Pendente" (amarelo)
  - Botão "Encerrar Avaliação" (visível apenas se status for `open` e pelo menos 1 avaliador tiver respondido)
- [ ] Server Action `closeNineBoxEvaluation(evaluationId)`:
  - Verifica acesso (gestor ou admin)
  - Atualiza `NineBoxEvaluation.status` para `closed`
- [ ] Ao encerrar, o botão desaparece e o badge muda para "Encerrado"
- [ ] Typecheck/lint passam
- [ ] Verificar no browser usando dev-browser skill

### US-006: Dashboard Nine Box para o gestor
**Descrição:** Como gestor, quero visualizar o resultado completo da avaliação Nine Box do colaborador, incluindo KPIs e posicionamento histórico na matriz.

**Acceptance Criteria:**
- [ ] Criar rota `/colaboradores/[id]/ninebox` (dentro do `(dashboard)` layout, acessível por gestor e admin)
- [ ] Exibir 4 KPI cards no topo:
  - **Média Geral**: média de todas as 12 questões numéricas (arredondado 2 casas decimais); delta em relação à avaliação anterior
  - **Potencialidade**: média das questões 7–12; delta em relação à avaliação anterior
  - **Desempenho**: média das questões 1–6; delta em relação à avaliação anterior
  - **Quadrante**: nome do quadrante atual + movimento (ex: "Alto Potencial → Profissional Chave — Regressão" se mudou negativamente, "Progressão" se melhorou, "Manutenção" se ficou no mesmo)
- [ ] O delta deve exibir: valor anterior entre parênteses, seta vermelha ▼ para queda, verde ▲ para melhora, e percentual de variação
- [ ] Exibir seção "Movimentação no Nine Box" com:
  - Subtítulo: "Eixos: Potencialidade (Y) x Desempenho (X) | Faixas: Baixo 1–2,33 | Médio 2,34–3,66 | Alto 3,67–5,00"
  - Grade 3×3 representando a avaliação **anterior** (se existir), com o quadrante do colaborador destacado e label com valores entre parênteses
  - Seta `→` entre as duas grades
  - Grade 3×3 representando a avaliação **atual**, com o quadrante atual destacado e label com valores
  - Se não houver avaliação anterior, exibir apenas a grade atual sem comparação
- [ ] Cores dos quadrantes (conforme imagem de referência):
  - Linha superior (Alto Potencial): tons de verde/azul
  - Linha do meio (Médio Potencial): tons de roxo/amarelo
  - Linha inferior (Baixo Potencial): tons de salmão/rosa
  - Quadrante ativo: cor mais saturada/destacada
- [ ] Os cálculos consideram apenas `NineBoxEvaluator` com `status: completed`
- [ ] Se a avaliação está `open` e tem pelo menos 1 resposta, exibir o resultado parcial com aviso "Avaliação em andamento — resultado parcial"
- [ ] Typecheck/lint passam
- [ ] Verificar no browser usando dev-browser skill

### US-007: Colaborador visualiza seu resultado Nine Box
**Descrição:** Como colaborador, quero ver meu resultado Nine Box (médias e quadrante) sem ter acesso aos comentários individuais dos colegas.

**Acceptance Criteria:**
- [ ] Na página `/perfil` ou em uma rota `/meu-ninebox`, o colaborador pode visualizar seu resultado mais recente (apenas se a avaliação estiver `closed`)
- [ ] Exibir apenas:
  - Média de Desempenho (2 casas decimais)
  - Média de Potencial (2 casas decimais)
  - Média Geral (2 casas decimais)
  - Nome do quadrante atual
  - Grade 3×3 com o quadrante destacado (sem valores numéricos nos outros quadrantes)
- [ ] **Não exibir**: nomes dos avaliadores, notas individuais, q13 (pontos fortes), q14 (oportunidades) de nenhum avaliador
- [ ] Se não houver avaliação encerrada, exibir mensagem: "Nenhuma avaliação Nine Box disponível."
- [ ] O acesso é controlado pelo access control existente (employee vê apenas o próprio)
- [ ] Typecheck/lint passam
- [ ] Verificar no browser usando dev-browser skill

### US-008: Adicionar link de navegação para o Nine Box do colaborador
**Descrição:** Como gestor, quero acessar facilmente o dashboard Nine Box de um colaborador a partir da lista de colaboradores ou da página do feedback.

**Acceptance Criteria:**
- [ ] Na página de detalhes do Feedback, quando a `NineBoxEvaluation` estiver `closed`, exibir botão/link "Ver Resultado Nine Box" que navega para `/colaboradores/[employeeId]/ninebox`
- [ ] Na página de detalhes do Colaborador (`/colaboradores/[id]`), exibir aba ou link "Nine Box" que leva para `/colaboradores/[id]/ninebox`
- [ ] Typecheck/lint passam
- [ ] Verificar no browser usando dev-browser skill

---

## Functional Requirements

- **FR-1**: Cada `Feedback` pode ter no máximo uma `NineBoxEvaluation` vinculada (relação 1:1)
- **FR-2**: Apenas o gestor do Feedback (ou admin) pode iniciar, acompanhar e encerrar a avaliação Nine Box
- **FR-3**: O gestor seleciona manualmente os avaliadores entre usuários ativos do sistema, excluindo o avaliado e si mesmo
- **FR-4**: Avaliadores recebem notificação interna (tipo `ninebox_invite`) + e-mail ao serem convidados
- **FR-5**: O formulário de resposta requer autenticação; `evaluatorId` deve pertencer ao usuário logado
- **FR-6**: Todas as 12 questões numéricas (escala 1–5) e as 2 questões abertas são obrigatórias para submissão
- **FR-7**: Um avaliador só pode responder uma vez (status `completed` bloqueia novo acesso)
- **FR-8**: Avaliadores não podem ver as respostas uns dos outros
- **FR-9**: Desempenho = média aritmética de q1–q6 dos avaliadores que completaram; Potencial = média de q7–q12
- **FR-10**: Quadrante determinado por: Desempenho (X) × Potencial (Y), usando faixas Baixo (1–2,33), Médio (2,34–3,66), Alto (3,67–5,00)
- **FR-11**: O colaborador avaliado vê apenas as médias e o quadrante de avaliações `closed`; nunca vê q13, q14 ou notas individuais
- **FR-12**: O histórico de quadrantes usa todas as `NineBoxEvaluation` com `status: closed` daquele colaborador, ordenadas por `createdAt`
- **FR-13**: A avaliação só pode ser encerrada (`closed`) pelo gestor; não há encerramento automático

---

## Non-Goals (Fora do Escopo)

- Não há encerramento automático por prazo (o gestor decide quando encerrar)
- Não há autoavaliação (o próprio colaborador não responde o formulário sobre si mesmo)
- Não há relatório consolidado de toda a equipe na matriz (ex: todos os colaboradores numa grade só)
- Não há integração com Outlook para os convites dos avaliadores
- Não há anonimização configurável (sempre anônimo para o avaliado)
- Não há edição de respostas após submissão
- Não há reenvio de notificação para avaliadores que não responderam (v1)

---

## Design Considerations

- Reutilizar o componente de grade 3×3 como componente React puro (`NineBoxGrid`) que recebe `desempenho` e `potencial` como props e destaca o quadrante correspondente
- Cores dos quadrantes devem seguir a referência visual fornecida (imagem do dashboard)
- Para a escala 1–5 no formulário, usar botões de seleção únicos horizontais com label ao lado (ex: "1 — Ruim ... 5 — Ótimo")
- O dashboard do gestor deve seguir o layout da imagem de referência: 4 cards no topo + seção de movimentação com duas grades lado a lado
- Reutilizar os componentes de `Notification` e `email.ts` existentes para os envios

---

## Technical Considerations

- **Schema**: Adicionar `NineBoxEvaluation` com `feedbackId @unique` (1:1 com Feedback), `NineBoxEvaluator` com `@@unique([evaluationId, evaluatorId])`
- **Access control**: usar `getAccessibleEmployeeIds()` existente nas Server Actions do dashboard Nine Box; o formulário de resposta (`/ninebox/[evaluatorId]`) usa validação direta por `evaluatorId`
- **Cálculo de médias**: calcular on-the-fly nas Server Actions (não persistir as médias calculadas — sempre recalcular dos dados brutos)
- **Rota do formulário**: criar fora do grupo `(dashboard)` para ter layout próprio (sem sidebar), mas ainda protegida por `getServerSession`
- **Notificação de tipo `ninebox_invite`**: adicionar ao enum `NotificationType` no schema e ao componente de exibição de notificações existente

---

## Success Metrics

- Gestor consegue disparar e encerrar uma avaliação Nine Box em menos de 2 minutos
- Avaliador acessa, preenche e envia o formulário em menos de 5 minutos
- Dashboard exibe corretamente a movimentação histórica comparando a avaliação atual com a anterior
- Colaborador não tem acesso a nenhum dado individual dos avaliadores

---

## Open Questions

- **Localização do "Meu Nine Box" para o colaborador**: colocar na página `/perfil` (aba) ou criar rota dedicada `/meu-ninebox`? Recomendação: aba no perfil.
- **Período do Nine Box**: usar o campo `Feedback.period` como período da avaliação (ex: "Q4/2025") — confirmar se esse campo já está preenchido nos feedbacks existentes.
- **Avaliadores de ciclos anteriores**: ao abrir uma nova avaliação, o gestor quer sugestão dos mesmos avaliadores do ciclo anterior ou começa do zero?
