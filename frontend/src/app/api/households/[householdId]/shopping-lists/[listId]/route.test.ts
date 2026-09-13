// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { backendFetchMock } = vi.hoisted(() => ({ backendFetchMock: vi.fn() }));

vi.mock("@/lib/api/backend", () => ({
  backendFetch: backendFetchMock,
}));

import { DELETE, PUT } from "./route";

const params = Promise.resolve({ householdId: "household-1", listId: "list-1" });

describe("PUT /api/households/[householdId]/shopping-lists/[listId]", () => {
  beforeEach(() => backendFetchMock.mockReset());

  it("forwards the parsed request body to the backend", async () => {
    backendFetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    const request = new Request("http://app.test/api/households/household-1/shopping-lists/list-1", {
      method: "PUT",
      body: JSON.stringify({ name: "Groceries" }),
    });

    await PUT(request as never, { params });

    expect(backendFetchMock).toHaveBeenCalledWith("/households/household-1/shopping-lists/list-1", {
      method: "PUT",
      body: { name: "Groceries" },
    });
  });
});

describe("DELETE /api/households/[householdId]/shopping-lists/[listId]", () => {
  beforeEach(() => backendFetchMock.mockReset());

  it("proxies the delete to the backend", async () => {
    backendFetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await DELETE(new Request("http://app.test/api/households/household-1/shopping-lists/list-1"), { params });
    expect(backendFetchMock).toHaveBeenCalledWith("/households/household-1/shopping-lists/list-1", {
      method: "DELETE",
    });
  });
});