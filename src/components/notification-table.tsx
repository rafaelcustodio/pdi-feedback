"use client";

import { useTransition } from "react";
import { Check, CheckCheck, ChevronLeft, ChevronRight } from "lucide-react";
import {
  type NotificationListItem,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/app/(dashboard)/notificacoes/actions";

interface NotificationTableProps {
  notifications: NotificationListItem[];
  total: number;
  page: number;
  pageSize: number;
  filter: string;
}

function getTypeColor(type: string): string {
  switch (type) {
    case "pdi_reminder":
      return "bg-blue-100 text-blue-700";
    case "feedback_reminder":
      return "bg-purple-100 text-purple-700";
    case "feedback_scheduled":
      return "bg-indigo-100 text-indigo-700";
    case "feedback_submitted_auto":
      return "bg-green-100 text-green-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function getTypeLabel(type: string): string {
  switch (type) {
    case "pdi_reminder":
      return "PDI";
    case "feedback_reminder":
      return "Feedback";
    case "feedback_scheduled":
      return "Agendamento";
    case "feedback_submitted_auto":
      return "Auto-envio";
    default:
      return "Geral";
  }
}

function buildUrl(params: Record<string, string | number>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && value !== "all" && value !== "1") {
      searchParams.set(key, String(value));
    }
  }
  const qs = searchParams.toString();
  return `/notificacoes${qs ? `?${qs}` : ""}`;
}

export function NotificationTable({
  notifications,
  total,
  page,
  pageSize,
  filter,
}: NotificationTableProps) {
  const [isPending, startTransition] = useTransition();
  const totalPages = Math.ceil(total / pageSize);
  const hasUnread = notifications.some((n) => !n.isRead);

  function handleMarkAsRead(notificationId: string) {
    startTransition(async () => {
      const result = await markNotificationAsRead(notificationId);
      if (result.success) {
        window.location.reload();
      }
    });
  }

  function handleMarkAllAsRead() {
    startTransition(async () => {
      const result = await markAllNotificationsAsRead();
      if (result.success) {
        window.location.reload();
      }
    });
  }

  return (
    <div>
      {/* Filters and actions */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(["all", "unread", "read"] as const).map((f) => (
            <a
              key={f}
              href={buildUrl({ filter: f, page: 1 })}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                filter === f
                  ? "bg-blue-700 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {f === "all" ? "Todas" : f === "unread" ? "Não lidas" : "Lidas"}
            </a>
          ))}
        </div>

        {hasUnread && (
          <button
            onClick={handleMarkAllAsRead}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-blue-700 ring-1 ring-inset ring-blue-200 hover:bg-blue-50 disabled:opacity-50"
          >
            <CheckCheck size={16} />
            Marcar todas como lidas
          </button>
        )}
      </div>

      {/* Notification list */}
      <div className="rounded-lg border border-gray-200 bg-white">
        {notifications.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">
            {filter === "unread"
              ? "Nenhuma notificação não lida"
              : filter === "read"
                ? "Nenhuma notificação lida"
                : "Nenhuma notificação"}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <li
                key={notification.id}
                className={`flex items-start gap-4 px-4 py-4 sm:px-6 ${
                  !notification.isRead ? "bg-blue-50/50" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${getTypeColor(notification.type)}`}
                    >
                      {getTypeLabel(notification.type)}
                    </span>
                    {!notification.isRead && (
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                    )}
                    <span className="text-xs text-gray-400">
                      {new Date(notification.createdAt).toLocaleDateString(
                        "pt-BR",
                        {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {notification.title}
                  </p>
                  <p className="mt-0.5 text-sm text-gray-600">
                    {notification.message.replace(/\s*\[.*?\]\s*$/, "")}
                  </p>
                </div>
                {!notification.isRead && (
                  <button
                    onClick={() => handleMarkAsRead(notification.id)}
                    disabled={isPending}
                    className="shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                    title="Marcar como lida"
                  >
                    <Check size={16} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Mostrando {(page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, total)} de {total}
          </p>
          <div className="flex gap-1">
            {page > 1 && (
              <a
                href={buildUrl({ filter, page: page - 1 })}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 hover:bg-gray-50"
              >
                <ChevronLeft size={16} />
              </a>
            )}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 ||
                  p === totalPages ||
                  (p >= page - 1 && p <= page + 1)
              )
              .map((p, i, arr) => (
                <span key={p} className="flex items-center">
                  {i > 0 && arr[i - 1] !== p - 1 && (
                    <span className="px-1 text-gray-400">...</span>
                  )}
                  <a
                    href={buildUrl({ filter, page: p })}
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-sm ${
                      p === page
                        ? "bg-blue-700 text-white"
                        : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {p}
                  </a>
                </span>
              ))}
            {page < totalPages && (
              <a
                href={buildUrl({ filter, page: page + 1 })}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 hover:bg-gray-50"
              >
                <ChevronRight size={16} />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
