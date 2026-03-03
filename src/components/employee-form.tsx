"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft } from "lucide-react";
import Link from "next/link";
import {
  createEmployee,
  updateEmployee,
  getManagerCandidates,
} from "@/app/(dashboard)/colaboradores/actions";

const UF_OPTIONS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

function maskCPF(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function maskPhone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function maskZip(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

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
    phone?: string;
    cpf?: string;
    birthDate?: string;
    jobTitle?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
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
  const [phone, setPhone] = useState(initialData?.phone ? maskPhone(initialData.phone) : "");
  const [cpf, setCpf] = useState(initialData?.cpf ? maskCPF(initialData.cpf) : "");
  const [birthDate, setBirthDate] = useState(initialData?.birthDate ?? "");
  const [jobTitle, setJobTitle] = useState(initialData?.jobTitle ?? "");
  const [address, setAddress] = useState(initialData?.address ?? "");
  const [city, setCity] = useState(initialData?.city ?? "");
  const [state, setState] = useState(initialData?.state ?? "");
  const [zipCode, setZipCode] = useState(initialData?.zipCode ? maskZip(initialData.zipCode) : "");
  const [managers, setManagers] = useState<
    { id: string; name: string; email: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialOrgUnitId = useRef(initialData?.orgUnitId ?? "");

  // Fetch managers when org unit changes
  useEffect(() => {
    async function fetchManagers() {
      setLoadingManagers(true);
      const candidates = await getManagerCandidates(
        orgUnitId || null,
        initialData?.id
      );
      setManagers(candidates);

      // Only clear manager selection if the user changed the org unit (not on initial load)
      const isOrgUnitChanged = orgUnitId !== initialOrgUnitId.current;
      if (isOrgUnitChanged && managerId && !candidates.find((m) => m.id === managerId)) {
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
        phone: phone || undefined,
        cpf: cpf || undefined,
        birthDate: birthDate || undefined,
        jobTitle: jobTitle || undefined,
        address: address || undefined,
        city: city || undefined,
        state: state || undefined,
        zipCode: zipCode || undefined,
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
        phone: phone || undefined,
        cpf: cpf || undefined,
        birthDate: birthDate || undefined,
        jobTitle: jobTitle || undefined,
        address: address || undefined,
        city: city || undefined,
        state: state || undefined,
        zipCode: zipCode || undefined,
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
        <h2 className="mb-4 text-lg font-medium text-gray-900">Dados do Sistema</h2>
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

      {/* Dados Pessoais Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-medium text-gray-900">Dados Pessoais</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* CPF */}
          <div>
            <label htmlFor="emp-cpf" className="mb-1 block text-sm font-medium text-gray-700">
              CPF
            </label>
            <input
              id="emp-cpf"
              type="text"
              value={cpf}
              onChange={(e) => setCpf(maskCPF(e.target.value))}
              placeholder="000.000.000-00"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="emp-phone" className="mb-1 block text-sm font-medium text-gray-700">
              Telefone
            </label>
            <input
              id="emp-phone"
              type="text"
              value={phone}
              onChange={(e) => setPhone(maskPhone(e.target.value))}
              placeholder="(00) 00000-0000"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          {/* Birth Date */}
          <div>
            <label htmlFor="emp-birthdate" className="mb-1 block text-sm font-medium text-gray-700">
              Data de Nascimento
            </label>
            <input
              id="emp-birthdate"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          {/* Job Title */}
          <div>
            <label htmlFor="emp-jobtitle" className="mb-1 block text-sm font-medium text-gray-700">
              Cargo
            </label>
            <input
              id="emp-jobtitle"
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Ex: Analista de TI"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          {/* Address */}
          <div className="sm:col-span-2">
            <label htmlFor="emp-address" className="mb-1 block text-sm font-medium text-gray-700">
              Endereço
            </label>
            <input
              id="emp-address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rua, número, complemento"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          {/* City */}
          <div>
            <label htmlFor="emp-city" className="mb-1 block text-sm font-medium text-gray-700">
              Cidade
            </label>
            <input
              id="emp-city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          {/* State */}
          <div>
            <label htmlFor="emp-state" className="mb-1 block text-sm font-medium text-gray-700">
              Estado (UF)
            </label>
            <select
              id="emp-state"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="">Selecione</option>
              {UF_OPTIONS.map((uf) => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </div>

          {/* Zip Code */}
          <div>
            <label htmlFor="emp-zipcode" className="mb-1 block text-sm font-medium text-gray-700">
              CEP
            </label>
            <input
              id="emp-zipcode"
              type="text"
              value={zipCode}
              onChange={(e) => setZipCode(maskZip(e.target.value))}
              placeholder="00000-000"
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
