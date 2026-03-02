"use client";

import { useState } from "react";
import { Save, Calendar } from "lucide-react";
import { saveEmployeeSchedules, toggleIndividualSchedule } from "@/app/(dashboard)/colaboradores/actions";
import type { SectorScheduleInfo } from "@/app/(dashboard)/colaboradores/actions";

const FREQUENCY_OPTIONS = [
  { value: "", label: "Nenhum" },
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

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

interface ScheduleSectionProps {
  employeeId: string;
  initialFeedbackFrequency: number | null;
  initialFeedbackNextDueDate: Date | string | null;
  sectorSchedule?: SectorScheduleInfo;
}

export function ScheduleSection({
  employeeId,
  initialFeedbackFrequency,
  initialFeedbackNextDueDate,
  sectorSchedule,
}: ScheduleSectionProps) {
  const hasIndividual = initialFeedbackFrequency !== null;
  const hasSector = !!(sectorSchedule?.pdi || sectorSchedule?.feedback);

  const [useIndividual, setUseIndividual] = useState(hasIndividual);
  const [feedbackFrequency, setFeedbackFrequency] = useState(
    initialFeedbackFrequency?.toString() ?? ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [feedbackNextDueDate, setFeedbackNextDueDate] = useState(
    initialFeedbackNextDueDate
  );

  async function handleToggle() {
    const newValue = !useIndividual;
    setLoading(true);
    setError(null);
    setSuccess(false);

    if (!newValue) {
      // Deactivating individual schedule
      const result = await toggleIndividualSchedule(employeeId, false);
      if (!result.success) {
        setError(result.error ?? "Erro ao desativar configuração individual");
        setLoading(false);
        return;
      }
      setFeedbackFrequency("");
      setFeedbackNextDueDate(null);
    }

    setUseIndividual(newValue);
    setLoading(false);
  }

  async function handleSave() {
    setLoading(true);
    setError(null);
    setSuccess(false);

    const result = await saveEmployeeSchedules(employeeId, {
      feedbackFrequency: feedbackFrequency
        ? parseInt(feedbackFrequency, 10)
        : null,
    });

    setLoading(false);

    if (result.success) {
      setSuccess(true);
      if (feedbackFrequency) {
        const next = new Date();
        next.setMonth(next.getMonth() + parseInt(feedbackFrequency, 10));
        setFeedbackNextDueDate(next);
      } else {
        setFeedbackNextDueDate(null);
      }
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError(result.error ?? "Erro ao salvar agendamento");
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <Calendar size={20} className="text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-900">Agendamento</h2>
      </div>
      <p className="mb-4 text-sm text-gray-600">
        Configure a frequência de PDI e feedback para este colaborador.
      </p>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          Agendamento salvo com sucesso!
          {feedbackFrequency && (
            <span className="block mt-1 text-xs text-green-600">
              Eventos agendados gerados automaticamente para os próximos 12 meses.
            </span>
          )}
        </div>
      )}

      {/* Toggle for individual vs sector */}
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={useIndividual}
          onClick={handleToggle}
          disabled={loading}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
            useIndividual ? "bg-blue-600" : "bg-gray-200"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              useIndividual ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
        <span className="text-sm font-medium text-gray-700">
          Usar configuração personalizada
        </span>
      </div>

      {useIndividual ? (
        /* Individual schedule editing */
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="feedback-frequency"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Frequência do Feedback
              </label>
              <select
                id="feedback-frequency"
                value={feedbackFrequency}
                onChange={(e) => setFeedbackFrequency(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={loading}
              >
                {FREQUENCY_OPTIONS.map((opt) => (
                  <option key={`fb-${opt.value}`} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {feedbackNextDueDate && (
                <p className="mt-1 text-xs text-gray-500">
                  Próxima data prevista:{" "}
                  <span className="font-medium text-gray-700">
                    {formatDate(feedbackNextDueDate)}
                  </span>
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={16} />
              {loading ? "Salvando..." : "Salvar Agendamento"}
            </button>
          </div>
        </>
      ) : (
        /* Sector schedule read-only display */
        <div className="rounded-md border border-gray-100 bg-gray-50 p-4">
          {hasSector ? (
            <div>
              <p className="text-sm font-medium text-gray-700">Frequência do Feedback</p>
              <p className="mt-0.5 text-sm text-gray-600">
                {sectorSchedule?.feedback
                  ? frequencyLabel(sectorSchedule.feedback.frequencyMonths)
                  : "Não configurado no setor"}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Setor sem configuração de recorrência.
            </p>
          )}
          <p className="mt-2 text-xs text-gray-400">
            Configuração herdada do setor. Ative o toggle acima para personalizar.
          </p>
        </div>
      )}
    </div>
  );
}
