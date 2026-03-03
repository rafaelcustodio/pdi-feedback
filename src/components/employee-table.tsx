"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  UserX,
  UserCheck,
  Pencil,
  GitBranch,
} from "lucide-react";
import type { EmployeeListItem } from "@/app/(dashboard)/colaboradores/actions";
import {
  deactivateEmployee,
  reactivateEmployee,
} from "@/app/(dashboard)/colaboradores/actions";

interface EmployeeTableProps {
  employees: EmployeeListItem[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
}

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  manager: "Gestor",
  employee: "Colaborador",
};

export function EmployeeTable({
  employees,
  total,
  page,
  pageSize,
  search: initialSearch,
}: EmployeeTableProps) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(initialSearch);
  const [loading, setLoading] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchValue.trim()) params.set("search", searchValue.trim());
    params.set("page", "1");
    router.replace(`/colaboradores?${params.toString()}`);
  }

  function goToPage(p: number) {
    const params = new URLSearchParams();
    if (searchValue.trim()) params.set("search", searchValue.trim());
    params.set("page", String(p));
    router.replace(`/colaboradores?${params.toString()}`);
  }

  async function handleDeactivate(id: string) {
    if (!confirm("Deseja realmente desativar este colaborador?")) return;
    setLoading(id);
    await deactivateEmployee(id);
    setLoading(null);
  }

  async function handleReactivate(id: string) {
    setLoading(id);
    await reactivateEmployee(id);
    setLoading(null);
  }

  return (
    <div className="space-y-4">
      {/* Header with search and create button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1 sm:max-w-xs">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
            />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Buscar por nome ou e-mail..."
              className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            Buscar
          </button>
        </form>
        <Link
          href="/colaboradores/novo"
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <UserPlus size={16} />
          Novo Colaborador
        </Link>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Nome
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                E-mail
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Papel
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 lg:table-cell">
                Cargo
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 md:table-cell">
                Telefone
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 md:table-cell">
                Modo
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Unidade
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Gestor
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {employees.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  Nenhum colaborador encontrado.
                </td>
              </tr>
            ) : (
              employees.map((emp) => (
                <tr
                  key={emp.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${!emp.isActive ? "opacity-60" : ""}`}
                >
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                    {emp.name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {emp.email}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        emp.role === "admin"
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"
                          : emp.role === "manager"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {roleLabels[emp.role] ?? emp.role}
                    </span>
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-400 lg:table-cell">
                    {emp.jobTitle ?? "—"}
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-400 md:table-cell">
                    {emp.phone ?? "—"}
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-sm md:table-cell">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        emp.evaluationMode === "pdi"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                          : "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                      }`}
                    >
                      {emp.evaluationMode === "pdi" ? "PDI" : "Feedback"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {emp.orgUnit ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {emp.managerName ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    {emp.isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/50 dark:text-green-300">
                        Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/50 dark:text-red-300">
                        Inativo
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/colaboradores/${emp.id}`}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600 dark:text-gray-500 dark:hover:bg-gray-700"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </Link>
                      <Link
                        href={`/colaboradores/${emp.id}/hierarquia`}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-green-600 dark:text-gray-500 dark:hover:bg-gray-700"
                        title="Ver hierarquia"
                      >
                        <GitBranch size={14} />
                      </Link>
                      {emp.isActive ? (
                        <button
                          onClick={() => handleDeactivate(emp.id)}
                          disabled={loading === emp.id}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600 disabled:opacity-50 dark:text-gray-500 dark:hover:bg-gray-700"
                          title="Desativar"
                        >
                          <UserX size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivate(emp.id)}
                          disabled={loading === emp.id}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-green-600 disabled:opacity-50 dark:text-gray-500 dark:hover:bg-gray-700"
                          title="Reativar"
                        >
                          <UserCheck size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Mostrando {(page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, total)} de {total} colaboradores
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="rounded-md border border-gray-300 p-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 ||
                  p === totalPages ||
                  (p >= page - 1 && p <= page + 1)
              )
              .map((p, idx, arr) => (
                <span key={p} className="flex items-center">
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span className="px-1 text-gray-400 dark:text-gray-500">...</span>
                  )}
                  <button
                    onClick={() => goToPage(p)}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                      p === page
                        ? "bg-blue-600 text-white"
                        : "border border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
                    }`}
                  >
                    {p}
                  </button>
                </span>
              ))}
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="rounded-md border border-gray-300 p-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
