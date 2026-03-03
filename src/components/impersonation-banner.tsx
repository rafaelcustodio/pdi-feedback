"use client";

import { useRouter } from "next/navigation";
import { Eye, X } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Gestor",
  employee: "Colaborador",
};

interface ImpersonationBannerProps {
  targetName: string;
  targetRole: string;
}

export function ImpersonationBanner({
  targetName,
  targetRole,
}: ImpersonationBannerProps) {
  const router = useRouter();

  async function handleExit() {
    await fetch("/api/impersonate", { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between gap-3 bg-amber-400 px-4 py-2 text-sm font-medium text-amber-900 dark:bg-amber-500 dark:text-amber-950">
      <div className="flex items-center gap-2">
        <Eye size={16} className="shrink-0" />
        <span>
          Visualizando como{" "}
          <strong>{targetName}</strong>{" "}
          ({ROLE_LABELS[targetRole] ?? targetRole})
        </span>
      </div>
      <button
        onClick={handleExit}
        className="flex items-center gap-1.5 rounded-md bg-amber-900/20 px-2.5 py-1 text-xs font-semibold transition-colors hover:bg-amber-900/30 dark:bg-amber-950/20 dark:hover:bg-amber-950/30"
      >
        <X size={13} />
        Sair da visualização
      </button>
    </div>
  );
}
