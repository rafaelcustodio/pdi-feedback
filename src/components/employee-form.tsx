"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import {
  createEmployee,
  updateEmployee,
  getManagerCandidates,
  updateEmployeeDependents,
  updateEmployeeEmergencyContacts,
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

const HOBBY_OPTIONS = [
  "Games", "Leitura", "Cinema", "Música", "Pintura/Desenho", "Escrita",
  "Esporte", "Canto", "Instrumentos Musicais", "Viagens", "Voluntariado",
  "Dança", "Jardinagem", "Teatro", "Pescaria", "Artesanato", "Skate", "Outra",
];

const SOCIAL_NETWORK_OPTIONS = [
  "Instagram", "LinkedIn", "Twitter", "Facebook", "TikTok", "Outra",
];

const PETS_OPTIONS = [
  { value: "", label: "Selecione" },
  { value: "nao", label: "Não" },
  { value: "sim_cachorros", label: "Sim, cachorros" },
  { value: "sim_gatos", label: "Sim, gatos" },
  { value: "outra", label: "Outra" },
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
    dependents?: { id: string; name: string; relationship: string; cpf: string | null }[];
    emergencyContacts?: { id: string; name: string; phone: string; relationship: string | null }[];
  };
}

type DependentFormItem = {
  id?: string;
  name: string;
  relationship: string;
  cpf: string;
};

