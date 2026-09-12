// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
const getSessionMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      getUser: getUserMock,
      getSession: getSessionMock,
    },
  })),
}));

import { backendFetch, requireAccessToken, UnauthorizedError } from "@/lib/api/backend";

describe("requireAccessToken", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    getSessionMock.mockReset();
  });

  it("throws UnauthorizedError when there is no authenticated user", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });

    await expect(requireAccessToken()).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("returns the access token for an authenticated session", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    getSessionMock.mockResolvedValue({ data: { session: { access_token: "token-123" } } });

    await expect(requireAccessToken()).resolves.toBe("token-123");
  });
});

describe("backendFetch", () => {
  const originalBackendUrl = process.env.BACKEND_API_URL;
  const fetchMock = vi.fn();

  beforeEach(() => {
    getUserMock.mockReset();
    getSessionMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    process.env.BACKEND_API_URL = "http://backend.test";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env.BACKEND_API_URL = originalBackendUrl;
  });

  it("returns 401 and never calls the backend when there is no session", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });

    const response = await backendFetch("/households");

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards the bearer token and relays the backend response for an authenticated call", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    getSessionMock.mockResolvedValue({ data: { session: { access_token: "token-123" } } });
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: "household-1", name: "The Hollows" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const response = await backendFetch("/households", {
      method: "POST",
      body: { name: "The Hollows", timezone: "UTC" },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://backend.test/api/households");
    expect(init.method).toBe("POST");
    expect((init.headers as Headers).get("Authorization")).toBe("Bearer token-123");
    expect(init.body).toBe(JSON.stringify({ name: "The Hollows", timezone: "UTC" }));

    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload).toEqual({ id: "household-1", name: "The Hollows" });
  });

  it("returns 500 when BACKEND_API_URL is not configured", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    getSessionMock.mockResolvedValue({ data: { session: { access_token: "token-123" } } });
    delete process.env.BACKEND_API_URL;

    const response = await backendFetch("/households");

    expect(response.status).toBe(500);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
