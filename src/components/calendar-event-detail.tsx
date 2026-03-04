"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CalendarEventDetail } from "@/app/(dashboard)/calendario/event-actions";
import {
  updateCalendarEvent,
  addParticipant,
  removeParticipant,
  cancelCalendarEvent,
  searchUsersForParticipant,
} from "@/app/(dashboard)/calendario/event-actions";
import type { SystemUser } from "@/app/(dashboard)/calendario/event-actions";
import { RoomPicker } from "@/components/room-picker";

// ── Timezone helpers (America/Sao_Paulo) ─────────────────────

const TZ = "America/Sao_Paulo";

/** Extract YYYY-MM-DD from ISO string in São Paulo timezone */
function extractDateSP(isoString: string): string {
  const d = new Date(isoString);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const day = parts.find((p) => p.type === "day")!.value;
  return `${y}-${m}-${day}`;
}

/** Extract HH:MM from ISO string in São Paulo timezone */
function extractTimeSP(isoString: string): string {
  const d = new Date(isoString);
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const h = parts.find((p) => p.type === "hour")!.value;
  const m = parts.find((p) => p.type === "minute")!.value;
  return `${h}:${m}`;
}

/** Format date for display in São Paulo timezone */
function formatDateSP(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString("pt-BR", { timeZone: TZ });
}

/** Format time for display in São Paulo timezone */
function formatTimeSP(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString("pt-BR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Convert São Paulo local date+time to UTC ISO string */
function spToUTC(dateStr: string, timeStr: string): string {
  // Build an ISO-like string interpreted as São Paulo local time
  // Use Intl to find the offset at that moment, then adjust
  const naive = new Date(`${dateStr}T${timeStr}:00`);
  // Get UTC offset for São Paulo at this date by comparing formatted output
  const utcStr = naive.toLocaleString("en-US", { timeZone: "UTC" });
  const spStr = naive.toLocaleString("en-US", { timeZone: TZ });
  const utcDate = new Date(utcStr);
  const spDate = new Date(spStr);
  const offsetMs = utcDate.getTime() - spDate.getTime();
  // The naive date was created in local TZ; re-create in São Paulo
  // Simpler: create a date in São Paulo by using the target wall-clock time
  const target = new Date(`${dateStr}T${timeStr}:00.000Z`);
  target.setTime(target.getTime() + offsetMs);
  return target.toISOString();
}

/** Compute end time HH:MM from start time and duration */
function computeEndTime(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(":").map(Number);
  const totalMin = h * 60 + m + durationMinutes;
  const endH = Math.floor(totalMin / 60) % 24;
  const endM = totalMin % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

// ── Badges ───────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  const isFollowUp = type === "pdi_followup";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isFollowUp
          ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
      }`}
    >
      {isFollowUp ? "Acompanhamento PDI" : "Feedback"}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    scheduled:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    completed:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    cancelled:
      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  };
  const labels: Record<string, string> = {
    scheduled: "Agendado",
    completed: "Concluído",
    cancelled: "Cancelado",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        colors[status] ?? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
      }`}
    >
      {labels[status] ?? status}
    </span>
  );
}

// ── Duration options ─────────────────────────────────────────

const DURATION_OPTIONS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1h" },
  { value: 90, label: "1h30" },
  { value: 120, label: "2h" },
  { value: 150, label: "2h30" },
  { value: 180, label: "3h" },
];

// ── Main Component ───────────────────────────────────────────

