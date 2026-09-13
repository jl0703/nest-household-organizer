// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { backendFetchMock } = vi.hoisted(() => ({ backendFetchMock: vi.fn() }));

vi.mock("@/lib/api/backend", () => ({
  backendFetch: backendFetchMock,
}));

import { DELETE, GET, PUT } from "./route";

const params = Promise.resolve({ householdId: "household-1", eventId: "event-1" });

describe("GET /api/households/[householdId]/events/[eventId]", () => {
  beforeEach(() => backendFetchMock.mockReset());

  it("proxies to the backend event detail endpoint", async () => {
    backendFetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    await GET(new Request("http://app.test/api/households/household-1/events/event-1"), { params });
    expect(backendFetchMock).toHaveBeenCalledWith("/households/household-1/events/event-1");
  });
});

describe("PUT /api/households/[householdId]/events/[eventId]", () => {
  beforeEach(() => backendFetchMock.mockReset());

  it("forwards the parsed request body to the backend", async () => {
    backendFetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    const request = new Request("http://app.test/api/households/household-1/events/event-1", {
      method: "PUT",
      body: JSON.stringify({ title: "Dentist" }),
    });

    await PUT(request as never, { params });

    expect(backendFetchMock).toHaveBeenCalledWith("/households/household-1/events/event-1", {
      method: "PUT",
      body: { title: "Dentist" },
    });
  });
});

describe("DELETE /api/households/[householdId]/events/[eventId]", () => {
  beforeEach(() => backendFetchMock.mockReset());

  it("proxies the delete to the backend", async () => {
    backendFetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await DELETE(new Request("http://app.test/api/households/household-1/events/event-1"), { params });
    expect(backendFetchMock).toHaveBeenCalledWith("/households/household-1/events/event-1", {
      method: "DELETE",
    });
  });
});
