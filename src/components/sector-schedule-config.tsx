"use client";

import { useState } from "react";
import { Calendar, Settings, X, Save } from "lucide-react";
import Link from "next/link";
import type { SectorScheduleSummary, SectorProgressInfo } from "@/app/(dashboard)/configuracoes/actions";
import { saveSectorSchedule, deleteSectorSchedule } from "@/app/(dashboard)/configuracoes/actions";
import { getFrequencyLabel } from "@/lib/sector-schedule-pure-utils";

const FREQUENCY_OPTIONS = [
  { value: "", label: "Não configurado" },
  { value: "1", label: "Mensal (1 mês)" },
  { value: "2", label: "Bimestral (2 meses)" },
  { value: "3", label: "Trimestral (3 meses)" },
  { value: "6", label: "Semestral (6 meses)" },
  { value: "12", label: "Anual (12 meses)" },
];

function sortByProgress(a: SectorScheduleSummary, b: SectorScheduleSummary): number {
  const aProgress = getCompletionRate(a);
  const bProgress = getCompletionRate(b);
  return aProgress - bProgress;
}

function getCompletionRate(unit: SectorScheduleSummary): number {
  let total = 0;
  let done = 0;
  if (unit.feedbackProgress) {
    total += unit.feedbackProgress.total;
    done += unit.feedbackProgress.done;
  }
  if (total === 0) return 1;
  return done / total;
}

interface SectorScheduleConfigProps {
  schedules: SectorScheduleSummary[];
}

export function SectorScheduleConfig({ schedules }: SectorScheduleConfigProps) {
  const [editingUnit, setEditingUnit] = useState<string | null>(null);
  const [feedbackFreq, setFeedbackFreq] = useState("");
  const [feedbackStart, setFeedbackStart] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function openConfig(unit: SectorScheduleSummary) {
    setEditingUnit(unit.unitId);
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
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Calendar size={20} className="text-gray-500 dark:text-gray-400" />
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Recorrência por Setor
        </h2>
      </div>
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        Configure a frequência de Feedback para cada unidade organizacional.
      </p>

      {schedules.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Nenhuma unidade organizacional cadastrada.
        </p>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {[...schedules].sort(sortByProgress).map((unit) => (
            <div key={unit.unitId} className="py-3">
              <div className="flex items-center justify-between gap-4">
                <Link
                  href={`/programacao?unit=${unit.unitId}`}
                  className="min-w-0 flex-1 hover:opacity-80"
                >
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {unit.unitName}
                  </p>
                  <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      Feedback:{" "}
                      {unit.feedback
                        ? getFrequencyLabel(unit.feedback.frequencyMonths)
                        : "Não configurado"}
                    </span>
                  </div>
                </Link>
                <button
                  onClick={() => openConfig(unit)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <Settings size={14} />
                  Configurar
                </button>
              </div>

              {unit.feedbackProgress && (
                <div className="mt-2">
                  <ProgressIndicator label="Feedback" progress={unit.feedbackProgress} />
                </div>
              )}

              {!unit.feedback && (
                <p className="mt-1 text-xs text-gray-400">Não configurado</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Configuration Modal */}
      {editingUnit && editingUnitData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Configurar Recorrência
              </h3>
              <button
                onClick={closeConfig}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              {editingUnitData.unitName}
            </p>

            {error && (
              <div className="mb-4 rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 rounded-md border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30 p-3 text-sm text-green-700 dark:text-green-400">
                {success}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Frequência Feedback
                </label>
                <select
                  value={feedbackFreq}
                  onChange={(e) => setFeedbackFreq(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Data de Início Feedback
                  </label>
                  <input
                    type="date"
                    value={feedbackStart}
                    onChange={(e) => setFeedbackStart(e.target.value)}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={loading}
                  />
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeConfig}
                disabled={loading}
                className="rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
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

function ProgressIndicator({ label, progress }: { label: string; progress: SectorProgressInfo }) {
  const scheduled = progress.total - progress.notScheduled - progress.done;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          {label}: {progress.done}/{progress.total} realizados
        </span>
        {progress.notScheduled > 0 && (
          <span className="inline-flex rounded-full bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 text-[10px] font-medium text-orange-700 dark:text-orange-400">
            {progress.notScheduled} não programados
          </span>
        )}
      </div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
        {progress.done > 0 && (
          <div
            className="bg-green-500"
            style={{ width: `${(progress.done / progress.total) * 100}%` }}
          />
        )}
        {scheduled > 0 && (
          <div
            className="bg-blue-500"
            style={{ width: `${(scheduled / progress.total) * 100}%` }}
          />
        )}
      </div>
    </div>
  );
}
