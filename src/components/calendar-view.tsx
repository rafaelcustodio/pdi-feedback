"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Pencil,
  Play,
  Check,
  ClipboardList,
  MessageSquare,
  Calendar,
  LayoutGrid,
  List,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

export type SerializedCalendarEvent = {
  id: string;
  type: "pdi" | "feedback" | "followup";
  employeeName: string;
  managerName: string;
  scheduledAt: string;
  status: string;
  href: string;
};

interface CalendarViewProps {
  events: SerializedCalendarEvent[];
  month: number;
  year: number;
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const MAX_VISIBLE_EVENTS = 3;

type StatusStyle = {
  bg: string;
  text: string;
  label: string;
  Icon: typeof Clock;
};

const STATUS_STYLES: Record<string, StatusStyle> = {
  scheduled: { bg: "bg-gray-100", text: "text-gray-700", label: "Agendado", Icon: Clock },
  draft: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Rascunho", Icon: Pencil },
  active: { bg: "bg-blue-100", text: "text-blue-800", label: "Em andamento", Icon: Play },
  submitted: { bg: "bg-green-100", text: "text-green-800", label: "Concluído", Icon: Check },
  completed: { bg: "bg-green-100", text: "text-green-800", label: "Concluído", Icon: Check },
};

function getStatusStyle(status: string): StatusStyle {
  return STATUS_STYLES[status] || STATUS_STYLES.scheduled;
}

function getTypeBorderColor(type: "pdi" | "feedback" | "followup"): string {
  if (type === "pdi") return "border-l-blue-500";
  if (type === "followup") return "border-l-purple-500";
  return "border-l-green-500";
}

export function CalendarView({ events, month, year }: CalendarViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const today = useMemo(() => new Date(), []);
  const isCurrentMonth = today.getMonth() + 1 === month && today.getFullYear() === year;

  // Build calendar grid data
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startDow = firstDay.getDay(); // 0=Sun

    // Previous month padding
    const prevMonthLastDay = new Date(year, month - 1, 0).getDate();
    const prevDays: { day: number; currentMonth: false }[] = [];
    for (let i = startDow - 1; i >= 0; i--) {
      prevDays.push({ day: prevMonthLastDay - i, currentMonth: false as const });
    }

    // Current month
    const currentDays: { day: number; currentMonth: true }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      currentDays.push({ day: d, currentMonth: true as const });
    }

    // Next month padding
    const totalCells = prevDays.length + currentDays.length;
    const rows = Math.ceil(totalCells / 7);
    const nextDaysCount = rows * 7 - totalCells;
    const nextDays: { day: number; currentMonth: false }[] = [];
    for (let d = 1; d <= nextDaysCount; d++) {
      nextDays.push({ day: d, currentMonth: false as const });
    }

