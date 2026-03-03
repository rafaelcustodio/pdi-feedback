import * as XLSX from "xlsx";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Raw row parsed from the Forms Excel file (question title → answer string). */
export type FormsRow = Record<string, string>;

/** Employee data structure matching the createEmployee server action input. */
export type EmployeeFormData = {
  name?: string;
  email?: string;
  birthDate?: string;
  ethnicity?: string;
  gender?: string;
  cpf?: string;
  rg?: string;
  maritalStatus?: string;
  educationLevel?: string;
  livesWithDescription?: string;
  hasChildren?: boolean;
  childrenAges?: string;
  hasBradescoAccount?: string;
  bankAgency?: string;
  bankAccount?: string;
  hasOtherEmployment?: boolean;
  hasIRDependents?: boolean;
  shirtSize?: string;
  address?: string;
  addressNumber?: string;
  addressComplement?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  personalEmail?: string;
  phone?: string;
  foodAllergies?: string;
  contractType?: string;
  healthPlanOption?: string;
  wantsTransportVoucher?: boolean;
  hobbies?: string[];
  socialNetworks?: Record<string, string>;
  favoriteBookMovieGenres?: string;
  favoriteBooks?: string;
  favoriteMovies?: string;
  favoriteMusic?: string;
  admiredValues?: string;
  hasPets?: string;
  participateInVideos?: boolean;
  // Parsed from Forms but stored as related models (not direct User fields)
  dependentInfo?: string;
  emergencyContactInfo?: string;
};

// ---------------------------------------------------------------------------
// Mapping: Forms question title → system field(s)
// ---------------------------------------------------------------------------

/**
 * Maps Microsoft Forms question titles (from the "Talento I Narwal" form)
 * to system field names. Some questions map to composite logic handled in
 * mapFormsRowToEmployee rather than a single field.
 *
 * Questions ignored:
 * - Q1 (consentimento LGPD)
 * - Q5 (idade — calculated from birthDate)
 * - Q10 (iniciando na Narwal)
 * - Q13 (Grupo Becomex)
 */
export const FORMS_FIELD_MAPPING: Record<string, string> = {
  // Nome completo
  "Nome Completo": "name",
  // Data de nascimento
  "Data de Nascimento": "birthDate",
  // Etnia
  "Auto Declaração de Etnia": "ethnicity",
  // Gênero
  "Gênero": "gender",
  // CPF
  "CPF": "cpf",
  // RG
  "RG": "rg",
  // Estado civil
  "Estado Civil:": "maritalStatus",
  // Possui filhos
  "Possui filhos? Qual a idade deles?": "hasChildren",
  // Idades dos filhos
  "Se sim, por favor indique a idade dos seus filhos": "childrenAges",
  // Conta Bradesco
  "Você possui conta corrente no banco Bradesco?": "hasBradescoAccount",
  // Agência/Conta
  "Se sim, nos informa agencia e conta.": "bankAgencyAccount",
  // Outro emprego
  "Você Possui outro emprego registrado?": "hasOtherEmployment",
  // Dependentes IR
  "Você possui dependentes para declaração de imposto de renda?": "hasIRDependents",
  // Info dependentes
  "Se sim, informe o nome e grau de parentesco:": "dependentInfo",
  // Tamanho camiseta
  "Qual o seu número de camiseta?": "shirtSize",
  // Endereço
  "Endereço (Estado, Rua, Número e CEP)": "addressFull",
  // Cidade/Estado
  "Cidade/Estado": "cityState",
  // Email pessoal
  "E-mail pessoal": "personalEmail",
  // Telefone
  "Informe seu (DDD +telefone) para contato": "phone",
  // Contato de emergência
  "Informe nome e contato para casos de emergência": "emergencyContactInfo",
  // Alergias
  "Você possui alguma alergia ou intolerância alimentar? Se sim, qual?": "foodAllergies",
  // Nível escolaridade
  "Nível de Escolaridade": "educationLevel",
  // Com quem mora
  "Com quem mora": "livesWithDescription",
  // Pets
  "Tem animais de estimação": "hasPets",
  // Formato contratação
  "Qual seu formato de contratação?": "contractType",
  // Plano de saúde
  "Possui interesse em nosso plano de saúde Unimed?": "healthPlanOption",
  // Vale transporte
  "Possui interesse em nosso vale transporte?": "wantsTransportVoucher",
  // Hobbies
  "Nos conte quais seus hobbies preferidos": "hobbies",
  // Redes sociais
  "Redes Sociais que utiliza": "socialNetworks",
  // Gênero livros/filmes
  "Gênero de livros e filmes que curte": "favoriteBookMovieGenres",
  // Livros favoritos
  "Livro(s) Favorito(s)": "favoriteBooks",
  // Filmes favoritos
  "Filme(s) Favorito(s)": "favoriteMovies",
  // Música favorita
  "Música ou Banda(s) Favorito(s)": "favoriteMusic",
  // Valores que admira
  "Valores que admira": "admiredValues",
  // Participação em vídeos
  "Nas ações internas que ocorrerem na Narwal, você gostaria de participar das gravações de vídeos institucionais?": "participateInVideos",
};

