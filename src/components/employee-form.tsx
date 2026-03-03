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

function calculateAge(birthDateStr: string): number | null {
  if (!birthDateStr) return null;
  const birth = new Date(birthDateStr + "T00:00:00");
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

const GENDER_OPTIONS = [
  { value: "", label: "Selecione" },
  { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" },
  { value: "outra", label: "Outra" },
];

const ETHNICITY_OPTIONS = [
  { value: "", label: "Selecione" },
  { value: "branco", label: "Branco" },
  { value: "preto", label: "Preto" },
  { value: "amarelo", label: "Amarelo" },
  { value: "indigena", label: "Indígena" },
  { value: "pardo", label: "Pardo" },
];

const MARITAL_STATUS_OPTIONS = [
  { value: "", label: "Selecione" },
  { value: "solteiro", label: "Solteiro(a)" },
  { value: "casado", label: "Casado(a)" },
  { value: "outra", label: "Outra" },
];

const EDUCATION_LEVEL_OPTIONS = [
  { value: "", label: "Selecione" },
  { value: "ensino_medio", label: "Ensino Médio" },
  { value: "ensino_tecnico", label: "Ensino Técnico" },
  { value: "superior_incompleto", label: "Superior Incompleto" },
  { value: "superior_completo", label: "Superior Completo" },
  { value: "pos_graduado", label: "Pós-Graduado" },
];

const BANK_ACCOUNT_OPTIONS = [
  { value: "", label: "Selecione" },
  { value: "sim", label: "Sim" },
  { value: "nao", label: "Não" },
  { value: "outra", label: "Outra" },
];

const HEALTH_PLAN_OPTIONS = [
  { value: "", label: "Selecione" },
  { value: "regional", label: "Regional" },
  { value: "nacional", label: "Nacional" },
  { value: "nao", label: "Não" },
];

const CONTRACT_TYPE_OPTIONS = [
  { value: "", label: "Selecione" },
  { value: "efetivo", label: "Efetivo" },
  { value: "estagio", label: "Estágio" },
];

const SHIRT_SIZE_OPTIONS = [
  { value: "", label: "Selecione" },
  { value: "p_fem", label: "P Feminino" },
  { value: "m_fem", label: "M Feminino" },
  { value: "g_fem", label: "G Feminino" },
  { value: "gg_fem", label: "GG Feminino" },
  { value: "xg_fem", label: "XG Feminino" },
  { value: "p_masc", label: "P Masculino" },
  { value: "m_masc", label: "M Masculino" },
  { value: "g_masc", label: "G Masculino" },
  { value: "gg_masc", label: "GG Masculino" },
  { value: "xg_masc", label: "XG Masculino" },
];

const TAB_LABELS = [
  "Dados Pessoais",
  "Endereço e Contato",
  "Financeiro e Benefícios",
  "Família e Dependentes",
  "Sobre Mim",
];

interface EmployeeFormProps {
  mode: "create" | "edit";
  orgUnits: { id: string; name: string }[];
  isPending?: boolean;
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
    addressNumber?: string;
    addressComplement?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    personalEmail?: string;
    rg?: string;
    ethnicity?: string;
    gender?: string;
    maritalStatus?: string;
    educationLevel?: string;
    livesWithDescription?: string;
    hasBradescoAccount?: string;
    bankAgency?: string;
    bankAccount?: string;
    hasOtherEmployment?: boolean;
    healthPlanOption?: string;
    wantsTransportVoucher?: boolean;
    contractType?: string;
    shirtSize?: string;
    hasChildren?: boolean;
    childrenAges?: string;
    hasIRDependents?: boolean;
    hobbies?: string[];
    socialNetworks?: unknown;
    favoriteBookMovieGenres?: string;
    favoriteBooks?: string;
    favoriteMovies?: string;
    favoriteMusic?: string;
    admiredValues?: string;
    foodAllergies?: string;
    hasPets?: string;
    participateInVideos?: boolean;
  };
}

export function EmployeeForm({ mode, orgUnits, isPending = false, initialData }: EmployeeFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);

  // System data fields
  const [name, setName] = useState(initialData?.name ?? "");
  const [email, setEmail] = useState(initialData?.email ?? "");
  const [role, setRole] = useState(initialData?.role ?? "employee");
  const [evaluationMode, setEvaluationMode] = useState(initialData?.evaluationMode ?? "feedback");
  const [password, setPassword] = useState("");
  const [orgUnitId, setOrgUnitId] = useState(initialData?.orgUnitId ?? "");
  const [managerId, setManagerId] = useState(initialData?.managerId ?? "");
  const [admissionDate, setAdmissionDate] = useState(initialData?.admissionDate ?? "");
  const [jobTitle, setJobTitle] = useState(initialData?.jobTitle ?? "");

  // Tab 1: Personal data
  const [birthDate, setBirthDate] = useState(initialData?.birthDate ?? "");
  const [gender, setGender] = useState(initialData?.gender ?? "");
  const [ethnicity, setEthnicity] = useState(initialData?.ethnicity ?? "");
  const [maritalStatus, setMaritalStatus] = useState(initialData?.maritalStatus ?? "");
  const [cpf, setCpf] = useState(initialData?.cpf ? maskCPF(initialData.cpf) : "");
  const [rg, setRg] = useState(initialData?.rg ?? "");
  const [educationLevel, setEducationLevel] = useState(initialData?.educationLevel ?? "");
  const [livesWithDescription, setLivesWithDescription] = useState(initialData?.livesWithDescription ?? "");

  // Tab 2: Address & Contact (existing fields, will be enhanced in US-007)
  const [address, setAddress] = useState(initialData?.address ?? "");
  const [addressNumber, setAddressNumber] = useState(initialData?.addressNumber ?? "");
  const [addressComplement, setAddressComplement] = useState(initialData?.addressComplement ?? "");
  const [city, setCity] = useState(initialData?.city ?? "");
  const [state, setState] = useState(initialData?.state ?? "");
  const [zipCode, setZipCode] = useState(initialData?.zipCode ? maskZip(initialData.zipCode) : "");
  const [personalEmail, setPersonalEmail] = useState(initialData?.personalEmail ?? "");
  const [phone, setPhone] = useState(initialData?.phone ? maskPhone(initialData.phone) : "");

  // Tab 3: Financial & Benefits (will be implemented in US-007)
  const [hasBradescoAccount, setHasBradescoAccount] = useState(initialData?.hasBradescoAccount ?? "");
  const [bankAgency, setBankAgency] = useState(initialData?.bankAgency ?? "");
  const [bankAccount, setBankAccount] = useState(initialData?.bankAccount ?? "");
  const [hasOtherEmployment, setHasOtherEmployment] = useState(initialData?.hasOtherEmployment ?? false);
  const [healthPlanOption, setHealthPlanOption] = useState(initialData?.healthPlanOption ?? "");
  const [wantsTransportVoucher, setWantsTransportVoucher] = useState(initialData?.wantsTransportVoucher ?? false);
  const [contractType, setContractType] = useState(initialData?.contractType ?? "");
  const [shirtSize, setShirtSize] = useState(initialData?.shirtSize ?? "");

  // Tab 4: Family & Dependents (will be implemented in US-008)
  const [hasChildren, setHasChildren] = useState(initialData?.hasChildren ?? false);
  const [childrenAges, setChildrenAges] = useState(initialData?.childrenAges ?? "");
  const [hasIRDependents, setHasIRDependents] = useState(initialData?.hasIRDependents ?? false);

  // Tab 5: About Me (will be implemented in US-009)
  const [hobbies] = useState<string[]>(initialData?.hobbies ?? []);
  const [socialNetworks] = useState<unknown>(initialData?.socialNetworks ?? null);
  const [favoriteBookMovieGenres] = useState(initialData?.favoriteBookMovieGenres ?? "");
  const [favoriteBooks] = useState(initialData?.favoriteBooks ?? "");
  const [favoriteMovies] = useState(initialData?.favoriteMovies ?? "");
  const [favoriteMusic] = useState(initialData?.favoriteMusic ?? "");
  const [admiredValues] = useState(initialData?.admiredValues ?? "");
  const [foodAllergies] = useState(initialData?.foodAllergies ?? "");
  const [hasPets] = useState(initialData?.hasPets ?? "");
  const [participateInVideos] = useState(initialData?.participateInVideos ?? false);

  const [managers, setManagers] = useState<
    { id: string; name: string; email: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
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

  async function doSave(generateOnboarding: boolean = false) {
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
        addressNumber: addressNumber || undefined,
        addressComplement: addressComplement || undefined,
        city: city || undefined,
        state: state || undefined,
        zipCode: zipCode || undefined,
        personalEmail: personalEmail || undefined,
        rg: rg || undefined,
        gender: gender || undefined,
        ethnicity: ethnicity || undefined,
        maritalStatus: maritalStatus || undefined,
        educationLevel: educationLevel || undefined,
        livesWithDescription: livesWithDescription || undefined,
        hasBradescoAccount: hasBradescoAccount || undefined,
        bankAgency: bankAgency || undefined,
        bankAccount: bankAccount || undefined,
        hasOtherEmployment,
        healthPlanOption: healthPlanOption || undefined,
        wantsTransportVoucher,
        contractType: contractType || undefined,
        shirtSize: shirtSize || undefined,
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
        addressNumber: addressNumber || undefined,
        addressComplement: addressComplement || undefined,
        city: city || undefined,
        state: state || undefined,
        zipCode: zipCode || undefined,
        personalEmail: personalEmail || undefined,
        rg: rg || undefined,
        gender: gender || undefined,
        ethnicity: ethnicity || undefined,
        maritalStatus: maritalStatus || undefined,
        educationLevel: educationLevel || undefined,
        livesWithDescription: livesWithDescription || undefined,
        hasBradescoAccount: hasBradescoAccount || undefined,
        bankAgency: bankAgency || undefined,
        bankAccount: bankAccount || undefined,
        hasOtherEmployment,
        healthPlanOption: healthPlanOption || undefined,
        wantsTransportVoucher,
        contractType: contractType || undefined,
        shirtSize: shirtSize || undefined,
        generateOnboarding,
      });
    }

    setLoading(false);

    if (result.success) {
      router.push("/colaboradores");
    } else {
      setError(result.error ?? "Erro ao salvar");
    }
  }

  // Calculate which onboarding feedbacks would be generated
  function getOnboardingInfo(): { show45: boolean; show90: boolean } | null {
    if (!isPending || !orgUnitId || !managerId || !admissionDate) return null;
    const admission = new Date(admissionDate);
    const now = new Date();
    const d45 = new Date(admission);
    d45.setDate(d45.getDate() + 45);
    const d90 = new Date(admission);
    d90.setDate(d90.getDate() + 90);
    const show45 = d45 > now;
    const show90 = d90 > now;
    if (!show45 && !show90) return null;
    return { show45, show90 };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const onboardingInfo = getOnboardingInfo();
    if (onboardingInfo) {
      setShowOnboardingModal(true);
      return;
    }

    await doSave();
  }

  const inputClass =
    "w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
  const labelClass = "mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300";
  const sectionClass = "rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6";

  const age = calculateAge(birthDate);

  // Suppress unused variable warnings for state that will be used in future US stories
  void hasChildren; void setHasChildren;
  void childrenAges; void setChildrenAges;
  void hasIRDependents; void setHasIRDependents;
  void hobbies; void socialNetworks;
  void favoriteBookMovieGenres; void favoriteBooks; void favoriteMovies;
  void favoriteMusic; void admiredValues; void foodAllergies;
  void hasPets; void participateInVideos;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/colaboradores"
          className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {mode === "create" ? "Novo Colaborador" : "Editar Colaborador"}
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {mode === "create"
              ? "Preencha os dados para cadastrar um novo colaborador."
              : "Atualize os dados do colaborador."}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* System Data Section - Fixed at top */}
      <div className={sectionClass}>
        <h2 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">Dados do Sistema</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Email */}
          <div>
            <label htmlFor="emp-email" className={labelClass}>
              E-mail *
            </label>
            <input
              id="emp-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@empresa.com"
              className={inputClass}
              required
              disabled={loading}
            />
          </div>

          {/* Role */}
          <div>
            <label htmlFor="emp-role" className={labelClass}>
              Papel *
            </label>
            <select
              id="emp-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={inputClass}
              disabled={loading}
            >
              <option value="employee">Colaborador</option>
              <option value="manager">Gestor</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          {/* Evaluation Mode */}
          <div>
            <label htmlFor="emp-evaluation-mode" className={labelClass}>
              Modo de Avaliação
            </label>
            <select
              id="emp-evaluation-mode"
              value={evaluationMode}
              onChange={(e) => setEvaluationMode(e.target.value)}
              className={inputClass}
              disabled={loading}
            >
              <option value="feedback">Feedback</option>
              <option value="pdi">PDI</option>
            </select>
          </div>

          {/* Org Unit */}
          <div>
            <label htmlFor="emp-orgunit" className={labelClass}>
              Unidade Organizacional
            </label>
            <select
              id="emp-orgunit"
              value={orgUnitId}
              onChange={(e) => setOrgUnitId(e.target.value)}
              className={inputClass}
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

          {/* Manager */}
          <div>
            <label htmlFor="emp-manager" className={labelClass}>
              Gestor Direto
            </label>
            <select
              id="emp-manager"
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              className={inputClass}
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
            <label htmlFor="emp-admission" className={labelClass}>
              Data de Admissão
            </label>
            <input
              id="emp-admission"
              type="date"
              value={admissionDate}
              onChange={(e) => setAdmissionDate(e.target.value)}
              className={inputClass}
              disabled={loading}
            />
          </div>

          {/* Job Title */}
          <div>
            <label htmlFor="emp-jobtitle" className={labelClass}>
              Cargo
            </label>
            <input
              id="emp-jobtitle"
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Ex: Analista de TI"
              className={inputClass}
              disabled={loading}
            />
          </div>

          {/* Password (create only) */}
          {mode === "create" && (
            <div>
              <label htmlFor="emp-password" className={labelClass}>
                Senha (opcional)
              </label>
              <input
                id="emp-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Deixe vazio para login via SSO"
                className={inputClass}
                disabled={loading}
              />
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={sectionClass}>
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Tabs">
            {TAB_LABELS.map((label, idx) => (
              <button
                key={label}
                type="button"
                onClick={() => setActiveTab(idx)}
                className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
                  activeTab === idx
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="pt-6">
          {/* Tab 1: Dados Pessoais */}
          {activeTab === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Nome Completo */}
              <div className="sm:col-span-2">
                <label htmlFor="emp-name" className={labelClass}>
                  Nome Completo *
                </label>
                <input
                  id="emp-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome completo"
                  className={inputClass}
                  required
                  disabled={loading}
                />
              </div>

              {/* Birth Date */}
              <div>
                <label htmlFor="emp-birthdate" className={labelClass}>
                  Data de Nascimento
                </label>
                <input
                  id="emp-birthdate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className={inputClass}
                  disabled={loading}
                />
              </div>

              {/* Age (calculated, read-only) */}
              <div>
                <label className={labelClass}>Idade</label>
                <input
                  type="text"
                  value={age !== null ? `${age} anos` : "—"}
                  readOnly
                  className={`${inputClass} cursor-default bg-gray-50 dark:bg-gray-600`}
                  tabIndex={-1}
                />
              </div>

              {/* Gender */}
              <div>
                <label htmlFor="emp-gender" className={labelClass}>
                  Gênero
                </label>
                <select
                  id="emp-gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className={inputClass}
                  disabled={loading}
                >
                  {GENDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ethnicity */}
              <div>
                <label htmlFor="emp-ethnicity" className={labelClass}>
                  Etnia
                </label>
                <select
                  id="emp-ethnicity"
                  value={ethnicity}
                  onChange={(e) => setEthnicity(e.target.value)}
                  className={inputClass}
                  disabled={loading}
                >
                  {ETHNICITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Marital Status */}
              <div>
                <label htmlFor="emp-maritalstatus" className={labelClass}>
                  Estado Civil
                </label>
                <select
                  id="emp-maritalstatus"
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value)}
                  className={inputClass}
                  disabled={loading}
                >
                  {MARITAL_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* CPF */}
              <div>
                <label htmlFor="emp-cpf" className={labelClass}>
                  CPF
                </label>
                <input
                  id="emp-cpf"
                  type="text"
                  value={cpf}
                  onChange={(e) => setCpf(maskCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  className={inputClass}
                  disabled={loading}
                />
              </div>

              {/* RG */}
              <div>
                <label htmlFor="emp-rg" className={labelClass}>
                  RG
                </label>
                <input
                  id="emp-rg"
                  type="text"
                  value={rg}
                  onChange={(e) => setRg(e.target.value)}
                  placeholder="Número do RG"
                  className={inputClass}
                  disabled={loading}
                />
              </div>

              {/* Education Level */}
              <div>
                <label htmlFor="emp-education" className={labelClass}>
                  Nível de Escolaridade
                </label>
                <select
                  id="emp-education"
                  value={educationLevel}
                  onChange={(e) => setEducationLevel(e.target.value)}
                  className={inputClass}
                  disabled={loading}
                >
                  {EDUCATION_LEVEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lives With Description */}
              <div>
                <label htmlFor="emp-liveswith" className={labelClass}>
                  Com quem mora
                </label>
                <input
                  id="emp-liveswith"
                  type="text"
                  value={livesWithDescription}
                  onChange={(e) => setLivesWithDescription(e.target.value)}
                  placeholder="Ex: Pais, cônjuge, sozinho(a)..."
                  className={inputClass}
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* Tab 2: Endereço e Contato (placeholder for US-007) */}
          {activeTab === 1 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="emp-address" className={labelClass}>
                  Endereço (Rua)
                </label>
                <input
                  id="emp-address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua, Avenida..."
                  className={inputClass}
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="emp-addressnumber" className={labelClass}>
                  Número
                </label>
                <input
                  id="emp-addressnumber"
                  type="text"
                  value={addressNumber}
                  onChange={(e) => setAddressNumber(e.target.value)}
                  placeholder="Nº"
                  className={inputClass}
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="emp-addresscomplement" className={labelClass}>
                  Complemento
                </label>
                <input
                  id="emp-addresscomplement"
                  type="text"
                  value={addressComplement}
                  onChange={(e) => setAddressComplement(e.target.value)}
                  placeholder="Apto, Bloco..."
                  className={inputClass}
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="emp-zipcode" className={labelClass}>
                  CEP
                </label>
                <input
                  id="emp-zipcode"
                  type="text"
                  value={zipCode}
                  onChange={(e) => setZipCode(maskZip(e.target.value))}
                  placeholder="00000-000"
                  className={inputClass}
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="emp-city" className={labelClass}>
                  Cidade
                </label>
                <input
                  id="emp-city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={inputClass}
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="emp-state" className={labelClass}>
                  Estado (UF)
                </label>
                <select
                  id="emp-state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className={inputClass}
                  disabled={loading}
                >
                  <option value="">Selecione</option>
                  {UF_OPTIONS.map((uf) => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="emp-personalemail" className={labelClass}>
                  E-mail Pessoal
                </label>
                <input
                  id="emp-personalemail"
                  type="email"
                  value={personalEmail}
                  onChange={(e) => setPersonalEmail(e.target.value)}
                  placeholder="email@pessoal.com"
                  className={inputClass}
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="emp-phone" className={labelClass}>
                  Telefone
                </label>
                <input
                  id="emp-phone"
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(maskPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  className={inputClass}
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* Tab 3: Financeiro e Benefícios */}
          {activeTab === 2 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Conta Bradesco */}
              <div>
                <label htmlFor="emp-bradesco" className={labelClass}>
                  Conta Bradesco
                </label>
                <select
                  id="emp-bradesco"
                  value={hasBradescoAccount}
                  onChange={(e) => setHasBradescoAccount(e.target.value)}
                  className={inputClass}
                  disabled={loading}
                >
                  {BANK_ACCOUNT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Placeholder for grid alignment */}
              <div />

              {/* Bank Agency - visible only when hasBradescoAccount = "sim" */}
              {hasBradescoAccount === "sim" && (
                <>
                  <div>
                    <label htmlFor="emp-bankagency" className={labelClass}>
                      Agência
                    </label>
                    <input
                      id="emp-bankagency"
                      type="text"
                      value={bankAgency}
                      onChange={(e) => setBankAgency(e.target.value)}
                      placeholder="Nº da agência"
                      className={inputClass}
                      disabled={loading}
                    />
                  </div>

                  {/* Bank Account */}
                  <div>
                    <label htmlFor="emp-bankaccount" className={labelClass}>
                      Conta
                    </label>
                    <input
                      id="emp-bankaccount"
                      type="text"
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      placeholder="Nº da conta"
                      className={inputClass}
                      disabled={loading}
                    />
                  </div>
                </>
              )}

              {/* Outro emprego registrado */}
              <div className="flex items-center gap-3 sm:col-span-2">
                <input
                  id="emp-otheremployment"
                  type="checkbox"
                  checked={hasOtherEmployment}
                  onChange={(e) => setHasOtherEmployment(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                  disabled={loading}
                />
                <label htmlFor="emp-otheremployment" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Possui outro emprego registrado
                </label>
              </div>

              {/* Plano de Saúde Unimed */}
              <div>
                <label htmlFor="emp-healthplan" className={labelClass}>
                  Plano de Saúde Unimed
                </label>
                <select
                  id="emp-healthplan"
                  value={healthPlanOption}
                  onChange={(e) => setHealthPlanOption(e.target.value)}
                  className={inputClass}
                  disabled={loading}
                >
                  {HEALTH_PLAN_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vale Transporte */}
              <div className="flex items-center gap-3">
                <input
                  id="emp-transportvoucher"
                  type="checkbox"
                  checked={wantsTransportVoucher}
                  onChange={(e) => setWantsTransportVoucher(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                  disabled={loading}
                />
                <label htmlFor="emp-transportvoucher" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Deseja vale transporte
                </label>
              </div>

              {/* Formato de Contratação */}
              <div>
                <label htmlFor="emp-contracttype" className={labelClass}>
                  Formato de Contratação
                </label>
                <select
                  id="emp-contracttype"
                  value={contractType}
                  onChange={(e) => setContractType(e.target.value)}
                  className={inputClass}
                  disabled={loading}
                >
                  {CONTRACT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tamanho Camiseta */}
              <div>
                <label htmlFor="emp-shirtsize" className={labelClass}>
                  Tamanho da Camiseta
                </label>
                <select
                  id="emp-shirtsize"
                  value={shirtSize}
                  onChange={(e) => setShirtSize(e.target.value)}
                  className={inputClass}
                  disabled={loading}
                >
                  {SHIRT_SIZE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Tab 4: Família e Dependentes (placeholder for US-008) */}
          {activeTab === 3 && (
            <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              Seção de Família e Dependentes será implementada em breve.
            </div>
          )}

          {/* Tab 5: Sobre Mim (placeholder for US-009) */}
          {activeTab === 4 && (
            <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              Seção Sobre Mim será implementada em breve.
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Link
          href="/colaboradores"
          className="rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
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

      {/* Onboarding feedback confirmation modal */}
      {showOnboardingModal && (() => {
        const info = getOnboardingInfo();
        const feedbackList = info
          ? [info.show45 && "45 dias", info.show90 && "90 dias"].filter(Boolean).join(" e ")
          : "";
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Gerar Feedbacks de Onboarding?
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Este colaborador está sendo vinculado a uma unidade e gestor pela primeira vez.
              Deseja gerar automaticamente o(s) feedback(s) de onboarding de{" "}
              <strong>{feedbackList}</strong> com base na data de admissão?
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={async () => {
                  setShowOnboardingModal(false);
                  await doSave(false);
                }}
                disabled={loading}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Não, apenas salvar
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowOnboardingModal(false);
                  await doSave(true);
                }}
                disabled={loading}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Salvando..." : "Sim, gerar feedbacks"}
              </button>
            </div>
          </div>
        </div>
        );
      })()}
    </form>
  );
}
