"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarCheck } from "lucide-react";
import type { AccessibleUnit, PeriodOption, ComplianceEmployee } from "@/app/(dashboard)/programacao/actions";
import { getUnitPeriods, getSectorComplianceStatus } from "@/app/(dashboard)/programacao/actions";

interface ProgramacaoPanelProps {
  units: AccessibleUnit[];
}

export function ProgramacaoPanel({ units }: ProgramacaoPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialUnit = searchParams.get("unit") ?? "";
  const initialType = (searchParams.get("type") as "pdi" | "feedback") || "pdi";
  const initialPeriod = searchParams.get("period") ?? "";

  const [unitId, setUnitId] = useState(initialUnit);
  const [type, setType] = useState<"pdi" | "feedback">(initialType);
  const [periods, setPeriods] = useState<PeriodOption[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState(initialPeriod);
  const [employees, setEmployees] = useState<ComplianceEmployee[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [noConfig, setNoConfig] = useState(false);

  // Update URL when filters change
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

  // Fetch periods when unit or type changes
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
        // Select the initial period from URL or the current period
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

  // Fetch compliance data when period changes
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

  const selectedUnit = units.find((u) => u.id === unitId);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Unit selector */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Unidade Organizacional
            </label>
            <select
              value={unitId}
              onChange={(e) => {
                setUnitId(e.target.value);
                setSelectedPeriod("");
                setEmployees([]);
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Selecione...</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type toggle */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Tipo
            </label>
            <div className="flex rounded-md border border-gray-300">
              <button
                type="button"
                onClick={() => setType("pdi")}
                className={`flex-1 rounded-l-md px-3 py-2 text-sm font-medium transition-colors ${
                  type === "pdi"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                PDI
              </button>
              <button
                type="button"
                onClick={() => setType("feedback")}
                className={`flex-1 rounded-r-md px-3 py-2 text-sm font-medium transition-colors ${
                  type === "feedback"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Feedback
              </button>
            </div>
          </div>

          {/* Period selector */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Período
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              disabled={loadingPeriods || periods.length === 0}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
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

      {/* No configuration message */}
      {noConfig && unitId && (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
          <CalendarCheck className="mx-auto mb-3 text-gray-400" size={40} />
          <p className="text-sm text-gray-500">
            Setor sem configuração de recorrência para {type === "pdi" ? "PDI" : "Feedback"}.
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Configure a recorrência em Configurações antes de programar eventos.
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="py-8 text-center text-sm text-gray-500">
          Carregando...
        </div>
      )}

      {/* Compliance data placeholder - will be populated by US-012 */}
      {!loading && !noConfig && employees.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Nome</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Cargo</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Data</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {employees.map((emp) => (
                  <tr key={emp.employeeId}>
                    <td className="px-4 py-3 font-medium text-gray-800">{emp.employeeName}</td>
                    <td className="px-4 py-3 text-gray-600">{emp.position}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={emp.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {emp.eventDate
                        ? new Date(emp.eventDate).toLocaleDateString("pt-BR")
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
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state when no employees */}
      {!loading && !noConfig && unitId && selectedPeriod && employees.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
          <p className="text-sm text-gray-500">
            Nenhum colaborador encontrado para este setor e período.
          </p>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "done":
      return (
        <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
          Realizado
        </span>
      );
    case "scheduled":
      return (
        <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
          Programado
        </span>
      );
    default:
      return (
        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
          Não programado
        </span>
      );
  }
}
