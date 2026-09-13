// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { backendFetchMock } = vi.hoisted(() => ({ backendFetchMock: vi.fn() }));

vi.mock("@/lib/api/backend", () => ({
  backendFetch: backendFetchMock,
}));

import { POST } from "./route";

const params = Promise.resolve({ householdId: "household-1", eventId: "event-1", date: "2026-01-08" });

describe("POST /api/households/[householdId]/events/[eventId]/occurrences/[date]/modify", () => {
  beforeEach(() => backendFetchMock.mockReset());

  it("forwards the parsed request body to the backend", async () => {
    backendFetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    const request = new Request(
      "http://app.test/api/households/household-1/events/event-1/occurrences/2026-01-08/modify",
      { method: "POST", body: JSON.stringify({ overrideTitle: "Rescheduled" }) },
    );

    await POST(request as never, { params });

    expect(backendFetchMock).toHaveBeenCalledWith(
      "/households/household-1/events/event-1/occurrences/2026-01-08/modify",
      { method: "POST", body: { overrideTitle: "Rescheduled" } },
    );
  });
});
