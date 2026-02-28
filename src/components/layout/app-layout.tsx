"use client";

import { useState, useCallback } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { MobileSidebarOverlay } from "./mobile-sidebar-overlay";
import type { NotificationListItem } from "@/app/(dashboard)/notificacoes/actions";

interface AppLayoutProps {
  children: React.ReactNode;
  userName?: string;
  avatarUrl?: string | null;
  userRole?: string;
  notificationCount?: number;
  recentNotifications?: NotificationListItem[];
}

export function AppLayout({
  children,
  userName = "Usuário",
  avatarUrl,
  userRole = "employee",
  notificationCount = 0,
  recentNotifications = [],
}: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen((prev) => !prev);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
          userRole={userRole}
        />
      </div>

      {/* Mobile sidebar overlay */}
      <MobileSidebarOverlay open={mobileMenuOpen} onClose={closeMobileMenu}>
        <Sidebar
          collapsed={false}
          onToggle={closeMobileMenu}
          userRole={userRole}
        />
      </MobileSidebarOverlay>

      {/* Header */}
      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"
        }`}
      >
        <Header
          userName={userName}
          avatarUrl={avatarUrl}
          notificationCount={notificationCount}
          recentNotifications={recentNotifications}
          onMenuToggle={toggleMobileMenu}
        />
      </div>

      {/* Main content */}
      <main
        className={`pt-16 transition-all duration-300 ${
          sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"
        }`}
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
