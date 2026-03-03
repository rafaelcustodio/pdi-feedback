"use client";

import { useState } from "react";
import type { MyFullProfile } from "@/app/(dashboard)/perfil/actions";

// Enum label maps — same as employee-form.tsx
const GENDER_LABELS: Record<string, string> = {
  masculino: "Masculino",
  feminino: "Feminino",
  outra: "Outra",
};
const ETHNICITY_LABELS: Record<string, string> = {
  branco: "Branco",
  preto: "Preto",
  amarelo: "Amarelo",
  indigena: "Indígena",
  pardo: "Pardo",
};
const MARITAL_STATUS_LABELS: Record<string, string> = {
  solteiro: "Solteiro(a)",
  casado: "Casado(a)",
  outra: "Outra",
};
const EDUCATION_LEVEL_LABELS: Record<string, string> = {
  ensino_medio: "Ensino Médio",
  ensino_tecnico: "Ensino Técnico",
  superior_incompleto: "Superior Incompleto",
  superior_completo: "Superior Completo",
  pos_graduado: "Pós-Graduado",
};
const BANK_ACCOUNT_LABELS: Record<string, string> = {
  sim: "Sim",
  nao: "Não",
  outra: "Outra",
};
const HEALTH_PLAN_LABELS: Record<string, string> = {
  regional: "Regional",
  nacional: "Nacional",
  nao: "Não",
};
const CONTRACT_TYPE_LABELS: Record<string, string> = {
  efetivo: "Efetivo",
  estagio: "Estágio",
};
const SHIRT_SIZE_LABELS: Record<string, string> = {
  p_fem: "P Feminino",
  m_fem: "M Feminino",
  g_fem: "G Feminino",
  gg_fem: "GG Feminino",
  xg_fem: "XG Feminino",
  p_masc: "P Masculino",
  m_masc: "M Masculino",
  g_masc: "G Masculino",
  gg_masc: "GG Masculino",
  xg_masc: "XG Masculino",
};
const PETS_LABELS: Record<string, string> = {
  nao: "Não",
  sim_cachorros: "Sim, cachorros",
  sim_gatos: "Sim, gatos",
};

const TAB_LABELS = [
  "Dados Pessoais",
  "Endereço e Contato",
  "Financeiro e Benefícios",
  "Família e Dependentes",
  "Sobre Mim",
];

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function calculateAge(birthDate: Date | string | null): string {
  if (!birthDate) return "—";
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getUTCFullYear();
  const monthDiff = today.getMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getUTCDate())) {
    age--;
  }
  return `${age} anos`;
}

function label(map: Record<string, string>, value: string | null): string {
  if (!value) return "—";
  return map[value] || value;
}

function boolLabel(value: boolean | null): string {
  if (value === null || value === undefined) return "—";
  return value ? "Sim" : "Não";
}

const sectionClass = "rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800";
const fieldLabelClass = "text-sm font-medium text-gray-500 dark:text-gray-400";
const fieldValueClass = "mt-1 text-sm text-gray-900 dark:text-gray-100";

function Field({ label: lbl, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className={fieldLabelClass}>{lbl}</dt>
      <dd className={fieldValueClass}>{value || "—"}</dd>
    </div>
  );
}

export function PerfilData({ profile }: { profile: MyFullProfile }) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div>
      {/* Tab navigation */}
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

      {/* Tab content */}
      <div className="mt-6">
        {activeTab === 0 && <TabDadosPessoais profile={profile} />}
        {activeTab === 1 && <TabEnderecoContato profile={profile} />}
        {activeTab === 2 && <TabFinanceiroBeneficios profile={profile} />}
        {activeTab === 3 && <TabFamiliaDependentes profile={profile} />}
        {activeTab === 4 && <TabSobreMim profile={profile} />}
      </div>
    </div>
  );
}

function TabDadosPessoais({ profile }: { profile: MyFullProfile }) {
  return (
    <div className={sectionClass}>
      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
        Dados Pessoais
      </h3>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Nome Completo" value={profile.name} />
        <Field label="Data de Nascimento" value={formatDate(profile.birthDate)} />
        <Field label="Idade" value={calculateAge(profile.birthDate)} />
        <Field label="Gênero" value={label(GENDER_LABELS, profile.gender)} />
        <Field label="Etnia" value={label(ETHNICITY_LABELS, profile.ethnicity)} />
        <Field label="Estado Civil" value={label(MARITAL_STATUS_LABELS, profile.maritalStatus)} />
        <Field label="CPF" value={profile.cpf || "—"} />
        <Field label="RG" value={profile.rg || "—"} />
        <Field label="Nível de Escolaridade" value={label(EDUCATION_LEVEL_LABELS, profile.educationLevel)} />
        <Field label="Com quem mora" value={profile.livesWithDescription || "—"} />
      </dl>
    </div>
  );
}

