// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { backendFetchMock } = vi.hoisted(() => ({ backendFetchMock: vi.fn() }));

vi.mock("@/lib/api/backend", () => ({
  backendFetch: backendFetchMock,
}));

import { GET, POST } from "./route";

describe("GET /api/households", () => {
  beforeEach(() => backendFetchMock.mockReset());

  it("proxies to the backend households list endpoint", async () => {
    backendFetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    await GET();
    expect(backendFetchMock).toHaveBeenCalledWith("/households");
  });
});

describe("POST /api/households", () => {
  beforeEach(() => backendFetchMock.mockReset());

  it("forwards the parsed request body to the backend", async () => {
    backendFetchMock.mockResolvedValue(new Response(null, { status: 201 }));
    const request = new Request("http://app.test/api/households", {
      method: "POST",
      body: JSON.stringify({ name: "The Hollows", timezone: "UTC" }),
    });

    await POST(request as never);

    expect(backendFetchMock).toHaveBeenCalledWith("/households", {
      method: "POST",
      body: { name: "The Hollows", timezone: "UTC" },
    });
  });
});
