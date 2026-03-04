"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getOrCreatePDI } from "@/app/(dashboard)/pdis/actions";
import type { SubordinateWithoutPDI } from "@/app/(dashboard)/pdis/actions";

interface PdiMissingAlertProps {
  subordinates: SubordinateWithoutPDI[];
}

export function PdiMissingAlert({ subordinates }: PdiMissingAlertProps) {
  const [expanded, setExpanded] = useState(subordinates.length <= 5);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (subordinates.length === 0) return null;

  async function handleCreatePDI(employeeId: string) {
    setLoadingId(employeeId);
    const result = await getOrCreatePDI(employeeId);
    if (result.success && result.pdi) {
      startTransition(() => {
        router.push(`/pdis/${result.pdi!.id}`);
      });
    } else {
      setLoadingId(null);
      alert(result.error || "Erro ao criar PDI");
    }
  }

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/50">
      <div className="flex items-start gap-3">
        <svg
          className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              Colaboradores sem PDI ativo
            </h3>
            <span className="inline-flex items-center rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-800 dark:text-amber-200">
              {subordinates.length}
            </span>
          </div>

          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            {subordinates.length === 1
              ? "1 colaborador com modo de avaliação PDI não possui plano ativo."
              : `${subordinates.length} colaboradores com modo de avaliação PDI não possuem plano ativo.`}
          </p>

          {subordinates.length > 5 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-2 text-sm font-medium text-amber-700 underline hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
            >
              {expanded ? "Recolher lista" : "Expandir lista"}
            </button>
          )}

          {expanded && (
            <ul className="mt-3 space-y-2">
              {subordinates.map((sub) => (
                <li
                  key={sub.id}
                  className="flex items-center justify-between rounded-md bg-amber-100/70 px-3 py-2 dark:bg-amber-900/30"
                >
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
                      {sub.name}
                    </span>
                    <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                      {sub.email}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCreatePDI(sub.id)}
                    disabled={loadingId === sub.id || isPending}
                    className="ml-3 flex-shrink-0 rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50 dark:bg-amber-700 dark:hover:bg-amber-600"
                  >
                    {loadingId === sub.id ? "Criando..." : "Criar PDI"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
