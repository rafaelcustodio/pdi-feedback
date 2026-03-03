"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Users, Search, X, ChevronRight } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Gestor",
  employee: "Colaborador",
};

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  jobTitle?: string | null;
}

export function ImpersonationSelector({
  onClose,
}: {
  onClose?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  function openModal() {
    setOpen(true);
    setSearch("");
    setLoading(true);
    fetch("/api/impersonate/users")
      .then((r) => r.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }

  function close() {
    setOpen(false);
    onClose?.();
  }

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleSelect(userId: string) {
    await fetch("/api/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    close();
    router.refresh();
  }

  const filtered = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.jobTitle?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <button
        onClick={openModal}
        style={{ color: "var(--text-sidebar)" }}
        className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm font-medium transition-colors hover:bg-[var(--bg-sidebar-hover)] hover:text-[#1E4FF2]"
      >
        <Users size={15} />
        Simular usuário
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (modalRef.current && !modalRef.current.contains(e.target as Node))
              close();
          }}
        >
          <div
            ref={modalRef}
            className="flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-[#1e2535] dark:bg-[#161b27]"
            style={{ maxHeight: "70vh" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-[#1e2535]">
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Simular usuário
              </h2>
              <button
                onClick={close}
                className="rounded-md p-1 transition-colors hover:bg-gray-100 dark:hover:bg-[#1e2535]"
                style={{ color: "var(--text-secondary)" }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Search */}
            <div className="border-b border-gray-100 px-3 py-2 dark:border-[#1e2535]">
              <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 dark:bg-[#1e2535]">
                <Search size={14} style={{ color: "var(--text-secondary)" }} />
                <input
                  autoFocus
                  type="text"
                  placeholder="Buscar por nome, e-mail ou setor..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: "var(--text-primary)" }}
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="py-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                  Carregando...
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                  Nenhum usuário encontrado.
                </div>
              ) : (
                filtered.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelect(user.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-[#1e2535]"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1E4FF2] text-xs font-semibold text-white">
                      {user.name
                        ?.split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {user.name}
                      </p>
                      <p className="truncate text-xs" style={{ color: "var(--text-secondary)" }}>
                        {ROLE_LABELS[user.role] ?? user.role}
                        {user.jobTitle ? ` · ${user.jobTitle}` : ""}
                      </p>
                    </div>
                    <ChevronRight size={14} style={{ color: "var(--text-secondary)" }} className="shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