    return [...prevDays, ...currentDays, ...nextDays];
  }, [month, year]);

  // Group events by day of month
  const eventsByDay = useMemo(() => {
    const map = new Map<number, SerializedCalendarEvent[]>();
    for (const event of events) {
      const date = new Date(event.scheduledAt);
      const day = date.getUTCDate();
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(event);
    }
    return map;
  }, [events]);

  // Navigation helpers
  const navigateMonth = useCallback(
    (offset: number) => {
      let newMonth = month + offset;
      let newYear = year;
      if (newMonth < 1) {
        newMonth = 12;
        newYear--;
      } else if (newMonth > 12) {
        newMonth = 1;
        newYear++;
      }

      const params = new URLSearchParams(searchParams.toString());
      params.set("mes", String(newMonth));
      params.set("ano", String(newYear));
      router.push(`/calendario?${params.toString()}`);
    },
    [month, year, searchParams, router]
  );

  const goToToday = useCallback(() => {
    const now = new Date();
    const params = new URLSearchParams(searchParams.toString());
    params.set("mes", String(now.getMonth() + 1));
    params.set("ano", String(now.getFullYear()));
    router.push(`/calendario?${params.toString()}`);
  }, [searchParams, router]);

  return (
    <div>
      {/* Header: navigation */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateMonth(-1)}
            className="rounded-md p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            aria-label="Mês anterior"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="min-w-[180px] text-center text-lg font-semibold text-gray-900 dark:text-gray-100">
            {MONTH_NAMES[month - 1]} {year}
          </h2>
          <button
            onClick={() => navigateMonth(1)}
            className="rounded-md p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            aria-label="Próximo mês"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Hoje
          </button>
          <div className="flex rounded-lg border border-gray-300 dark:border-gray-600">
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded-l-lg p-1.5 ${
                viewMode === "grid"
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300"
                  : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              }`}
              aria-label="Visualização em grade"
              title="Grade"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`rounded-r-lg border-l border-gray-300 p-1.5 dark:border-gray-600 ${
                viewMode === "list"
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300"
                  : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              }`}
              aria-label="Visualização em lista"
              title="Lista"
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {viewMode === "list" ? (
        /* Agenda list view (all screen sizes) */
        <AgendaListView events={events} month={month} year={year} />
      ) : (
        <>
          {/* Desktop: Grid calendar */}
          <div className="hidden md:block">
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
              {/* Day-of-week header */}
              <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                {DAY_NAMES.map((name) => (
                  <div
                    key={name}
                    className="px-2 py-2 text-center text-xs font-semibold uppercase text-gray-500 dark:text-gray-400"
                  >
                    {name}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7">
                {calendarDays.map((cell, i) => {
                  const isToday =
                    cell.currentMonth &&
                    isCurrentMonth &&
                    cell.day === today.getDate();
                  const dayEvents = cell.currentMonth
                    ? eventsByDay.get(cell.day) || []
                    : [];
                  const hasOverflow = dayEvents.length > MAX_VISIBLE_EVENTS;
                  const isExpanded = expandedDay === cell.day && cell.currentMonth;
                  const visibleEvents = isExpanded
                    ? dayEvents
                    : dayEvents.slice(0, MAX_VISIBLE_EVENTS);

                  return (
                    <div
                      key={i}
                      className={`min-h-[100px] border-b border-r border-gray-100 p-1 dark:border-gray-700 ${
                        cell.currentMonth ? "bg-white dark:bg-gray-800" : "bg-gray-50 dark:bg-gray-900"
                      }`}
                    >
                      {/* Day number */}
                      <div className="mb-1 flex justify-end">
                        <span
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                            isToday
                              ? "bg-blue-600 font-bold text-white"
                              : cell.currentMonth
                                ? "text-gray-900 dark:text-gray-100"
                                : "text-gray-400 dark:text-gray-600"
                          }`}
                        >
                          {cell.day}
                        </span>
                      </div>

                      {/* Events */}
                      <div className="space-y-0.5">
                        {visibleEvents.map((event) => (
                          <EventBadge key={`${event.type}-${event.id}`} event={event} />
                        ))}
                        {hasOverflow && !isExpanded && (
                          <button
                            onClick={() => setExpandedDay(cell.day)}
                            className="w-full rounded px-1 py-0.5 text-left text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
                          >
                            +{dayEvents.length - MAX_VISIBLE_EVENTS} mais
                          </button>
                        )}
                        {isExpanded && hasOverflow && (
                          <button
                            onClick={() => setExpandedDay(null)}
                            className="w-full rounded px-1 py-0.5 text-left text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
                          >
                            Mostrar menos
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mobile: Agenda list view */}
          <div className="md:hidden">
            <MobileAgendaView events={events} month={month} year={year} />
          </div>
        </>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
        <span className="font-medium text-gray-700 dark:text-gray-300">Legenda:</span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded border-l-2 border-l-blue-500 bg-blue-50" />
          PDI
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded border-l-2 border-l-green-500 bg-green-50" />
          Feedback
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded border-l-2 border-l-purple-500 bg-purple-50" />
          Acompanhamento
        </span>
        <span className="mx-2 text-gray-300 dark:text-gray-600">|</span>
        {Object.entries(STATUS_STYLES).filter(([k]) => k !== "completed").map(([key, style]) => (
          <span key={key} className="flex items-center gap-1">
            <span className={`inline-block h-3 w-3 rounded ${style.bg}`} />
            {style.label}
          </span>
        ))}
      </div>
    </div>
  );
}

const TYPE_LABELS: Record<SerializedCalendarEvent["type"], string> = {
  feedback: "Feedback",
  pdi: "PDI",
  followup: "Acomp. PDI",
};

function EventBadge({ event }: { event: SerializedCalendarEvent }) {
  const style = getStatusStyle(event.status);
  const borderColor = getTypeBorderColor(event.type);
  const Icon = style.Icon;
  const typeLabel = TYPE_LABELS[event.type];

  return (
    <Link
      href={event.href}
      className={`block rounded border-l-2 ${borderColor} ${style.bg} px-1.5 py-1 text-xs ${style.text} transition-opacity hover:opacity-80`}
      title={`${typeLabel} — ${event.employeeName} | Gestor: ${event.managerName} (${style.label})`}
    >
      <div className="flex items-center gap-1">
        <Icon size={10} className="shrink-0" />
        <span className="truncate font-medium">
          [{typeLabel}] {event.employeeName}
        </span>
      </div>
      <div className="mt-0.5 truncate text-[10px] opacity-70">
        {event.managerName}
      </div>
    </Link>
  );
}

