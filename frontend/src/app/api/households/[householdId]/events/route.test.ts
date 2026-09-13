// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { backendFetchMock } = vi.hoisted(() => ({ backendFetchMock: vi.fn() }));

vi.mock("@/lib/api/backend", () => ({
  backendFetch: backendFetchMock,
}));

import { GET, POST } from "./route";

describe("GET /api/households/[householdId]/events", () => {
  beforeEach(() => backendFetchMock.mockReset());

  it("proxies to the backend events list endpoint", async () => {
    backendFetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    await GET(new Request("http://app.test/api/households/household-1/events"), {
      params: Promise.resolve({ householdId: "household-1" }),
    });
    expect(backendFetchMock).toHaveBeenCalledWith("/households/household-1/events");
  });
});

describe("POST /api/households/[householdId]/events", () => {
  beforeEach(() => backendFetchMock.mockReset());

  it("forwards the parsed request body to the backend", async () => {
    backendFetchMock.mockResolvedValue(new Response(null, { status: 201 }));
    const request = new Request("http://app.test/api/households/household-1/events", {
      method: "POST",
      body: JSON.stringify({ title: "Dentist", startsAt: "2026-01-01T10:00:00Z", endsAt: "2026-01-01T11:00:00Z" }),
    });

    await POST(request as never, { params: Promise.resolve({ householdId: "household-1" }) });

    expect(backendFetchMock).toHaveBeenCalledWith("/households/household-1/events", {
      method: "POST",
      body: { title: "Dentist", startsAt: "2026-01-01T10:00:00Z", endsAt: "2026-01-01T11:00:00Z" },
    });
  });
});
