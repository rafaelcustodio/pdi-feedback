"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Search } from "lucide-react";
import {
  approveChangeRequest,
  rejectChangeRequest,
  bulkApproveChangeRequests,
  bulkRejectChangeRequests,
} from "@/app/(dashboard)/colaboradores/actions";
import type { ChangeRequestItem } from "@/app/(dashboard)/colaboradores/actions";

const FIELD_LABELS: Record<string, string> = {
  name: "Nome",
  birthDate: "Data de Nascimento",
  gender: "Gênero",
  ethnicity: "Etnia",
  maritalStatus: "Estado Civil",
  cpf: "CPF",
  rg: "RG",
  educationLevel: "Escolaridade",
  livesWithDescription: "Com quem mora",
  address: "Endereço",
  addressNumber: "Número",
  addressComplement: "Complemento",
  zipCode: "CEP",
  city: "Cidade",
  state: "Estado",
  personalEmail: "Email Pessoal",
  phone: "Telefone",
  hasBradescoAccount: "Conta Bradesco",
  bankAgency: "Agência",
  bankAccount: "Conta",
  hasOtherEmployment: "Outro Emprego",
  healthPlanOption: "Plano de Saúde",
  wantsTransportVoucher: "Vale Transporte",
  contractType: "Tipo de Contrato",
  shirtSize: "Tamanho Camiseta",
  hasChildren: "Possui Filhos",
  childrenAges: "Idades dos Filhos",
  hasIRDependents: "Dependentes IR",
};

const ENUM_LABELS: Record<string, Record<string, string>> = {
  gender: { masculino: "Masculino", feminino: "Feminino", outra: "Outra" },
  ethnicity: { branco: "Branco", preto: "Preto", amarelo: "Amarelo", indigena: "Indígena", pardo: "Pardo" },
  maritalStatus: { solteiro: "Solteiro(a)", casado: "Casado(a)", outra: "Outra" },
  educationLevel: { ensino_medio: "Ensino Médio", ensino_tecnico: "Ensino Técnico", superior_incompleto: "Superior Incompleto", superior_completo: "Superior Completo", pos_graduado: "Pós-graduado" },
  hasBradescoAccount: { sim: "Sim", nao: "Não", outra: "Outra" },
  healthPlanOption: { regional: "Regional", nacional: "Nacional", nao: "Não" },
  contractType: { efetivo: "Efetivo", estagio: "Estágio" },
  shirtSize: { p_fem: "P Fem", m_fem: "M Fem", g_fem: "G Fem", gg_fem: "GG Fem", xg_fem: "XG Fem", p_masc: "P Masc", m_masc: "M Masc", g_masc: "G Masc", gg_masc: "GG Masc", xg_masc: "XG Masc" },
};

function formatFieldLabel(fieldName: string): string {
  return FIELD_LABELS[fieldName] ?? fieldName;
}

function formatValue(fieldName: string, value: string | null): string {
  if (value === null || value === "") return "—";
  if (value === "true") return "Sim";
  if (value === "false") return "Não";
  if (fieldName === "birthDate") {
    const d = new Date(value + "T00:00:00Z");
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
    }
  }
  const enumMap = ENUM_LABELS[fieldName];
  if (enumMap && enumMap[value]) return enumMap[value];
  return value;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
};

interface ChangeRequestsTableProps {
  requests: ChangeRequestItem[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  statusFilter: string;
}

export function ChangeRequestsTable({
  requests,
  total,
  page,
  pageSize,
  search,
  statusFilter,
}: ChangeRequestsTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searchInput, setSearchInput] = useState(search);
  const [confirmAction, setConfirmAction] = useState<{
    type: "approve" | "reject";
    id?: string;
    bulk?: boolean;
  } | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const totalPages = Math.ceil(total / pageSize);
  const pendingRequests = requests.filter((r) => r.status === "pending");
  const allPendingSelected = pendingRequests.length > 0 && pendingRequests.every((r) => selected.has(r.id));

  function buildUrl(params: Record<string, string | number>) {
    const sp = new URLSearchParams();
    sp.set("tab", "changes");
    if (params.crsearch || search) sp.set("crsearch", String(params.crsearch ?? search));
    if (params.crpage || page > 1) sp.set("crpage", String(params.crpage ?? page));
    if (params.crstatus || statusFilter) sp.set("crstatus", String(params.crstatus ?? statusFilter));
    return `/colaboradores?${sp.toString()}`;
  }

  function handleSearch() {
    router.replace(buildUrl({ crsearch: searchInput, crpage: 1 }));
  }

  function handleStatusFilter(status: string) {
    router.replace(buildUrl({ crstatus: status, crpage: 1 }));
  }

