import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CalendarPanel } from "./calendar-panel";
import type { CalendarEvent } from "@/lib/types";

const baseEvent: CalendarEvent = {
  id: "event-1",
  householdId: "household-1",
  title: "Dentist",
  description: null,
  allDay: false,
  startsAt: "2026-01-01T10:00:00Z",
  endsAt: "2026-01-01T11:00:00Z",
  recurrenceFrequency: "none",
  recurrenceInterval: 1,
  recurrenceEndDate: null,
  createdBy: "user-1",
  createdAt: "2026-01-01T00:00:00Z",
};

describe("CalendarPanel", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("shows a validation error and does not submit when the title is blank", async () => {
    render(<CalendarPanel householdId="household-1" initialEvents={[]} />);

    fireEvent.change(screen.getByLabelText(/starts/i), { target: { value: "2026-01-01T10:00" } });
    fireEvent.change(screen.getByLabelText(/ends/i), { target: { value: "2026-01-01T11:00" } });
    fireEvent.click(screen.getByRole("button", { name: /add event/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/enter a title/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects a non-positive recurrence interval before submitting", async () => {
    render(<CalendarPanel householdId="household-1" initialEvents={[]} />);

    fireEvent.change(screen.getByLabelText(/^title$/i), { target: { value: "Dentist" } });
    fireEvent.change(screen.getByLabelText(/starts/i), { target: { value: "2026-01-01T10:00" } });
    fireEvent.change(screen.getByLabelText(/ends/i), { target: { value: "2026-01-01T11:00" } });
    fireEvent.change(screen.getByLabelText(/repeats/i), { target: { value: "weekly" } });
    fireEvent.change(screen.getByLabelText(/repeat every/i), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: /add event/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/positive number/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("submits a new event to the BFF route with ISO datetimes", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify(baseEvent), { status: 201, headers: { "Content-Type": "application/json" } }),
    );

    render(<CalendarPanel householdId="household-1" initialEvents={[]} />);

    fireEvent.change(screen.getByLabelText(/^title$/i), { target: { value: "Dentist" } });
    fireEvent.change(screen.getByLabelText(/starts/i), { target: { value: "2026-01-01T10:00" } });
    fireEvent.change(screen.getByLabelText(/ends/i), { target: { value: "2026-01-01T11:00" } });
    fireEvent.click(screen.getByRole("button", { name: /add event/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/households/household-1/events");
    const body = JSON.parse(init.body as string);
    expect(body.title).toBe("Dentist");
    expect(body.startsAt).toBe(new Date("2026-01-01T10:00").toISOString());

    expect(await screen.findByText("Dentist")).toBeInTheDocument();
  });

  it("shows a session-expired message on a 401 response", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(new Response(null, { status: 401 }));

    render(<CalendarPanel householdId="household-1" initialEvents={[]} />);

    fireEvent.change(screen.getByLabelText(/^title$/i), { target: { value: "Dentist" } });
    fireEvent.change(screen.getByLabelText(/starts/i), { target: { value: "2026-01-01T10:00" } });
    fireEvent.change(screen.getByLabelText(/ends/i), { target: { value: "2026-01-01T11:00" } });
    fireEvent.click(screen.getByRole("button", { name: /add event/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/session has expired/i);
  });

  it("edits an event, including fields absent from the title/starts/ends inputs", async () => {
    const updated: CalendarEvent = { ...baseEvent, title: "Dentist (updated)", description: "Annual checkup" };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify(updated), { status: 200, headers: { "Content-Type": "application/json" } }),
    );

    render(<CalendarPanel householdId="household-1" initialEvents={[baseEvent]} />);

    fireEvent.click(screen.getByRole("button", { name: /^edit$/i }));
    fireEvent.change(screen.getByLabelText("Title", { selector: "#edit-event-1-title" }), {
      target: { value: "Dentist (updated)" },
    });
    fireEvent.change(screen.getByLabelText("Description (optional)", { selector: "#edit-event-1-description" }), {
      target: { value: "Annual checkup" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/households/household-1/events/event-1");
    expect(init.method).toBe("PUT");
    const body = JSON.parse(init.body as string);
    expect(body.title).toBe("Dentist (updated)");
    expect(body.description).toBe("Annual checkup");

    expect(await screen.findByText("Dentist (updated)")).toBeInTheDocument();
  });

  it("deletes an event", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(new Response(null, { status: 204 }));

    render(<CalendarPanel householdId="household-1" initialEvents={[baseEvent]} />);

    fireEvent.click(screen.getByRole("button", { name: /remove dentist/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/households/household-1/events/event-1", {
      method: "DELETE",
    }));
    await waitFor(() => expect(screen.queryByText("Dentist")).not.toBeInTheDocument());
  });

  it("loads and skips an occurrence for a recurring event", async () => {
    const recurringEvent: CalendarEvent = { ...baseEvent, recurrenceFrequency: "weekly", recurrenceInterval: 1 };
    const override = {
      id: "override-1",
      eventId: "event-1",
      occurrenceDate: "2026-01-08",
      status: "skipped" as const,
      overrideStartsAt: null,
      overrideEndsAt: null,
      overrideTitle: null,
      createdAt: "2026-01-01T00:00:00Z",
    };
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify(override), { status: 200, headers: { "Content-Type": "application/json" } }));

    render(<CalendarPanel householdId="household-1" initialEvents={[recurringEvent]} />);

    fireEvent.click(screen.getByRole("button", { name: /occurrences/i }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText(/occurrence date/i), { target: { value: "2026-01-08" } });
    fireEvent.click(screen.getByRole("button", { name: /skip this date/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls[1][0]).toBe(
      "/api/households/household-1/events/event-1/occurrences/2026-01-08/skip",
    );
    expect(await screen.findByText("2026-01-08")).toBeInTheDocument();
  });

  it("requires at least one changed field before modifying an occurrence", async () => {
    const recurringEvent: CalendarEvent = { ...baseEvent, recurrenceFrequency: "weekly", recurrenceInterval: 1 };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } }),
    );

    render(<CalendarPanel householdId="household-1" initialEvents={[recurringEvent]} />);

    fireEvent.click(screen.getByRole("button", { name: /occurrences/i }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText(/occurrence date/i), { target: { value: "2026-01-08" } });
    fireEvent.click(screen.getByRole("button", { name: /save as modified/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/enter a new title, start time, or end time/i);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("modifies an occurrence with a new title", async () => {
    const recurringEvent: CalendarEvent = { ...baseEvent, recurrenceFrequency: "weekly", recurrenceInterval: 1 };
    const override = {
      id: "override-1",
      eventId: "event-1",
      occurrenceDate: "2026-01-08",
      status: "modified" as const,
      overrideStartsAt: null,
      overrideEndsAt: null,
      overrideTitle: "Rescheduled dentist",
      createdAt: "2026-01-01T00:00:00Z",
    };
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify(override), { status: 200, headers: { "Content-Type": "application/json" } }));

    render(<CalendarPanel householdId="household-1" initialEvents={[recurringEvent]} />);

    fireEvent.click(screen.getByRole("button", { name: /occurrences/i }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText(/occurrence date/i), { target: { value: "2026-01-08" } });
    fireEvent.change(screen.getByLabelText(/new title/i), { target: { value: "Rescheduled dentist" } });
    fireEvent.click(screen.getByRole("button", { name: /save as modified/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[1];
    expect(url).toBe("/api/households/household-1/events/event-1/occurrences/2026-01-08/modify");
    const body = JSON.parse(init.body as string);
    expect(body.overrideTitle).toBe("Rescheduled dentist");

    expect(await screen.findByText("modified")).toBeInTheDocument();
  });
});
