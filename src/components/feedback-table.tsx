"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
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
  CalendarPlus,
  CalendarClock,
} from "lucide-react";
import type {
  FeedbackListItem,
  SubordinateOption,
} from "@/app/(dashboard)/feedbacks/actions";
import { createFutureFeedback } from "@/app/(dashboard)/feedbacks/actions";

interface FeedbackTableProps {
  feedbacks: FeedbackListItem[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  year: string;
  conductedAtFrom?: string;
  conductedAtTo?: string;
  statusFilter?: string;
  availableYears: number[];
  canCreate: boolean;
  isEmployeeView: boolean;
  subordinates?: SubordinateOption[];
  scheduledCount?: number;
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
  conductedAtFrom: initialConductedAtFrom = "",
  conductedAtTo: initialConductedAtTo = "",
  statusFilter: initialStatusFilter = "",
  availableYears,
  canCreate,
  isEmployeeView,
  subordinates,
  scheduledCount = 0,
}: FeedbackTableProps) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(initialSearch);
  const [yearValue, setYearValue] = useState(initialYear);
  const [conductedAtFromValue, setConductedAtFromValue] = useState(initialConductedAtFrom);
  const [conductedAtToValue, setConductedAtToValue] = useState(initialConductedAtTo);
  const [statusFilterValue, setStatusFilterValue] = useState(initialStatusFilter);
  const [showFutureModal, setShowFutureModal] = useState(false);
  const [futureEmployeeId, setFutureEmployeeId] = useState("");
  const [futureDate, setFutureDate] = useState("");
  const [futureLoading, setFutureLoading] = useState(false);
  const [futureError, setFutureError] = useState<string | null>(null);
  const minFutureDate = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function buildUrl(overrides: {
    search?: string;
    year?: string;
    page?: string;
    conductedAtFrom?: string;
    conductedAtTo?: string;
    status?: string;
  }) {
    const params = new URLSearchParams();
    const s = overrides.search ?? searchValue;
    const y = overrides.year ?? yearValue;
    const p = overrides.page ?? "1";
    const caFrom = overrides.conductedAtFrom ?? conductedAtFromValue;
    const caTo = overrides.conductedAtTo ?? conductedAtToValue;
    const st = overrides.status ?? statusFilterValue;
    if (s.trim()) params.set("search", s.trim());
    if (y) params.set("year", y);
    if (caFrom) params.set("conductedAtFrom", caFrom);
    if (caTo) params.set("conductedAtTo", caTo);
    if (st) params.set("status", st);
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

  // Status filter options — employees only see submitted
  const statusOptions = isEmployeeView
    ? [
        { value: "", label: "Todos os status" },
        { value: "submitted", label: "Submetido" },
      ]
    : [
        { value: "", label: "Todos os status" },
        { value: "scheduled", label: "Agendado" },
        { value: "draft", label: "Rascunho" },
        { value: "submitted", label: "Submetido" },
      ];

  async function handleCreateFutureFeedback() {
    if (!futureEmployeeId || !futureDate) return;
    setFutureLoading(true);
    setFutureError(null);

    const result = await createFutureFeedback({
      employeeId: futureEmployeeId,
      scheduledAt: futureDate,
    });

    setFutureLoading(false);
    if (result.success) {
      setShowFutureModal(false);
      setFutureEmployeeId("");
      setFutureDate("");
      router.refresh();
    } else {
      setFutureError(result.error ?? "Erro ao agendar feedback futuro");
    }
  }

  return (
    <div className="space-y-4">
      {/* Scheduled feedbacks banner for employees */}
      {isEmployeeView && scheduledCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <CalendarClock size={20} className="shrink-0 text-blue-600" />
          <p className="text-sm text-blue-800">
            {scheduledCount === 1
              ? "Você tem 1 feedback agendado para uma data futura."
              : `Você tem ${scheduledCount} feedbacks agendados para datas futuras.`}
            {" "}O conteúdo será disponibilizado quando o feedback for submetido pelo gestor.
          </p>
        </div>
      )}

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
          {!isEmployeeView && (
            <div className="flex items-center gap-1.5">
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
          )}
        </div>
        {canCreate && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFutureModal(true)}
              className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              <CalendarPlus size={16} />
              Agendar Feedback Futuro
            </button>
            <Link
              href="/feedbacks/novo"
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus size={16} />
              Novo Feedback
            </Link>
          </div>
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
              {!isEmployeeView && (
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Data de Realização
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {isEmployeeView ? "Data de Submissão" : "Data de Criação"}
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
                  colSpan={isEmployeeView ? 6 : 8}
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
                  {!isEmployeeView && (
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {fb.status === "draft" && fb.scheduledAt ? (
                        <>
                          <span className="inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                            Agendado para preenchimento
                          </span>
                          <span className="ml-1.5 text-xs text-indigo-600">
                            {new Date(fb.scheduledAt).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                          </span>
                        </>
                      ) : (
                        <>
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
                          {fb.status === "scheduled" && fb.scheduledAt && (
                            <span className="ml-1.5 text-xs text-blue-600">
                              {new Date(fb.scheduledAt).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                            </span>
                          )}
                        </>
                      )}
                    </td>
                  )}
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {fb.conductedAt
                      ? new Date(fb.conductedAt).toLocaleDateString("pt-BR", { timeZone: "UTC" })
                      : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {isEmployeeView
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

      {/* Future Feedback Modal */}
      {showFutureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              Agendar Feedback Futuro
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Agende uma data futura para preencher um feedback. Um rascunho será criado e você receberá lembretes.
            </p>

            {futureError && (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                {futureError}
              </div>
            )}

            <div className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="future-employee"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Colaborador *
                </label>
                <select
                  id="future-employee"
                  value={futureEmployeeId}
                  onChange={(e) => setFutureEmployeeId(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  disabled={futureLoading}
                >
                  <option value="">Selecione um colaborador</option>
                  {subordinates?.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} ({sub.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="future-date"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Data prevista para preenchimento *
                </label>
                <input
                  id="future-date"
                  type="date"
                  value={futureDate}
                  onChange={(e) => setFutureDate(e.target.value)}
                  min={minFutureDate}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  disabled={futureLoading}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Você receberá um lembrete 7 dias antes e na data agendada.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowFutureModal(false);
                  setFutureEmployeeId("");
                  setFutureDate("");
                  setFutureError(null);
                }}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateFutureFeedback}
                disabled={!futureEmployeeId || !futureDate || futureLoading}
                className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
              >
                <CalendarPlus size={16} />
                {futureLoading ? "Agendando..." : "Confirmar Agendamento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
