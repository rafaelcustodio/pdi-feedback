"use client";

import { Menu } from "lucide-react";

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  return (
    <header
      style={{ background: "var(--bg-header)", borderColor: "var(--border-sidebar)" }}
      className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center border-b px-4 transition-all lg:hidden"
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          style={{ color: "var(--text-secondary)" }}
          className="rounded-md p-2 transition-colors hover:bg-[var(--bg-sidebar-hover)] hover:text-[#1E4FF2]"
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1E4FF2]">
            <span className="text-xs font-bold text-white">N</span>
          </div>
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Narwal PDI
          </span>
        </div>
      </div>
    </header>
  );
}
