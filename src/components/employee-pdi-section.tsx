"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Plus, ArrowRight } from "lucide-react";
import { getOrCreatePDI } from "@/app/(dashboard)/pdis/actions";

interface EmployeePDISectionProps {
  employeeId: string;
  activePdiId: string | null;
}

export function EmployeePDISection({ employeeId, activePdiId }: EmployeePDISectionProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreatePDI() {
    setLoading(true);
    setError(null);
    const result = await getOrCreatePDI(employeeId);
    setLoading(false);
    if (result.success && result.pdi) {
      router.push(`/pdis/${result.pdi.id}`);
    } else {
      setError(result.error ?? "Erro ao criar PDI");
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-center gap-2 mb-4">
        <ClipboardList size={20} className="text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-900">PDI</h2>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {activePdiId ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              PDI Ativo
            </span>
            <span className="text-sm text-gray-500">
              Existe um PDI ativo para este colaborador.
            </span>
          </div>
          <a
            href={`/pdis/${activePdiId}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Ver PDI
            <ArrowRight size={14} />
          </a>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
              Sem PDI ativo
            </span>
            <span className="text-sm text-gray-500">
              Nenhum PDI ativo encontrado para este colaborador.
            </span>
          </div>
          <button
            onClick={handleCreatePDI}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus size={14} />
            {loading ? "Criando..." : "Criar PDI"}
          </button>
        </div>
      )}
    </div>
  );
}