// ---------------------------------------------------------------------------
// Enum conversion maps: Forms label → Prisma enum value
// ---------------------------------------------------------------------------

const ETHNICITY_MAP: Record<string, string> = {
  branco: "branco",
  branca: "branco",
  preto: "preto",
  preta: "preto",
  amarelo: "amarelo",
  amarela: "amarelo",
  "indígena": "indigena",
  indigena: "indigena",
  pardo: "pardo",
  parda: "pardo",
};

const GENDER_MAP: Record<string, string> = {
  masculino: "masculino",
  feminino: "feminino",
  outra: "outra",
  outro: "outra",
};

const MARITAL_STATUS_MAP: Record<string, string> = {
  "solteiro": "solteiro",
  "solteira": "solteiro",
  "casado": "casado",
  "casada": "casado",
  "outra": "outra",
  "outro": "outra",
  "divorciado": "outra",
  "divorciada": "outra",
  "viúvo": "outra",
  "viúva": "outra",
  "união estável": "outra",
};

const EDUCATION_LEVEL_MAP: Record<string, string> = {
  "ensino médio": "ensino_medio",
  "ensino medio": "ensino_medio",
  "ensino técnico": "ensino_tecnico",
  "ensino tecnico": "ensino_tecnico",
  "superior incompleto": "superior_incompleto",
  "superior completo": "superior_completo",
  "pós-graduação": "pos_graduado",
  "pos-graduação": "pos_graduado",
  "pós-graduado": "pos_graduado",
  "pos graduado": "pos_graduado",
  "pós graduação": "pos_graduado",
  "mestrado": "pos_graduado",
  "doutorado": "pos_graduado",
};

const CONTRACT_TYPE_MAP: Record<string, string> = {
  efetivo: "efetivo",
  "estágio": "estagio",
  estagio: "estagio",
};

const HEALTH_PLAN_MAP: Record<string, string> = {
  "sim, modalidade regional": "regional",
  regional: "regional",
  "sim, modalidade nacional": "nacional",
  nacional: "nacional",
  "não": "nao",
  nao: "nao",
};

const SHIRT_SIZE_MAP: Record<string, string> = {
  "p feminino": "p_fem",
  "m feminino": "m_fem",
  "g feminino": "g_fem",
  "gg feminino": "gg_fem",
  "xg feminino": "xg_fem",
  "p masculino": "p_masc",
  "m masculino": "m_masc",
  "g masculino": "g_masc",
  "gg masculino": "gg_masc",
  "xg masculino": "xg_masc",
  // Short forms
  "p fem": "p_fem",
  "m fem": "m_fem",
  "g fem": "g_fem",
  "gg fem": "gg_fem",
  "xg fem": "xg_fem",
  "p masc": "p_masc",
  "m masc": "m_masc",
  "g masc": "g_masc",
  "gg masc": "gg_masc",
  "xg masc": "xg_masc",
};

