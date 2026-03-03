import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ADMIN,
  MANAGER_A,
  EMP_A1,
  mockSession,
} from "./fixtures";

// ── Mocks ────────────────────────────────────────────────────

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

const mockFindUnique = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

const mockCookieGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: (...args: unknown[]) => mockCookieGet(...args),
  }),
}));

// Import after mocks
import { getEffectiveAuth, getImpersonationInfo } from "../impersonation";

// ── Helpers ──────────────────────────────────────────────────

const TARGET_USER = {
  id: EMP_A1.id,
  name: EMP_A1.name,
  email: EMP_A1.email,
  role: EMP_A1.role,
  avatarUrl: EMP_A1.avatarUrl,
  evaluationMode: EMP_A1.evaluationMode,
};

// ── getEffectiveAuth ─────────────────────────────────────────

describe("getEffectiveAuth", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockFindUnique.mockReset();
    mockCookieGet.mockReset();
  });

  it("returns null when session is null", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await getEffectiveAuth();
    expect(result).toBeNull();
  });

  it("returns original session for role employee without consulting cookie or DB", async () => {
    const session = mockSession(EMP_A1);
    mockAuth.mockResolvedValue(session);

    const result = await getEffectiveAuth();

    expect(result).toEqual(session);
    expect(mockCookieGet).not.toHaveBeenCalled();
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("returns original session for role manager without consulting cookie or DB", async () => {
    const session = mockSession(MANAGER_A);
    mockAuth.mockResolvedValue(session);

    const result = await getEffectiveAuth();

    expect(result).toEqual(session);
    expect(mockCookieGet).not.toHaveBeenCalled();
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("returns original session for admin when __impersonate cookie is absent", async () => {
    const session = mockSession(ADMIN);
    mockAuth.mockResolvedValue(session);
    mockCookieGet.mockReturnValue(undefined);

    const result = await getEffectiveAuth();

    expect(result).toEqual(session);
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("returns session with target user data when admin has valid __impersonate cookie", async () => {
    const session = mockSession(ADMIN);
    mockAuth.mockResolvedValue(session);
    mockCookieGet.mockReturnValue({ value: EMP_A1.id });
    mockFindUnique.mockResolvedValue(TARGET_USER);

    const result = await getEffectiveAuth();

    expect(result).toEqual({
      ...session,
      user: {
        ...session.user,
        id: TARGET_USER.id,
        name: TARGET_USER.name,
        email: TARGET_USER.email,
        role: TARGET_USER.role,
        image: TARGET_USER.avatarUrl,
        evaluationMode: TARGET_USER.evaluationMode,
      },
    });
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: EMP_A1.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        evaluationMode: true,
      },
    });
  });

  it("returns original session when admin has __impersonate cookie with invalid userId", async () => {
    const session = mockSession(ADMIN);
    mockAuth.mockResolvedValue(session);
    mockCookieGet.mockReturnValue({ value: "nonexistent-user" });
    mockFindUnique.mockResolvedValue(null);

    const result = await getEffectiveAuth();

    expect(result).toEqual(session);
  });
});

// ── getImpersonationInfo ─────────────────────────────────────

describe("getImpersonationInfo", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockFindUnique.mockReset();
    mockCookieGet.mockReset();
  });

  it("returns null for role employee", async () => {
    mockAuth.mockResolvedValue(mockSession(EMP_A1));

    const result = await getImpersonationInfo();
    expect(result).toBeNull();
  });

  it("returns null for admin when __impersonate cookie is absent", async () => {
    mockAuth.mockResolvedValue(mockSession(ADMIN));
    mockCookieGet.mockReturnValue(undefined);

    const result = await getImpersonationInfo();
    expect(result).toBeNull();
  });

  it("returns target user info for admin when __impersonate cookie is present", async () => {
    const targetInfo = { id: EMP_A1.id, name: EMP_A1.name, role: EMP_A1.role };
    mockAuth.mockResolvedValue(mockSession(ADMIN));
    mockCookieGet.mockReturnValue({ value: EMP_A1.id });
    mockFindUnique.mockResolvedValue(targetInfo);

    const result = await getImpersonationInfo();

    expect(result).toEqual(targetInfo);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: EMP_A1.id },
      select: { id: true, name: true, role: true },
    });
  });
});
