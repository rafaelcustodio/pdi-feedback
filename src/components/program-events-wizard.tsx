"use client";

import { useState } from "react";
import { X, Eye, Check } from "lucide-react";
import { programEvents } from "@/app/(dashboard)/programacao/actions";
import type { ComplianceEmployee } from "@/app/(dashboard)/programacao/actions";
import { snapToBusinessDay } from "@/lib/sector-schedule-utils";

interface ProgramEventsWizardProps {
  unitId: string;
  type: "pdi" | "feedback";
  periodStart: string;
  periodEnd: string;
  notScheduledEmployees: ComplianceEmployee[];
  onClose: () => void;
  onComplete: () => void;
}

interface PreviewEvent {
  employeeId: string;
  employeeName: string;
  scheduledDate: string; // ISO string
  wasSnapped: boolean;
}

export function ProgramEventsWizard({
  unitId,
  type,
  periodStart,
  periodEnd,
  notScheduledEmployees,
  onClose,
  onComplete,
}: ProgramEventsWizardProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(notScheduledEmployees.map((e) => e.employeeId))
  );
  const [perDay, setPerDay] = useState<1 | 2>(1);
  const [direction, setDirection] = useState<"end-to-start" | "last-month-start">("end-to-start");
  const [preview, setPreview] = useState<PreviewEvent[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function toggleEmployee(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === notScheduledEmployees.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notScheduledEmployees.map((e) => e.employeeId)));
    }
  }

  async function handlePreview() {
    if (selectedIds.size === 0) return;

    setLoading(true);
    setError(null);
    setPreview(null);

    const result = await programEvents({
      unitId,
      type,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      employeeIds: [...selectedIds],
      perDay,
      direction,
      dryRun: true,
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "Erro ao gerar preview");
      return;
    }

    setPreview(
      result.events.map((e) => ({
        employeeId: e.employeeId,
        employeeName: e.employeeName,
        scheduledDate: new Date(e.scheduledDate).toISOString().slice(0, 10),
        wasSnapped: false,
      }))
    );
  }

  function handleDateChange(index: number, newDate: string) {
    if (!preview) return;

    const d = new Date(newDate);
    const snapped = snapToBusinessDay(d);
    const snappedStr = snapped.toISOString().slice(0, 10);
    const wasSnapped = snappedStr !== newDate;

    setPreview((prev) =>
      prev!.map((item, i) =>
        i === index
          ? { ...item, scheduledDate: snappedStr, wasSnapped }
          : item
      )
    );
  }

  async function handleConfirm() {
    if (!preview || preview.length === 0) return;

    setLoading(true);
    setError(null);

    const result = await programEvents({
      unitId,
      type,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      employeeIds: preview.map((e) => e.employeeId),
      perDay,
      direction,
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "Erro ao criar eventos");
      return;
    }

    setSuccess(`${result.created} eventos criados com sucesso!`);
    setTimeout(() => {
      onComplete();
      onClose();
    }, 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Programar {type === "pdi" ? "PDIs" : "Feedbacks"}
          </h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

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

        {!preview ? (
          /* Step 1: Configuration */
          <div className="space-y-4">
            {/* Employee selection */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Colaboradores ({selectedIds.size}/{notScheduledEmployees.length})
                </label>
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {selectedIds.size === notScheduledEmployees.length
                    ? "Desmarcar todos"
                    : "Selecionar todos"}
                </button>
              </div>
              <div className="max-h-40 overflow-y-auto rounded-md border border-gray-200">
                {notScheduledEmployees.map((emp) => (
                  <label
                    key={emp.employeeId}
                    className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(emp.employeeId)}
                      onChange={() => toggleEmployee(emp.employeeId)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">{emp.employeeName}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Per day */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Eventos por dia
              </label>
              <div className="flex gap-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="perDay"
                    checked={perDay === 1}
                    onChange={() => setPerDay(1)}
                    className="border-gray-300 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">1 por dia</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="perDay"
                    checked={perDay === 2}
                    onChange={() => setPerDay(2)}
                    className="border-gray-300 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">2 por dia</span>
                </label>
              </div>
            </div>

            {/* Direction */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Direção
              </label>
              <div className="flex flex-col gap-2">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="direction"
                    checked={direction === "end-to-start"}
                    onChange={() => setDirection("end-to-start")}
                    className="border-gray-300 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">Começar do fim do período</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="direction"
                    checked={direction === "last-month-start"}
                    onChange={() => setDirection("last-month-start")}
                    className="border-gray-300 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">Começar no início do último mês</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={onClose}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handlePreview}
                disabled={loading || selectedIds.size === 0}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Eye size={16} />
                {loading ? "Gerando..." : "Gerar Preview"}
              </button>
            </div>
          </div>
        ) : (
          /* Step 2: Preview */
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Revise as datas antes de confirmar. Você pode editar as datas individualmente.
            </p>

            <div className="max-h-60 overflow-y-auto rounded-md border border-gray-200">
              {preview.map((event, idx) => (
                <div
                  key={event.employeeId}
                  className="flex items-center justify-between gap-3 border-b border-gray-50 px-3 py-2 last:border-b-0"
                >
                  <span className="text-sm text-gray-700">{event.employeeName}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={event.scheduledDate}
                      onChange={(e) => handleDateChange(idx, e.target.value)}
                      className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    {event.wasSnapped && (
                      <span className="text-xs text-amber-600" title="Auto-corrigido para dia útil">
                        (ajustado)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setPreview(null)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                <Check size={16} />
                {loading ? "Criando..." : "Confirmar Programação"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
