"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Eye,
  Pencil,
  Target,
  Filter,
} from "lucide-react";
import type { PDIListItem } from "@/app/(dashboard)/pdis/actions";

interface PDITableProps {
  pdis: PDIListItem[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  conductedAtFrom?: string;
  conductedAtTo?: string;
  statusFilter?: string;
  canCreate: boolean;
  isEmployeeView?: boolean;
}

const statusLabels: Record<string, string> = {
  scheduled: "Agendado",
  draft: "Rascunho",
  active: "Ativo",
  completed: "Concluído",
  cancelled: "Cancelado",
};

const statusColors: Record<string, string> = {
  scheduled: "bg-gray-100 text-gray-600",
  draft: "bg-yellow-100 text-yellow-700",
  active: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export function PDITable({
  pdis,
  total,
  page,
  pageSize,
  search: initialSearch,
  conductedAtFrom: initialConductedAtFrom = "",
  conductedAtTo: initialConductedAtTo = "",
  statusFilter: initialStatusFilter = "",
  canCreate,
  isEmployeeView = false,
}: PDITableProps) {
  const [searchValue, setSearchValue] = useState(initialSearch);
  const [conductedAtFromValue, setConductedAtFromValue] = useState(initialConductedAtFrom);
  const [conductedAtToValue, setConductedAtToValue] = useState(initialConductedAtTo);
  const [statusFilterValue, setStatusFilterValue] = useState(initialStatusFilter);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function buildUrl(overrides: {
    search?: string;
    page?: string;
    conductedAtFrom?: string;
    conductedAtTo?: string;
    status?: string;
  }) {
    const params = new URLSearchParams();
    const s = overrides.search ?? searchValue;
    const p = overrides.page ?? "1";
    const caFrom = overrides.conductedAtFrom ?? conductedAtFromValue;
    const caTo = overrides.conductedAtTo ?? conductedAtToValue;
    const st = overrides.status ?? statusFilterValue;
    if (s.trim()) params.set("search", s.trim());
    if (caFrom) params.set("conductedAtFrom", caFrom);
    if (caTo) params.set("conductedAtTo", caTo);
    if (st) params.set("status", st);
    params.set("page", p);
    return `/pdis?${params.toString()}`;
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    window.location.href = buildUrl({ search: searchValue, page: "1" });
  }

  function handleConductedAtFilter(from: string, to: string) {
    setConductedAtFromValue(from);
    setConductedAtToValue(to);
    window.location.href = buildUrl({ conductedAtFrom: from, conductedAtTo: to, page: "1" });
  }

  function handleStatusFilter(newStatus: string) {
    setStatusFilterValue(newStatus);
    window.location.href = buildUrl({ status: newStatus, page: "1" });
  }

  function goToPage(p: number) {
    window.location.href = buildUrl({ page: String(p) });
  }

  // Status filter options — employees don't see 'scheduled'
  const statusOptions = isEmployeeView
    ? [
        { value: "", label: "Todos os status" },
        { value: "draft", label: "Rascunho" },
        { value: "active", label: "Ativo" },
        { value: "completed", label: "Concluído" },
        { value: "cancelled", label: "Cancelado" },
      ]
    : [
        { value: "", label: "Todos os status" },
        { value: "scheduled", label: "Agendado" },
        { value: "draft", label: "Rascunho" },
        { value: "active", label: "Ativo" },
        { value: "completed", label: "Concluído" },
        { value: "cancelled", label: "Cancelado" },
      ];

  return (
    <div className="space-y-4">
      {/* Header with search and create button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <form onSubmit={handleSearch} className="flex flex-1 gap-2">
            <div className="relative flex-1 sm:max-w-xs">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Buscar por colaborador ou período..."
                className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Buscar
            </button>
          </form>
          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-gray-400" />
            <select
              value={statusFilterValue}
              onChange={(e) => handleStatusFilter(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {canCreate && (
          <Link
            href="/pdis/novo"
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={16} />
            Novo PDI
          </Link>
        )}
      </div>

      {/* Date range filter for conductedAt */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-gray-500">Realizado de:</span>
        <input
          type="date"
          value={conductedAtFromValue}
          onChange={(e) => handleConductedAtFilter(e.target.value, conductedAtToValue)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <span className="text-xs font-medium text-gray-500">até:</span>
        <input
          type="date"
          value={conductedAtToValue}
          onChange={(e) => handleConductedAtFilter(conductedAtFromValue, e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {(conductedAtFromValue || conductedAtToValue) && (
          <button
            type="button"
            onClick={() => handleConductedAtFilter("", "")}
            className="rounded-md px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Colaborador
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Gestor
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Período
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Metas
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Data Agendada
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Data de Realização
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pdis.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-sm text-gray-500"
                >
                  Nenhum PDI encontrado.
                </td>
              </tr>
            ) : (
              pdis.map((pdi) => (
                <tr key={pdi.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                    {pdi.employeeName}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {pdi.managerName}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {pdi.period}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    <span className="inline-flex items-center gap-1">
                      <Target size={14} className="text-gray-400" />
                      {pdi.completedGoalCount}/{pdi.goalCount}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        statusColors[pdi.status] ?? "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {statusLabels[pdi.status] ?? pdi.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {pdi.scheduledAt
                      ? new Date(pdi.scheduledAt).toLocaleDateString("pt-BR")
                      : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {pdi.conductedAt
                      ? new Date(pdi.conductedAt).toLocaleDateString("pt-BR")
                      : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/pdis/${pdi.id}`}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                        title={pdi.status === "draft" || pdi.status === "scheduled" ? "Editar" : "Visualizar"}
                      >
                        {pdi.status === "draft" || pdi.status === "scheduled" ? (
                          <Pencil size={14} />
                        ) : (
                          <Eye size={14} />
                        )}
                      </Link>
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
          <p className="text-sm text-gray-600">
            Mostrando {(page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, total)} de {total} PDIs
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="rounded-md border border-gray-300 p-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
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
                    <span className="px-1 text-gray-400">...</span>
                  )}
                  <button
                    onClick={() => goToPage(p)}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                      p === page
                        ? "bg-blue-600 text-white"
                        : "border border-gray-300 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {p}
                  </button>
                </span>
              ))}
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="rounded-md border border-gray-300 p-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
