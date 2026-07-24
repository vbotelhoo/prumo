import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { hasSessionCookie } from "../domain/session-cookie";
import * as nextHeaders from "next/headers";

// Mock next/headers
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

interface MockCookieStore {
  has: (name: string) => boolean;
  get: (name: string) => { value: string } | undefined;
  getAll: () => { name: string; value: string }[];
  delete: (name: string) => void;
  clear: () => void;
  set: (name: string, value: string, options?: object) => void;
  toString: () => string;
}

function createMockCookieStore(
  hasHandler: (name: string) => boolean
): MockCookieStore {
  return {
    has: vi.fn(hasHandler),
    get: vi.fn(),
    getAll: vi.fn(() => []),
    delete: vi.fn(),
    clear: vi.fn(),
    set: vi.fn(),
    toString: vi.fn(() => ""),
  };
}

describe("hasSessionCookie", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns true when better-auth.session_token cookie is present", async () => {
    const mockCookieStore = createMockCookieStore(
      (name: string) => name === "better-auth.session_token"
    );

    // @ts-expect-error - mock type mismatch is expected; runtime behavior is correct
    vi.mocked(nextHeaders.cookies).mockResolvedValue(mockCookieStore);

    const result = await hasSessionCookie();

    expect(result).toBe(true);
    expect(mockCookieStore.has).toHaveBeenCalledWith(
      "__Secure-better-auth.session_token"
    );
    expect(mockCookieStore.has).toHaveBeenCalledWith(
      "better-auth.session_token"
    );
  });

  it("returns true when __Secure-better-auth.session_token cookie is present (production HTTPS)", async () => {
    const mockCookieStore = createMockCookieStore(
      (name: string) => name === "__Secure-better-auth.session_token"
    );

    // @ts-expect-error - mock type mismatch is expected; runtime behavior is correct
    vi.mocked(nextHeaders.cookies).mockResolvedValue(mockCookieStore);

    const result = await hasSessionCookie();

    expect(result).toBe(true);
    expect(mockCookieStore.has).toHaveBeenCalledWith(
      "__Secure-better-auth.session_token"
    );
  });

  it("returns false when no session cookie is present", async () => {
    const mockCookieStore = createMockCookieStore(() => false);

    // @ts-expect-error - mock type mismatch is expected; runtime behavior is correct
    vi.mocked(nextHeaders.cookies).mockResolvedValue(mockCookieStore);

    const result = await hasSessionCookie();

    expect(result).toBe(false);
    expect(mockCookieStore.has).toHaveBeenCalledTimes(4);
  });

  it("checks all cookie name variants in order", async () => {
    const callOrder: string[] = [];
    const mockCookieStore = createMockCookieStore((name: string) => {
      callOrder.push(name);
      return false;
    });

    // @ts-expect-error - mock type mismatch is expected; runtime behavior is correct
    vi.mocked(nextHeaders.cookies).mockResolvedValue(mockCookieStore);

    await hasSessionCookie();

    expect(callOrder).toEqual([
      "__Secure-better-auth.session_token",
      "better-auth.session_token",
      "__Secure-better-auth-session_token",
      "better-auth-session_token",
    ]);
  });

  it("returns true on first matching cookie name (stops checking after match)", async () => {
    const mockCookieStore = createMockCookieStore((name: string) => {
      // Match on the second cookie variant
      return name === "better-auth.session_token";
    });

    // @ts-expect-error - mock type mismatch is expected; runtime behavior is correct
    vi.mocked(nextHeaders.cookies).mockResolvedValue(mockCookieStore);

    const result = await hasSessionCookie();

    expect(result).toBe(true);
    // Should have called has() twice: once for secure, once for non-secure (match)
    expect(mockCookieStore.has).toHaveBeenCalledTimes(2);
  });

  it("handles hyphenated cookie name variant with __Secure- prefix", async () => {
    const mockCookieStore = createMockCookieStore(
      (name: string) => name === "__Secure-better-auth-session_token"
    );

    // @ts-expect-error - mock type mismatch is expected; runtime behavior is correct
    vi.mocked(nextHeaders.cookies).mockResolvedValue(mockCookieStore);

    const result = await hasSessionCookie();

    expect(result).toBe(true);
  });
});
