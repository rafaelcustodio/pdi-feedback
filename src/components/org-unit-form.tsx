"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { createOrganizationalUnit } from "@/app/(dashboard)/configuracoes/actions";

interface OrgUnitFormProps {
  parentOptions: { id: string; name: string; parentId: string | null }[];
}

export function OrgUnitForm({ parentOptions }: OrgUnitFormProps) {
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    const result = await createOrganizationalUnit(
      name.trim(),
      parentId || null
    );

    setLoading(false);

    if (result.success) {
      setName("");
      setParentId("");
    } else {
      setError(result.error ?? "Erro ao criar unidade");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-medium text-gray-700">
        Nova Unidade Organizacional
      </h3>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label
            htmlFor="unit-name"
            className="mb-1 block text-xs font-medium text-gray-600"
          >
            Nome
          </label>
          <input
            id="unit-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Departamento de TI"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={loading}
            required
          />
        </div>
        <div className="flex-1">
          <label
            htmlFor="unit-parent"
            className="mb-1 block text-xs font-medium text-gray-600"
          >
            Unidade-pai (opcional)
          </label>
          <select
            id="unit-parent"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={loading}
          >
            <option value="">Nenhuma (raiz)</option>
            {parentOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          <Plus size={16} />
          {loading ? "Criando..." : "Criar"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  );
}
