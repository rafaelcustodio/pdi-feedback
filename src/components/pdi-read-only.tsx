"use client";

import Link from "next/link";
import { ArrowLeft, Target, Calendar } from "lucide-react";
import type { PDIDetail } from "@/app/(dashboard)/pdis/actions";

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

export function PDIReadOnly({ pdi }: { pdi: PDIDetail }) {
  const completedGoals = pdi.goals.filter((g) => g.status === "completed").length;
  const progressPct =
    pdi.goals.length > 0
      ? Math.round((completedGoals / pdi.goals.length) * 100)
      : 0;

  return (
    <div className="space-y-6">
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

      {/* Goals */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-medium text-gray-900">
          Metas ({pdi.goals.length})
        </h2>

        {pdi.goals.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma meta cadastrada.</p>
        ) : (
          <div className="space-y-3">
            {pdi.goals.map((goal) => (
              <div
                key={goal.id}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Target size={14} className="text-gray-400" />
                      <h3 className="font-medium text-gray-900">
                        {goal.developmentObjective}
                      </h3>
                    </div>
                    {goal.actions && (
                      <p className="mt-1 text-sm text-gray-600">
                        {goal.actions}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      {goal.dueDate && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(goal.dueDate).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
                      goalStatusColors[goal.status] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {goalStatusLabels[goal.status] ?? goal.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="text-xs text-gray-400">
        Criado em {new Date(pdi.createdAt).toLocaleDateString("pt-BR")} |
        Última atualização em {new Date(pdi.updatedAt).toLocaleDateString("pt-BR")}
      </div>
    </div>
  );
}
