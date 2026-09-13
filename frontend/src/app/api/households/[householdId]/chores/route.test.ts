// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { backendFetchMock } = vi.hoisted(() => ({ backendFetchMock: vi.fn() }));

vi.mock("@/lib/api/backend", () => ({
  backendFetch: backendFetchMock,
}));

import { GET, POST } from "./route";

describe("GET /api/households/[householdId]/chores", () => {
  beforeEach(() => backendFetchMock.mockReset());

  it("proxies to the backend chores list endpoint", async () => {
    backendFetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    await GET(new Request("http://app.test/api/households/household-1/chores"), {
      params: Promise.resolve({ householdId: "household-1" }),
    });
    expect(backendFetchMock).toHaveBeenCalledWith("/households/household-1/chores");
  });
});

describe("POST /api/households/[householdId]/chores", () => {
  beforeEach(() => backendFetchMock.mockReset());

  it("forwards the parsed request body to the backend", async () => {
    backendFetchMock.mockResolvedValue(new Response(null, { status: 201 }));
    const request = new Request("http://app.test/api/households/household-1/chores", {
      method: "POST",
      body: JSON.stringify({ title: "Dishes", assigneeType: "adult", assigneeUserId: "user-1", firstDueDate: "2026-01-01" }),
    });

    await POST(request as never, { params: Promise.resolve({ householdId: "household-1" }) });

    expect(backendFetchMock).toHaveBeenCalledWith("/households/household-1/chores", {
      method: "POST",
      body: { title: "Dishes", assigneeType: "adult", assigneeUserId: "user-1", firstDueDate: "2026-01-01" },
    });
  });
});
