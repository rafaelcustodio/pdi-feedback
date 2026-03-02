"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Save, Play, ArrowLeft, Plus, Trash2, CalendarClock, CalendarX2, Calendar } from "lucide-react";
import Link from "next/link";
import {
  createPDI,
  updatePDI,
  reschedulePDI,
  cancelScheduledPDI,
} from "@/app/(dashboard)/pdis/actions";
import type { SubordinateOption, GoalInput } from "@/app/(dashboard)/pdis/actions";

interface PDIFormProps {
  mode: "create" | "edit";
  subordinates?: SubordinateOption[];
  managerId?: string;
  managerName?: string;
  initialData?: {
    id: string;
    employeeId: string;
    employeeName: string;
    period: string;
    status?: string;
    scheduledAt?: string;
    conductedAt: string;
    createdAt?: string;
    goals: {
      id: string;
      developmentObjective: string;
      actions: string;
      status: string;
      dueDate: string;
      startDate?: string;
      expectedResults?: string;
      responsibleId?: string;
      completedAt?: string;
      successMetrics?: string;
      achievedResults?: string;
    }[];
  };
}

function createEmptyGoal(): GoalInput {
  return {
    developmentObjective: "",
    actions: "",
    status: "pending",
    dueDate: "",
    startDate: "",
    expectedResults: "",
    responsibleId: "",
    completedAt: "",
    successMetrics: "",
    achievedResults: "",
  };
}

