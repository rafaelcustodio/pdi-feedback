"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft } from "lucide-react";
import Link from "next/link";
import {
  createEmployee,
  updateEmployee,
  getManagerCandidates,
} from "@/app/(dashboard)/colaboradores/actions";

interface EmployeeFormProps {
  mode: "create" | "edit";
  orgUnits: { id: string; name: string }[];
  initialData?: {
    id: string;
    name: string;
    email: string;
    role: string;
    evaluationMode?: string;
    orgUnitId?: string;
    managerId?: string;
    admissionDate?: string;
  };
}

export function EmployeeForm({ mode, orgUnits, initialData }: EmployeeFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialData?.name ?? "");
  const [email, setEmail] = useState(initialData?.email ?? "");
  const [role, setRole] = useState(initialData?.role ?? "employee");
  const [evaluationMode, setEvaluationMode] = useState(initialData?.evaluationMode ?? "feedback");
  const [password, setPassword] = useState("");
  const [orgUnitId, setOrgUnitId] = useState(initialData?.orgUnitId ?? "");
  const [managerId, setManagerId] = useState(initialData?.managerId ?? "");
  const [admissionDate, setAdmissionDate] = useState(initialData?.admissionDate ?? "");
  const [managers, setManagers] = useState<
    { id: string; name: string; email: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch managers when org unit changes
  useEffect(() => {
    async function fetchManagers() {
      setLoadingManagers(true);
      const candidates = await getManagerCandidates(
        orgUnitId || null,
        initialData?.id
      );
      setManagers(candidates);

      // If current manager not in new list, clear selection
      if (managerId && !candidates.find((m) => m.id === managerId)) {
        setManagerId("");
      }

      setLoadingManagers(false);
    }
    fetchManagers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgUnitId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let result;
    if (mode === "create") {
      result = await createEmployee({
        name,
        email,
        role,
        evaluationMode,
        password: password || undefined,
        orgUnitId: orgUnitId || undefined,
        managerId: managerId || undefined,
        admissionDate: admissionDate || undefined,
      });
    } else {
      result = await updateEmployee(initialData!.id, {
        name,
        email,
        role,
        evaluationMode,
        orgUnitId: orgUnitId || undefined,
        managerId: managerId || undefined,
        admissionDate: admissionDate || undefined,
      });
    }

    setLoading(false);

    if (result.success) {
      router.push("/colaboradores");
    } else {
      setError(result.error ?? "Erro ao salvar");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/colaboradores"
          className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {mode === "create" ? "Novo Colaborador" : "Editar Colaborador"}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {mode === "create"
              ? "Preencha os dados para cadastrar um novo colaborador."
              : "Atualize os dados do colaborador."}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Name */}
          <div>
            <label
              htmlFor="emp-name"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Nome *
            </label>
            <input
              id="emp-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome completo"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
              disabled={loading}
            />
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="emp-email"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              E-mail *
            </label>
            <input
              id="emp-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@empresa.com"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
              disabled={loading}
            />
          </div>

          {/* Role */}
          <div>
            <label
              htmlFor="emp-role"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Papel *
            </label>
            <select
              id="emp-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="employee">Colaborador</option>
              <option value="manager">Gestor</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          {/* Evaluation Mode */}
          <div>
            <label
              htmlFor="emp-evaluation-mode"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Modo de Avaliação
            </label>
            <select
              id="emp-evaluation-mode"
              value={evaluationMode}
              onChange={(e) => setEvaluationMode(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="feedback">Feedback</option>
              <option value="pdi">PDI</option>
            </select>
          </div>

          {/* Password (create only) */}
          {mode === "create" && (
            <div>
              <label
                htmlFor="emp-password"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Senha (opcional)
              </label>
              <input
                id="emp-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Deixe vazio para login via SSO"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={loading}
              />
            </div>
          )}

          {/* Org Unit */}
          <div>
            <label
              htmlFor="emp-orgunit"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Unidade Organizacional
            </label>
            <select
              id="emp-orgunit"
              value={orgUnitId}
              onChange={(e) => setOrgUnitId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="">Nenhuma</option>
              {orgUnits.map((ou) => (
                <option key={ou.id} value={ou.id}>
                  {ou.name}
                </option>
              ))}
            </select>
          </div>

          {/* Manager (filtered by org unit) */}
          <div>
            <label
              htmlFor="emp-manager"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Gestor Direto
            </label>
            <select
              id="emp-manager"
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={loading || loadingManagers}
            >
              <option value="">
                {loadingManagers ? "Carregando..." : "Nenhum"}
              </option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.email})
                </option>
              ))}
            </select>
          </div>

          {/* Admission Date */}
          <div>
            <label
              htmlFor="emp-admission"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Data de Admissão
            </label>
            <input
              id="emp-admission"
              type="date"
              value={admissionDate}
              onChange={(e) => setAdmissionDate(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={loading}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Link
          href="/colaboradores"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={loading || !name.trim() || !email.trim()}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Save size={16} />
          {loading ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}