function MobileAgendaView({
  events,
  month,
  year,
}: {
  events: SerializedCalendarEvent[];
  month: number;
  year: number;
}) {
  // Group events by day
  const groupedByDay = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const groups: { day: number; events: SerializedCalendarEvent[] }[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dayEvents = events.filter((e) => {
        const date = new Date(e.scheduledAt);
        return date.getUTCDate() === d;
      });
      if (dayEvents.length > 0) {
        groups.push({ day: d, events: dayEvents });
      }
    }
    return groups;
  }, [events, month, year]);

  const today = new Date();
  const isCurrentMonth = today.getMonth() + 1 === month && today.getFullYear() === year;

  if (groupedByDay.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
        Nenhum evento neste mês.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groupedByDay.map(({ day, events: dayEvents }) => {
        const isToday = isCurrentMonth && day === today.getDate();
        const dayOfWeek = DAY_NAMES[new Date(year, month - 1, day).getDay()];

        return (
          <div
            key={day}
            className={`rounded-xl border bg-white shadow-sm dark:bg-gray-800 ${
              isToday ? "border-blue-300 dark:border-blue-700" : "border-gray-200 dark:border-gray-700"
            }`}
          >
            <div
              className={`flex items-center gap-2 border-b px-4 py-2 ${
                isToday
                  ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/30"
                  : "border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
              }`}
            >
              <span
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  isToday ? "bg-blue-600 text-white" : "text-gray-700 dark:text-gray-300"
                }`}
              >
                {day}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">{dayOfWeek}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {dayEvents.length} {dayEvents.length === 1 ? "evento" : "eventos"}
              </span>
            </div>

            <div className="divide-y divide-gray-50 dark:divide-gray-700">
              {dayEvents.map((event) => {
                const style = getStatusStyle(event.status);
                const EventIcon = event.type === "pdi" ? ClipboardList : event.type === "followup" ? Calendar : MessageSquare;
                const StatusIcon = style.Icon;

                return (
                  <Link
                    key={`${event.type}-${event.id}`}
                    href={event.href}
                    className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                          event.type === "pdi"
                            ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                            : event.type === "followup"
                              ? "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                              : "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                        }`}
                      >
                        <EventIcon size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          [{TYPE_LABELS[event.type]}] {event.employeeName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Gestor: {event.managerName}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}
                    >
                      <StatusIcon size={12} />
                      {style.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getTypeSolidColor(type: "pdi" | "feedback" | "followup"): string {
  if (type === "pdi") return "bg-blue-500";
  if (type === "followup") return "bg-purple-500";
  return "bg-green-500";
}

function AgendaListView({
  events,
  month,
  year,
}: {
  events: SerializedCalendarEvent[];
  month: number;
  year: number;
}) {
  const groupedByDay = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const groups: { day: number; events: SerializedCalendarEvent[] }[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dayEvents = events.filter((e) => {
        const date = new Date(e.scheduledAt);
        return date.getUTCDate() === d;
      });
      if (dayEvents.length > 0) {
        groups.push({ day: d, events: dayEvents });
      }
    }
    return groups;
  }, [events, month, year]);

  const today = new Date();
  const isCurrentMonth = today.getMonth() + 1 === month && today.getFullYear() === year;

  if (groupedByDay.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
        Nenhum evento neste mês.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      {groupedByDay.map(({ day, events: dayEvents }, groupIdx) => {
        const isToday = isCurrentMonth && day === today.getDate();
        const dayOfWeek = DAY_NAMES[new Date(year, month - 1, day).getDay()];

        return (
          <div key={day}>
            {/* Day header */}
            <div
              className={`flex items-baseline gap-2 border-b px-4 py-2 ${
                groupIdx > 0 ? "border-t" : ""
              } ${
                isToday
                  ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/30"
                  : "border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
              }`}
            >
              <span
                className={`text-lg font-bold ${
                  isToday ? "text-blue-600 dark:text-blue-400" : "text-gray-900 dark:text-gray-100"
                }`}
              >
                {day}
              </span>
              <span
                className={`text-sm ${
                  isToday ? "font-medium text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {dayOfWeek}
              </span>
            </div>

            {/* Events */}
            {dayEvents.map((event, eventIdx) => {
              const style = getStatusStyle(event.status);
              const StatusIcon = style.Icon;
              const time = new Date(event.scheduledAt);
              const timeStr = `${String(time.getUTCHours()).padStart(2, "0")}:${String(time.getUTCMinutes()).padStart(2, "0")}`;
              const barColor = getTypeSolidColor(event.type);

              return (
                <Link
                  key={`${event.type}-${event.id}`}
                  href={event.href}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    eventIdx < dayEvents.length - 1
                      ? "border-b border-gray-100 dark:border-gray-700"
                      : ""
                  }`}
                >
                  {/* Color bar */}
                  <div className={`w-[3px] self-stretch rounded-full ${barColor}`} />

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                      [{TYPE_LABELS[event.type]}] {event.employeeName}
                    </p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                      Gestor: {event.managerName}
                    </p>
                  </div>

                  {/* Right side: time + status */}
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}
                    >
                      <StatusIcon size={10} />
                      {style.label}
                    </span>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {timeStr}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