type EmergencyContactFormItem = {
  id?: string;
  name: string;
  phone: string;
  relationship: string;
};

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

  // Tab 4: Family & Dependents
  const [hasChildren, setHasChildren] = useState(initialData?.hasChildren ?? false);
  const [childrenAges, setChildrenAges] = useState(initialData?.childrenAges ?? "");
  const [hasIRDependents, setHasIRDependents] = useState(initialData?.hasIRDependents ?? false);
  const [dependents, setDependents] = useState<DependentFormItem[]>(
    initialData?.dependents?.map((d) => ({
      id: d.id,
      name: d.name,
      relationship: d.relationship,
      cpf: d.cpf ? maskCPF(d.cpf) : "",
    })) ?? []
  );
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContactFormItem[]>(
    initialData?.emergencyContacts?.map((c) => ({
      id: c.id,
      name: c.name,
      phone: maskPhone(c.phone),
      relationship: c.relationship ?? "",
    })) ?? []
  );

  // Tab 5: About Me
  const [hobbies, setHobbies] = useState<string[]>(initialData?.hobbies ?? []);
  const [socialNetworks, setSocialNetworks] = useState<Record<string, string>>(
    (initialData?.socialNetworks as Record<string, string>) ?? {}
  );
  const [favoriteBookMovieGenres, setFavoriteBookMovieGenres] = useState(initialData?.favoriteBookMovieGenres ?? "");
  const [favoriteBooks, setFavoriteBooks] = useState(initialData?.favoriteBooks ?? "");
  const [favoriteMovies, setFavoriteMovies] = useState(initialData?.favoriteMovies ?? "");
  const [favoriteMusic, setFavoriteMusic] = useState(initialData?.favoriteMusic ?? "");
  const [admiredValues, setAdmiredValues] = useState(initialData?.admiredValues ?? "");
  const [foodAllergies, setFoodAllergies] = useState(initialData?.foodAllergies ?? "");
  const [hasPets, setHasPets] = useState(() => {
    const val = initialData?.hasPets ?? "";
    return val.startsWith("outra: ") ? "outra" : val;
  });
  const [petsDescription, setPetsDescription] = useState(() => {
    const val = initialData?.hasPets ?? "";
    return val.startsWith("outra: ") ? val.slice(7) : "";
  });
  const [participateInVideos, setParticipateInVideos] = useState(initialData?.participateInVideos ?? false);

  const [managers, setManagers] = useState<
    { id: string; name: string; email: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const initialOrgUnitId = useRef(initialData?.orgUnitId ?? "");

  // Pre-fill from Forms import (sessionStorage) on create mode
  useEffect(() => {
    if (mode !== "create") return;
    const raw = sessionStorage.getItem("formsImportData");
    if (!raw) return;
    sessionStorage.removeItem("formsImportData");
    try {
      const d = JSON.parse(raw) as Record<string, unknown>;
      if (d.name) setName(d.name as string);
      if (d.birthDate) setBirthDate(d.birthDate as string);
      if (d.gender) setGender(d.gender as string);
      if (d.ethnicity) setEthnicity(d.ethnicity as string);
      if (d.maritalStatus) setMaritalStatus(d.maritalStatus as string);
      if (d.cpf) setCpf(maskCPF(d.cpf as string));
      if (d.rg) setRg(d.rg as string);
      if (d.educationLevel) setEducationLevel(d.educationLevel as string);
      if (d.livesWithDescription) setLivesWithDescription(d.livesWithDescription as string);
      if (d.address) setAddress(d.address as string);
      if (d.addressNumber) setAddressNumber(d.addressNumber as string);
      if (d.addressComplement) setAddressComplement(d.addressComplement as string);
      if (d.city) setCity(d.city as string);
      if (d.state) setState(d.state as string);
      if (d.zipCode) setZipCode(maskZip(d.zipCode as string));
      if (d.personalEmail) setPersonalEmail(d.personalEmail as string);
      if (d.phone) setPhone(maskPhone(d.phone as string));
      if (d.hasBradescoAccount) setHasBradescoAccount(d.hasBradescoAccount as string);
      if (d.bankAgency) setBankAgency(d.bankAgency as string);
      if (d.bankAccount) setBankAccount(d.bankAccount as string);
      if (typeof d.hasOtherEmployment === "boolean") setHasOtherEmployment(d.hasOtherEmployment);
      if (d.healthPlanOption) setHealthPlanOption(d.healthPlanOption as string);
      if (typeof d.wantsTransportVoucher === "boolean") setWantsTransportVoucher(d.wantsTransportVoucher);
      if (d.contractType) setContractType(d.contractType as string);
      if (d.shirtSize) setShirtSize(d.shirtSize as string);
      if (typeof d.hasChildren === "boolean") setHasChildren(d.hasChildren);
      if (d.childrenAges) setChildrenAges(d.childrenAges as string);
      if (typeof d.hasIRDependents === "boolean") setHasIRDependents(d.hasIRDependents);
      if (Array.isArray(d.hobbies)) setHobbies(d.hobbies as string[]);
      if (d.socialNetworks && typeof d.socialNetworks === "object") setSocialNetworks(d.socialNetworks as Record<string, string>);
      if (d.favoriteBookMovieGenres) setFavoriteBookMovieGenres(d.favoriteBookMovieGenres as string);
      if (d.favoriteBooks) setFavoriteBooks(d.favoriteBooks as string);
      if (d.favoriteMovies) setFavoriteMovies(d.favoriteMovies as string);
      if (d.favoriteMusic) setFavoriteMusic(d.favoriteMusic as string);
      if (d.admiredValues) setAdmiredValues(d.admiredValues as string);
      if (d.foodAllergies) setFoodAllergies(d.foodAllergies as string);
      if (d.hasPets) {
        const petVal = d.hasPets as string;
        if (petVal.startsWith("outra: ")) {
          setHasPets("outra");
          setPetsDescription(petVal.slice(7));
        } else {
          // Map "sim cachorros" → "sim_cachorros", "sim gatos" → "sim_gatos", "não" → "nao"
          const petMap: Record<string, string> = {
            "sim cachorros": "sim_cachorros",
            "sim gatos": "sim_gatos",
            "não": "nao",
          };
          setHasPets(petMap[petVal] ?? petVal);
        }
      }
      if (typeof d.participateInVideos === "boolean") setParticipateInVideos(d.participateInVideos);
    } catch {
      // Ignore invalid JSON
    }
  }, [mode]);

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
        hasChildren,
        childrenAges: childrenAges || undefined,
        hasIRDependents,
        hobbies,
        socialNetworks: Object.keys(socialNetworks).length > 0 ? socialNetworks : undefined,
        favoriteBookMovieGenres: favoriteBookMovieGenres || undefined,
        favoriteBooks: favoriteBooks || undefined,
        favoriteMovies: favoriteMovies || undefined,
        favoriteMusic: favoriteMusic || undefined,
        admiredValues: admiredValues || undefined,
        foodAllergies: foodAllergies || undefined,
        hasPets: hasPets === "outra" && petsDescription ? `outra: ${petsDescription}` : hasPets || undefined,
        participateInVideos,
      });

      // Save dependents and emergency contacts for newly created employee
      if (result.success && result.id) {
        const depData = dependents.filter((d) => d.name.trim());
        if (depData.length > 0) {
          await updateEmployeeDependents(result.id, depData.map((d) => ({
            name: d.name,
            relationship: d.relationship,
            cpf: d.cpf || null,
          })));
        }
        const contactData = emergencyContacts.filter((c) => c.name.trim());
        if (contactData.length > 0) {
          await updateEmployeeEmergencyContacts(result.id, contactData.map((c) => ({
            name: c.name,
            phone: c.phone,
            relationship: c.relationship || null,
          })));
        }
      }
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
        hasChildren,
        childrenAges: childrenAges || undefined,
        hasIRDependents,
        hobbies,
        socialNetworks: Object.keys(socialNetworks).length > 0 ? socialNetworks : undefined,
        favoriteBookMovieGenres: favoriteBookMovieGenres || undefined,
        favoriteBooks: favoriteBooks || undefined,
        favoriteMovies: favoriteMovies || undefined,
        favoriteMusic: favoriteMusic || undefined,
        admiredValues: admiredValues || undefined,
        foodAllergies: foodAllergies || undefined,
        hasPets: hasPets === "outra" && petsDescription ? `outra: ${petsDescription}` : hasPets || undefined,
        participateInVideos,
        generateOnboarding,
      });

      // Save dependents and emergency contacts
      if (result.success) {
        const depData = dependents.filter((d) => d.name.trim());
        await updateEmployeeDependents(initialData!.id, depData.map((d) => ({
          id: d.id,
          name: d.name,
          relationship: d.relationship,
          cpf: d.cpf || null,
        })));
        const contactData = emergencyContacts.filter((c) => c.name.trim());
        await updateEmployeeEmergencyContacts(initialData!.id, contactData.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          relationship: c.relationship || null,
        })));
      }
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

  const selectedSocialNetworks = Object.keys(socialNetworks);

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

          {/* Tab 4: Família e Dependentes */}
          {activeTab === 3 && (
            <div className="space-y-8">
              {/* Filhos */}
              <div className="space-y-4">
                <h3 className="text-base font-medium text-gray-900 dark:text-white">Filhos</h3>
                <div className="flex items-center gap-3">
                  <input
                    id="emp-haschildren"
                    type="checkbox"
                    checked={hasChildren}
                    onChange={(e) => setHasChildren(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                    disabled={loading}
                  />
                  <label htmlFor="emp-haschildren" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Possui filhos
                  </label>
                </div>
                {hasChildren && (
                  <div>
                    <label htmlFor="emp-childrenages" className={labelClass}>
                      Idades dos filhos
                    </label>
                    <input
                      id="emp-childrenages"
                      type="text"
                      value={childrenAges}
                      onChange={(e) => setChildrenAges(e.target.value)}
                      placeholder="Ex: 3 e 7 anos"
                      className={inputClass}
                      disabled={loading}
                    />
                  </div>
                )}
              </div>

              {/* Dependentes IR */}
              <div className="space-y-4">
                <h3 className="text-base font-medium text-gray-900 dark:text-white">Dependentes IR</h3>
                <div className="flex items-center gap-3">
                  <input
                    id="emp-hasirdependents"
                    type="checkbox"
                    checked={hasIRDependents}
                    onChange={(e) => setHasIRDependents(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                    disabled={loading}
                  />
                  <label htmlFor="emp-hasirdependents" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Possui dependentes para IR
                  </label>
                </div>
                {hasIRDependents && (
                  <div className="space-y-3">
                    {dependents.map((dep, idx) => (
                      <div key={idx} className="flex items-start gap-3 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3">
                        <div className="grid flex-1 gap-3 sm:grid-cols-3">
                          <div>
                            <label className={labelClass}>Nome</label>
                            <input
                              type="text"
                              value={dep.name}
                              onChange={(e) => {
                                const updated = [...dependents];
                                updated[idx] = { ...dep, name: e.target.value };
                                setDependents(updated);
                              }}
                              placeholder="Nome do dependente"
                              className={inputClass}
                              disabled={loading}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Parentesco</label>
                            <input
                              type="text"
                              value={dep.relationship}
                              onChange={(e) => {
                                const updated = [...dependents];
                                updated[idx] = { ...dep, relationship: e.target.value };
                                setDependents(updated);
                              }}
                              placeholder="Ex: Filho(a), Cônjuge"
                              className={inputClass}
                              disabled={loading}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>CPF</label>
                            <input
                              type="text"
                              value={dep.cpf}
                              onChange={(e) => {
                                const updated = [...dependents];
                                updated[idx] = { ...dep, cpf: maskCPF(e.target.value) };
                                setDependents(updated);
                              }}
                              placeholder="000.000.000-00"
                              className={inputClass}
                              disabled={loading}
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDependents(dependents.filter((_, i) => i !== idx))}
                          className="mt-6 rounded-md p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                          disabled={loading}
                          title="Remover dependente"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setDependents([...dependents, { name: "", relationship: "", cpf: "" }])}
                      className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      disabled={loading}
                    >
                      <Plus size={14} />
                      Adicionar dependente
                    </button>
                  </div>
                )}
              </div>

              {/* Contatos de Emergência */}
              <div className="space-y-4">
                <h3 className="text-base font-medium text-gray-900 dark:text-white">Contatos de Emergência</h3>
                <div className="space-y-3">
                  {emergencyContacts.map((contact, idx) => (
                    <div key={idx} className="flex items-start gap-3 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3">
                      <div className="grid flex-1 gap-3 sm:grid-cols-3">
                        <div>
                          <label className={labelClass}>Nome</label>
                          <input
                            type="text"
                            value={contact.name}
                            onChange={(e) => {
                              const updated = [...emergencyContacts];
                              updated[idx] = { ...contact, name: e.target.value };
                              setEmergencyContacts(updated);
                            }}
                            placeholder="Nome do contato"
                            className={inputClass}
                            disabled={loading}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Telefone</label>
                          <input
                            type="text"
                            value={contact.phone}
                            onChange={(e) => {
                              const updated = [...emergencyContacts];
                              updated[idx] = { ...contact, phone: maskPhone(e.target.value) };
                              setEmergencyContacts(updated);
                            }}
                            placeholder="(00) 00000-0000"
                            className={inputClass}
                            disabled={loading}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Parentesco (opcional)</label>
                          <input
                            type="text"
                            value={contact.relationship}
                            onChange={(e) => {
                              const updated = [...emergencyContacts];
                              updated[idx] = { ...contact, relationship: e.target.value };
                              setEmergencyContacts(updated);
                            }}
                            placeholder="Ex: Mãe, Pai, Amigo"
                            className={inputClass}
                            disabled={loading}
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEmergencyContacts(emergencyContacts.filter((_, i) => i !== idx))}
                        className="mt-6 rounded-md p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                        disabled={loading}
                        title="Remover contato"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setEmergencyContacts([...emergencyContacts, { name: "", phone: "", relationship: "" }])}
                    className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    disabled={loading}
                  >
                    <Plus size={14} />
                    Adicionar contato
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: Sobre Mim */}
          {activeTab === 4 && (
            <div className="space-y-6">
              {/* Hobbies */}
              <div className={sectionClass}>
                <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Hobbies</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {HOBBY_OPTIONS.map((hobby) => (
                    <label key={hobby} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={hobbies.includes(hobby)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setHobbies([...hobbies, hobby]);
                          } else {
                            setHobbies(hobbies.filter((h) => h !== hobby));
                          }
                        }}
                        disabled={loading}
                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                      />
                      {hobby}
                    </label>
                  ))}
                </div>
              </div>

              {/* Social Networks */}
              <div className={sectionClass}>
                <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Redes Sociais</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {SOCIAL_NETWORK_OPTIONS.map((network) => (
                      <label key={network} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <input
                          type="checkbox"
                          checked={selectedSocialNetworks.includes(network)}
                          onChange={(e) => {
                            const updated = { ...socialNetworks };
                            if (e.target.checked) {
                              updated[network] = socialNetworks[network] ?? "";
                            } else {
                              delete updated[network];
                            }
                            setSocialNetworks(updated);
                          }}
                          disabled={loading}
                          className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                        {network}
                      </label>
                    ))}
                  </div>
                  {selectedSocialNetworks.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {selectedSocialNetworks.map((network) => (
                        <div key={network}>
                          <label className={labelClass}>{network} — Perfil / Handle</label>
                          <input
                            type="text"
                            value={socialNetworks[network] ?? ""}
                            onChange={(e) => setSocialNetworks({ ...socialNetworks, [network]: e.target.value })}
                            placeholder={`Seu perfil no ${network}`}
                            className={inputClass}
                            disabled={loading}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Favorites */}
              <div className={sectionClass}>
                <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Favoritos</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Gênero de livros/filmes que curte</label>
                    <input
                      type="text"
                      value={favoriteBookMovieGenres}
                      onChange={(e) => setFavoriteBookMovieGenres(e.target.value)}
                      className={inputClass}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Livro(s) favorito(s)</label>
                    <input
                      type="text"
                      value={favoriteBooks}
                      onChange={(e) => setFavoriteBooks(e.target.value)}
                      className={inputClass}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Filme(s) favorito(s)</label>
                    <input
                      type="text"
                      value={favoriteMovies}
                      onChange={(e) => setFavoriteMovies(e.target.value)}
                      className={inputClass}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Música/banda favorita</label>
                    <input
                      type="text"
                      value={favoriteMusic}
                      onChange={(e) => setFavoriteMusic(e.target.value)}
                      className={inputClass}
                      disabled={loading}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Valores que admira</label>
                    <input
                      type="text"
                      value={admiredValues}
                      onChange={(e) => setAdmiredValues(e.target.value)}
                      className={inputClass}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {/* Food allergies */}
              <div className={sectionClass}>
                <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Alergias / Intolerâncias Alimentares</h3>
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Campo opcional — preencha se desejar informar.</p>
                <input
                  type="text"
                  value={foodAllergies}
                  onChange={(e) => setFoodAllergies(e.target.value)}
                  className={inputClass}
                  disabled={loading}
                  placeholder="Ex: Intolerância a lactose, alergia a amendoim..."
                />
              </div>

              {/* Pets */}
              <div className={sectionClass}>
                <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Animais de Estimação</h3>
                <div className="space-y-3">
                  <div>
                    <label className={labelClass}>Possui animais de estimação?</label>
                    <select
                      value={hasPets}
                      onChange={(e) => {
                        setHasPets(e.target.value);
                        if (e.target.value !== "outra") setPetsDescription("");
                      }}
                      className={inputClass}
                      disabled={loading}
                    >
                      {PETS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {hasPets === "outra" && (
                    <div>
                      <label className={labelClass}>Descreva</label>
                      <input
                        type="text"
                        value={petsDescription}
                        onChange={(e) => setPetsDescription(e.target.value)}
                        className={inputClass}
                        disabled={loading}
                        placeholder="Ex: Coelho, hamster..."
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Participation in videos */}
              <div className={sectionClass}>
                <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Participação Institucional</h3>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={participateInVideos}
                    onChange={(e) => setParticipateInVideos(e.target.checked)}
                    disabled={loading}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  Aceito participar de vídeos institucionais
                </label>
              </div>
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
