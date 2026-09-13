import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChoresPanel } from "./chores-panel";
import type { ChildProfile, Chore, HouseholdMember } from "@/lib/types";

const members: HouseholdMember[] = [
  { id: "member-1", householdId: "household-1", userId: "user-1", role: "owner", joinedAt: "2026-01-01T00:00:00Z" },
];

const childProfiles: ChildProfile[] = [
  { id: "child-1", householdId: "household-1", createdBy: "user-1", displayName: "Sam", createdAt: "2026-01-01T00:00:00Z" },
];

const baseChore: Chore = {
  id: "chore-1",
  householdId: "household-1",
  title: "Dishes",
  assigneeType: "adult",
  assigneeUserId: "user-1",
  assigneeChildId: null,
  recurrenceFrequency: "none",
  recurrenceInterval: 1,
  recurrenceEndDate: null,
  createdBy: "user-1",
  createdAt: "2026-01-01T00:00:00Z",
};

function renderPanel(initialChores: Chore[] = []) {
  return render(
    <ChoresPanel
      householdId="household-1"
      initialChores={initialChores}
      members={members}
      childProfiles={childProfiles}
      currentUserId="user-1"
    />,
  );
}

describe("ChoresPanel", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("shows a validation error and does not submit when the title is blank", async () => {
    renderPanel();

    fireEvent.change(screen.getByLabelText(/first due date/i), { target: { value: "2026-02-01" } });
    fireEvent.click(screen.getByRole("button", { name: /add chore/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/enter a title/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects a non-positive recurrence interval before submitting", async () => {
    renderPanel();

    fireEvent.change(screen.getByLabelText(/^title$/i), { target: { value: "Dishes" } });
    fireEvent.change(screen.getByLabelText(/adult$/i), { target: { value: "user-1" } });
    fireEvent.change(screen.getByLabelText(/first due date/i), { target: { value: "2026-02-01" } });
    fireEvent.change(screen.getByLabelText(/repeats/i), { target: { value: "weekly" } });
    fireEvent.change(screen.getByLabelText(/repeat every/i), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: /add chore/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/positive number/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("submits a new chore to the BFF route with the exact posted body", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify(baseChore), { status: 201, headers: { "Content-Type": "application/json" } }),
    );

    renderPanel();

    fireEvent.change(screen.getByLabelText(/^title$/i), { target: { value: "Dishes" } });
    fireEvent.change(screen.getByLabelText(/adult$/i), { target: { value: "user-1" } });
    fireEvent.change(screen.getByLabelText(/first due date/i), { target: { value: "2026-02-01" } });
    fireEvent.click(screen.getByRole("button", { name: /add chore/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/households/household-1/chores");
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({
      title: "Dishes",
      assigneeType: "adult",
      assigneeUserId: "user-1",
      assigneeChildId: undefined,
      firstDueDate: "2026-02-01",
      recurrenceFrequency: "none",
      recurrenceInterval: 1,
      recurrenceEndDate: undefined,
    });

    expect(await screen.findByText("Dishes")).toBeInTheDocument();
  });

  it("edits a chore, including the recurrence field absent from title/assignee inputs", async () => {
    const updated: Chore = { ...baseChore, title: "Dishes (updated)", recurrenceFrequency: "weekly", recurrenceInterval: 2 };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify(updated), { status: 200, headers: { "Content-Type": "application/json" } }),
    );

    renderPanel([baseChore]);

    fireEvent.click(screen.getByRole("button", { name: /^edit$/i }));
    fireEvent.change(screen.getByLabelText("Title", { selector: "#edit-chore-1-title" }), {
      target: { value: "Dishes (updated)" },
    });
    fireEvent.change(screen.getByLabelText("Repeats", { selector: "#edit-chore-1-recurrence" }), {
      target: { value: "weekly" },
    });
    fireEvent.change(screen.getByLabelText("Repeat every", { selector: "#edit-chore-1-recurrence-interval" }), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/households/household-1/chores/chore-1");
    expect(init.method).toBe("PUT");
    const body = JSON.parse(init.body as string);
    expect(body.title).toBe("Dishes (updated)");
    expect(body.recurrenceFrequency).toBe("weekly");
    expect(body.recurrenceInterval).toBe(2);
    expect(body.firstDueDate).toBeUndefined();

    expect(await screen.findByText("Dishes (updated)")).toBeInTheDocument();
  });

  it("deletes a chore", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(new Response(null, { status: 204 }));

    renderPanel([baseChore]);

    fireEvent.click(screen.getByRole("button", { name: /remove dishes/i }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith("/api/households/household-1/chores/chore-1", { method: "DELETE" }),
    );
    await waitFor(() => expect(screen.queryByText("Dishes")).not.toBeInTheDocument());
  });

  it("completes a pending occurrence and refreshes the occurrence list", async () => {
    const pendingOccurrence = {
      id: "occurrence-1",
      choreId: "chore-1",
      dueDate: "2026-02-01",
      status: "pending" as const,
      completedAt: null,
      completedBy: null,
      createdAt: "2026-01-01T00:00:00Z",
    };
    const nextOccurrence = {
      id: "occurrence-2",
      choreId: "chore-1",
      dueDate: "2026-02-08",
      status: "pending" as const,
      completedAt: null,
      completedBy: null,
      createdAt: "2026-01-01T00:00:00Z",
    };
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(
        new Response(JSON.stringify([pendingOccurrence]), { status: 200, headers: { "Content-Type": "application/json" } }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ...pendingOccurrence, status: "completed" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ ...pendingOccurrence, status: "completed" }, nextOccurrence]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    renderPanel([baseChore]);

    fireEvent.click(screen.getByRole("button", { name: /occurrences/i }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("2026-02-01")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^complete$/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls[1][0]).toBe(
      "/api/households/household-1/chores/occurrences/occurrence-1/complete",
    );
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls[2][0]).toBe(
      "/api/households/household-1/chores/chore-1/occurrences",
    );
    expect(await screen.findByText("2026-02-08")).toBeInTheDocument();
  });

  it("skips a pending occurrence and refreshes the occurrence list", async () => {
    const pendingOccurrence = {
      id: "occurrence-1",
      choreId: "chore-1",
      dueDate: "2026-02-01",
      status: "pending" as const,
      completedAt: null,
      completedBy: null,
      createdAt: "2026-01-01T00:00:00Z",
    };
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(
        new Response(JSON.stringify([pendingOccurrence]), { status: 200, headers: { "Content-Type": "application/json" } }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ...pendingOccurrence, status: "skipped" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ ...pendingOccurrence, status: "skipped" }]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    renderPanel([baseChore]);

    fireEvent.click(screen.getByRole("button", { name: /occurrences/i }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("2026-02-01")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^skip$/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls[1][0]).toBe(
      "/api/households/household-1/chores/occurrences/occurrence-1/skip",
    );
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls[2][0]).toBe(
      "/api/households/household-1/chores/chore-1/occurrences",
    );
    expect(await screen.findByText("skipped")).toBeInTheDocument();
  });
});
