// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { backendFetchMock } = vi.hoisted(() => ({ backendFetchMock: vi.fn() }));

vi.mock("@/lib/api/backend", () => ({
  backendFetch: backendFetchMock,
}));

import { GET, POST } from "./route";

const params = Promise.resolve({ householdId: "household-1", listId: "list-1" });

describe("GET /api/households/[householdId]/shopping-lists/[listId]/items", () => {
  beforeEach(() => backendFetchMock.mockReset());

  it("proxies to the backend shopping list items endpoint", async () => {
    backendFetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    await GET(new Request("http://app.test/api/households/household-1/shopping-lists/list-1/items"), { params });
    expect(backendFetchMock).toHaveBeenCalledWith("/households/household-1/shopping-lists/list-1/items");
  });
});

describe("POST /api/households/[householdId]/shopping-lists/[listId]/items", () => {
  beforeEach(() => backendFetchMock.mockReset());

  it("forwards the parsed request body to the backend", async () => {
    backendFetchMock.mockResolvedValue(new Response(null, { status: 201 }));
    const request = new Request("http://app.test/api/households/household-1/shopping-lists/list-1/items", {
      method: "POST",
      body: JSON.stringify({ name: "Milk", quantity: "1 gallon" }),
    });

    await POST(request as never, { params });

    expect(backendFetchMock).toHaveBeenCalledWith("/households/household-1/shopping-lists/list-1/items", {
      method: "POST",
      body: { name: "Milk", quantity: "1 gallon" },
    });
  });
});