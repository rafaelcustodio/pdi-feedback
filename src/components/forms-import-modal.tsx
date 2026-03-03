"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, Upload, FileSpreadsheet, AlertTriangle, Loader2, CheckCircle } from "lucide-react";
import { parseFormsExcel, mapFormsRowToEmployee } from "@/lib/forms-import-mapping";
import type { FormsRow, EmployeeFormData } from "@/lib/forms-import-mapping";
import { checkExistingEmployees } from "@/app/(dashboard)/colaboradores/actions";
import type { ExistingEmployeeCheck } from "@/app/(dashboard)/colaboradores/actions";

// ---------------------------------------------------------------------------
// CPF validation (client-side)
// ---------------------------------------------------------------------------

function isValidCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  if (parseInt(digits[9]) !== check) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  return parseInt(digits[10]) === check;
}

function formatCPF(cpf: string): string {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PreviewRow = {
  index: number;
  raw: FormsRow;
  mapped: Partial<EmployeeFormData>;
  name: string;
  email: string;
  cpf: string;
  cpfValid: boolean;
  duplicate: ExistingEmployeeCheck | null;
};

type Step = "upload" | "parsing" | "preview";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface FormsImportModalProps {
  open: boolean;
  onClose: () => void;
}

export function FormsImportModal({ open, onClose }: FormsImportModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const reset = useCallback(() => {
    setStep("upload");
    setError(null);
    setRows([]);
    setDragOver(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const processFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".xlsx")) {
      setError("Apenas arquivos .xlsx são aceitos.");
      return;
    }

    setError(null);
    setStep("parsing");

    try {
      const rawRows = await parseFormsExcel(file);
      if (rawRows.length === 0) {
        setError("Nenhuma linha encontrada no arquivo.");
        setStep("upload");
        return;
      }

      // Map rows to employee data
      const mappedRows: PreviewRow[] = rawRows.map((raw, index) => {
        const mapped = mapFormsRowToEmployee(raw);
        const cpfDigits = mapped.cpf?.replace(/\D/g, "") ?? "";
        return {
          index,
          raw,
          mapped,
          name: mapped.name ?? "",
          email: mapped.personalEmail ?? "",
          cpf: cpfDigits,
          cpfValid: cpfDigits.length === 0 || isValidCPF(cpfDigits),
          duplicate: null,
        };
      });

      // Check for existing employees (email + CPF)
      const entries = mappedRows.map((r) => ({
        email: r.email || undefined,
        cpf: r.cpf || undefined,
      }));

      try {
        const checks = await checkExistingEmployees(entries);
        for (let i = 0; i < mappedRows.length; i++) {
          mappedRows[i].duplicate = checks[i];
        }
      } catch {
        // If check fails, continue without duplicate info
      }

      setRows(mappedRows);
      setStep("preview");
    } catch (err) {
      setError(`Erro ao processar arquivo: ${err instanceof Error ? err.message : "erro desconhecido"}`);
      setStep("upload");
    }
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleSelect = useCallback(
    (row: PreviewRow) => {
      // Store mapped data in sessionStorage for the employee form to read
      sessionStorage.setItem(
        "formsImportData",
        JSON.stringify(row.mapped)
      );
      handleClose();
      router.push("/colaboradores/novo");
    },
    [handleClose, router]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative mx-4 flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg bg-white shadow-xl dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={20} className="text-green-600 dark:text-green-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Importar do Microsoft Forms
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          {/* Upload step */}
          {step === "upload" && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-16 transition-colors ${
                dragOver
                  ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20"
                  : "border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-900/50"
              }`}
            >
              <Upload size={40} className="mb-3 text-gray-400 dark:text-gray-500" />
              <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                Arraste o arquivo .xlsx aqui ou clique para selecionar
              </p>
              <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
                Exportação do Microsoft Forms (formato Excel)
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Selecionar arquivo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          )}

          {/* Parsing step (spinner) */}
          {step === "parsing" && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 size={40} className="mb-3 animate-spin text-blue-600 dark:text-blue-400" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Processando arquivo...
              </p>
            </div>
          )}

          {/* Preview step */}
          {step === "preview" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {rows.length} registro{rows.length !== 1 ? "s" : ""} encontrado{rows.length !== 1 ? "s" : ""}. Selecione um para pré-preencher o formulário.
                </p>
                <button
                  type="button"
                  onClick={reset}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Importar outro arquivo
                </button>
              </div>

              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Nome
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        CPF
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Status
                      </th>
                      <th className="sticky right-0 bg-gray-50 px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        Ação
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                    {rows.map((row) => {
                      const hasDuplicate = row.duplicate?.existsByEmail || row.duplicate?.existsByCpf;
                      return (
                        <tr key={row.index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-white">
                            {row.name || <span className="italic text-gray-400">—</span>}
                          </td>
                          <td className="max-w-[180px] truncate px-4 py-3 text-sm text-gray-600 dark:text-gray-400" title={row.email}>
                            {row.email || <span className="italic text-gray-400">—</span>}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm">
                            {row.cpf ? (
                              <span className={row.cpfValid ? "text-gray-600 dark:text-gray-400" : "font-medium text-red-600 dark:text-red-400"}>
                                {formatCPF(row.cpf)}
                                {!row.cpfValid && (
                                  <span className="ml-1 text-xs">(inválido)</span>
                                )}
                              </span>
                            ) : (
                              <span className="italic text-gray-400">—</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm">
                            {hasDuplicate ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                <AlertTriangle size={12} />
                                {row.duplicate?.existsByEmail && row.duplicate?.existsByCpf
                                  ? "Email e CPF já cadastrados"
                                  : row.duplicate?.existsByEmail
                                    ? "Email já cadastrado"
                                    : "CPF já cadastrado"}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300">
                                <CheckCircle size={12} />
                                Novo
                              </span>
                            )}
                          </td>
                          <td className="sticky right-0 whitespace-nowrap bg-white px-4 py-3 text-right dark:bg-gray-900">
                            <button
                              type="button"
                              onClick={() => handleSelect(row)}
                              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                            >
                              Selecionar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-3 dark:border-gray-700">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
