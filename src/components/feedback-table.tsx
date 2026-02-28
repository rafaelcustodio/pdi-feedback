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
  Star,
  Filter,
} from "lucide-react";
import type { FeedbackListItem } from "@/app/(dashboard)/feedbacks/actions";

interface FeedbackTableProps {
  feedbacks: FeedbackListItem[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  year: string;
  availableYears: number[];
  canCreate: boolean;
  isEmployeeView: boolean;
}

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  scheduled: "Agendado",
  submitted: "Submetido",
};

export function FeedbackTable({
  feedbacks,
  total,
  page,
  pageSize,
  search: initialSearch,
  year: initialYear,
  availableYears,
  canCreate,
  isEmployeeView,
}: FeedbackTableProps) {
  const [searchValue, setSearchValue] = useState(initialSearch);
  const [yearValue, setYearValue] = useState(initialYear);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function buildUrl(overrides: { search?: string; year?: string; page?: string }) {
    const params = new URLSearchParams();
    const s = overrides.search ?? searchValue;
    const y = overrides.year ?? yearValue;
    const p = overrides.page ?? "1";
    if (s.trim()) params.set("search", s.trim());
    if (y) params.set("year", y);
    params.set("page", p);
    return `/feedbacks?${params.toString()}`;
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    window.location.href = buildUrl({ search: searchValue, page: "1" });
  }

  function handleYearChange(newYear: string) {
    setYearValue(newYear);
    window.location.href = buildUrl({ year: newYear, page: "1" });
  }

  function goToPage(p: number) {
    window.location.href = buildUrl({ page: String(p) });
  }

  return (
    <div className="space-y-4">
      {/* Header with search, year filter, and create button */}
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
                placeholder={
                  isEmployeeView
                    ? "Buscar por gestor ou período..."
                    : "Buscar por colaborador ou período..."
                }
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
          {availableYears.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Filter size={14} className="text-gray-400" />
              <select
                value={yearValue}
                onChange={(e) => handleYearChange(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Todos os anos</option>
                {availableYears.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        {canCreate && (
          <Link
            href="/feedbacks/novo"
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={16} />
            Novo Feedback
          </Link>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {!isEmployeeView && (
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Colaborador
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Gestor
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Período
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Avaliação
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {isEmployeeView ? "Data de Submissão" : "Data"}
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {feedbacks.length === 0 ? (
              <tr>
                <td
                  colSpan={isEmployeeView ? 6 : 7}
                  className="px-4 py-8 text-center text-sm text-gray-500"
                >
                  Nenhum feedback encontrado.
                </td>
              </tr>
            ) : (
              feedbacks.map((fb) => (
                <tr key={fb.id} className="hover:bg-gray-50">
                  {!isEmployeeView && (
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                      {fb.employeeName}
                    </td>
                  )}
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {fb.managerName}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {fb.period}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {fb.rating ? (
                      <span className="inline-flex items-center gap-1">
                        <Star size={14} className="fill-yellow-400 text-yellow-400" />
                        {fb.rating}/5
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        fb.status === "submitted"
                          ? "bg-green-100 text-green-700"
                          : fb.status === "scheduled"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {statusLabels[fb.status] ?? fb.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {isEmployeeView && fb.status === "submitted"
                      ? new Date(fb.updatedAt).toLocaleDateString("pt-BR")
                      : new Date(fb.createdAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/feedbacks/${fb.id}`}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                        title={fb.status === "draft" || fb.status === "scheduled" ? "Editar" : "Visualizar"}
                      >
                        {fb.status === "draft" || fb.status === "scheduled" ? (
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
            {Math.min(page * pageSize, total)} de {total} feedbacks
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
