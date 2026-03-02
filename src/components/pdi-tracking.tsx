"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Plus,
  Send,
  FileText,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  Circle,
  XCircle,
  Pencil,
} from "lucide-react";
import type { PDIDetail, GoalInput } from "@/app/(dashboard)/pdis/actions";
import {
  addEvidence,
  addComment,
  updateGoalStatus,
  updateGoal,
  updateComment,
  updateEvidence,
  addGoal as addGoalAction,
} from "@/app/(dashboard)/pdis/actions";

const statusLabels: Record<string, string> = {
  active: "Ativo",
  cancelled: "Cancelado",
};

const statusColors: Record<string, string> = {
  active: "bg-blue-100 text-blue-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const goalStatusLabels: Record<string, string> = {
  pending: "Pendente",
  in_progress: "Em Andamento",
  completed: "Concluída",
};

const goalStatusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
};

const goalStatusIcons: Record<string, typeof Circle> = {
  pending: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
};

interface PDITrackingProps {
  pdi: PDIDetail;
  userId: string;
  userRole: string;
}

export function PDITracking({ pdi, userId, userRole }: PDITrackingProps) {
  const isEmployee = pdi.employeeId === userId;
  const isManager = pdi.managerId === userId || userRole === "admin";

  const completedGoals = pdi.goals.filter(
    (g) => g.status === "completed"
  ).length;
  const progressPct =
    pdi.goals.length > 0
      ? Math.round((completedGoals / pdi.goals.length) * 100)
      : 0;

  // Separate active and completed goals
  const activeGoals = pdi.goals.filter((g) => g.status !== "completed");
  const doneGoals = pdi.goals.filter((g) => g.status === "completed");

  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/pdis"
          className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">
              PDI - {pdi.employeeName}
            </h1>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                statusColors[pdi.status] ?? "bg-gray-100 text-gray-500"
              }`}
            >
              {statusLabels[pdi.status] ?? pdi.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Gestor: {pdi.managerName}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      {pdi.goals.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">Progresso</span>
            <span className="text-gray-500">
              {completedGoals}/{pdi.goals.length} metas ({progressPct}%)
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-gray-200">
            <div
              className="h-2.5 rounded-full bg-blue-600 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Goals - Active/In Progress */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">
            Metas ({pdi.goals.length})
          </h2>
          {isManager && pdi.status === "active" && (
            <button
              onClick={() => setShowAddGoal(!showAddGoal)}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus size={14} />
              Nova Meta
            </button>
          )}
        </div>

        {/* Add Goal Form */}
        {showAddGoal && (
          <AddGoalForm
            pdiId={pdi.id}
            employeeId={pdi.employeeId}
            employeeName={pdi.employeeName}
            managerId={pdi.managerId}
            managerName={pdi.managerName}
            onClose={() => setShowAddGoal(false)}
          />
        )}

        {activeGoals.length === 0 && doneGoals.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma meta cadastrada.</p>
        ) : (
          <div className="space-y-4">
            {activeGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                isEmployee={isEmployee}
                isManager={isManager}
                pdiStatus={pdi.status}
                userId={userId}
                employeeId={pdi.employeeId}
                managerId={pdi.managerId}
                employeeName={pdi.employeeName}
                managerName={pdi.managerName}
              />
            ))}
          </div>
        )}

        {/* Completed Goals - Collapsed */}
        {doneGoals.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              {showCompleted ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              Metas concluídas ({doneGoals.length})
            </button>
            {showCompleted && (
              <div className="mt-3 space-y-3">
                {doneGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    isEmployee={isEmployee}
                    isManager={isManager}
                    pdiStatus={pdi.status}
                    userId={userId}
                    employeeId={pdi.employeeId}
                    managerId={pdi.managerId}
                    employeeName={pdi.employeeName}
                    managerName={pdi.managerName}
                    defaultCollapsed
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Comments Section */}
      <CommentsSection
        pdiId={pdi.id}
        comments={pdi.comments}
        userId={userId}
      />

      {/* Metadata */}
      <div className="text-xs text-gray-400">
        {pdi.conductedAt && (
          <>
            Realizado em{" "}
            {new Date(pdi.conductedAt).toLocaleDateString("pt-BR")} |{" "}
          </>
        )}
        Criado em {new Date(pdi.createdAt).toLocaleDateString("pt-BR")} |
        Última atualização em{" "}
        {new Date(pdi.updatedAt).toLocaleDateString("pt-BR")}
      </div>
    </div>
  );
}

// ============================================================
// Add Goal Form (for continuous model)
// ============================================================

function AddGoalForm({
  pdiId,
  employeeId,
  employeeName,
  managerId,
  managerName,
  onClose,
}: {
  pdiId: string;
  employeeId: string;
  employeeName: string;
  managerId: string;
  managerName: string;
  onClose: () => void;
}) {
  const [objective, setObjective] = useState("");
  const [actions, setActions] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [expectedResults, setExpectedResults] = useState("");
  const [responsibleId, setResponsibleId] = useState("");
  const [successMetrics, setSuccessMetrics] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!objective.trim()) return;
    setLoading(true);
    setError(null);
    const result = await addGoalAction(pdiId, {
      developmentObjective: objective,
      actions,
      status: "pending",
      dueDate,
      startDate: startDate || undefined,
      expectedResults: expectedResults || undefined,
      responsibleId: responsibleId || undefined,
      successMetrics: successMetrics || undefined,
    });
    setLoading(false);
    if (result.success) {
      onClose();
    } else {
      setError(result.error ?? "Erro ao adicionar meta");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
      <p className="mb-3 text-sm font-medium text-blue-800">Nova Meta</p>
      {error && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Objetivo de Desenvolvimento *
          </label>
          <input
            type="text"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Ex: Concluir certificação AWS"
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={loading}
            required
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Ações / Atividades
          </label>
          <textarea
            value={actions}
            onChange={(e) => setActions(e.target.value)}
            rows={2}
            placeholder="Detalhes sobre as ações..."
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={loading}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Início</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={loading}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Prazo Final</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={loading}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-gray-700">Resultados Esperados</label>
          <textarea
            value={expectedResults}
            onChange={(e) => setExpectedResults(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={loading}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Responsável</label>
          <select
            value={responsibleId}
            onChange={(e) => setResponsibleId(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={loading}
          >
            <option value="">Selecione</option>
            <option value={employeeId}>{employeeName} (Colaborador)</option>
            <option value={managerId}>{managerName} (Gestor)</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Métricas de Sucesso</label>
          <input
            type="text"
            value={successMetrics}
            onChange={(e) => setSuccessMetrics(e.target.value)}
            placeholder="Ex: Nota >= 80%"
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={loading}
          />
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading || !objective.trim()}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Salvando..." : "Adicionar Meta"}
        </button>
      </div>
    </form>
  );
}

// ============================================================
// Goal Card with status management and evidence
// ============================================================

function GoalCard({
  goal,
  isEmployee,
  isManager,
  pdiStatus,
  userId,
  employeeId,
  managerId,
  employeeName,
  managerName,
  defaultCollapsed = false,
}: {
  goal: PDIDetail["goals"][number];
  isEmployee: boolean;
  isManager: boolean;
  pdiStatus: string;
  userId: string;
  employeeId: string;
  managerId: string;
  employeeName: string;
  managerName: string;
  defaultCollapsed?: boolean;
}) {
  const [expanded, setExpanded] = useState(!defaultCollapsed ? false : false);
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [evidenceDesc, setEvidenceDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Goal editing state
  const [editingGoal, setEditingGoal] = useState(false);
  const [editObjective, setEditObjective] = useState(goal.developmentObjective);
  const [editActions, setEditActions] = useState(goal.actions ?? "");
  const [editDueDate, setEditDueDate] = useState(
    goal.dueDate ? new Date(goal.dueDate).toISOString().split("T")[0] : ""
  );
  const [editStartDate, setEditStartDate] = useState(
    goal.startDate ? new Date(goal.startDate).toISOString().split("T")[0] : ""
  );
  const [editExpectedResults, setEditExpectedResults] = useState(goal.expectedResults ?? "");
  const [editResponsibleId, setEditResponsibleId] = useState(goal.responsibleId ?? "");
  const [editSuccessMetrics, setEditSuccessMetrics] = useState(goal.successMetrics ?? "");
  const [editCompletedAt, setEditCompletedAt] = useState(
    goal.completedAt ? new Date(goal.completedAt).toISOString().split("T")[0] : ""
  );
  const [editAchievedResults, setEditAchievedResults] = useState(goal.achievedResults ?? "");

  // Evidence editing state
  const [editingEvidenceId, setEditingEvidenceId] = useState<string | null>(null);
  const [editingEvidenceText, setEditingEvidenceText] = useState("");

  const StatusIcon = goalStatusIcons[goal.status] ?? Circle;
  const isActive = pdiStatus === "active";

  async function handleStatusChange(
    newStatus: "pending" | "in_progress" | "completed"
  ) {
    setLoading(true);
    setError(null);
    const result = await updateGoalStatus(goal.id, newStatus);
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Erro ao atualizar status");
    }
  }

  async function handleAddEvidence() {
    if (!evidenceDesc.trim()) return;
    setLoading(true);
    setError(null);
    const result = await addEvidence(goal.id, evidenceDesc);
    setLoading(false);
    if (result.success) {
      setEvidenceDesc("");
      setShowEvidenceForm(false);
    } else {
      setError(result.error ?? "Erro ao adicionar evidência");
    }
  }

  async function handleUpdateGoal() {
    setLoading(true);
    setError(null);
    const result = await updateGoal(goal.id, {
      developmentObjective: editObjective.trim(),
      actions: editActions,
      dueDate: editDueDate || undefined,
      startDate: editStartDate || undefined,
      expectedResults: editExpectedResults || undefined,
      responsibleId: editResponsibleId || undefined,
      successMetrics: editSuccessMetrics || undefined,
      completedAt: editCompletedAt || undefined,
      achievedResults: editAchievedResults || undefined,
    });
    setLoading(false);
    if (result.success) {
      setEditingGoal(false);
    } else {
      setError(result.error ?? "Erro ao salvar meta");
    }
  }

  async function handleUpdateEvidence(evidenceId: string) {
    setLoading(true);
    setError(null);
    const result = await updateEvidence(evidenceId, editingEvidenceText);
    setLoading(false);
    if (result.success) {
      setEditingEvidenceId(null);
    } else {
      setError(result.error ?? "Erro ao salvar evidência");
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50">
      {/* Goal Header */}
      <div
        className="cursor-pointer p-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <StatusIcon
                size={16}
                className={
                  goal.status === "completed"
                    ? "text-green-500"
                    : goal.status === "in_progress"
                      ? "text-blue-500"
                      : "text-gray-400"
                }
              />
              <h3 className="font-medium text-gray-900">{goal.developmentObjective}</h3>
            </div>
            {goal.actions && (
              <p className="mt-1 pl-6 text-sm text-gray-600">
                {goal.actions}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3 pl-6 text-xs text-gray-500">
              {goal.dueDate && (
                <span className="inline-flex items-center gap-1">
                  <Calendar size={12} />
                  {new Date(goal.dueDate).toLocaleDateString("pt-BR")}
                </span>
              )}
              {goal.evidences.length > 0 && (
                <span className="inline-flex items-center gap-1">
                  <FileText size={12} />
                  {goal.evidences.length} evidência
                  {goal.evidences.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isManager && isActive && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(true);
                  setEditingGoal(true);
                }}
                className="rounded p-1 text-gray-400 hover:text-blue-600"
                title="Editar meta"
              >
                <Pencil size={14} />
              </button>
            )}
            <span
              className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
                goalStatusColors[goal.status] ?? "bg-gray-100 text-gray-600"
              }`}
            >
              {goalStatusLabels[goal.status] ?? goal.status}
            </span>
            {expanded ? (
              <ChevronUp size={16} className="text-gray-400" />
            ) : (
              <ChevronDown size={16} className="text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-gray-200 p-4">
          {error && (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Goal Edit Form */}
          {editingGoal && (
            <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-4">
              <p className="mb-3 text-xs font-medium text-blue-700">Editar Meta</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Objetivo de Desenvolvimento *
                  </label>
                  <input
                    type="text"
                    value={editObjective}
                    onChange={(e) => setEditObjective(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={loading}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Ações / Atividades
                  </label>
                  <textarea
                    value={editActions}
                    onChange={(e) => setEditActions(e.target.value)}
                    rows={2}
                    className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Início
                  </label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Prazo Final
                  </label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={loading}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Resultados Esperados
                  </label>
                  <textarea
                    value={editExpectedResults}
                    onChange={(e) => setEditExpectedResults(e.target.value)}
                    rows={2}
                    placeholder="Descreva os resultados esperados..."
                    className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Responsável
                  </label>
                  <select
                    value={editResponsibleId}
                    onChange={(e) => setEditResponsibleId(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={loading}
                  >
                    <option value="">Selecione</option>
                    <option value={employeeId}>{employeeName} (Colaborador)</option>
                    <option value={managerId}>{managerName} (Gestor)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Métricas de Sucesso
                  </label>
                  <input
                    type="text"
                    value={editSuccessMetrics}
                    onChange={(e) => setEditSuccessMetrics(e.target.value)}
                    placeholder="Ex: Nota >= 80% no exame"
                    className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Término
                  </label>
                  <input
                    type="date"
                    value={editCompletedAt}
                    onChange={(e) => setEditCompletedAt(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                    disabled={loading || goal.status !== "completed"}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Resultados Obtidos
                  </label>
                  <input
                    type="text"
                    value={editAchievedResults}
                    onChange={(e) => setEditAchievedResults(e.target.value)}
                    placeholder="Descreva os resultados obtidos..."
                    className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                    disabled={loading || goal.status !== "completed"}
                  />
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  onClick={() => setEditingGoal(false)}
                  disabled={loading}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdateGoal}
                  disabled={loading || !editObjective.trim()}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          )}

          {/* Status Actions */}
          {isActive && (isEmployee || isManager) && (
            <div className="mb-4">
              <p className="mb-2 text-xs font-medium text-gray-500">
                Alterar Status:
              </p>
              <div className="flex flex-wrap gap-2">
                {isEmployee && goal.status !== "in_progress" && (
                  <button
                    onClick={() => handleStatusChange("in_progress")}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                  >
                    <Clock size={12} />
                    Marcar Em Andamento
                  </button>
                )}
                {isEmployee && goal.status !== "completed" && (
                  <button
                    onClick={() => handleStatusChange("completed")}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 rounded-md bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                  >
                    <CheckCircle2 size={12} />
                    Marcar Concluída
                  </button>
                )}
                {isManager && goal.status === "completed" && (
                  <button
                    onClick={() => handleStatusChange("in_progress")}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    <XCircle size={12} />
                    Rejeitar Conclusão
                  </button>
                )}
                {isManager && goal.status === "completed" && (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
                    <CheckCircle2 size={12} />
                    Aprovada
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Evidences List */}
          {goal.evidences.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-xs font-medium text-gray-500">
                Evidências ({goal.evidences.length}):
              </p>
              <div className="space-y-2">
                {goal.evidences.map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-md border border-gray-200 bg-white p-3"
                  >
                    {editingEvidenceId === ev.id ? (
                      <>
                        <textarea
                          value={editingEvidenceText}
                          onChange={(e) => setEditingEvidenceText(e.target.value)}
                          rows={3}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          disabled={loading}
                        />
                        <div className="mt-2 flex justify-end gap-2">
                          <button
                            onClick={() => setEditingEvidenceId(null)}
                            disabled={loading}
                            className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleUpdateEvidence(ev.id)}
                            disabled={loading || !editingEvidenceText.trim()}
                            className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            {loading ? "Salvando..." : "Salvar"}
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-gray-700">{ev.description}</p>
                        <div className="mt-1 flex items-center justify-between">
                          <p className="text-xs text-gray-400">
                            {new Date(ev.createdAt).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                          {ev.authorId === userId && (
                            <button
                              onClick={() => {
                                setEditingEvidenceId(ev.id);
                                setEditingEvidenceText(ev.description);
                              }}
                              className="rounded p-0.5 text-gray-400 hover:text-blue-600"
                              title="Editar evidência"
                            >
                              <Pencil size={12} />
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Evidence */}
          {isActive && (isEmployee || isManager) && (
            <div>
              {!showEvidenceForm ? (
                <button
                  onClick={() => setShowEvidenceForm(true)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
                >
                  <Plus size={12} />
                  Adicionar Evidência
                </button>
              ) : (
                <div className="rounded-md border border-gray-200 bg-white p-3">
                  <p className="mb-2 text-xs font-medium text-gray-500">
                    Nova Evidência:
                  </p>
                  <textarea
                    value={evidenceDesc}
                    onChange={(e) => setEvidenceDesc(e.target.value)}
                    placeholder="Descreva a evidência de progresso..."
                    rows={3}
                    className="mb-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={loading}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setShowEvidenceForm(false);
                        setEvidenceDesc("");
                      }}
                      disabled={loading}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleAddEvidence}
                      disabled={loading || !evidenceDesc.trim()}
                      className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Plus size={12} />
                      {loading ? "Salvando..." : "Salvar"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Comments Section
// ============================================================

function CommentsSection({
  pdiId,
  comments,
  userId,
}: {
  pdiId: string;
  comments: PDIDetail["comments"];
  userId: string;
}) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    setError(null);
    const result = await addComment(pdiId, content);
    setLoading(false);
    if (result.success) {
      setContent("");
    } else {
      setError(result.error ?? "Erro ao enviar comentário");
    }
  }

  async function handleUpdateComment(commentId: string) {
    setLoading(true);
    setError(null);
    const result = await updateComment(commentId, editingCommentText);
    setLoading(false);
    if (result.success) {
      setEditingCommentId(null);
    } else {
      setError(result.error ?? "Erro ao editar comentário");
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-medium text-gray-900">
        Comentários ({comments.length})
      </h2>

      {/* Comments List */}
      <div className="mb-4 max-h-96 space-y-3 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500">
            Nenhum comentário ainda. Inicie uma conversa sobre este PDI.
          </p>
        ) : (
          comments.map((comment) => {
            const isOwn = comment.authorId === userId;
            return (
              <div
                key={comment.id}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    isOwn
                      ? "bg-blue-50 text-blue-900"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  <p className="text-xs font-medium">
                    {isOwn ? "Você" : comment.authorName}
                  </p>
                  {editingCommentId === comment.id ? (
                    <div className="mt-1">
                      <textarea
                        value={editingCommentText}
                        onChange={(e) => setEditingCommentText(e.target.value)}
                        rows={3}
                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        disabled={loading}
                      />
                      <div className="mt-1 flex justify-end gap-2">
                        <button
                          onClick={() => setEditingCommentId(null)}
                          disabled={loading}
                          className="rounded px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleUpdateComment(comment.id)}
                          disabled={loading || !editingCommentText.trim()}
                          className="rounded bg-blue-600 px-2 py-0.5 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {loading ? "..." : "Salvar"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="mt-0.5 whitespace-pre-wrap text-sm">
                        {comment.content}
                      </p>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className="text-xs text-gray-400">
                          {new Date(comment.createdAt).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        {isOwn && (
                          <button
                            onClick={() => {
                              setEditingCommentId(comment.id);
                              setEditingCommentText(comment.content);
                            }}
                            className="rounded p-0.5 text-gray-400 hover:text-blue-600"
                            title="Editar comentário"
                          >
                            <Pencil size={11} />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={commentsEndRef} />
      </div>

      {/* Comment Input */}
      {error && (
        <div className="mb-2 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Escreva um comentário..."
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Send size={14} />
          {loading ? "..." : "Enviar"}
        </button>
      </form>
    </div>
  );
}
