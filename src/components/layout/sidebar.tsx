"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import {
  LayoutDashboard,
  Calendar,
  CalendarCheck,
  Users,
  ClipboardList,
  MessageSquare,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Sun,
  Moon,
  User,
  LogOut,
} from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";
import { ImpersonationSelector } from "@/components/impersonation-selector";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  userRole?: string;
  evaluationMode?: string;
  userName?: string;
  avatarUrl?: string | null;
  notificationCount?: number;
  isAdmin?: boolean;
  pendingEmployeesCount?: number;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: null, evaluationModes: null },
  { href: "/calendario", label: "Calendário", icon: Calendar, roles: null, evaluationModes: null },
  { href: "/colaboradores", label: "Colaboradores", icon: Users, roles: ["admin"] as string[], evaluationModes: null },
  { href: "/pdis", label: "PDIs", icon: ClipboardList, roles: null, evaluationModes: ["pdi"] as string[] },
  { href: "/feedbacks", label: "Feedbacks", icon: MessageSquare, roles: null, evaluationModes: ["feedback"] as string[] },
  { href: "/programacao", label: "Programação", icon: CalendarCheck, roles: ["admin", "manager"] as string[], evaluationModes: null },
];

function Tooltip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative flex w-full">
      {children}
      <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-[#32373c] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        {label}
      </span>
    </div>
  );
}

function UserInitials({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1E4FF2] text-xs font-semibold text-white">
      {initials}
    </div>
  );
}

