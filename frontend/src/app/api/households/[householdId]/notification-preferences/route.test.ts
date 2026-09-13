// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { backendFetchMock } = vi.hoisted(() => ({ backendFetchMock: vi.fn() }));

vi.mock("@/lib/api/backend", () => ({
  backendFetch: backendFetchMock,
}));

import { GET, PUT } from "./route";

describe("notification preferences BFF route", () => {
  beforeEach(() => backendFetchMock.mockReset());

  it("proxies preference reads to the backend", async () => {
    backendFetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    await GET(new Request("http://app.test/api/households/household-1/notification-preferences"), {
      params: Promise.resolve({ householdId: "household-1" }),
    });

    expect(backendFetchMock).toHaveBeenCalledWith("/households/household-1/notification-preferences");
  });

  it("forwards preference updates to the backend", async () => {
    backendFetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    const body = {
      dailyDigestEnabled: true,
      eventRemindersEnabled: false,
      choreRemindersEnabled: true,
      digestTime: "09:30",
    };
    const request = new Request("http://app.test/api/households/household-1/notification-preferences", {
      method: "PUT",
      body: JSON.stringify(body),
    });

    await PUT(request as never, { params: Promise.resolve({ householdId: "household-1" }) });

    expect(backendFetchMock).toHaveBeenCalledWith("/households/household-1/notification-preferences", {
      method: "PUT",
      body,
    });
  });
});