export function PDIForm({
  mode,
  subordinates,
  managerId,
  managerName,
  initialData,
}: PDIFormProps) {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState(initialData?.employeeId ?? "");
  const [period, setPeriod] = useState(initialData?.period ?? "");
  const [conductedAt, setConductedAt] = useState(initialData?.conductedAt ?? "");
  const [goals, setGoals] = useState<GoalInput[]>(
    initialData?.goals && initialData.goals.length > 0
      ? initialData.goals
      : [createEmptyGoal()]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const minRescheduleDate = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  }, []);

  const canRescheduleOrCancel =
    mode === "edit" &&
    initialData?.scheduledAt &&
    (initialData?.status === "scheduled" || initialData?.status === "draft");

  const hasValidGoals = goals.some(
    (g) => g.developmentObjective.trim()
  );

  const canActivate =
    (mode === "create" ? !!employeeId : true) &&
    !!period.trim() &&
    !!conductedAt &&
    hasValidGoals;

  function updateGoal(index: number, field: keyof GoalInput, value: string) {
    setGoals((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function addGoal() {
    setGoals((prev) => [...prev, createEmptyGoal()]);
  }

  function removeGoal(index: number) {
    setGoals((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleSave(activate: boolean) {
    setLoading(true);
    setError(null);

    const goalsData = goals.filter((g) => g.developmentObjective.trim());

    let result;
    if (mode === "create") {
      result = await createPDI({
        employeeId,
        period,
        conductedAt,
        goals: goalsData,
        activate,
      });
    } else {
      result = await updatePDI(initialData!.id, {
        period,
        conductedAt,
        goals: goalsData,
        activate,
      });
    }

    setLoading(false);

    if (result.success) {
      router.push("/pdis");
    } else {
      setError(result.error ?? "Erro ao salvar");
    }
  }

  async function handleReschedule() {
    if (!rescheduleDate || !initialData?.id) return;
    setLoading(true);
    setError(null);
    const result = await reschedulePDI(initialData.id, rescheduleDate);
    setLoading(false);
    if (result.success) {
      setShowRescheduleModal(false);
      setRescheduleDate("");
      router.push("/pdis");
    } else {
      setError(result.error ?? "Erro ao reagendar");
    }
  }

  async function handleCancelEvent() {
    if (!initialData?.id) return;
    setLoading(true);
    setError(null);
    const result = await cancelScheduledPDI(initialData.id);
    setLoading(false);
    if (result.success) {
      setShowCancelModal(false);
      router.push("/pdis");
    } else {
      setError(result.error ?? "Erro ao cancelar evento");
    }
  }

  function handleSubmitForm(e: React.FormEvent) {
    e.preventDefault();
    handleSave(false);
  }

  return (
    <form onSubmit={handleSubmitForm} className="space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/pdis"
          className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {mode === "create" ? "Novo PDI" : "Editar PDI"}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {mode === "create"
              ? "Crie um plano de desenvolvimento para um colaborador da sua equipe."
              : `Edite o PDI de ${initialData?.employeeName}.`}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {initialData?.status === "scheduled" && initialData.scheduledAt && (
        <div className="flex items-start gap-3 rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <CalendarClock size={20} className="mt-0.5 shrink-0 text-blue-600" />
          <p>
            Este PDI está agendado para{" "}
            <strong>
              {new Date(initialData.scheduledAt + "T00:00:00").toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </strong>
            . Preencha antes da reunião.
          </p>
        </div>
      )}

      {/* Basic Info */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-medium text-gray-900">
          Informações Gerais
        </h2>
        <div className="space-y-3">
          {/* Employee selection (create mode only) */}
          {mode === "create" && subordinates && (
            <div>
              <label
                htmlFor="pdi-employee"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Colaborador *
              </label>
              <select
                id="pdi-employee"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
                disabled={loading}
              >
                <option value="">Selecione um colaborador</option>
                {subordinates.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} ({sub.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Employee name (edit mode - read only) */}
          {mode === "edit" && initialData && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Colaborador
              </label>
              <p className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {initialData.employeeName}
              </p>
            </div>
          )}

          {/* Period + Conducted At - 2 columns */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Period */}
            <div>
              <label
                htmlFor="pdi-period"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Período *
              </label>
              <input
                id="pdi-period"
                type="text"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="Ex: 1º Semestre 2026, Q1 2026"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
                disabled={loading}
              />
            </div>

            {/* Conducted At */}
            <div>
              <label
                htmlFor="pdi-conducted-at"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Data de realização
              </label>
              <input
                id="pdi-conducted-at"
                type="date"
                value={conductedAt}
                onChange={(e) => setConductedAt(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={loading}
              />
            </div>
          </div>

          {/* Created At (read-only, edit mode only) */}
          {mode === "edit" && initialData?.createdAt && (
            <div className="sm:w-1/2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Data de criação
              </label>
              <p className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {new Date(initialData.createdAt).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Goals Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">
            Metas ({goals.length})
          </h2>
          <button
            type="button"
            onClick={addGoal}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
          >
            <Plus size={14} />
            Adicionar Meta
          </button>
        </div>

        <div className="space-y-3">
          {goals.map((goal, index) => (
            <div
              key={index}
              className="rounded-lg border border-gray-200 bg-gray-50 p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Meta {index + 1}
                </span>
                {goals.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeGoal(index)}
                    disabled={loading}
                    className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-red-500 disabled:opacity-50"
                    title="Remover meta"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {/* Development Objective */}
                <div className="sm:col-span-2">
                  <label
                    htmlFor={`goal-obj-${index}`}
                    className="mb-1 block text-xs font-medium text-gray-600"
                  >
                    Objetivo de Desenvolvimento *
                  </label>
                  <input
                    id={`goal-obj-${index}`}
                    type="text"
                    value={goal.developmentObjective}
                    onChange={(e) => updateGoal(index, "developmentObjective", e.target.value)}
                    placeholder="Ex: Concluir certificação AWS"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={loading}
                  />
                </div>

                {/* Actions */}
                <div className="sm:col-span-2">
                  <label
                    htmlFor={`goal-actions-${index}`}
                    className="mb-1 block text-xs font-medium text-gray-600"
                  >
                    Ações / Atividades
                  </label>
                  <textarea
                    id={`goal-actions-${index}`}
                    value={goal.actions}
                    onChange={(e) =>
                      updateGoal(index, "actions", e.target.value)
                    }
                    placeholder="Detalhes sobre as ações e atividades para atingir o objetivo..."
                    rows={2}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={loading}
                  />
                </div>

                {/* Start Date */}
                <div>
                  <label
                    htmlFor={`goal-startdate-${index}`}
                    className="mb-1 block text-xs font-medium text-gray-600"
                  >
                    Início
                  </label>
                  <input
                    id={`goal-startdate-${index}`}
                    type="date"
                    value={goal.startDate || ""}
                    onChange={(e) =>
                      updateGoal(index, "startDate", e.target.value)
                    }
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={loading}
                  />
                </div>

                {/* Due Date */}
                <div>
                  <label
                    htmlFor={`goal-duedate-${index}`}
                    className="mb-1 block text-xs font-medium text-gray-600"
                  >
                    Prazo Final
                  </label>
                  <input
                    id={`goal-duedate-${index}`}
                    type="date"
                    value={goal.dueDate}
                    onChange={(e) =>
                      updateGoal(index, "dueDate", e.target.value)
                    }
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={loading}
                  />
                </div>

                {/* Expected Results */}
                <div className="sm:col-span-2">
                  <label
                    htmlFor={`goal-expected-${index}`}
                    className="mb-1 block text-xs font-medium text-gray-600"
                  >
                    Resultados Esperados
                  </label>
                  <textarea
                    id={`goal-expected-${index}`}
                    value={goal.expectedResults || ""}
                    onChange={(e) =>
                      updateGoal(index, "expectedResults", e.target.value)
                    }
                    placeholder="Descreva os resultados esperados..."
                    rows={2}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={loading}
                  />
                </div>

                {/* Responsible */}
                <div>
                  <label
                    htmlFor={`goal-responsible-${index}`}
                    className="mb-1 block text-xs font-medium text-gray-600"
                  >
                    Responsável
                  </label>
                  <select
                    id={`goal-responsible-${index}`}
                    value={goal.responsibleId || ""}
                    onChange={(e) =>
                      updateGoal(index, "responsibleId", e.target.value)
                    }
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={loading}
                  >
                    <option value="">Selecione</option>
                    {(initialData?.employeeId || employeeId) && (
                      <option value={initialData?.employeeId || employeeId}>
                        {initialData?.employeeName || subordinates?.find(s => s.id === employeeId)?.name || "Colaborador"} (Colaborador)
                      </option>
                    )}
                    {managerId && (
                      <option value={managerId}>
                        {managerName} (Gestor)
                      </option>
                    )}
                  </select>
                </div>

                {/* Success Metrics */}
                <div>
                  <label
                    htmlFor={`goal-metrics-${index}`}
                    className="mb-1 block text-xs font-medium text-gray-600"
                  >
                    Métricas de Sucesso
                  </label>
                  <input
                    id={`goal-metrics-${index}`}
                    type="text"
                    value={goal.successMetrics || ""}
                    onChange={(e) =>
                      updateGoal(index, "successMetrics", e.target.value)
                    }
                    placeholder="Ex: Aprovação no exame com nota >= 80%"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={loading}
                  />
                </div>

                {/* Completed At */}
                <div>
                  <label
                    htmlFor={`goal-completed-${index}`}
                    className="mb-1 block text-xs font-medium text-gray-600"
                  >
                    Término
                  </label>
                  <input
                    id={`goal-completed-${index}`}
                    type="date"
                    value={goal.completedAt || ""}
                    onChange={(e) =>
                      updateGoal(index, "completedAt", e.target.value)
                    }
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                    disabled={loading || goal.status !== "completed"}
                  />
                </div>

                {/* Achieved Results */}
                <div>
                  <label
                    htmlFor={`goal-achieved-${index}`}
                    className="mb-1 block text-xs font-medium text-gray-600"
                  >
                    Resultados Obtidos
                  </label>
                  <input
                    id={`goal-achieved-${index}`}
                    type="text"
                    value={goal.achievedResults || ""}
                    onChange={(e) =>
                      updateGoal(index, "achievedResults", e.target.value)
                    }
                    placeholder="Descreva os resultados obtidos..."
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                    disabled={loading || goal.status !== "completed"}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/pdis"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          {canRescheduleOrCancel && (
            <>
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                <CalendarX2 size={16} />
                Cancelar Evento
              </button>
              <button
                type="button"
                onClick={() => setShowRescheduleModal(true)}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-md border border-orange-300 px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-50 disabled:opacity-50"
              >
                <Calendar size={16} />
                Reagendar
              </button>
            </>
          )}
          <button
            type="submit"
            disabled={loading || !period.trim() || (mode === "create" && !employeeId)}
            className="inline-flex items-center gap-2 rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            <Save size={16} />
            {loading ? "Salvando..." : "Salvar Rascunho"}
          </button>
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={loading || !canActivate}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            title={
              !canActivate
                ? "Preencha todos os campos e adicione pelo menos uma meta com objetivo de desenvolvimento para ativar"
                : ""
            }
          >
            <Play size={16} />
            {loading ? "Ativando..." : "Ativar PDI"}
          </button>
        </div>
      </div>

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              Reagendar PDI
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Selecione a nova data para este PDI.
            </p>
            <div className="mt-4">
              <label
                htmlFor="reschedule-date"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Nova data *
              </label>
              <input
                id="reschedule-date"
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                min={minRescheduleDate}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                A data deve ser futura (a partir de amanhã).
              </p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowRescheduleModal(false);
                  setRescheduleDate("");
                }}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleReschedule}
                disabled={!rescheduleDate || loading}
                className="inline-flex items-center gap-2 rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
              >
                <Calendar size={16} />
                {loading ? "Reagendando..." : "Confirmar Reagendamento"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              Cancelar PDI agendado
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Tem certeza que deseja cancelar este PDI agendado?
              {initialData?.status === "scheduled"
                ? " O registro será removido."
                : " O PDI será marcado como cancelado."}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleCancelEvent}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                <CalendarX2 size={16} />
                {loading ? "Cancelando..." : "Confirmar Cancelamento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
