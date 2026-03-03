"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MyFullProfile, MyPendingChangeRequest } from "@/app/(dashboard)/perfil/actions";
import { createChangeRequest, updateEmployeeProfile } from "@/app/(dashboard)/colaboradores/actions";

// Enum label maps
const GENDER_LABELS: Record<string, string> = {
  masculino: "Masculino", feminino: "Feminino", outra: "Outra",
};
const ETHNICITY_LABELS: Record<string, string> = {
  branco: "Branco", preto: "Preto", amarelo: "Amarelo", indigena: "Indígena", pardo: "Pardo",
};
const MARITAL_STATUS_LABELS: Record<string, string> = {
  solteiro: "Solteiro(a)", casado: "Casado(a)", outra: "Outra",
};
const EDUCATION_LEVEL_LABELS: Record<string, string> = {
  ensino_medio: "Ensino Médio", ensino_tecnico: "Ensino Técnico",
  superior_incompleto: "Superior Incompleto", superior_completo: "Superior Completo",
  pos_graduado: "Pós-Graduado",
};
const BANK_ACCOUNT_LABELS: Record<string, string> = { sim: "Sim", nao: "Não", outra: "Outra" };
const HEALTH_PLAN_LABELS: Record<string, string> = { regional: "Regional", nacional: "Nacional", nao: "Não" };
const CONTRACT_TYPE_LABELS: Record<string, string> = { efetivo: "Efetivo", estagio: "Estágio" };
const SHIRT_SIZE_LABELS: Record<string, string> = {
  p_fem: "P Feminino", m_fem: "M Feminino", g_fem: "G Feminino", gg_fem: "GG Feminino", xg_fem: "XG Feminino",
  p_masc: "P Masculino", m_masc: "M Masculino", g_masc: "G Masculino", gg_masc: "GG Masculino", xg_masc: "XG Masculino",
};
const PETS_LABELS: Record<string, string> = {
  nao: "Não", sim_cachorros: "Sim, cachorros", sim_gatos: "Sim, gatos",
};

// Select options for edit mode
const GENDER_OPTIONS = [
  { value: "", label: "Selecione" }, { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" }, { value: "outra", label: "Outra" },
];
const ETHNICITY_OPTIONS = [
  { value: "", label: "Selecione" }, { value: "branco", label: "Branco" },
  { value: "preto", label: "Preto" }, { value: "amarelo", label: "Amarelo" },
  { value: "indigena", label: "Indígena" }, { value: "pardo", label: "Pardo" },
];
const MARITAL_STATUS_OPTIONS = [
  { value: "", label: "Selecione" }, { value: "solteiro", label: "Solteiro(a)" },
  { value: "casado", label: "Casado(a)" }, { value: "outra", label: "Outra" },
];
const EDUCATION_LEVEL_OPTIONS = [
  { value: "", label: "Selecione" }, { value: "ensino_medio", label: "Ensino Médio" },
  { value: "ensino_tecnico", label: "Ensino Técnico" }, { value: "superior_incompleto", label: "Superior Incompleto" },
  { value: "superior_completo", label: "Superior Completo" }, { value: "pos_graduado", label: "Pós-Graduado" },
];
const BANK_ACCOUNT_OPTIONS = [
  { value: "", label: "Selecione" }, { value: "sim", label: "Sim" },
  { value: "nao", label: "Não" }, { value: "outra", label: "Outra" },
];
const HEALTH_PLAN_OPTIONS = [
  { value: "", label: "Selecione" }, { value: "regional", label: "Regional" },
  { value: "nacional", label: "Nacional" }, { value: "nao", label: "Não" },
];
const CONTRACT_TYPE_OPTIONS = [
  { value: "", label: "Selecione" }, { value: "efetivo", label: "Efetivo" },
  { value: "estagio", label: "Estágio" },
];
const SHIRT_SIZE_OPTIONS = [
  { value: "", label: "Selecione" },
  { value: "p_fem", label: "P Feminino" }, { value: "m_fem", label: "M Feminino" },
  { value: "g_fem", label: "G Feminino" }, { value: "gg_fem", label: "GG Feminino" },
  { value: "xg_fem", label: "XG Feminino" }, { value: "p_masc", label: "P Masculino" },
  { value: "m_masc", label: "M Masculino" }, { value: "g_masc", label: "G Masculino" },
  { value: "gg_masc", label: "GG Masculino" }, { value: "xg_masc", label: "XG Masculino" },
];
const HOBBY_OPTIONS = [
  "Games", "Leitura", "Cinema", "Música", "Pintura/Desenho", "Escrita",
  "Esporte", "Canto", "Instrumentos Musicais", "Viagens", "Voluntariado",
  "Dança", "Jardinagem", "Teatro", "Pescaria", "Artesanato", "Skate", "Outra",
];
const SOCIAL_NETWORK_OPTIONS = ["Instagram", "LinkedIn", "Twitter", "Facebook", "TikTok", "Outra"];
const PETS_OPTIONS = [
  { value: "", label: "Selecione" }, { value: "nao", label: "Não" },
  { value: "sim_cachorros", label: "Sim, cachorros" }, { value: "sim_gatos", label: "Sim, gatos" },
  { value: "outra", label: "Outra" },
];
const UF_OPTIONS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const TAB_LABELS = ["Dados Pessoais", "Endereço e Contato", "Financeiro e Benefícios", "Família e Dependentes", "Sobre Mim"];

// Helpers
function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function dateToInput(date: Date | string | null): string {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0];
}