  function handlePageChange(newPage: number) {
    router.replace(buildUrl({ crpage: newPage }));
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allPendingSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingRequests.map((r) => r.id)));
    }
  }

  function showConfirm(type: "approve" | "reject", id?: string, bulk?: boolean) {
    setConfirmAction({ type, id, bulk });
  }

  async function executeAction() {
    if (!confirmAction) return;
    setMessage(null);

    startTransition(async () => {
      try {
        if (confirmAction.bulk) {
          const ids = Array.from(selected);
          if (ids.length === 0) return;
          if (confirmAction.type === "approve") {
            const result = await bulkApproveChangeRequests(ids);
            if (result.success) {
              setMessage({ type: "success", text: `${result.approved} solicitação(ões) aprovada(s) com sucesso.` });
              setSelected(new Set());
            } else {
              setMessage({ type: "error", text: result.error ?? "Erro ao aprovar solicitações." });
            }
          } else {
            const result = await bulkRejectChangeRequests(ids);
            if (result.success) {
              setMessage({ type: "success", text: `${result.rejected} solicitação(ões) rejeitada(s).` });
              setSelected(new Set());
            } else {
              setMessage({ type: "error", text: result.error ?? "Erro ao rejeitar solicitações." });
            }
          }
        } else if (confirmAction.id) {
          if (confirmAction.type === "approve") {
            const result = await approveChangeRequest(confirmAction.id);
            if (result.success) {
              setMessage({ type: "success", text: "Solicitação aprovada com sucesso." });
              setSelected((prev) => { const next = new Set(prev); next.delete(confirmAction.id!); return next; });
            } else {
              setMessage({ type: "error", text: result.error ?? "Erro ao aprovar solicitação." });
            }
          } else {
            const result = await rejectChangeRequest(confirmAction.id);
            if (result.success) {
              setMessage({ type: "success", text: "Solicitação rejeitada." });
              setSelected((prev) => { const next = new Set(prev); next.delete(confirmAction.id!); return next; });
            } else {
              setMessage({ type: "error", text: result.error ?? "Erro ao rejeitar solicitação." });
            }
          }
        }
        router.refresh();
      } catch {
        setMessage({ type: "error", text: "Erro inesperado ao processar solicitação." });
      } finally {
        setConfirmAction(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Message banner */}
      {message && (
        <div className={`rounded-md px-4 py-3 text-sm ${
          message.type === "success"
            ? "bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-300"
            : "bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300"
        }`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-2 font-medium underline">Fechar</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <button
            onClick={handleSearch}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Buscar
          </button>
        </div>

        <div className="flex items-center gap-2">
          {["", "pending", "approved", "rejected"].map((s) => (
            <button
              key={s}
              onClick={() => handleStatusFilter(s)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === s
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              {s === "" ? "Todos" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-md bg-blue-50 px-4 py-2 dark:bg-blue-900/20">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            {selected.size} selecionada(s)
          </span>
          <button
            onClick={() => showConfirm("approve", undefined, true)}
            disabled={isPending}
            className="inline-flex items-center gap-1 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
            Aprovar selecionadas
          </button>
          <button
            onClick={() => showConfirm("reject", undefined, true)}
            disabled={isPending}
            className="inline-flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
            Rejeitar selecionadas
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="w-10 px-4 py-3">
                {pendingRequests.length > 0 && (
                  <input
                    type="checkbox"
                    checked={allPendingSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                )}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Colaborador
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Campo Alterado
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Valor Antigo
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Valor Novo
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Data
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
            {requests.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  Nenhuma solicitação encontrada.
                </td>
              </tr>
            ) : (
              requests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3">
                    {req.status === "pending" && (
                      <input
                        type="checkbox"
                        checked={selected.has(req.id)}
                        onChange={() => toggleSelect(req.id)}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                    {req.userName}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {formatFieldLabel(req.fieldName)}
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {formatValue(req.fieldName, req.oldValue)}
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {formatValue(req.fieldName, req.newValue)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(req.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[req.status] ?? ""}`}>
                      {STATUS_LABELS[req.status] ?? req.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    {req.status === "pending" ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => showConfirm("approve", req.id)}
                          disabled={isPending}
                          title="Aprovar"
                          className="rounded p-1.5 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30 disabled:opacity-50"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => showConfirm("reject", req.id)}
                          disabled={isPending}
                          title="Rejeitar"
                          className="rounded p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 disabled:opacity-50"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {req.reviewedByName ? `Por ${req.reviewedByName}` : "—"}
                      </span>
                    )}
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
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Mostrando {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-gray-600 dark:text-gray-300"
            >
              Anterior
            </button>
            <span className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-gray-600 dark:text-gray-300"
            >
              Próxima
            </button>
          </div>
        </div>
      )}

      {/* Confirmation modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {confirmAction.type === "approve" ? "Confirmar Aprovação" : "Confirmar Rejeição"}
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {confirmAction.bulk
                ? `Deseja ${confirmAction.type === "approve" ? "aprovar" : "rejeitar"} ${selected.size} solicitação(ões) selecionada(s)?`
                : `Deseja ${confirmAction.type === "approve" ? "aprovar" : "rejeitar"} esta solicitação?`}
              {confirmAction.type === "approve" && (
                <span className="mt-1 block font-medium text-green-700 dark:text-green-400">
                  Os dados do colaborador serão atualizados automaticamente.
                </span>
              )}
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                disabled={isPending}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={executeAction}
                disabled={isPending}
                className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                  confirmAction.type === "approve"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {isPending ? "Processando..." : confirmAction.type === "approve" ? "Aprovar" : "Rejeitar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