const BANK_ACCOUNT_MAP: Record<string, string> = {
  sim: "sim",
  "não": "nao",
  nao: "nao",
  outra: "outra",
  outro: "outra",
};

// ---------------------------------------------------------------------------
// Hobbies mapping: Forms labels → system hobby labels
// ---------------------------------------------------------------------------

const HOBBY_MAP: Record<string, string> = {
  games: "Games",
  leitura: "Leitura",
  cinema: "Cinema",
  "música": "Música",
  musica: "Música",
  "pintura/desenho": "Pintura/Desenho",
  pintura: "Pintura/Desenho",
  desenho: "Pintura/Desenho",
  escrita: "Escrita",
  esporte: "Esporte",
  canto: "Canto",
  "instrumentos musicais": "Instrumentos Musicais",
  viagens: "Viagens",
  "voluntariado": "Voluntariado",
  "dança": "Dança",
  danca: "Dança",
  jardinagem: "Jardinagem",
  teatro: "Teatro",
  pescaria: "Pescaria",
  artesanato: "Artesanato",
  skate: "Skate",
  outra: "Outra",
};

// ---------------------------------------------------------------------------
// Social networks mapping
// ---------------------------------------------------------------------------

const SOCIAL_NETWORK_NAMES: Record<string, string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
  twitter: "Twitter",
  facebook: "Facebook",
  tiktok: "TikTok",
  outra: "Outra",
};

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

function normalizeStr(s: string): string {
  return s.trim().toLowerCase();
}

function parseBooleanPtBr(value: string): boolean | undefined {
  const v = normalizeStr(value);
  if (v === "sim" || v === "yes" || v === "true" || v === "1") return true;
  if (v === "não" || v === "nao" || v === "no" || v === "false" || v === "0")
    return false;
  return undefined;
}

function parseMultiSelect(value: string): string[] {
  return value
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

function mapEnum(
  value: string,
  enumMap: Record<string, string>
): string | undefined {
  const normalized = normalizeStr(value);
  return enumMap[normalized];
}

/**
 * Try to parse a date from various formats the Forms export might use.
 * Returns ISO date string (YYYY-MM-DD) or undefined.
 */
function parseDate(value: string): string | undefined {
  if (!value?.trim()) return undefined;

  // If it's a number (Excel serial date), convert it
  const num = Number(value);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    // Excel serial date
    const date = new Date((num - 25569) * 86400 * 1000);
    return date.toISOString().split("T")[0];
  }

  // Try D/M/YYYY or DD/MM/YYYY — detect format by checking if "day" > 12 (then it's M/D/YYYY from Forms US locale)
  const brMatch = value.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (brMatch) {
    const [, first, second, year] = brMatch;
    const firstNum = parseInt(first);
    const secondNum = parseInt(second);
    // If second part > 12, it must be DD (day), so format is M/DD/YYYY (US Forms export)
    if (secondNum > 12) {
      return `${year}-${first.padStart(2, "0")}-${second.padStart(2, "0")}`;
    }
    // Otherwise assume DD/MM/YYYY (Brazilian)
    return `${year}-${second.padStart(2, "0")}-${first.padStart(2, "0")}`;
  }

  // Try YYYY-MM-DD (ISO)
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return isoMatch[0];
  }

  // Fallback to native Date parsing
  const d = new Date(value);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split("T")[0];
  }

  return undefined;
}

/**
 * Parse address string into parts.
 * Expected formats: "Rua X, 123, Apto 1, 12345-678" or similar.
 */
