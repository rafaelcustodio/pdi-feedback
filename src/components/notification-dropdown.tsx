"use client";

import { useState, useRef, useEffect, useTransition, useMemo } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import {
  type NotificationListItem,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/app/(dashboard)/notificacoes/actions";

interface NotificationDropdownProps {
  initialCount: number;
  initialNotifications: NotificationListItem[];
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d`;
  return new Date(date).toLocaleDateString("pt-BR");
}

function getTypeColor(type: string): string {
  switch (type) {
    case "pdi_reminder":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
    case "feedback_reminder":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
  }
}

function getTypeLabel(type: string): string {
  switch (type) {
    case "pdi_reminder":
      return "PDI";
    case "feedback_reminder":
      return "Feedback";
    default:
      return "Geral";
  }
}

export function NotificationDropdown({
  initialCount,
  initialNotifications,
}: NotificationDropdownProps) {
  const [open, setOpen] = useState(false);
  // Track which notifications have been locally marked as read for optimistic UI
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [allMarkedRead, setAllMarkedRead] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const notifications = useMemo(
    () =>
      initialNotifications.map((n) => ({
        ...n,
        isRead: n.isRead || allMarkedRead || readIds.has(n.id),
      })),
    [initialNotifications, readIds, allMarkedRead]
  );

  const count = allMarkedRead
    ? 0
    : Math.max(0, initialCount - readIds.size);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleMarkAsRead(notificationId: string) {
    startTransition(async () => {
      const result = await markNotificationAsRead(notificationId);
      if (result.success) {
        setReadIds((prev) => new Set(prev).add(notificationId));
      }
    });
  }

  function handleMarkAllAsRead() {
    startTransition(async () => {
      const result = await markAllNotificationsAsRead();
      if (result.success) {
        setAllMarkedRead(true);
      }
    });
  }

  const unreadInList = notifications.some((n) => !n.isRead);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
        aria-label="Notificações"
      >
        <Bell size={20} />
        {count > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 sm:w-96">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Notificações
            </h3>
            {unreadInList && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={isPending}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <CheckCheck size={14} />
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                Nenhuma notificação
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`border-b border-gray-50 px-4 py-3 dark:border-gray-700 ${
                    !notification.isRead ? "bg-blue-50/50 dark:bg-blue-950/30" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${getTypeColor(notification.type)}`}
                        >
                          {getTypeLabel(notification.type)}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {formatTimeAgo(notification.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {notification.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-gray-600 dark:text-gray-400">
                        {notification.message.replace(/\s*\[.*?\]\s*$/, "")}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        disabled={isPending}
                        className="mt-1 shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                        title="Marcar como lida"
                      >
                        <Check size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-gray-100 px-4 py-2 dark:border-gray-700">
            <a
              href="/notificacoes"
              className="block text-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Ver todas as notificações
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
