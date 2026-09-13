// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { backendFetchMock } = vi.hoisted(() => ({ backendFetchMock: vi.fn() }));

vi.mock("@/lib/api/backend", () => ({
  backendFetch: backendFetchMock,
}));

import { GET } from "./route";

const params = Promise.resolve({ householdId: "household-1", eventId: "event-1" });

describe("GET /api/households/[householdId]/events/[eventId]/occurrences", () => {
  beforeEach(() => backendFetchMock.mockReset());

  it("proxies to the backend occurrence overrides endpoint", async () => {
    backendFetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    await GET(new Request("http://app.test/api/households/household-1/events/event-1/occurrences"), { params });
    expect(backendFetchMock).toHaveBeenCalledWith("/households/household-1/events/event-1/occurrences");
  });
});
