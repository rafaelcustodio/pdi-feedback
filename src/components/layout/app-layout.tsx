"use client";

import { useState, useCallback } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { MobileSidebarOverlay } from "./mobile-sidebar-overlay";

interface AppLayoutProps {
  children: React.ReactNode;
  userName?: string;
  avatarUrl?: string | null;
  userRole?: string;
  evaluationMode?: string;
  notificationCount?: number;
}

export function AppLayout({
  children,
  userName = "Usuário",
  avatarUrl,
  userRole = "employee",
  evaluationMode = "feedback",
  notificationCount = 0,
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
    <div style={{ background: "var(--bg-body)" }} className="min-h-screen">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
          userRole={userRole}
          evaluationMode={evaluationMode}
          userName={userName}
          avatarUrl={avatarUrl}
          notificationCount={notificationCount}
        />
      </div>

      {/* Mobile sidebar overlay */}
      <MobileSidebarOverlay open={mobileMenuOpen} onClose={closeMobileMenu}>
        <Sidebar
          collapsed={false}
          onToggle={closeMobileMenu}
          userRole={userRole}
          evaluationMode={evaluationMode}
          userName={userName}
          avatarUrl={avatarUrl}
          notificationCount={notificationCount}
        />
      </MobileSidebarOverlay>

      {/* Mobile header */}
      <Header onMenuToggle={toggleMobileMenu} />

      {/* Main content */}
      <main
        className={`pt-16 transition-all duration-300 lg:pt-0 ${
          sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"
        }`}
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
