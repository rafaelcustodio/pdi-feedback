"use client";

import { useState } from "react";
import { Calendar, Settings, X, Save } from "lucide-react";
import type { SectorScheduleSummary } from "@/app/(dashboard)/configuracoes/actions";
import { saveSectorSchedule, deleteSectorSchedule } from "@/app/(dashboard)/configuracoes/actions";

const FREQUENCY_OPTIONS = [
  { value: "", label: "Não configurado" },
  { value: "1", label: "Mensal (1 mês)" },
  { value: "2", label: "Bimestral (2 meses)" },
  { value: "3", label: "Trimestral (3 meses)" },
  { value: "6", label: "Semestral (6 meses)" },
  { value: "12", label: "Anual (12 meses)" },
];

function frequencyLabel(months: number): string {
  const opt = FREQUENCY_OPTIONS.find((o) => o.value === String(months));
  return opt?.label ?? `${months} meses`;
}

interface SectorScheduleConfigProps {
  schedules: SectorScheduleSummary[];
}

export function SectorScheduleConfig({ schedules }: SectorScheduleConfigProps) {
  const [editingUnit, setEditingUnit] = useState<string | null>(null);
  const [pdiFreq, setPdiFreq] = useState("");
  const [pdiStart, setPdiStart] = useState("");
  const [feedbackFreq, setFeedbackFreq] = useState("");
  const [feedbackStart, setFeedbackStart] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function openConfig(unit: SectorScheduleSummary) {
    setEditingUnit(unit.unitId);
    setPdiFreq(unit.pdi ? String(unit.pdi.frequencyMonths) : "");
    setPdiStart(unit.pdi ? unit.pdi.startDate.toISOString().slice(0, 10) : "");
    setFeedbackFreq(unit.feedback ? String(unit.feedback.frequencyMonths) : "");
    setFeedbackStart(
      unit.feedback ? unit.feedback.startDate.toISOString().slice(0, 10) : ""
    );
    setError(null);
    setSuccess(null);
  }

  function closeConfig() {
    setEditingUnit(null);
    setError(null);
    setSuccess(null);
  }

  async function handleSave() {
    if (!editingUnit) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Save PDI schedule
      if (pdiFreq) {
        if (!pdiStart) {
          setError("Data de início do PDI é obrigatória.");
          setLoading(false);
          return;
        }
        const result = await saveSectorSchedule({
          unitId: editingUnit,
          type: "pdi",
          frequencyMonths: parseInt(pdiFreq),
          startDate: new Date(pdiStart),
          isActive: true,
        });
        if (!result.success) {
          setError(result.error ?? "Erro ao salvar PDI");
          setLoading(false);
          return;
        }
      } else {
        // Deactivate PDI if cleared
        await deleteSectorSchedule(editingUnit, "pdi");
      }

      // Save Feedback schedule
      if (feedbackFreq) {
        if (!feedbackStart) {
          setError("Data de início do Feedback é obrigatória.");
          setLoading(false);
          return;
        }
        const result = await saveSectorSchedule({
          unitId: editingUnit,
          type: "feedback",
          frequencyMonths: parseInt(feedbackFreq),
          startDate: new Date(feedbackStart),
          isActive: true,
        });
        if (!result.success) {
          setError(result.error ?? "Erro ao salvar Feedback");
          setLoading(false);
          return;
        }
      } else {
        await deleteSectorSchedule(editingUnit, "feedback");
      }

      setSuccess("Configuração salva com sucesso!");
      setTimeout(() => closeConfig(), 1200);
    } catch {
      setError("Erro inesperado ao salvar.");
    } finally {
      setLoading(false);
    }
  }

  const editingUnitData = schedules.find((s) => s.unitId === editingUnit);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Calendar size={20} className="text-gray-500" />
        <h2 className="text-lg font-medium text-gray-900">
          Recorrência por Setor
        </h2>
      </div>
      <p className="mb-4 text-sm text-gray-600">
        Configure a frequência de PDI e Feedback para cada unidade organizacional.
      </p>

      {schedules.length === 0 ? (
        <p className="text-sm text-gray-500">
          Nenhuma unidade organizacional cadastrada.
        </p>
      ) : (
        <div className="divide-y divide-gray-100">
          {schedules.map((unit) => (
            <div
              key={unit.unitId}
              className="flex items-center justify-between gap-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800">
                  {unit.unitName}
                </p>
                <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
                  <span>
                    PDI:{" "}
                    {unit.pdi
                      ? frequencyLabel(unit.pdi.frequencyMonths)
                      : "Não configurado"}
                  </span>
                  <span>
                    Feedback:{" "}
                    {unit.feedback
                      ? frequencyLabel(unit.feedback.frequencyMonths)
                      : "Não configurado"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => openConfig(unit)}
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <Settings size={14} />
                Configurar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Configuration Modal */}
      {editingUnit && editingUnitData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Configurar Recorrência
              </h3>
              <button
                onClick={closeConfig}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <p className="mb-4 text-sm text-gray-600">
              {editingUnitData.unitName}
            </p>

            {error && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                {success}
              </div>
            )}

            <div className="space-y-4">
              {/* PDI Config */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Frequência PDI
                </label>
                <select
                  value={pdiFreq}
                  onChange={(e) => setPdiFreq(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={loading}
                >
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <option key={`pdi-${opt.value}`} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {pdiFreq && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Data de Início PDI
                  </label>
                  <input
                    type="date"
                    value={pdiStart}
                    onChange={(e) => setPdiStart(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={loading}
                  />
                </div>
              )}

              {/* Feedback Config */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Frequência Feedback
                </label>
                <select
                  value={feedbackFreq}
                  onChange={(e) => setFeedbackFreq(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={loading}
                >
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <option key={`fb-${opt.value}`} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {feedbackFreq && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Data de Início Feedback
                  </label>
                  <input
                    type="date"
                    value={feedbackStart}
                    onChange={(e) => setFeedbackStart(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={loading}
                  />
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeConfig}
                disabled={loading}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Save size={16} />
                {loading ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