function calculateAge(birthDate: Date | string | null): string {
  if (!birthDate) return "—";
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getUTCFullYear();
  const monthDiff = today.getMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getUTCDate())) age--;
  return `${age} anos`;
}

function enumLabel(map: Record<string, string>, value: string | null): string {
  if (!value) return "—";
  return map[value] || value;
}

function boolLabel(value: boolean | null): string {
  if (value === null || value === undefined) return "—";
  return value ? "Sim" : "Não";
}

// CSS classes
const sectionClass = "rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800";
const fieldLabelClass = "text-sm font-medium text-gray-500 dark:text-gray-400";
const fieldValueClass = "mt-1 text-sm text-gray-900 dark:text-gray-100";
const inputClass = "block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white";
const selectClass = inputClass;
const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

// Types
type TabProps = { profile: MyFullProfile; pendingFields: Set<string> };
type Message = { type: "success" | "error"; text: string } | null;
type FieldChange = { fieldName: string; oldValue: string | null; newValue: string | null };

// Shared UI
function PendingBadge() {
  return (
    <span
      className="ml-1.5 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
      title="Aguardando aprovação do RH"
    >
      Pendente
    </span>
  );
}

function MessageBanner({ message }: { message: Message }) {
  if (!message) return null;
  const cls = message.type === "success"
    ? "bg-green-50 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800"
    : "bg-red-50 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800";
  return (
    <div className={`mb-4 rounded-md border p-3 text-sm ${cls}`}>
      {message.text}
    </div>
  );
}

function TabHeader({
  title, editing, saving, onEdit, onSave, onCancel,
}: {
  title: string; editing: boolean; saving: boolean;
  onEdit: () => void; onSave: () => void; onCancel: () => void;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      {editing ? (
        <div className="flex gap-2">
          <button
            onClick={onSave}
            disabled={saving}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
          <button
            onClick={onCancel}
            disabled={saving}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          onClick={onEdit}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        >
          Editar
        </button>
      )}
    </div>
  );
}

function ReadField({ label: lbl, value, pending }: { label: string; value: string; pending?: boolean }) {
  return (
    <div>
      <dt className={fieldLabelClass}>
        {lbl}
        {pending && <PendingBadge />}
      </dt>
      <dd className={fieldValueClass}>{value || "—"}</dd>
    </div>
  );
}

// Helper to submit change requests for tabs 1-4
async function submitChangeRequests(
  userId: string,
  changes: FieldChange[],
  pendingFields: Set<string>,
): Promise<{ ok: boolean; message: Message }> {
  const applicable = changes.filter(c => !pendingFields.has(c.fieldName));
  if (applicable.length === 0) {
    return { ok: true, message: null };
  }

  const errors: string[] = [];
  for (const change of applicable) {
    const result = await createChangeRequest(userId, change.fieldName, change.oldValue, change.newValue);
    if (!result.success) {
      errors.push(result.error || `Erro no campo ${change.fieldName}`);
    }
  }

  if (errors.length > 0) {
    return { ok: false, message: { type: "error", text: errors.join("; ") } };
  }
  return { ok: true, message: { type: "success", text: "Alteração enviada para aprovação do RH" } };
}

// ── Main Component ──────────────────────────────────────

