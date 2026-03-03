"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarCheck, CalendarPlus } from "lucide-react";
import type { AccessibleUnit, PeriodOption, ComplianceEmployee } from "@/app/(dashboard)/programacao/actions";
import { getUnitPeriods, getSectorComplianceStatus } from "@/app/(dashboard)/programacao/actions";
import { ProgramEventsWizard } from "./program-events-wizard";

type StatusFilter = "all" | "not_scheduled" | "scheduled" | "done";

interface ProgramacaoPanelProps {
  units: AccessibleUnit[];
}

export function ProgramacaoPanel({ units }: ProgramacaoPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialUnit = searchParams.get("unit") ?? "";
  const initialPeriod = searchParams.get("period") ?? "";

  const [unitId, setUnitId] = useState(initialUnit);
  const type = "feedback" as const;
  const [periods, setPeriods] = useState<PeriodOption[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState(initialPeriod);
  const [employees, setEmployees] = useState<ComplianceEmployee[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [noConfig, setNoConfig] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showWizard, setShowWizard] = useState(false);

  const updateUrl = useCallback(
    (unit: string, t: string, period: string) => {
      const params = new URLSearchParams();
      if (unit) params.set("unit", unit);
      if (t) params.set("type", t);
      if (period) params.set("period", period);
      router.replace(`/programacao?${params.toString()}`, { scroll: false });
    },
    [router]
  );

  useEffect(() => {
    if (!unitId) {
      setPeriods([]);
      setSelectedPeriod("");
      setEmployees([]);
      setNoConfig(false);
      return;
    }

    async function fetchPeriods() {
      setLoadingPeriods(true);
      setNoConfig(false);
      const result = await getUnitPeriods(unitId, type);
      setPeriods(result);
      if (result.length === 0) {
        setNoConfig(true);
        setSelectedPeriod("");
        setEmployees([]);
      } else {
        const existing = result.find((p) => p.label === initialPeriod);
        const now = new Date();
        const currentPeriod = result.find(
          (p) => now >= new Date(p.start) && now <= new Date(p.end)
        );
        const selected = existing?.label ?? currentPeriod?.label ?? result[0].label;
        setSelectedPeriod(selected);
      }
      setLoadingPeriods(false);
    }
    fetchPeriods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId, type]);

  useEffect(() => {
    if (!unitId || !selectedPeriod || periods.length === 0) {
      setEmployees([]);
      return;
    }

    const period = periods.find((p) => p.label === selectedPeriod);
    if (!period) return;

    async function fetchCompliance() {
      setLoading(true);
      const result = await getSectorComplianceStatus(
        unitId,
        new Date(period!.start),
        new Date(period!.end),
        type
      );
      if (result.success && result.data) {
        setEmployees(result.data);
      }
      setLoading(false);
      updateUrl(unitId, type, selectedPeriod);
    }
    fetchCompliance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId, selectedPeriod, type, periods]);

  const notScheduledCount = employees.filter((e) => e.status === "not_scheduled").length;
  const scheduledCount = employees.filter((e) => e.status === "scheduled").length;
  const doneCount = employees.filter((e) => e.status === "done").length;
  const total = employees.length;

  const filteredEmployees = statusFilter === "all"
    ? employees
    : employees.filter((e) => e.status === statusFilter);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Unidade Organizacional
            </label>
            <select
              value={unitId}
              onChange={(e) => {
                setUnitId(e.target.value);
                setSelectedPeriod("");
                setEmployees([]);
              }}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Selecione...</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Período
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              disabled={loadingPeriods || periods.length === 0}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            >
              {periods.length === 0 && (
                <option value="">
                  {loadingPeriods ? "Carregando..." : "Selecione um setor"}
                </option>
              )}
              {periods.map((p) => (
                <option key={p.label} value={p.label}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {noConfig && unitId && (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-8 text-center">
          <CalendarCheck className="mx-auto mb-3 text-gray-400 dark:text-gray-500" size={40} />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Setor sem configuração de recorrência para Feedback.
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Configure a recorrência em Configurações antes de programar eventos.
          </p>
        </div>
      )}

      {loading && (
        <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Carregando...
        </div>
      )}

      {!loading && !noConfig && employees.length > 0 && (
        <div className="space-y-4">
          {/* Progress bar and counters */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
            <div className="mb-3 flex h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
              {doneCount > 0 && (
                <div
                  className="bg-green-500 transition-all"
                  style={{ width: `${(doneCount / total) * 100}%` }}
                />
              )}
              {scheduledCount > 0 && (
                <div
                  className="bg-blue-500 transition-all"
                  style={{ width: `${(scheduledCount / total) * 100}%` }}
                />
              )}
              {notScheduledCount > 0 && (
                <div
                  className="bg-gray-300 dark:bg-gray-600 transition-all"
                  style={{ width: `${(notScheduledCount / total) * 100}%` }}
                />
              )}
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-400 dark:text-gray-500">{notScheduledCount} não programados</span>
              {" / "}
              <span className="font-medium text-blue-600">{scheduledCount} programados</span>
              {" / "}
              <span className="font-medium text-green-600">{doneCount} realizados</span>
              {" de "}
              <span className="font-medium text-gray-800 dark:text-gray-100">{total} total</span>
            </p>
          </div>

          {/* Filter and action bar */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">Todos</option>
                <option value="not_scheduled">Não programado</option>
                <option value="scheduled">Programado</option>
                <option value="done">Realizado</option>
              </select>
            </div>

            {notScheduledCount > 0 && (
              <button
                type="button"
                onClick={() => setShowWizard(true)}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <CalendarPlus size={16} />
                Programar Eventos
              </button>
            )}
          </div>

          {/* Table */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Nome</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Cargo</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Data</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {filteredEmployees.map((emp) => (
                    <tr
                      key={emp.employeeId}
                      className={
                        emp.status === "not_scheduled" ? "bg-yellow-50/50 dark:bg-yellow-900/20" : ""
                      }
                    >
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">
                        {emp.employeeName}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{emp.position}</td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          status={emp.status}
                          isOnboarding={emp.isOnboarding}
                          onboardingLabel={emp.onboardingLabel}
                        />
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {emp.eventDate
                          ? new Date(emp.eventDate).toLocaleDateString("pt-BR", { timeZone: "UTC" })
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {emp.eventHref ? (
                          <a
                            href={emp.eventHref}
                            className="text-sm text-blue-600 hover:underline"
                          >
                            Ver
                          </a>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {!loading && !noConfig && unitId && selectedPeriod && employees.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Nenhum colaborador encontrado para este setor e período.
          </p>
        </div>
      )}

      {/* Event Programming Wizard */}
      {showWizard && unitId && selectedPeriod && (() => {
        const period = periods.find((p) => p.label === selectedPeriod);
        if (!period) return null;
        const notScheduled = employees.filter((e) => e.status === "not_scheduled");
        return (
          <ProgramEventsWizard
            unitId={unitId}
            type={type}
            periodStart={period.start}
            periodEnd={period.end}
            notScheduledEmployees={notScheduled}
            onClose={() => setShowWizard(false)}
            onComplete={() => {
              // Refresh compliance data
              const p = periods.find((pp) => pp.label === selectedPeriod);
              if (p) {
                getSectorComplianceStatus(unitId, new Date(p.start), new Date(p.end), type)
                  .then((result) => {
                    if (result.success && result.data) setEmployees(result.data);
                  });
              }
            }}
          />
        );
      })()}
    </div>
  );
}

function StatusBadge({
  status,
  isOnboarding,
  onboardingLabel,
}: {
  status: string;
  isOnboarding?: boolean;
  onboardingLabel?: string;
}) {
  if (isOnboarding && onboardingLabel) {
    return (
      <span className="inline-flex rounded-full bg-purple-100 dark:bg-purple-900/50 px-2.5 py-0.5 text-xs font-medium text-purple-800 dark:text-purple-300">
        {onboardingLabel}
      </span>
    );
  }

  switch (status) {
    case "done":
      return (
        <span className="inline-flex rounded-full bg-green-100 dark:bg-green-900/50 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:text-green-300">
          Realizado
        </span>
      );
    case "scheduled":
      return (
        <span className="inline-flex rounded-full bg-blue-100 dark:bg-blue-900/50 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:text-blue-300">
          Programado
        </span>
      );
    default:
      return (
        <span className="inline-flex rounded-full bg-gray-100 dark:bg-gray-700 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400">
          Não programado
        </span>
      );
  }
}
