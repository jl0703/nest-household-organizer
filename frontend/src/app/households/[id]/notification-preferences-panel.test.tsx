import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NotificationPreference } from "@/lib/types";
import { NotificationPreferencesPanel } from "./notification-preferences-panel";

const preference: NotificationPreference = {
  id: "preference-1",
  householdId: "household-1",
  userId: "user-1",
  dailyDigestEnabled: true,
  eventRemindersEnabled: true,
  choreRemindersEnabled: true,
  digestTime: "08:00:00",
  updatedAt: "2026-01-01T00:00:00Z",
};

describe("NotificationPreferencesPanel", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));

  it("shows the current preferences and saves changes", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ ...preference, eventRemindersEnabled: false, digestTime: "09:30:00" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    render(<NotificationPreferencesPanel householdId="household-1" initialPreference={preference} />);

    fireEvent.click(screen.getByRole("checkbox", { name: /event reminders/i }));
    fireEvent.change(screen.getByLabelText(/daily digest time/i), { target: { value: "09:30" } });
    fireEvent.click(screen.getByRole("button", { name: /save notification preferences/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(fetch).toHaveBeenCalledWith("/api/households/household-1/notification-preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dailyDigestEnabled: true,
        eventRemindersEnabled: false,
        choreRemindersEnabled: true,
        digestTime: "09:30",
      }),
    });
    expect(await screen.findByRole("status")).toHaveTextContent(/preferences saved/i);
  });

  it("shows a server error without reporting success", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(new Response(null, { status: 500 }));
    render(<NotificationPreferencesPanel householdId="household-1" initialPreference={preference} />);

    fireEvent.click(screen.getByRole("button", { name: /save notification preferences/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't save/i);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
