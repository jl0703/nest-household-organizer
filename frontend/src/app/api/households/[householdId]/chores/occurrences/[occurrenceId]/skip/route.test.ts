// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { backendFetchMock } = vi.hoisted(() => ({ backendFetchMock: vi.fn() }));

vi.mock("@/lib/api/backend", () => ({
  backendFetch: backendFetchMock,
}));

import { POST } from "./route";

const params = Promise.resolve({ householdId: "household-1", occurrenceId: "occurrence-1" });

describe("POST /api/households/[householdId]/chores/occurrences/[occurrenceId]/skip", () => {
  beforeEach(() => backendFetchMock.mockReset());

  it("proxies the skip request to the backend with no body", async () => {
    backendFetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    await POST(
      new Request(
        "http://app.test/api/households/household-1/chores/occurrences/occurrence-1/skip",
        { method: "POST" },
      ),
      { params },
    );
    expect(backendFetchMock).toHaveBeenCalledWith(
      "/households/household-1/chores/occurrences/occurrence-1/skip",
      { method: "POST" },
    );
  });
});