function parseAddress(value: string): {
  address?: string;
  addressNumber?: string;
  addressComplement?: string;
  zipCode?: string;
} {
  const result: {
    address?: string;
    addressNumber?: string;
    addressComplement?: string;
    zipCode?: string;
  } = {};

  // Extract CEP (Brazilian ZIP) — 5 digits, optional dash, 3 digits
  const cepMatch = value.match(/(\d{5})-?(\d{3})/);
  if (cepMatch) {
    result.zipCode = `${cepMatch[1]}-${cepMatch[2]}`;
  }

  // Remove CEP from the string for further parsing
  const withoutCep = value.replace(/\d{5}-?\d{3}/, "").trim();

  // Split by commas
  const parts = withoutCep
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length >= 1) {
    result.address = parts[0];
  }
  if (parts.length >= 2) {
    // Check if second part is a number
    const numMatch = parts[1].match(/^\d+\w?$/);
    if (numMatch) {
      result.addressNumber = parts[1];
    } else {
      result.addressNumber = parts[1];
    }
  }
  if (parts.length >= 3) {
    result.addressComplement = parts[2];
  }

  return result;
}

/**
 * Parse "Cidade/Estado" or "Cidade - UF" strings.
 */
function parseCityState(value: string): {
  city?: string;
  state?: string;
} {
  // Try "City - UF" or "City / UF" or "City, UF"
  const match = value.match(/^(.+?)\s*[-/,]\s*([A-Za-z]{2})$/);
  if (match) {
    return { city: match[1].trim(), state: match[2].trim().toUpperCase() };
  }
  // Fallback: whole value as city
  return { city: value.trim() };
}

/**
 * Parse "Agência e conta bancária" — expected format: "Ag 1234 / CC 56789" or "1234/56789".
 */
function parseBankInfo(value: string): {
  bankAgency?: string;
  bankAccount?: string;
} {
  // Try patterns like "Ag 1234 / CC 56789", "1234/56789", "Ag: 1234 Conta: 56789"
  const match = value.match(
    /(?:ag[êe]?ncia|ag\.?)\s*:?\s*([\d-]+)\s*[/,;]\s*(?:conta|cc|c\.?c\.?)\s*:?\s*([\d-]+)/i
  );
  if (match) {
    return { bankAgency: match[1].trim(), bankAccount: match[2].trim() };
  }

  // Simple two-part split
  const parts = value
    .split(/[/,;]/)
    .map((p) => p.replace(/\D/g, "").trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return { bankAgency: parts[0], bankAccount: parts[1] };
  }

  return {};
}

// ---------------------------------------------------------------------------
// Parse Excel
// ---------------------------------------------------------------------------

/**
 * Parse a Microsoft Forms Excel export (.xlsx) and return an array of row objects.
 * Each row maps the Forms question title to the answer text.
 *
 * This function runs client-side in the browser.
 */
export async function parseFormsExcel(file: File): Promise<FormsRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<FormsRow>(firstSheet, {
    defval: "",
    raw: false,
  });
  return rows;
}

// ---------------------------------------------------------------------------
// Map Forms Row → Employee Data
// ---------------------------------------------------------------------------

/**
 * Convert a single parsed Forms row into employee form data that can
 * pre-fill the employee registration form.
 */