function TabEnderecoContato({ profile }: { profile: MyFullProfile }) {
  const fullAddress = [
    profile.address,
    profile.addressNumber ? `nº ${profile.addressNumber}` : null,
    profile.addressComplement,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className={sectionClass}>
      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
        Endereço e Contato
      </h3>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Endereço" value={fullAddress || "—"} />
        <Field label="CEP" value={profile.zipCode || "—"} />
        <Field label="Cidade" value={profile.city || "—"} />
        <Field label="Estado (UF)" value={profile.state || "—"} />
        <Field label="Email Pessoal" value={profile.personalEmail || "—"} />
        <Field label="Telefone" value={profile.phone || "—"} />
      </dl>
    </div>
  );
}

function TabFinanceiroBeneficios({ profile }: { profile: MyFullProfile }) {
  return (
    <div className={sectionClass}>
      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
        Financeiro e Benefícios
      </h3>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Conta Bradesco" value={label(BANK_ACCOUNT_LABELS, profile.hasBradescoAccount)} />
        {profile.hasBradescoAccount === "sim" && (
          <>
            <Field label="Agência" value={profile.bankAgency || "—"} />
            <Field label="Conta" value={profile.bankAccount || "—"} />
          </>
        )}
        <Field label="Outro Emprego Registrado" value={boolLabel(profile.hasOtherEmployment)} />
        <Field label="Plano de Saúde Unimed" value={label(HEALTH_PLAN_LABELS, profile.healthPlanOption)} />
        <Field label="Vale Transporte" value={boolLabel(profile.wantsTransportVoucher)} />
        <Field label="Formato de Contratação" value={label(CONTRACT_TYPE_LABELS, profile.contractType)} />
        <Field label="Tamanho Camiseta" value={label(SHIRT_SIZE_LABELS, profile.shirtSize)} />
      </dl>
    </div>
  );
}

function TabFamiliaDependentes({ profile }: { profile: MyFullProfile }) {
  return (
    <div className="space-y-6">
      {/* Children */}
      <div className={sectionClass}>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Filhos
        </h3>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Possui Filhos" value={boolLabel(profile.hasChildren)} />
          {profile.hasChildren && (
            <Field label="Idades dos Filhos" value={profile.childrenAges || "—"} />
          )}
        </dl>
      </div>

      {/* IR Dependents */}
      <div className={sectionClass}>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Dependentes IR
        </h3>
        <Field label="Possui Dependentes IR" value={boolLabel(profile.hasIRDependents)} />
        {profile.dependents.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
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
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Nenhum dependente cadastrado.</p>
        )}
      </div>

      {/* Emergency Contacts */}
      <div className={sectionClass}>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Contatos de Emergência
        </h3>
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

function TabSobreMim({ profile }: { profile: MyFullProfile }) {
  const socialNetworks = (profile.socialNetworks && typeof profile.socialNetworks === "object")
    ? (profile.socialNetworks as Record<string, string>)
    : {};
  const socialEntries = Object.entries(socialNetworks).filter(([, handle]) => handle);

  // Parse hasPets
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
      {/* Hobbies */}
      <div className={sectionClass}>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Hobbies
        </h3>
        {profile.hobbies.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {profile.hobbies.map((hobby) => (
              <span
                key={hobby}
                className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
              >
                {hobby}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum hobby informado.</p>
        )}
      </div>

      {/* Social Networks */}
      <div className={sectionClass}>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Redes Sociais
        </h3>
        {socialEntries.length > 0 ? (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {socialEntries.map(([network, handle]) => (
              <Field key={network} label={network} value={handle} />
            ))}
          </dl>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma rede social informada.</p>
        )}
      </div>

      {/* Favorites */}
      <div className={sectionClass}>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Favoritos e Preferências
        </h3>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Gênero de livros/filmes que curte" value={profile.favoriteBookMovieGenres || "—"} />
          <Field label="Livro(s) Favorito(s)" value={profile.favoriteBooks || "—"} />
          <Field label="Filme(s) Favorito(s)" value={profile.favoriteMovies || "—"} />
          <Field label="Música/Banda Favorita" value={profile.favoriteMusic || "—"} />
          <Field label="Valores que Admira" value={profile.admiredValues || "—"} />
        </dl>
      </div>

      {/* Other */}
      <div className={sectionClass}>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Outros
        </h3>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Alergias/Intolerâncias Alimentares" value={profile.foodAllergies || "—"} />
          <Field label="Animais de Estimação" value={petsDisplay} />
          <Field label="Participação em Vídeos Institucionais" value={boolLabel(profile.participateInVideos)} />
        </dl>
      </div>
    </div>
  );
}