export function CalendarEventDetailView({
  event,
  canEdit,
}: {
  event: CalendarEventDetail;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit form state — extract date/time from ISO using São Paulo timezone
  const [editDate, setEditDate] = useState(extractDateSP(event.scheduledAt));
  const [editTime, setEditTime] = useState(extractTimeSP(event.scheduledAt));
  const [editDuration, setEditDuration] = useState(event.durationMinutes);
  const [editRoom, setEditRoom] = useState<{
    email: string;
    displayName: string;
  } | null>(
    event.roomEmail && event.roomDisplayName
      ? { email: event.roomEmail, displayName: event.roomDisplayName }
      : null
  );

  // Participant state
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [participantSearch, setParticipantSearch] = useState("");
  const [participantResults, setParticipantResults] = useState<SystemUser[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [externalEmail, setExternalEmail] = useState("");
  const [showExternalInput, setShowExternalInput] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search users as participant types
  const handleParticipantSearch = useCallback(
    (value: string) => {
      setParticipantSearch(value);
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
      if (!value.trim()) {
        setParticipantResults([]);
        return;
      }
      searchDebounce.current = setTimeout(async () => {
        setSearchingUsers(true);
        const results = await searchUsersForParticipant(event.id, value.trim());
        setParticipantResults(results);
        setSearchingUsers(false);
      }, 300);
    },
    [event.id]
  );

  useEffect(() => {
    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);

    // Convert São Paulo local date+time to UTC ISO string
    const scheduledAt = spToUTC(editDate, editTime);

    const result = await updateCalendarEvent(event.id, {
      scheduledAt,
      durationMinutes: editDuration,
      roomEmail: editRoom?.email ?? null,
      roomDisplayName: editRoom?.displayName ?? null,
    });

    setSaving(false);
    if (result.success) {
      setIsEditing(false);
      router.refresh();
    } else {
      setError(result.error ?? "Erro ao salvar");
    }
  }

  async function handleCancel() {
    if (!confirm("Tem certeza que deseja cancelar este evento?")) return;
    setCancelling(true);
    const result = await cancelCalendarEvent(event.id);
    setCancelling(false);
    if (result.success) {
      router.push("/calendario");
    } else {
      setError(result.error ?? "Erro ao cancelar");
    }
  }

  async function handleAddUserParticipant(user: SystemUser) {
    setAddingParticipant(true);
    const result = await addParticipant(event.id, { userId: user.id });
    setAddingParticipant(false);
    if (result.success) {
      setParticipantSearch("");
      setParticipantResults([]);
      router.refresh();
    } else {
      setError(result.error ?? "Erro ao adicionar participante");
    }
  }

  async function handleAddExternalParticipant() {
    if (!externalEmail.trim()) return;
    setAddingParticipant(true);
    const result = await addParticipant(event.id, {
      externalEmail: externalEmail.trim(),
    });
    setAddingParticipant(false);
    if (result.success) {
      setExternalEmail("");
      setShowExternalInput(false);
      router.refresh();
    } else {
      setError(result.error ?? "Erro ao adicionar participante");
    }
  }

  async function handleRemoveParticipant(participantId: string) {
    const result = await removeParticipant(event.id, participantId);
    if (result.success) {
      router.refresh();
    } else {
      setError(result.error ?? "Erro ao remover participante");
    }
  }

  const linkedHref =
    event.type === "feedback" && event.feedbackId
      ? `/feedbacks/${event.feedbackId}`
      : event.type === "pdi_followup" && event.pdiId
        ? `/pdis/${event.pdiId}`
        : null;

  const linkedLabel =
    event.type === "feedback" ? "Ver Feedback" : "Ver PDI";

  const endTime = computeEndTime(extractTimeSP(event.scheduledAt), event.durationMinutes);
  const editEndTime = computeEndTime(editTime, editDuration);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Link
          href="/calendario"
          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          &larr; Calendário
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          {event.title}
        </h1>
        <TypeBadge type={event.type} />
        <StatusBadge status={event.status} />
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Info Card */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Informações
          </h2>

          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500 dark:text-gray-400">Colaborador</dt>
              <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {event.employeeName}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500 dark:text-gray-400">Gestor</dt>
              <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {event.managerName}
              </dd>
            </div>

            {/* Date */}
            <div className="flex justify-between items-center">
              <dt className="text-sm text-gray-500 dark:text-gray-400">Data</dt>
              <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {isEditing ? (
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                ) : (
                  formatDateSP(event.scheduledAt)
                )}
              </dd>
            </div>

            {/* Time */}
            <div className="flex justify-between items-center">
              <dt className="text-sm text-gray-500 dark:text-gray-400">Horário</dt>
              <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {isEditing ? (
                  <input
                    type="time"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                ) : (
                  formatTimeSP(event.scheduledAt)
                )}
              </dd>
            </div>

            {/* Duration */}
            <div className="flex justify-between items-center">
              <dt className="text-sm text-gray-500 dark:text-gray-400">Duração</dt>
              <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {isEditing ? (
                  <select
                    value={editDuration}
                    onChange={(e) => setEditDuration(parseInt(e.target.value, 10))}
                    className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {DURATION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  DURATION_OPTIONS.find((o) => o.value === event.durationMinutes)?.label ??
                  `${event.durationMinutes} min`
                )}
              </dd>
            </div>

            {/* Room — display mode */}
            {!isEditing && (
              <div className="flex justify-between items-center">
                <dt className="text-sm text-gray-500 dark:text-gray-400">Sala</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {event.roomDisplayName ? (
                    event.roomDisplayName
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">Sem sala</span>
                  )}
                </dd>
              </div>
            )}
          </dl>

          {/* Room — edit mode (full RoomPicker) */}
          {isEditing && (
            <div className="mt-4">
              <RoomPicker
                date={editDate}
                startTime={editTime}
                endTime={editEndTime}
                onSelect={(room) => setEditRoom(room)}
                selectedRoomEmail={editRoom?.email}
              />
              {/* Fallback: show current room if RoomPicker hidden (no MS token) */}
              {editRoom && (
                <div className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span>Sala atual: {editRoom.displayName}</span>
                  <button
                    type="button"
                    onClick={() => setEditRoom(null)}
                    className="text-xs text-red-600 hover:text-red-800 dark:text-red-400"
                  >
                    Remover
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Edit/Save buttons */}
          {canEdit && event.status === "scheduled" && (
            <div className="mt-6 flex gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? "Salvando..." : "Salvar"}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      // Reset to original values
                      setEditDate(extractDateSP(event.scheduledAt));
                      setEditTime(extractTimeSP(event.scheduledAt));
                      setEditDuration(event.durationMinutes);
                      setEditRoom(
                        event.roomEmail && event.roomDisplayName
                          ? { email: event.roomEmail, displayName: event.roomDisplayName }
                          : null
                      );
                    }}
                    className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Editar
                </button>
              )}
            </div>
          )}
        </div>

        {/* Participants + Actions */}
        <div className="space-y-6">
          {/* Participants */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              Participantes
            </h2>

            <ul className="space-y-2">
              <li className="flex items-center justify-between text-sm">
                <span className="text-gray-900 dark:text-gray-100">{event.employeeName}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">Colaborador</span>
              </li>
              <li className="flex items-center justify-between text-sm">
                <span className="text-gray-900 dark:text-gray-100">{event.managerName}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">Gestor</span>
              </li>

              {event.participants.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <span className="text-gray-900 dark:text-gray-100">
                      {p.userName ?? p.externalEmail ?? "—"}
                    </span>
                    {p.userName && p.externalEmail && (
                      <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                        ({p.externalEmail})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {p.role === "optional" ? "Opcional" : "Obrigatório"}
                    </span>
                    {canEdit && (
                      <button
                        onClick={() => handleRemoveParticipant(p.id)}
                        className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {/* Add participant */}
            {canEdit && event.status === "scheduled" && (
              <div className="mt-4">
                {showAddParticipant ? (
                  <div className="space-y-3">
                    {/* Search system users */}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                        Buscar usuário do sistema
                      </label>
                      <input
                        type="text"
                        placeholder="Digite o nome ou e-mail..."
                        value={participantSearch}
                        onChange={(e) => handleParticipantSearch(e.target.value)}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      {searchingUsers && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Buscando...
                        </p>
                      )}
                      {participantResults.length > 0 && (
                        <ul className="mt-1 max-h-40 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
                          {participantResults.map((user) => (
                            <li key={user.id}>
                              <button
                                type="button"
                                disabled={addingParticipant}
                                onClick={() => handleAddUserParticipant(user)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                              >
                                <div className="min-w-0">
                                  <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                    {user.name}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {user.email}
                                  </div>
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      {participantSearch.trim() &&
                        !searchingUsers &&
                        participantResults.length === 0 && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Nenhum usuário encontrado.
                          </p>
                        )}
                    </div>

                    {/* External email */}
                    {showExternalInput ? (
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                          E-mail externo
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="email"
                            placeholder="email@externo.com"
                            value={externalEmail}
                            onChange={(e) => setExternalEmail(e.target.value)}
                            className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <button
                            onClick={handleAddExternalParticipant}
                            disabled={addingParticipant || !externalEmail.trim()}
                            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            Adicionar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowExternalInput(true)}
                        className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      >
                        + Adicionar e-mail externo
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setShowAddParticipant(false);
                        setParticipantSearch("");
                        setParticipantResults([]);
                        setShowExternalInput(false);
                        setExternalEmail("");
                      }}
                      className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                      Fechar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddParticipant(true)}
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    + Adicionar participante
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              Ações
            </h2>

            <div className="flex flex-wrap gap-3">
              {linkedHref && (
                <Link
                  href={linkedHref}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  {linkedLabel}
                </Link>
              )}

              {canEdit && event.status === "scheduled" && (
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="rounded-md border border-red-300 dark:border-red-700 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                >
                  {cancelling ? "Cancelando..." : "Cancelar Evento"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