export function PerfilData({
  profile,
  pendingChangeRequests,
}: {
  profile: MyFullProfile;
  pendingChangeRequests: MyPendingChangeRequest[];
}) {
  const [activeTab, setActiveTab] = useState(0);
  const pendingFields = new Set(pendingChangeRequests.map(cr => cr.fieldName));

  return (
    <div>
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex gap-4 overflow-x-auto">
          {TAB_LABELS.map((tabLabel, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTab(idx)}
              className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                activeTab === idx
                  ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300"
              }`}
            >
              {tabLabel}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 0 && <TabDadosPessoais profile={profile} pendingFields={pendingFields} />}
        {activeTab === 1 && <TabEnderecoContato profile={profile} pendingFields={pendingFields} />}
        {activeTab === 2 && <TabFinanceiroBeneficios profile={profile} pendingFields={pendingFields} />}
        {activeTab === 3 && <TabFamiliaDependentes profile={profile} pendingFields={pendingFields} />}
        {activeTab === 4 && <TabSobreMim profile={profile} />}
      </div>
    </div>
  );
}

// ── Tab 1: Dados Pessoais ───────────────────────────────

function TabDadosPessoais({ profile, pendingFields }: TabProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  const [name, setName] = useState(profile.name || "");
  const [birthDate, setBirthDate] = useState(dateToInput(profile.birthDate));
  const [gender, setGender] = useState(profile.gender || "");
  const [ethnicity, setEthnicity] = useState(profile.ethnicity || "");
  const [maritalStatus, setMaritalStatus] = useState(profile.maritalStatus || "");
  const [cpf, setCpf] = useState(profile.cpf || "");
  const [rg, setRg] = useState(profile.rg || "");
  const [educationLevel, setEducationLevel] = useState(profile.educationLevel || "");
  const [livesWithDescription, setLivesWithDescription] = useState(profile.livesWithDescription || "");

  const resetForm = () => {
    setName(profile.name || "");
    setBirthDate(dateToInput(profile.birthDate));
    setGender(profile.gender || "");
    setEthnicity(profile.ethnicity || "");
    setMaritalStatus(profile.maritalStatus || "");
    setCpf(profile.cpf || "");
    setRg(profile.rg || "");
    setEducationLevel(profile.educationLevel || "");
    setLivesWithDescription(profile.livesWithDescription || "");
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setMessage({ type: "error", text: "Nome é obrigatório" });
      return;
    }
    setSaving(true);
    setMessage(null);

    const changes: FieldChange[] = [];
    const s = (v: string) => v.trim() || null;

    if (name.trim() !== (profile.name || "")) changes.push({ fieldName: "name", oldValue: profile.name || null, newValue: s(name) });
    if (birthDate !== dateToInput(profile.birthDate)) changes.push({ fieldName: "birthDate", oldValue: profile.birthDate ? dateToInput(profile.birthDate) : null, newValue: birthDate || null });
    if (gender !== (profile.gender || "")) changes.push({ fieldName: "gender", oldValue: profile.gender, newValue: gender || null });
    if (ethnicity !== (profile.ethnicity || "")) changes.push({ fieldName: "ethnicity", oldValue: profile.ethnicity, newValue: ethnicity || null });
    if (maritalStatus !== (profile.maritalStatus || "")) changes.push({ fieldName: "maritalStatus", oldValue: profile.maritalStatus, newValue: maritalStatus || null });
    if (cpf.trim() !== (profile.cpf || "")) changes.push({ fieldName: "cpf", oldValue: profile.cpf, newValue: s(cpf) });
    if (rg.trim() !== (profile.rg || "")) changes.push({ fieldName: "rg", oldValue: profile.rg, newValue: s(rg) });
    if (educationLevel !== (profile.educationLevel || "")) changes.push({ fieldName: "educationLevel", oldValue: profile.educationLevel, newValue: educationLevel || null });
    if (livesWithDescription.trim() !== (profile.livesWithDescription || "")) changes.push({ fieldName: "livesWithDescription", oldValue: profile.livesWithDescription, newValue: s(livesWithDescription) });

    const { ok, message: msg } = await submitChangeRequests(profile.id, changes, pendingFields);
    if (msg) setMessage(msg);
    if (ok) { router.refresh(); setEditing(false); }
    setSaving(false);
  };

  return (
    <div className={sectionClass}>
      <TabHeader title="Dados Pessoais" editing={editing} saving={saving}
        onEdit={() => { setMessage(null); setEditing(true); }}
        onSave={handleSave}
        onCancel={() => { resetForm(); setMessage(null); setEditing(false); }}
      />
      <MessageBanner message={message} />

      {!editing ? (
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ReadField label="Nome Completo" value={profile.name} pending={pendingFields.has("name")} />
          <ReadField label="Data de Nascimento" value={formatDate(profile.birthDate)} pending={pendingFields.has("birthDate")} />
          <ReadField label="Idade" value={calculateAge(profile.birthDate)} />
          <ReadField label="Gênero" value={enumLabel(GENDER_LABELS, profile.gender)} pending={pendingFields.has("gender")} />
          <ReadField label="Etnia" value={enumLabel(ETHNICITY_LABELS, profile.ethnicity)} pending={pendingFields.has("ethnicity")} />
          <ReadField label="Estado Civil" value={enumLabel(MARITAL_STATUS_LABELS, profile.maritalStatus)} pending={pendingFields.has("maritalStatus")} />
          <ReadField label="CPF" value={profile.cpf || "—"} pending={pendingFields.has("cpf")} />
          <ReadField label="RG" value={profile.rg || "—"} pending={pendingFields.has("rg")} />
          <ReadField label="Nível de Escolaridade" value={enumLabel(EDUCATION_LEVEL_LABELS, profile.educationLevel)} pending={pendingFields.has("educationLevel")} />
          <ReadField label="Com quem mora" value={profile.livesWithDescription || "—"} pending={pendingFields.has("livesWithDescription")} />
        </dl>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelClass}>Nome Completo {pendingFields.has("name") && <PendingBadge />}</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} disabled={pendingFields.has("name")} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Data de Nascimento {pendingFields.has("birthDate") && <PendingBadge />}</label>
            <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} disabled={pendingFields.has("birthDate")} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Idade</label>
            <input type="text" value={birthDate ? calculateAge(birthDate) : "—"} readOnly className={`${inputClass} bg-gray-100 dark:bg-gray-600`} />
          </div>
          <div>
            <label className={labelClass}>Gênero {pendingFields.has("gender") && <PendingBadge />}</label>
            <select value={gender} onChange={e => setGender(e.target.value)} disabled={pendingFields.has("gender")} className={selectClass}>
              {GENDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Etnia {pendingFields.has("ethnicity") && <PendingBadge />}</label>
            <select value={ethnicity} onChange={e => setEthnicity(e.target.value)} disabled={pendingFields.has("ethnicity")} className={selectClass}>
              {ETHNICITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Estado Civil {pendingFields.has("maritalStatus") && <PendingBadge />}</label>
            <select value={maritalStatus} onChange={e => setMaritalStatus(e.target.value)} disabled={pendingFields.has("maritalStatus")} className={selectClass}>
              {MARITAL_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>CPF {pendingFields.has("cpf") && <PendingBadge />}</label>
            <input type="text" value={cpf} onChange={e => setCpf(e.target.value)} disabled={pendingFields.has("cpf")} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>RG {pendingFields.has("rg") && <PendingBadge />}</label>
            <input type="text" value={rg} onChange={e => setRg(e.target.value)} disabled={pendingFields.has("rg")} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Nível de Escolaridade {pendingFields.has("educationLevel") && <PendingBadge />}</label>
            <select value={educationLevel} onChange={e => setEducationLevel(e.target.value)} disabled={pendingFields.has("educationLevel")} className={selectClass}>
              {EDUCATION_LEVEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Com quem mora {pendingFields.has("livesWithDescription") && <PendingBadge />}</label>
            <input type="text" value={livesWithDescription} onChange={e => setLivesWithDescription(e.target.value)} disabled={pendingFields.has("livesWithDescription")} className={inputClass} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab 2: Endereço e Contato ───────────────────────────

function TabEnderecoContato({ profile, pendingFields }: TabProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  const [address, setAddress] = useState(profile.address || "");
  const [addressNumber, setAddressNumber] = useState(profile.addressNumber || "");
  const [addressComplement, setAddressComplement] = useState(profile.addressComplement || "");
  const [zipCode, setZipCode] = useState(profile.zipCode || "");
  const [city, setCity] = useState(profile.city || "");
  const [state, setState] = useState(profile.state || "");
  const [personalEmail, setPersonalEmail] = useState(profile.personalEmail || "");
  const [phone, setPhone] = useState(profile.phone || "");

  const resetForm = () => {
    setAddress(profile.address || "");
    setAddressNumber(profile.addressNumber || "");
    setAddressComplement(profile.addressComplement || "");
    setZipCode(profile.zipCode || "");
    setCity(profile.city || "");
    setState(profile.state || "");
    setPersonalEmail(profile.personalEmail || "");
    setPhone(profile.phone || "");
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const changes: FieldChange[] = [];
    const s = (v: string) => v.trim() || null;

    if (address.trim() !== (profile.address || "")) changes.push({ fieldName: "address", oldValue: profile.address, newValue: s(address) });
    if (addressNumber.trim() !== (profile.addressNumber || "")) changes.push({ fieldName: "addressNumber", oldValue: profile.addressNumber, newValue: s(addressNumber) });
    if (addressComplement.trim() !== (profile.addressComplement || "")) changes.push({ fieldName: "addressComplement", oldValue: profile.addressComplement, newValue: s(addressComplement) });
    if (zipCode.trim() !== (profile.zipCode || "")) changes.push({ fieldName: "zipCode", oldValue: profile.zipCode, newValue: s(zipCode) });
    if (city.trim() !== (profile.city || "")) changes.push({ fieldName: "city", oldValue: profile.city, newValue: s(city) });
    if (state !== (profile.state || "")) changes.push({ fieldName: "state", oldValue: profile.state, newValue: state || null });
    if (personalEmail.trim() !== (profile.personalEmail || "")) changes.push({ fieldName: "personalEmail", oldValue: profile.personalEmail, newValue: s(personalEmail) });
    if (phone.trim() !== (profile.phone || "")) changes.push({ fieldName: "phone", oldValue: profile.phone, newValue: s(phone) });

    const { ok, message: msg } = await submitChangeRequests(profile.id, changes, pendingFields);
    if (msg) setMessage(msg);
    if (ok) { router.refresh(); setEditing(false); }
    setSaving(false);
  };

  const fullAddress = [profile.address, profile.addressNumber ? `nº ${profile.addressNumber}` : null, profile.addressComplement].filter(Boolean).join(", ");

  return (
    <div className={sectionClass}>
      <TabHeader title="Endereço e Contato" editing={editing} saving={saving}
        onEdit={() => { setMessage(null); setEditing(true); }}
        onSave={handleSave}
        onCancel={() => { resetForm(); setMessage(null); setEditing(false); }}
      />
      <MessageBanner message={message} />

      {!editing ? (
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ReadField label="Endereço" value={fullAddress || "—"} pending={pendingFields.has("address") || pendingFields.has("addressNumber") || pendingFields.has("addressComplement")} />
          <ReadField label="CEP" value={profile.zipCode || "—"} pending={pendingFields.has("zipCode")} />
          <ReadField label="Cidade" value={profile.city || "—"} pending={pendingFields.has("city")} />
          <ReadField label="Estado (UF)" value={profile.state || "—"} pending={pendingFields.has("state")} />
          <ReadField label="Email Pessoal" value={profile.personalEmail || "—"} pending={pendingFields.has("personalEmail")} />
          <ReadField label="Telefone" value={profile.phone || "—"} pending={pendingFields.has("phone")} />
        </dl>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelClass}>Endereço (Rua) {pendingFields.has("address") && <PendingBadge />}</label>
            <input type="text" value={address} onChange={e => setAddress(e.target.value)} disabled={pendingFields.has("address")} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Número {pendingFields.has("addressNumber") && <PendingBadge />}</label>
            <input type="text" value={addressNumber} onChange={e => setAddressNumber(e.target.value)} disabled={pendingFields.has("addressNumber")} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Complemento {pendingFields.has("addressComplement") && <PendingBadge />}</label>
            <input type="text" value={addressComplement} onChange={e => setAddressComplement(e.target.value)} disabled={pendingFields.has("addressComplement")} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>CEP {pendingFields.has("zipCode") && <PendingBadge />}</label>
            <input type="text" value={zipCode} onChange={e => setZipCode(e.target.value)} disabled={pendingFields.has("zipCode")} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Cidade {pendingFields.has("city") && <PendingBadge />}</label>
            <input type="text" value={city} onChange={e => setCity(e.target.value)} disabled={pendingFields.has("city")} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Estado (UF) {pendingFields.has("state") && <PendingBadge />}</label>
            <select value={state} onChange={e => setState(e.target.value)} disabled={pendingFields.has("state")} className={selectClass}>
              <option value="">Selecione</option>
              {UF_OPTIONS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Email Pessoal {pendingFields.has("personalEmail") && <PendingBadge />}</label>
            <input type="email" value={personalEmail} onChange={e => setPersonalEmail(e.target.value)} disabled={pendingFields.has("personalEmail")} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Telefone {pendingFields.has("phone") && <PendingBadge />}</label>
            <input type="text" value={phone} onChange={e => setPhone(e.target.value)} disabled={pendingFields.has("phone")} className={inputClass} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab 3: Financeiro e Benefícios ──────────────────────

function TabFinanceiroBeneficios({ profile, pendingFields }: TabProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  const [hasBradescoAccount, setHasBradescoAccount] = useState(profile.hasBradescoAccount || "");
  const [bankAgency, setBankAgency] = useState(profile.bankAgency || "");
  const [bankAccount, setBankAccount] = useState(profile.bankAccount || "");
  const [hasOtherEmployment, setHasOtherEmployment] = useState(profile.hasOtherEmployment ?? false);
  const [healthPlanOption, setHealthPlanOption] = useState(profile.healthPlanOption || "");
  const [wantsTransportVoucher, setWantsTransportVoucher] = useState(profile.wantsTransportVoucher ?? false);
  const [contractType, setContractType] = useState(profile.contractType || "");
  const [shirtSize, setShirtSize] = useState(profile.shirtSize || "");

  const resetForm = () => {
    setHasBradescoAccount(profile.hasBradescoAccount || "");
    setBankAgency(profile.bankAgency || "");
    setBankAccount(profile.bankAccount || "");
    setHasOtherEmployment(profile.hasOtherEmployment ?? false);
    setHealthPlanOption(profile.healthPlanOption || "");
    setWantsTransportVoucher(profile.wantsTransportVoucher ?? false);
    setContractType(profile.contractType || "");
    setShirtSize(profile.shirtSize || "");
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const changes: FieldChange[] = [];
    const s = (v: string) => v.trim() || null;

    if (hasBradescoAccount !== (profile.hasBradescoAccount || "")) changes.push({ fieldName: "hasBradescoAccount", oldValue: profile.hasBradescoAccount, newValue: hasBradescoAccount || null });
    if (bankAgency.trim() !== (profile.bankAgency || "")) changes.push({ fieldName: "bankAgency", oldValue: profile.bankAgency, newValue: s(bankAgency) });
    if (bankAccount.trim() !== (profile.bankAccount || "")) changes.push({ fieldName: "bankAccount", oldValue: profile.bankAccount, newValue: s(bankAccount) });
    if (hasOtherEmployment !== (profile.hasOtherEmployment ?? false)) changes.push({ fieldName: "hasOtherEmployment", oldValue: profile.hasOtherEmployment === null ? null : String(profile.hasOtherEmployment), newValue: String(hasOtherEmployment) });
    if (healthPlanOption !== (profile.healthPlanOption || "")) changes.push({ fieldName: "healthPlanOption", oldValue: profile.healthPlanOption, newValue: healthPlanOption || null });
    if (wantsTransportVoucher !== (profile.wantsTransportVoucher ?? false)) changes.push({ fieldName: "wantsTransportVoucher", oldValue: profile.wantsTransportVoucher === null ? null : String(profile.wantsTransportVoucher), newValue: String(wantsTransportVoucher) });
    if (contractType !== (profile.contractType || "")) changes.push({ fieldName: "contractType", oldValue: profile.contractType, newValue: contractType || null });
    if (shirtSize !== (profile.shirtSize || "")) changes.push({ fieldName: "shirtSize", oldValue: profile.shirtSize, newValue: shirtSize || null });

    const { ok, message: msg } = await submitChangeRequests(profile.id, changes, pendingFields);
    if (msg) setMessage(msg);
    if (ok) { router.refresh(); setEditing(false); }
    setSaving(false);
  };

  return (
    <div className={sectionClass}>
      <TabHeader title="Financeiro e Benefícios" editing={editing} saving={saving}
        onEdit={() => { setMessage(null); setEditing(true); }}
        onSave={handleSave}
        onCancel={() => { resetForm(); setMessage(null); setEditing(false); }}
      />
      <MessageBanner message={message} />

      {!editing ? (
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ReadField label="Conta Bradesco" value={enumLabel(BANK_ACCOUNT_LABELS, profile.hasBradescoAccount)} pending={pendingFields.has("hasBradescoAccount")} />
          {profile.hasBradescoAccount === "sim" && (
            <>
              <ReadField label="Agência" value={profile.bankAgency || "—"} pending={pendingFields.has("bankAgency")} />
              <ReadField label="Conta" value={profile.bankAccount || "—"} pending={pendingFields.has("bankAccount")} />
            </>
          )}
          <ReadField label="Outro Emprego Registrado" value={boolLabel(profile.hasOtherEmployment)} pending={pendingFields.has("hasOtherEmployment")} />
          <ReadField label="Plano de Saúde Unimed" value={enumLabel(HEALTH_PLAN_LABELS, profile.healthPlanOption)} pending={pendingFields.has("healthPlanOption")} />
          <ReadField label="Vale Transporte" value={boolLabel(profile.wantsTransportVoucher)} pending={pendingFields.has("wantsTransportVoucher")} />
          <ReadField label="Formato de Contratação" value={enumLabel(CONTRACT_TYPE_LABELS, profile.contractType)} pending={pendingFields.has("contractType")} />
          <ReadField label="Tamanho Camiseta" value={enumLabel(SHIRT_SIZE_LABELS, profile.shirtSize)} pending={pendingFields.has("shirtSize")} />
        </dl>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelClass}>Conta Bradesco {pendingFields.has("hasBradescoAccount") && <PendingBadge />}</label>
            <select value={hasBradescoAccount} onChange={e => setHasBradescoAccount(e.target.value)} disabled={pendingFields.has("hasBradescoAccount")} className={selectClass}>
              {BANK_ACCOUNT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {hasBradescoAccount === "sim" && (
            <>
              <div>
                <label className={labelClass}>Agência {pendingFields.has("bankAgency") && <PendingBadge />}</label>
                <input type="text" value={bankAgency} onChange={e => setBankAgency(e.target.value)} disabled={pendingFields.has("bankAgency")} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Conta {pendingFields.has("bankAccount") && <PendingBadge />}</label>
                <input type="text" value={bankAccount} onChange={e => setBankAccount(e.target.value)} disabled={pendingFields.has("bankAccount")} className={inputClass} />
              </div>
            </>
          )}
          <div className="flex items-center gap-2 pt-6">
            <input type="checkbox" checked={hasOtherEmployment} onChange={e => setHasOtherEmployment(e.target.checked)} disabled={pendingFields.has("hasOtherEmployment")} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Outro Emprego Registrado {pendingFields.has("hasOtherEmployment") && <PendingBadge />}
            </label>
          </div>
          <div>
            <label className={labelClass}>Plano de Saúde Unimed {pendingFields.has("healthPlanOption") && <PendingBadge />}</label>
            <select value={healthPlanOption} onChange={e => setHealthPlanOption(e.target.value)} disabled={pendingFields.has("healthPlanOption")} className={selectClass}>
              {HEALTH_PLAN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input type="checkbox" checked={wantsTransportVoucher} onChange={e => setWantsTransportVoucher(e.target.checked)} disabled={pendingFields.has("wantsTransportVoucher")} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Vale Transporte {pendingFields.has("wantsTransportVoucher") && <PendingBadge />}
            </label>
          </div>
          <div>
            <label className={labelClass}>Formato de Contratação {pendingFields.has("contractType") && <PendingBadge />}</label>
            <select value={contractType} onChange={e => setContractType(e.target.value)} disabled={pendingFields.has("contractType")} className={selectClass}>
              {CONTRACT_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Tamanho Camiseta {pendingFields.has("shirtSize") && <PendingBadge />}</label>
            <select value={shirtSize} onChange={e => setShirtSize(e.target.value)} disabled={pendingFields.has("shirtSize")} className={selectClass}>
              {SHIRT_SIZE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab 4: Família e Dependentes ────────────────────────

function TabFamiliaDependentes({ profile, pendingFields }: TabProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  const [hasChildren, setHasChildren] = useState(profile.hasChildren ?? false);
  const [childrenAges, setChildrenAges] = useState(profile.childrenAges || "");
  const [hasIRDependents, setHasIRDependents] = useState(profile.hasIRDependents ?? false);

  const resetForm = () => {
    setHasChildren(profile.hasChildren ?? false);
    setChildrenAges(profile.childrenAges || "");
    setHasIRDependents(profile.hasIRDependents ?? false);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const changes: FieldChange[] = [];

    if (hasChildren !== (profile.hasChildren ?? false)) changes.push({ fieldName: "hasChildren", oldValue: profile.hasChildren === null ? null : String(profile.hasChildren), newValue: String(hasChildren) });
    if (childrenAges.trim() !== (profile.childrenAges || "")) changes.push({ fieldName: "childrenAges", oldValue: profile.childrenAges, newValue: childrenAges.trim() || null });
    if (hasIRDependents !== (profile.hasIRDependents ?? false)) changes.push({ fieldName: "hasIRDependents", oldValue: profile.hasIRDependents === null ? null : String(profile.hasIRDependents), newValue: String(hasIRDependents) });

    const { ok, message: msg } = await submitChangeRequests(profile.id, changes, pendingFields);
    if (msg) setMessage(msg);
    if (ok) { router.refresh(); setEditing(false); }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Children section - editable */}
      <div className={sectionClass}>
        <TabHeader title="Filhos" editing={editing} saving={saving}
          onEdit={() => { setMessage(null); setEditing(true); }}
          onSave={handleSave}
          onCancel={() => { resetForm(); setMessage(null); setEditing(false); }}
        />
        <MessageBanner message={message} />

        {!editing ? (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ReadField label="Possui Filhos" value={boolLabel(profile.hasChildren)} pending={pendingFields.has("hasChildren")} />
            {profile.hasChildren && (
              <ReadField label="Idades dos Filhos" value={profile.childrenAges || "—"} pending={pendingFields.has("childrenAges")} />
            )}
            <ReadField label="Possui Dependentes IR" value={boolLabel(profile.hasIRDependents)} pending={pendingFields.has("hasIRDependents")} />
          </dl>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={hasChildren} onChange={e => setHasChildren(e.target.checked)} disabled={pendingFields.has("hasChildren")} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Possui Filhos {pendingFields.has("hasChildren") && <PendingBadge />}
              </label>
            </div>
            {hasChildren && (
              <div>
                <label className={labelClass}>Idades dos Filhos {pendingFields.has("childrenAges") && <PendingBadge />}</label>
                <input type="text" value={childrenAges} onChange={e => setChildrenAges(e.target.value)} disabled={pendingFields.has("childrenAges")} className={inputClass} />
              </div>
            )}
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={hasIRDependents} onChange={e => setHasIRDependents(e.target.checked)} disabled={pendingFields.has("hasIRDependents")} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Possui Dependentes IR {pendingFields.has("hasIRDependents") && <PendingBadge />}
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Dependents table - read-only */}
      <div className={sectionClass}>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Dependentes IR</h3>
        {profile.dependents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Nome</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Parentesco</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">CPF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {profile.dependents.map((dep) => (
                  <tr key={dep.id}>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{dep.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{dep.relationship}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{dep.cpf || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum dependente cadastrado.</p>
        )}
      </div>

      {/* Emergency Contacts - read-only */}
      <div className={sectionClass}>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Contatos de Emergência</h3>
        {profile.emergencyContacts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Nome</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Telefone</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Parentesco</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {profile.emergencyContacts.map((contact) => (
                  <tr key={contact.id}>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{contact.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{contact.phone}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{contact.relationship || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum contato de emergência cadastrado.</p>
        )}
      </div>
    </div>
  );
}

// ── Tab 5: Sobre Mim (Direct Edit) ─────────────────────

function TabSobreMim({ profile }: { profile: MyFullProfile }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  // Hobbies
  const [hobbies, setHobbies] = useState<string[]>(profile.hobbies || []);

  // Social Networks
  const initSocial = (profile.socialNetworks && typeof profile.socialNetworks === "object")
    ? (profile.socialNetworks as Record<string, string>) : {};
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>(Object.keys(initSocial).filter(k => initSocial[k]));
  const [networkHandles, setNetworkHandles] = useState<Record<string, string>>({ ...initSocial });

  // Favorites
  const [favoriteBookMovieGenres, setFavoriteBookMovieGenres] = useState(profile.favoriteBookMovieGenres || "");
  const [favoriteBooks, setFavoriteBooks] = useState(profile.favoriteBooks || "");
  const [favoriteMovies, setFavoriteMovies] = useState(profile.favoriteMovies || "");
  const [favoriteMusic, setFavoriteMusic] = useState(profile.favoriteMusic || "");
  const [admiredValues, setAdmiredValues] = useState(profile.admiredValues || "");

  // Other
  const [foodAllergies, setFoodAllergies] = useState(profile.foodAllergies || "");
  const initPets = profile.hasPets || "";
  const initPetsSelect = initPets.startsWith("outra: ") ? "outra" : initPets;
  const initPetsDesc = initPets.startsWith("outra: ") ? initPets.slice(7) : "";
  const [hasPetsSelect, setHasPetsSelect] = useState(initPetsSelect);
  const [hasPetsDescription, setHasPetsDescription] = useState(initPetsDesc);
  const [participateInVideos, setParticipateInVideos] = useState(profile.participateInVideos ?? false);

  const resetForm = () => {
    setHobbies(profile.hobbies || []);
    const sn = (profile.socialNetworks && typeof profile.socialNetworks === "object")
      ? (profile.socialNetworks as Record<string, string>) : {};
    setSelectedNetworks(Object.keys(sn).filter(k => sn[k]));
    setNetworkHandles({ ...sn });
    setFavoriteBookMovieGenres(profile.favoriteBookMovieGenres || "");
    setFavoriteBooks(profile.favoriteBooks || "");
    setFavoriteMovies(profile.favoriteMovies || "");
    setFavoriteMusic(profile.favoriteMusic || "");
    setAdmiredValues(profile.admiredValues || "");
    setFoodAllergies(profile.foodAllergies || "");
    const p = profile.hasPets || "";
    setHasPetsSelect(p.startsWith("outra: ") ? "outra" : p);
    setHasPetsDescription(p.startsWith("outra: ") ? p.slice(7) : "");
    setParticipateInVideos(profile.participateInVideos ?? false);
  };

  const toggleHobby = (hobby: string) => {
    setHobbies(prev => prev.includes(hobby) ? prev.filter(h => h !== hobby) : [...prev, hobby]);
  };

  const toggleNetwork = (network: string) => {
    if (selectedNetworks.includes(network)) {
      setSelectedNetworks(prev => prev.filter(n => n !== network));
      setNetworkHandles(prev => { const next = { ...prev }; delete next[network]; return next; });
    } else {
      setSelectedNetworks(prev => [...prev, network]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    const petsValue = hasPetsSelect === "outra" && hasPetsDescription.trim()
      ? `outra: ${hasPetsDescription.trim()}`
      : hasPetsSelect || null;

    const socialNetworksObj: Record<string, string> = {};
    for (const net of selectedNetworks) {
      socialNetworksObj[net] = networkHandles[net] || "";
    }

    const result = await updateEmployeeProfile(profile.id, {
      hobbies,
      socialNetworks: Object.keys(socialNetworksObj).length > 0 ? socialNetworksObj : undefined,
      favoriteBookMovieGenres: favoriteBookMovieGenres || null,
      favoriteBooks: favoriteBooks || null,
      favoriteMovies: favoriteMovies || null,
      favoriteMusic: favoriteMusic || null,
      admiredValues: admiredValues || null,
      foodAllergies: foodAllergies || null,
      hasPets: petsValue,
      participateInVideos,
    });

    if (result.success) {
      setMessage({ type: "success", text: "Dados atualizados com sucesso" });
      router.refresh();
      setEditing(false);
    } else {
      setMessage({ type: "error", text: result.error || "Erro ao salvar" });
    }
    setSaving(false);
  };

  // Read-only display helpers
  const socialEntries = Object.entries(initSocial).filter(([, handle]) => handle);
  let petsDisplay = "—";
  if (profile.hasPets) {
    if (profile.hasPets.startsWith("outra: ")) {
      petsDisplay = `Outra: ${profile.hasPets.slice(7)}`;
    } else {
      petsDisplay = PETS_LABELS[profile.hasPets] || profile.hasPets;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Edit/Save/Cancel */}
      <div className={sectionClass}>
        <TabHeader title="Sobre Mim" editing={editing} saving={saving}
          onEdit={() => { setMessage(null); setEditing(true); }}
          onSave={handleSave}
          onCancel={() => { resetForm(); setMessage(null); setEditing(false); }}
        />
        <MessageBanner message={message} />

        {!editing ? (
          <>
            {/* Hobbies */}
            <div className="mb-6">
              <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Hobbies</h4>
              {profile.hobbies.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.hobbies.map((hobby) => (
                    <span key={hobby} className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      {hobby}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum hobby informado.</p>
              )}
            </div>

            {/* Social Networks */}
            <div className="mb-6">
              <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Redes Sociais</h4>
              {socialEntries.length > 0 ? (
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {socialEntries.map(([network, handle]) => (
                    <ReadField key={network} label={network} value={handle} />
                  ))}
                </dl>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma rede social informada.</p>
              )}
            </div>

            {/* Favorites */}
            <div className="mb-6">
              <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Favoritos e Preferências</h4>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ReadField label="Gênero de livros/filmes que curte" value={profile.favoriteBookMovieGenres || "—"} />
                <ReadField label="Livro(s) Favorito(s)" value={profile.favoriteBooks || "—"} />
                <ReadField label="Filme(s) Favorito(s)" value={profile.favoriteMovies || "—"} />
                <ReadField label="Música/Banda Favorita" value={profile.favoriteMusic || "—"} />
                <ReadField label="Valores que Admira" value={profile.admiredValues || "—"} />
              </dl>
            </div>

            {/* Other */}
            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Outros</h4>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <ReadField label="Alergias/Intolerâncias Alimentares" value={profile.foodAllergies || "—"} />
                <ReadField label="Animais de Estimação" value={petsDisplay} />
                <ReadField label="Participação em Vídeos Institucionais" value={boolLabel(profile.participateInVideos)} />
              </dl>
            </div>
          </>
        ) : (
          <>
            {/* Hobbies - multi-select checkboxes */}
            <div className="mb-6">
              <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Hobbies</h4>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {HOBBY_OPTIONS.map(hobby => (
                  <label key={hobby} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input type="checkbox" checked={hobbies.includes(hobby)} onChange={() => toggleHobby(hobby)} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                    {hobby}
                  </label>
                ))}
              </div>
            </div>

            {/* Social Networks - multi-select + handles */}
            <div className="mb-6">
              <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Redes Sociais</h4>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {SOCIAL_NETWORK_OPTIONS.map(net => (
                  <label key={net} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input type="checkbox" checked={selectedNetworks.includes(net)} onChange={() => toggleNetwork(net)} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                    {net}
                  </label>
                ))}
              </div>
              {selectedNetworks.length > 0 && (
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {selectedNetworks.map(net => (
                    <div key={net}>
                      <label className={labelClass}>{net} (perfil/handle)</label>
                      <input
                        type="text"
                        value={networkHandles[net] || ""}
                        onChange={e => setNetworkHandles(prev => ({ ...prev, [net]: e.target.value }))}
                        placeholder={`@seu_${net.toLowerCase()}`}
                        className={inputClass}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Favorites */}
            <div className="mb-6">
              <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Favoritos e Preferências</h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Gênero de livros/filmes que curte</label>
                  <input type="text" value={favoriteBookMovieGenres} onChange={e => setFavoriteBookMovieGenres(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Livro(s) Favorito(s)</label>
                  <input type="text" value={favoriteBooks} onChange={e => setFavoriteBooks(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Filme(s) Favorito(s)</label>
                  <input type="text" value={favoriteMovies} onChange={e => setFavoriteMovies(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Música/Banda Favorita</label>
                  <input type="text" value={favoriteMusic} onChange={e => setFavoriteMusic(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Valores que Admira</label>
                  <input type="text" value={admiredValues} onChange={e => setAdmiredValues(e.target.value)} className={inputClass} />
                </div>
              </div>
            </div>

            {/* Other */}
            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Outros</h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Alergias/Intolerâncias Alimentares <span className="font-normal text-gray-400">(opcional)</span></label>
                  <input type="text" value={foodAllergies} onChange={e => setFoodAllergies(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Animais de Estimação</label>
                  <select value={hasPetsSelect} onChange={e => setHasPetsSelect(e.target.value)} className={selectClass}>
                    {PETS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  {hasPetsSelect === "outra" && (
                    <input type="text" value={hasPetsDescription} onChange={e => setHasPetsDescription(e.target.value)} placeholder="Descreva..." className={`${inputClass} mt-2`} />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={participateInVideos} onChange={e => setParticipateInVideos(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Participação em Vídeos Institucionais</label>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
