"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import {
  updatePDI,
} from "@/app/(dashboard)/pdis/actions";
import type { GoalInput } from "@/app/(dashboard)/pdis/actions";

interface PDIFormProps {
  managerId?: string;
  managerName?: string;
  initialData: {
    id: string;
    employeeId: string;
    employeeName: string;
    conductedAt: string;
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
  managerId,
  managerName,
  initialData,
}: PDIFormProps) {
  const router = useRouter();
  const [conductedAt, setConductedAt] = useState(initialData.conductedAt ?? "");
  const [goals, setGoals] = useState<GoalInput[]>(
    initialData.goals && initialData.goals.length > 0
      ? initialData.goals
      : [createEmptyGoal()]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function handleSave() {
    setLoading(true);
    setError(null);

    const goalsData = goals.filter((g) => g.developmentObjective.trim());

    const result = await updatePDI(initialData.id, {
      conductedAt,
      goals: goalsData,
    });

    setLoading(false);

    if (result.success) {
      router.push("/pdis");
    } else {
      setError(result.error ?? "Erro ao salvar");
    }
  }

  function handleSubmitForm(e: React.FormEvent) {
    e.preventDefault();
    handleSave();
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
            Editar PDI
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Edite o PDI de {initialData.employeeName}.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-medium text-gray-900">
          Informações Gerais
        </h2>
        <div className="space-y-3">
          {/* Employee name (read only) */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Colaborador
            </label>
            <p className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
              {initialData.employeeName}
            </p>
          </div>

          {/* Conducted At */}
          <div className="sm:w-1/2">
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
                    <option value={initialData.employeeId}>
                      {initialData.employeeName} (Colaborador)
                    </option>
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
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Save size={16} />
          {loading ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}