export function Sidebar({
  collapsed,
  onToggle,
  userRole,
  evaluationMode = "feedback",
  userName = "Usuário",
  avatarUrl,
  notificationCount = 0,
  isAdmin = false,
  pendingEmployeesCount = 0,
}: SidebarProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <aside
      style={{
        background: "var(--bg-sidebar)",
        borderColor: "var(--border-sidebar)",
      }}
      className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Logo */}
      <div
        style={{ borderColor: "var(--border-sidebar)" }}
        className="relative flex h-16 shrink-0 items-center border-b"
      >
        {collapsed ? (
          /* Collapsed: símbolo da Narwal (parte direita do logo) */
          <div className="flex w-full items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/narwal-logo.png"
              alt="Narwal"
              style={{
                display: "block",
                width: "58px",
                height: "32px",
                objectFit: "cover",
                objectPosition: "right center",
                borderRadius: "2px",
                filter: theme === "dark" ? "none" : "brightness(0)",
              }}
            />
          </div>
        ) : (
          /* Expanded: logo completo + botão recolher */
          <div className="flex w-full items-center justify-between px-3">
            <div className="flex h-8 min-w-0 flex-1 items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/narwal-logo.png"
                alt="Narwal Sistemas"
                className="h-7 w-auto object-contain object-left"
                style={{ filter: theme === "dark" ? "none" : "brightness(0)" }}
              />
            </div>
            <button
              onClick={onToggle}
              style={{ color: "var(--text-secondary)" }}
              className="ml-2 shrink-0 rounded-md p-1.5 transition-colors hover:bg-[var(--bg-sidebar-hover)] hover:text-[#1E4FF2]"
              aria-label="Recolher menu"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        )}

        {/* Botão expandir — aparece só quando colapsado, na borda direita */}
        {collapsed && (
          <button
            onClick={onToggle}
            style={{
              background: "var(--bg-sidebar)",
              borderColor: "var(--border-sidebar)",
              color: "var(--text-secondary)",
            }}
            className="absolute -right-3 top-[65%] z-50 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border shadow-sm transition-colors hover:text-[#1E4FF2]"
            aria-label="Expandir menu"
          >
            <ChevronRight size={12} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-0.5">
          {navItems.filter((item) => {
            // Role-based filtering
            if (item.roles && (!userRole || !item.roles.includes(userRole))) return false;
            // EvaluationMode filtering: admins/managers see both; employees see only their mode
            if (item.evaluationModes && userRole !== "admin" && userRole !== "manager") {
              if (!item.evaluationModes.includes(evaluationMode)) return false;
            }
            return true;
          }).map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            const link = (
              <Link
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  active
                    ? "bg-[#1E4FF2] text-white shadow-sm"
                    : "hover:bg-[var(--bg-sidebar-hover)]"
                }`}
                style={!active ? { color: "var(--text-sidebar)" } : undefined}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && item.href === "/colaboradores" && pendingEmployeesCount > 0 && (
                  <span className={`ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold ${
                    active ? "bg-white/20 text-white" : "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300"
                  }`}>
                    {pendingEmployeesCount > 99 ? "99+" : pendingEmployeesCount}
                  </span>
                )}
              </Link>
            );
            return (
              <li key={item.href}>
                {collapsed ? (
                  <Tooltip label={item.label}>{link}</Tooltip>
                ) : (
                  link
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom section */}
      <div
        style={{ borderColor: "var(--border-sidebar)" }}
        className="shrink-0 space-y-0.5 border-t px-2 py-3"
      >
        {/* Notifications */}
        {collapsed ? (
          <Tooltip
            label={`Notificações${notificationCount > 0 ? ` (${notificationCount})` : ""}`}
          >
            <Link
              href="/notificacoes"
              className={`relative flex w-full items-center justify-center rounded-lg p-2.5 transition-colors ${
                isActive("/notificacoes")
                  ? "bg-[#1E4FF2] text-white"
                  : "hover:bg-[var(--bg-sidebar-hover)]"
              }`}
              style={
                !isActive("/notificacoes")
                  ? { color: "var(--text-sidebar)" }
                  : undefined
              }
            >
              <Bell size={18} />
              {notificationCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              )}
            </Link>
          </Tooltip>
        ) : (
          <Link
            href="/notificacoes"
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive("/notificacoes")
                ? "bg-[#1E4FF2] text-white shadow-sm"
                : "hover:bg-[var(--bg-sidebar-hover)]"
            }`}
            style={
              !isActive("/notificacoes")
                ? { color: "var(--text-sidebar)" }
                : undefined
            }
          >
            <Bell size={18} className="shrink-0" />
            <span>Notificações</span>
            {notificationCount > 0 && (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            )}
          </Link>
        )}

        {/* Theme toggle */}
        {collapsed ? (
          <Tooltip label={theme === "dark" ? "Tema claro" : "Tema escuro"}>
            <button
              onClick={toggleTheme}
              style={{ color: "var(--text-sidebar)" }}
              className="flex w-full items-center justify-center rounded-lg p-2.5 transition-colors hover:bg-[var(--bg-sidebar-hover)] hover:text-[#1E4FF2]"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </Tooltip>
        ) : (
          <button
            onClick={toggleTheme}
            style={{ color: "var(--text-sidebar)" }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--bg-sidebar-hover)] hover:text-[#1E4FF2]"
          >
            {theme === "dark" ? (
              <Sun size={18} className="shrink-0" />
            ) : (
              <Moon size={18} className="shrink-0" />
            )}
            <span>{theme === "dark" ? "Tema claro" : "Tema escuro"}</span>
          </button>
        )}

        {/* User */}
        <div ref={userMenuRef} className="relative">
          {collapsed ? (
            <Tooltip label={userName}>
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex w-full items-center justify-center rounded-lg p-2.5 transition-colors hover:bg-[var(--bg-sidebar-hover)]"
              >
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={userName}
                    width={28}
                    height={28}
                    className="h-7 w-7 rounded-full object-cover"
                  />
                ) : (
                  <UserInitials name={userName} />
                )}
              </button>
            </Tooltip>
          ) : (
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              style={{ color: "var(--text-sidebar)" }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--bg-sidebar-hover)]"
            >
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={userName}
                  width={28}
                  height={28}
                  className="h-7 w-7 shrink-0 rounded-full object-cover"
                />
              ) : (
                <UserInitials name={userName} />
              )}
              <span className="min-w-0 flex-1 truncate text-left">
                {userName}
              </span>
              <ChevronUp
                size={14}
                className={`shrink-0 transition-transform duration-200 ${userMenuOpen ? "rotate-0" : "rotate-180"}`}
              />
            </button>
          )}

          {userMenuOpen && (
            <div
              className={`absolute z-[100] min-w-44 rounded-xl border border-gray-200 bg-white py-1.5 shadow-xl dark:border-[#1e2535] dark:bg-[#161b27] ${
                collapsed
                  ? "bottom-0 left-full ml-2"
                  : "bottom-full left-0 right-0 mb-1"
              }`}
            >
              <Link
                href="/perfil"
                onClick={() => setUserMenuOpen(false)}
                style={{ color: "var(--text-sidebar)" }}
                className="flex items-center gap-2.5 px-3.5 py-2 text-sm font-medium transition-colors hover:bg-[var(--bg-sidebar-hover)] hover:text-[#1E4FF2]"
              >
                <User size={15} />
                Meu Perfil
              </Link>
              {userRole === "admin" && (
                <Link
                  href="/configuracoes"
                  onClick={() => setUserMenuOpen(false)}
                  style={{ color: "var(--text-sidebar)" }}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-sm font-medium transition-colors hover:bg-[var(--bg-sidebar-hover)] hover:text-[#1E4FF2]"
                >
                  <Settings size={15} />
                  Configurações
                </Link>
              )}
              {isAdmin && (
                <ImpersonationSelector onClose={() => setUserMenuOpen(false)} />
              )}
              <div className="my-1 border-t border-gray-100 dark:border-[#1e2535]" />
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  signOut({ callbackUrl: "/login" });
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <LogOut size={15} />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
