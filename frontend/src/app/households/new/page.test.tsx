import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import NewHouseholdPage from "./page";

describe("NewHouseholdPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("shows a validation error and does not submit when the name is blank", async () => {
    render(<NewHouseholdPage />);

    fireEvent.click(screen.getByRole("button", { name: /create household/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/household name is required/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("submits the trimmed name and selected timezone to the BFF route", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "household-1",
          name: "The Hollows",
          timezone: "UTC",
          ownerId: "user-1",
          createdAt: "2026-01-01T00:00:00Z",
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(<NewHouseholdPage />);

    fireEvent.change(screen.getByLabelText(/household name/i), {
      target: { value: "  The Hollows  " },
    });
    fireEvent.click(screen.getByRole("button", { name: /create household/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/households");
    expect(JSON.parse(init.body as string).name).toBe("The Hollows");
  });

  it("shows a session-expired message on a 401 response", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(new Response(null, { status: 401 }));

    render(<NewHouseholdPage />);

    fireEvent.change(screen.getByLabelText(/household name/i), {
      target: { value: "The Hollows" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create household/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/session has expired/i);
  });
});
