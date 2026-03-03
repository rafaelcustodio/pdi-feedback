"use client";

import { useState, useEffect, useRef } from "react";
import { X, Eye, Check, MapPin } from "lucide-react";
import {
  programEvents,
  hasMicrosoftTokenForWizard,
  fetchRoomsForWizard,
  fetchRoomScheduleForPeriod,
} from "@/app/(dashboard)/programacao/actions";
import type {
  ComplianceEmployee,
  EventRoomSelection,
  WizardRoom,
} from "@/app/(dashboard)/programacao/actions";
import {
  snapToBusinessDay,
  getBusinessDays,
  distributeEventsWithTimeSlots,
  isSlotFreeInView,
  BUSINESS_TIME_SLOTS,
} from "@/lib/sector-schedule-pure-utils";
import { RoomPicker, RoomPickerCompact } from "@/components/room-picker";

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
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
  wasSnapped: boolean;
  roomEmail?: string;
  roomDisplayName?: string;
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
  const [expandedRoomPicker, setExpandedRoomPicker] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Room schedule cache (used for conflict validation on confirm)
  const roomScheduleRef = useRef<Map<string, string> | null>(null);

  // Room state for Step 1
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [wizardRooms, setWizardRooms] = useState<WizardRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<{ email: string; displayName: string } | null>(null);

  // Check for MS token and fetch rooms on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await hasMicrosoftTokenForWizard();
      if (cancelled) return;
      setHasToken(token);
      if (token) {
        setRoomsLoading(true);
        const rooms = await fetchRoomsForWizard();
        if (!cancelled) {
          setWizardRooms(rooms);
          setRoomsLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

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

    try {
      // Get business days for the period
      const businessDays = getBusinessDays(new Date(periodStart), new Date(periodEnd));

      // Build employee list from selected IDs
      const employees = notScheduledEmployees
        .filter((e) => selectedIds.has(e.employeeId))
        .map((e) => ({ id: e.employeeId, name: e.employeeName }));

      // Fetch room schedule if a room is selected
      let roomSchedule: Map<string, string> | undefined;
      roomScheduleRef.current = null;
      if (selectedRoom) {
        const startStr = new Date(periodStart).toISOString().slice(0, 10);
        const endStr = new Date(periodEnd).toISOString().slice(0, 10);
        const scheduleObj = await fetchRoomScheduleForPeriod(selectedRoom.email, startStr, endStr);
        roomSchedule = new Map(Object.entries(scheduleObj));
        roomScheduleRef.current = roomSchedule;
      }

      // Distribute with time slots
      const distributed = distributeEventsWithTimeSlots(
        employees,
        businessDays,
        perDay,
        direction,
        roomSchedule
      );

      // Also do a dry run to check for duplicates on the server side
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

      if (!result.success) {
        setError(result.error ?? "Erro ao gerar preview");
        setLoading(false);
        return;
      }

      // Build a set of employee IDs that passed the server dry run (not skipped)
      const serverApprovedIds = new Set(result.events.map((e) => e.employeeId));

      // Use distributed events (with time slots) but filter to only server-approved ones
      const previewEvents: PreviewEvent[] = distributed
        .filter((e) => serverApprovedIds.has(e.employeeId))
        .map((e) => ({
          employeeId: e.employeeId,
          employeeName: e.employeeName,
          scheduledDate: e.scheduledDate.toISOString().slice(0, 10),
          scheduledTime: e.scheduledTime,
          wasSnapped: false,
          roomEmail: selectedRoom?.email,
          roomDisplayName: selectedRoom?.displayName,
        }));

      setPreview(previewEvents);
    } catch {
      setError("Erro ao gerar preview");
    }
    setLoading(false);
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

  function handleTimeChange(index: number, newTime: string) {
    if (!preview) return;
    setPreview((prev) =>
      prev!.map((item, i) =>
        i === index ? { ...item, scheduledTime: newTime } : item
      )
    );
  }

  function handleRoomChangeForEvent(index: number, room: { email: string; displayName: string } | null) {
    if (!preview) return;
    setPreview((prev) =>
      prev!.map((item, i) =>
        i === index
          ? {
              ...item,
              roomEmail: room?.email,
              roomDisplayName: room?.displayName,
            }
          : item
      )
    );
    setExpandedRoomPicker(null);
  }

  async function handleConfirm() {
    if (!preview || preview.length === 0) return;

    setError(null);

    // Validate room availability before confirming
    if (roomScheduleRef.current) {
      const conflicts = preview.filter((event) => {
        if (!event.roomEmail) return false;
        const dayView = roomScheduleRef.current!.get(event.scheduledDate);
        return !isSlotFreeInView(dayView, event.scheduledTime);
      });
      if (conflicts.length > 0) {
        setError(`Conflito de sala: ${conflicts.map((e) => `${e.employeeName} — ${e.scheduledDate} às ${e.scheduledTime}`).join(", ")}. Ajuste os horários antes de confirmar.`);
        return;
      }
    }

    setLoading(true);

    // Build event room and time selections
    const roomSelections: EventRoomSelection[] = [];
    const eventTimes: Array<{ employeeId: string; scheduledTime: string }> = [];

    for (const event of preview) {
      if (event.roomEmail && event.roomDisplayName) {
        roomSelections.push({
          employeeId: event.employeeId,
          roomEmail: event.roomEmail,
          roomDisplayName: event.roomDisplayName,
        });
      }
      eventTimes.push({
        employeeId: event.employeeId,
        scheduledTime: event.scheduledTime,
      });
    }

    const result = await programEvents({
      unitId,
      type,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      employeeIds: preview.map((e) => e.employeeId),
      perDay,
      direction,
      eventRooms: roomSelections.length > 0 ? roomSelections : undefined,
      eventTimes: eventTimes.length > 0 ? eventTimes : undefined,
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
      <div className="mx-4 w-full max-w-lg rounded-lg bg-white dark:bg-gray-900 p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Programar {type === "pdi" ? "PDIs" : "Feedbacks"}
          </h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            <X size={20} />
          </button>
        </div>

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

        {!preview ? (
          /* Step 1: Configuration */
          <div className="space-y-4">
            {/* Employee selection */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
              <div className="max-h-40 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700">
                {notScheduledEmployees.map((emp) => (
                  <label
                    key={emp.employeeId}
                    className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(emp.employeeId)}
                      onChange={() => toggleEmployee(emp.employeeId)}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{emp.employeeName}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Per day */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Eventos por dia
              </label>
              <div className="flex gap-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="perDay"
                    checked={perDay === 1}
                    onChange={() => setPerDay(1)}
                    className="border-gray-300 dark:border-gray-600 text-blue-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">1 por dia</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="perDay"
                    checked={perDay === 2}
                    onChange={() => setPerDay(2)}
                    className="border-gray-300 dark:border-gray-600 text-blue-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">2 por dia</span>
                </label>
              </div>
            </div>

            {/* Direction */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Direção
              </label>
              <div className="flex flex-col gap-2">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="direction"
                    checked={direction === "end-to-start"}
                    onChange={() => setDirection("end-to-start")}
                    className="border-gray-300 dark:border-gray-600 text-blue-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Começar do fim do período</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="direction"
                    checked={direction === "last-month-start"}
                    onChange={() => setDirection("last-month-start")}
                    className="border-gray-300 dark:border-gray-600 text-blue-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Começar no início do último mês</span>
                </label>
              </div>
            </div>

            {/* Room picker (Step 1) — only for feedback and if MS token is available */}
            {type === "feedback" && hasToken === true && (
              <RoomPickerCompact
                rooms={wizardRooms}
                selectedRoomEmail={selectedRoom?.email}
                onSelect={setSelectedRoom}
                loading={roomsLoading}
              />
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={onClose}
                className="rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
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
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Revise as datas e horários antes de confirmar. Você pode editar individualmente.
            </p>

            <div className="max-h-80 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700">
              {preview.map((event, idx) => (
                <div
                  key={event.employeeId}
                  className="border-b border-gray-100 dark:border-gray-800 px-3 py-2.5 last:border-b-0"
                >
                  {/* Name row */}
                  <div className="flex items-center gap-1 mb-1.5">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {event.employeeName}
                    </span>
                    {event.wasSnapped && (
                      <span className="text-xs text-amber-600" title="Auto-corrigido para dia útil">!</span>
                    )}
                  </div>
                  {/* Controls row: Date | Time | Room */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="date"
                      value={event.scheduledDate}
                      onChange={(e) => handleDateChange(idx, e.target.value)}
                      className="shrink-0 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <select
                      value={event.scheduledTime}
                      onChange={(e) => handleTimeChange(idx, e.target.value)}
                      className="shrink-0 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {!(BUSINESS_TIME_SLOTS as readonly string[]).includes(event.scheduledTime) && (
                        <option value={event.scheduledTime}>{event.scheduledTime}</option>
                      )}
                      {BUSINESS_TIME_SLOTS.map((slot) => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                    {type === "feedback" && (
                      event.roomDisplayName ? (
                        <button
                          type="button"
                          onClick={() => setExpandedRoomPicker(expandedRoomPicker === event.employeeId ? null : event.employeeId)}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/70 transition-colors"
                        >
                          <MapPin size={10} className="shrink-0" />
                          {event.roomDisplayName}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setExpandedRoomPicker(expandedRoomPicker === event.employeeId ? null : event.employeeId)}
                          className="shrink-0 rounded px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          title="Selecionar sala"
                        >
                          Sala
                        </button>
                      )
                    )}
                  </div>

                  {/* Room picker expandido */}
                  {expandedRoomPicker === event.employeeId && (
                    <div className="mt-2">
                      <RoomPicker
                        date={event.scheduledDate}
                        startTime={event.scheduledTime}
                        endTime={`${String(parseInt(event.scheduledTime.split(":")[0]) + 1).padStart(2, "0")}:${event.scheduledTime.split(":")[1]}`}
                        selectedRoomEmail={event.roomEmail}
                        onSelect={(room) => handleRoomChangeForEvent(idx, room)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setPreview(null)}
                className="rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
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
