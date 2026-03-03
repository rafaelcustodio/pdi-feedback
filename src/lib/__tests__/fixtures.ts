// Static fixtures and helper factories for access-control tests.
// No Prisma imports, no network calls, no vi.mock.

// ── User Fixtures ──────────────────────────────────────────────

type UserFixture = {
  id: string;
  name: string;
  email: string;
  password: string | null;
  role: "admin" | "manager" | "employee";
  evaluationMode: "feedback" | "pdi";
  avatarUrl: string | null;
  ssoProvider: string | null;
  ssoId: string | null;
  msAccessToken: string | null;
  msRefreshToken: string | null;
  msTokenExpiresAt: Date | null;
  isActive: boolean;
  admissionDate: Date | null;
  phone: string | null;
  cpf: string | null;
  birthDate: Date | null;
  jobTitle: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const BASE_DATE = new Date("2025-01-01T00:00:00Z");

function makeUser(
  overrides: Pick<UserFixture, "id" | "role"> & Partial<UserFixture>
): UserFixture {
  return {
    name: overrides.id,
    email: `${overrides.id}@test.com`,
    password: null,
    evaluationMode: "feedback",
    avatarUrl: null,
    ssoProvider: null,
    ssoId: null,
    msAccessToken: null,
    msRefreshToken: null,
    msTokenExpiresAt: null,
    isActive: true,
    admissionDate: null,
    phone: null,
    cpf: null,
    birthDate: null,
    jobTitle: null,
    address: null,
    city: null,
    state: null,
    zipCode: null,
    createdAt: BASE_DATE,
    updatedAt: BASE_DATE,
    ...overrides,
  };
}

export const ADMIN = makeUser({ id: "admin-1", role: "admin" });
export const MANAGER_A = makeUser({ id: "mgr-a", role: "manager" });
export const COORD_A = makeUser({ id: "coord-a", role: "manager" });
export const EMP_A1 = makeUser({ id: "emp-a1", role: "employee" });
export const EMP_A2 = makeUser({ id: "emp-a2", role: "employee" });
export const MANAGER_B = makeUser({ id: "mgr-b", role: "manager" });
export const EMP_B1 = makeUser({ id: "emp-b1", role: "employee" });

// ── Hierarchy Fixtures ─────────────────────────────────────────

export const MOCK_HIERARCHIES = [
  { employeeId: "mgr-a", managerId: "admin-1", endDate: null },
  { employeeId: "coord-a", managerId: "mgr-a", endDate: null },
  { employeeId: "emp-a1", managerId: "coord-a", endDate: null },
  { employeeId: "emp-a2", managerId: "coord-a", endDate: null },
  { employeeId: "mgr-b", managerId: "admin-1", endDate: null },
  { employeeId: "emp-b1", managerId: "mgr-b", endDate: null },
];

// ── Session Helper ─────────────────────────────────────────────

export function mockSession(user: UserFixture) {
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      image: user.avatarUrl,
      evaluationMode: user.evaluationMode,
    },
  };
}

// ── PDI Factory ────────────────────────────────────────────────

type PDIFixture = {
  id: string;
  employeeId: string;
  managerId: string;
  status: "active" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
};

export function mockPDI(overrides?: Partial<PDIFixture>): PDIFixture {
  return {
    id: "pdi-1",
    employeeId: "emp-a1",
    managerId: "mgr-a",
    status: "active",
    createdAt: BASE_DATE,
    updatedAt: BASE_DATE,
    ...overrides,
  };
}

// ── Feedback Factory ───────────────────────────────────────────

type FeedbackFixture = {
  id: string;
  employeeId: string;
  managerId: string;
  status: "draft" | "scheduled" | "submitted" | "cancelled";
  period: string;
  createdAt: Date;
  updatedAt: Date;
};

export function mockFeedback(
  overrides?: Partial<FeedbackFixture>
): FeedbackFixture {
  return {
    id: "feedback-1",
    employeeId: "emp-a1",
    managerId: "mgr-a",
    status: "scheduled",
    period: "2025-Q1",
    createdAt: BASE_DATE,
    updatedAt: BASE_DATE,
    ...overrides,
  };
}