export function mapFormsRowToEmployee(
  row: FormsRow
): Partial<EmployeeFormData> {
  const result: Partial<EmployeeFormData> = {};

  for (const [questionTitle, answer] of Object.entries(row)) {
    if (!answer?.trim()) continue;

    // Normalize the column name: trim whitespace and remove \r\n before lookup
    const normalizedTitle = questionTitle.replace(/[\r\n]+/g, "").trim();
    const fieldKey = FORMS_FIELD_MAPPING[normalizedTitle];
    if (!fieldKey) continue;

    const value = answer.trim();

    switch (fieldKey) {
      case "name":
        result.name = value;
        break;

      case "birthDate":
        result.birthDate = parseDate(value);
        break;

      case "ethnicity":
        result.ethnicity = mapEnum(value, ETHNICITY_MAP);
        break;

      case "gender":
        result.gender = mapEnum(value, GENDER_MAP);
        break;

      case "cpf":
        // Remove formatting, keep only digits
        result.cpf = value.replace(/\D/g, "");
        break;

      case "rg":
        result.rg = value;
        break;

      case "maritalStatus":
        result.maritalStatus = mapEnum(value, MARITAL_STATUS_MAP);
        break;

      case "hasChildren":
        result.hasChildren = parseBooleanPtBr(value);
        break;

      case "childrenAges":
        result.childrenAges = value;
        break;

      case "hasBradescoAccount":
        result.hasBradescoAccount = mapEnum(value, BANK_ACCOUNT_MAP);
        break;

      case "bankAgencyAccount": {
        const bank = parseBankInfo(value);
        result.bankAgency = bank.bankAgency;
        result.bankAccount = bank.bankAccount;
        break;
      }

      case "hasOtherEmployment":
        result.hasOtherEmployment = parseBooleanPtBr(value);
        break;

      case "hasIRDependents":
        result.hasIRDependents = parseBooleanPtBr(value);
        break;

      case "dependentInfo":
        result.dependentInfo = value;
        break;

      case "shirtSize":
        result.shirtSize = mapEnum(value, SHIRT_SIZE_MAP);
        break;

      case "addressFull": {
        const addr = parseAddress(value);
        result.address = addr.address;
        result.addressNumber = addr.addressNumber;
        result.addressComplement = addr.addressComplement;
        if (addr.zipCode) result.zipCode = addr.zipCode;
        break;
      }

      case "cityState": {
        const cs = parseCityState(value);
        result.city = cs.city;
        result.state = cs.state;
        break;
      }

      case "personalEmail":
        result.personalEmail = value;
        break;

      case "phone":
        result.phone = value.replace(/\D/g, "");
        break;

      case "emergencyContactInfo":
        result.emergencyContactInfo = value;
        break;

      case "foodAllergies":
        result.foodAllergies = value;
        break;

      case "educationLevel":
        result.educationLevel = mapEnum(value, EDUCATION_LEVEL_MAP);
        break;

      case "livesWithDescription":
        result.livesWithDescription = value;
        break;

      case "hasPets": {
        const lower = normalizeStr(value);
        if (lower === "não" || lower === "nao") {
          result.hasPets = "não";
        } else if (lower.includes("cachorro")) {
          result.hasPets = "sim cachorros";
        } else if (lower.includes("gato")) {
          result.hasPets = "sim gatos";
        } else if (lower === "sim") {
          result.hasPets = "sim cachorros";
        } else {
          result.hasPets = `outra: ${value}`;
        }
        break;
      }

      case "contractType":
        result.contractType = mapEnum(value, CONTRACT_TYPE_MAP);
        break;

      case "healthPlanOption":
        result.healthPlanOption = mapEnum(value, HEALTH_PLAN_MAP);
        break;

      case "wantsTransportVoucher":
        result.wantsTransportVoucher = parseBooleanPtBr(value);
        break;

      case "hobbies": {
        const items = parseMultiSelect(value);
        result.hobbies = items
          .map((h) => HOBBY_MAP[normalizeStr(h)] ?? h)
          .filter(Boolean);
        break;
      }

      case "socialNetworks": {
        const items = parseMultiSelect(value);
        const networks: Record<string, string> = {};
        for (const item of items) {
          const name =
            SOCIAL_NETWORK_NAMES[normalizeStr(item)] ?? item;
          networks[name] = "";
        }
        result.socialNetworks = networks;
        break;
      }

      case "favoriteBookMovieGenres":
        result.favoriteBookMovieGenres = value;
        break;

      case "favoriteBooks":
        result.favoriteBooks = value;
        break;

      case "favoriteMovies":
        result.favoriteMovies = value;
        break;

      case "favoriteMusic":
        result.favoriteMusic = value;
        break;

      case "admiredValues":
        result.admiredValues = value;
        break;

      case "participateInVideos":
        result.participateInVideos = parseBooleanPtBr(value);
        break;
    }
  }

  return result;
}
