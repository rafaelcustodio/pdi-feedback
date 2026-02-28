"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { Menu, User, LogOut } from "lucide-react";
import {
  NotificationDropdown,
} from "@/components/notification-dropdown";
import type { NotificationListItem } from "@/app/(dashboard)/notificacoes/actions";

interface HeaderProps {
  userName: string;
  avatarUrl?: string | null;
  notificationCount?: number;
  recentNotifications?: NotificationListItem[];
  onMenuToggle: () => void;
}

export function Header({
  userName,
  avatarUrl,
  notificationCount = 0,
  recentNotifications = [],
  onMenuToggle,
}: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="fixed right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 transition-all">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuToggle}
          className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 lg:hidden"
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>

        <span className="text-lg font-semibold text-gray-800 lg:hidden">
          PDI & Feedback
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Notification dropdown */}
        <NotificationDropdown
          initialCount={notificationCount}
          initialNotifications={recentNotifications}
        />

        {/* User dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
          >
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={userName}
                width={32}
                height={32}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <span className="text-sm font-medium">
                  {userName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
              </div>
            )}
            <span className="hidden font-medium sm:inline">{userName}</span>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              <a
                href="/perfil"
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <User size={16} />
                Meu Perfil
              </a>
              <button
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut size={16} />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
