"use client";

import { useState, type FormEvent } from "react";
import type { CalendarEvent, EventOccurrenceOverride, RecurrenceFrequency } from "@/lib/types";

interface CalendarPanelProps {
  householdId: string;
  initialEvents: CalendarEvent[];
}

interface EventFormState {
  title: string;
  description: string;
  allDay: boolean;
  startsAt: string;
  endsAt: string;
  recurrenceFrequency: RecurrenceFrequency;
  recurrenceInterval: string;
  recurrenceEndDate: string;
}

interface OccurrenceFormState {
  overrideTitle: string;
  overrideStartsAt: string;
  overrideEndsAt: string;
}

const emptyForm: EventFormState = {
  title: "",
  description: "",
  allDay: false,
  startsAt: "",
  endsAt: "",
  recurrenceFrequency: "none",
  recurrenceInterval: "1",
  recurrenceEndDate: "",
};

const emptyOccurrenceForm: OccurrenceFormState = {
  overrideTitle: "",
  overrideStartsAt: "",
  overrideEndsAt: "",
};

function toDateTimeLocalInput(iso: string): string {
  const date = new Date(iso);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function toDateInput(iso: string): string {
  return toDateTimeLocalInput(iso).slice(0, 10);
}

function eventToFormState(event: CalendarEvent): EventFormState {
  return {
    title: event.title,
    description: event.description ?? "",
    allDay: event.allDay,
    startsAt: event.allDay ? toDateInput(event.startsAt) : toDateTimeLocalInput(event.startsAt),
    endsAt: event.allDay ? toDateInput(event.endsAt) : toDateTimeLocalInput(event.endsAt),
    recurrenceFrequency: event.recurrenceFrequency,
    recurrenceInterval: String(event.recurrenceInterval),
    recurrenceEndDate: event.recurrenceEndDate ?? "",
  };
}

function formatEventRange(event: CalendarEvent): string {
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);
  if (event.allDay) {
    return start.toLocaleDateString();
  }
  return `${start.toLocaleString()} – ${end.toLocaleString()}`;
}

function toIsoDateTime(value: string, allDay: boolean, endOfDay: boolean): string {
  if (!allDay) return new Date(value).toISOString();
  return new Date(`${value}T${endOfDay ? "23:59:59" : "00:00:00"}`).toISOString();
}

function validateEventForm(form: EventFormState): string | null {
  if (!form.title.trim()) return "Enter a title for the event.";
  if (!form.startsAt || !form.endsAt) return "Choose a start and end date/time.";
  if (form.recurrenceFrequency !== "none" && Number(form.recurrenceInterval) <= 0) {
    return "Repeat every must be a positive number.";
  }
  return null;
}

function buildRequestBody(form: EventFormState) {
  return {
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    allDay: form.allDay,
    startsAt: toIsoDateTime(form.startsAt, form.allDay, false),
    endsAt: toIsoDateTime(form.endsAt, form.allDay, true),
    recurrenceFrequency: form.recurrenceFrequency,
    recurrenceInterval: Number(form.recurrenceInterval),
    recurrenceEndDate: form.recurrenceEndDate || undefined,
  };
}

function fetchErrorMessage(status: number, fallback: string): string {
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You don't have access to this household's calendar.";
  if (status === 404) return "That event could not be found.";
  return fallback;
}

interface EventFieldsProps {
  idPrefix: string;
  form: EventFormState;
  onChange: (updater: (current: EventFormState) => EventFormState) => void;
}

/** Shared title/description/schedule/recurrence fields for both the create and edit forms. */
function EventFields({ idPrefix, form, onChange }: EventFieldsProps) {
  return (
    <>
      <div className="field">
        <label htmlFor={`${idPrefix}-title`}>Title</label>
        <input
          id={`${idPrefix}-title`}
          type="text"
          required
          maxLength={200}
          value={form.title}
          onChange={(event) => onChange((current) => ({ ...current, title: event.target.value }))}
        />
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-description`}>Description (optional)</label>
        <input
          id={`${idPrefix}-description`}
          type="text"
          value={form.description}
          onChange={(event) => onChange((current) => ({ ...current, description: event.target.value }))}
        />
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-all-day`}>
          <input
            id={`${idPrefix}-all-day`}
            type="checkbox"
            checked={form.allDay}
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                allDay: event.target.checked,
                startsAt: current.startsAt ? (event.target.checked ? current.startsAt.slice(0, 10) : current.startsAt) : "",
                endsAt: current.endsAt ? (event.target.checked ? current.endsAt.slice(0, 10) : current.endsAt) : "",
              }))
            }
          />{" "}
          All day
        </label>
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-starts`}>Starts</label>
        <input
          id={`${idPrefix}-starts`}
          type={form.allDay ? "date" : "datetime-local"}
          required
          value={form.startsAt}
          onChange={(event) => onChange((current) => ({ ...current, startsAt: event.target.value }))}
        />
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-ends`}>Ends</label>
        <input
          id={`${idPrefix}-ends`}
          type={form.allDay ? "date" : "datetime-local"}
          required
          value={form.endsAt}
          onChange={(event) => onChange((current) => ({ ...current, endsAt: event.target.value }))}
        />
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-recurrence`}>Repeats</label>
        <select
          id={`${idPrefix}-recurrence`}
          value={form.recurrenceFrequency}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              recurrenceFrequency: event.target.value as RecurrenceFrequency,
            }))
          }
        >
          <option value="none">Does not repeat</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>
      {form.recurrenceFrequency !== "none" && (
        <>
          <div className="field">
            <label htmlFor={`${idPrefix}-recurrence-interval`}>Repeat every</label>
            <input
              id={`${idPrefix}-recurrence-interval`}
              type="number"
              min={1}
              value={form.recurrenceInterval}
              onChange={(event) =>
                onChange((current) => ({ ...current, recurrenceInterval: event.target.value }))
              }
            />
          </div>
          <div className="field">
            <label htmlFor={`${idPrefix}-recurrence-end`}>Recurrence end date (optional)</label>
            <input
              id={`${idPrefix}-recurrence-end`}
              type="date"
              value={form.recurrenceEndDate}
              onChange={(event) =>
                onChange((current) => ({ ...current, recurrenceEndDate: event.target.value }))
              }
            />
          </div>
        </>
      )}
    </>
  );
}

export function CalendarPanel({ householdId, initialEvents }: CalendarPanelProps) {
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);

  const [createForm, setCreateForm] = useState<EventFormState>(emptyForm);
  const [createStatus, setCreateStatus] = useState<"idle" | "submitting">("idle");
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EventFormState>(emptyForm);
  const [editStatus, setEditStatus] = useState<"idle" | "submitting">("idle");
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [occurrences, setOccurrences] = useState<Record<string, EventOccurrenceOverride[]>>({});
  const [occurrenceDate, setOccurrenceDate] = useState("");
  const [occurrenceForm, setOccurrenceForm] = useState<OccurrenceFormState>(emptyOccurrenceForm);
  const [occurrenceStatus, setOccurrenceStatus] = useState<"idle" | "submitting">("idle");
  const [occurrenceError, setOccurrenceError] = useState<string | null>(null);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateEventForm(createForm);
    if (validationError) {
      setCreateError(validationError);
      return;
    }

    setCreateError(null);
    setCreateStatus("submitting");

    try {
      const response = await fetch(`/api/households/${householdId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRequestBody(createForm)),
      });

      if (!response.ok) {
        setCreateError(fetchErrorMessage(response.status, "We couldn't create that event. Please try again."));
        return;
      }

      const created = (await response.json()) as CalendarEvent;
      setEvents((current) => [...current, created]);
      setCreateForm(emptyForm);
    } catch {
      setCreateError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setCreateStatus("idle");
    }
  }

  function startEditing(event: CalendarEvent) {
    setEditingEventId(event.id);
    setEditForm(eventToFormState(event));
    setEditError(null);
  }

  function cancelEditing() {
    setEditingEventId(null);
    setEditError(null);
  }

  async function handleUpdate(eventToUpdate: CalendarEvent, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateEventForm(editForm);
    if (validationError) {
      setEditError(validationError);
      return;
    }

    setEditError(null);
    setEditStatus("submitting");

    try {
      const response = await fetch(`/api/households/${householdId}/events/${eventToUpdate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRequestBody(editForm)),
      });

      if (!response.ok) {
        setEditError(fetchErrorMessage(response.status, "We couldn't update that event. Please try again."));
        return;
      }

      const updated = (await response.json()) as CalendarEvent;
      setEvents((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setEditingEventId(null);
    } catch {
      setEditError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setEditStatus("idle");
    }
  }

  async function handleDelete(eventToDelete: CalendarEvent) {
    setDeleteError(null);
    setDeletingEventId(eventToDelete.id);
    try {
      const response = await fetch(`/api/households/${householdId}/events/${eventToDelete.id}`, {
        method: "DELETE",
      });
      if (response.ok || response.status === 204) {
        setEvents((current) => current.filter((item) => item.id !== eventToDelete.id));
        if (expandedEventId === eventToDelete.id) setExpandedEventId(null);
        return;
      }
      setDeleteError(fetchErrorMessage(response.status, "We couldn't delete that event. Please try again."));
    } catch {
      setDeleteError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setDeletingEventId(null);
    }
  }

  async function toggleOccurrences(eventForOccurrences: CalendarEvent) {
    if (expandedEventId === eventForOccurrences.id) {
      setExpandedEventId(null);
      return;
    }
    setExpandedEventId(eventForOccurrences.id);
    setOccurrenceError(null);
    setOccurrenceDate("");
    setOccurrenceForm(emptyOccurrenceForm);

    if (occurrences[eventForOccurrences.id]) return;

    try {
      const response = await fetch(`/api/households/${householdId}/events/${eventForOccurrences.id}/occurrences`);
      if (!response.ok) {
        setOccurrenceError(fetchErrorMessage(response.status, "We couldn't load occurrences for that event."));
        return;
      }
      const list = (await response.json()) as EventOccurrenceOverride[];
      setOccurrences((current) => ({ ...current, [eventForOccurrences.id]: list }));
    } catch {
      setOccurrenceError("We couldn't reach the server. Check your connection and try again.");
    }
  }

  function applyOccurrenceResult(eventId: string, override: EventOccurrenceOverride) {
    setOccurrences((current) => ({
      ...current,
      [eventId]: [
        ...(current[eventId] ?? []).filter((item) => item.occurrenceDate !== override.occurrenceDate),
        override,
      ],
    }));
    setOccurrenceDate("");
    setOccurrenceForm(emptyOccurrenceForm);
  }

  async function handleSkipOccurrence(eventForOccurrences: CalendarEvent) {
    if (!occurrenceDate) {
      setOccurrenceError("Choose a date to skip.");
      return;
    }
    setOccurrenceError(null);
    setOccurrenceStatus("submitting");
    try {
      const response = await fetch(
        `/api/households/${householdId}/events/${eventForOccurrences.id}/occurrences/${occurrenceDate}/skip`,
        { method: "POST" },
      );
      if (!response.ok) {
        setOccurrenceError(fetchErrorMessage(response.status, "We couldn't skip that occurrence. Please try again."));
        return;
      }
      const override = (await response.json()) as EventOccurrenceOverride;
      applyOccurrenceResult(eventForOccurrences.id, override);
    } catch {
      setOccurrenceError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setOccurrenceStatus("idle");
    }
  }

  async function handleModifyOccurrence(eventForOccurrences: CalendarEvent) {
    if (!occurrenceDate) {
      setOccurrenceError("Choose a date to modify.");
      return;
    }
    const overrideTitle = occurrenceForm.overrideTitle.trim();
    const overrideStartsAt = occurrenceForm.overrideStartsAt
      ? new Date(occurrenceForm.overrideStartsAt).toISOString()
      : undefined;
    const overrideEndsAt = occurrenceForm.overrideEndsAt
      ? new Date(occurrenceForm.overrideEndsAt).toISOString()
      : undefined;
    if (!overrideTitle && !overrideStartsAt && !overrideEndsAt) {
      setOccurrenceError("Enter a new title, start time, or end time to modify this occurrence.");
      return;
    }

    setOccurrenceError(null);
    setOccurrenceStatus("submitting");
    try {
      const response = await fetch(
        `/api/households/${householdId}/events/${eventForOccurrences.id}/occurrences/${occurrenceDate}/modify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            overrideTitle: overrideTitle || undefined,
            overrideStartsAt,
            overrideEndsAt,
          }),
        },
      );
      if (!response.ok) {
        setOccurrenceError(
          fetchErrorMessage(response.status, "We couldn't modify that occurrence. Please try again."),
        );
        return;
      }
      const override = (await response.json()) as EventOccurrenceOverride;
      applyOccurrenceResult(eventForOccurrences.id, override);
    } catch {
      setOccurrenceError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setOccurrenceStatus("idle");
    }
  }

  return (
    <section className="panel" aria-labelledby="events-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">WHAT&apos;S COMING UP</p>
          <h2 id="events-heading">Upcoming events</h2>
        </div>
        <span className="count">{events.length}</span>
      </div>

      {deleteError && (
        <p className="status-banner error" role="alert">
          {deleteError}
        </p>
      )}

      {events.length === 0 ? (
        <p className="empty-state">No events yet.</p>
      ) : (
        <ul className="event-list">
          {events.map((item) =>
            editingEventId === item.id ? (
              <li key={item.id} className="event-list-editing">
                <form onSubmit={(formEvent) => handleUpdate(item, formEvent)} className="stacked-form" noValidate>
                  <EventFields idPrefix={`edit-${item.id}`} form={editForm} onChange={setEditForm} />
                  {editError && (
                    <p className="status-banner error" role="alert">
                      {editError}
                    </p>
                  )}
                  <button type="submit" className="primary" disabled={editStatus === "submitting"}>
                    {editStatus === "submitting" ? "Saving…" : "Save changes"}
                  </button>{" "}
                  <button type="button" className="secondary" onClick={cancelEditing}>
                    Cancel
                  </button>
                </form>
              </li>
            ) : (
              <li key={item.id}>
                <div className="event-list-main">
                  <span>
                    {item.title}
                    <small>{formatEventRange(item)}</small>
                  </span>
                  {item.recurrenceFrequency !== "none" && (
                    <span className="role-badge">{item.recurrenceFrequency}</span>
                  )}
                </div>
                <div className="event-list-actions">
                  {item.recurrenceFrequency !== "none" && (
                    <button type="button" className="icon-button" onClick={() => toggleOccurrences(item)}>
                      {expandedEventId === item.id ? "Hide occurrences" : "Occurrences"}
                    </button>
                  )}
                  <button type="button" className="icon-button" onClick={() => startEditing(item)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="icon-button danger"
                    onClick={() => handleDelete(item)}
                    disabled={deletingEventId === item.id}
                    aria-label={`Remove ${item.title}`}
                  >
                    {deletingEventId === item.id ? "Removing…" : "Remove"}
                  </button>
                </div>

                {expandedEventId === item.id && (
                  <div className="occurrence-panel">
                    {occurrenceError && (
                      <p className="status-banner error" role="alert">
                        {occurrenceError}
                      </p>
                    )}
                    {(occurrences[item.id] ?? []).length === 0 ? (
                      <p className="empty-state">No occurrence changes yet.</p>
                    ) : (
                      <ul className="occurrence-list">
                        {(occurrences[item.id] ?? []).map((override) => (
                          <li key={override.id}>
                            <span>{override.occurrenceDate}</span>
                            <span className="role-badge">{override.status}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="field">
                      <label htmlFor={`occurrence-date-${item.id}`}>Occurrence date</label>
                      <input
                        id={`occurrence-date-${item.id}`}
                        type="date"
                        value={occurrenceDate}
                        onChange={(changeEvent) => setOccurrenceDate(changeEvent.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor={`occurrence-title-${item.id}`}>New title (for modify, optional)</label>
                      <input
                        id={`occurrence-title-${item.id}`}
                        type="text"
                        value={occurrenceForm.overrideTitle}
                        onChange={(changeEvent) =>
                          setOccurrenceForm((current) => ({ ...current, overrideTitle: changeEvent.target.value }))
                        }
                      />
                    </div>
                    <div className="field">
                      <label htmlFor={`occurrence-starts-${item.id}`}>New start time (for modify, optional)</label>
                      <input
                        id={`occurrence-starts-${item.id}`}
                        type="datetime-local"
                        value={occurrenceForm.overrideStartsAt}
                        onChange={(changeEvent) =>
                          setOccurrenceForm((current) => ({
                            ...current,
                            overrideStartsAt: changeEvent.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="field">
                      <label htmlFor={`occurrence-ends-${item.id}`}>New end time (for modify, optional)</label>
                      <input
                        id={`occurrence-ends-${item.id}`}
                        type="datetime-local"
                        value={occurrenceForm.overrideEndsAt}
                        onChange={(changeEvent) =>
                          setOccurrenceForm((current) => ({ ...current, overrideEndsAt: changeEvent.target.value }))
                        }
                      />
                    </div>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => handleSkipOccurrence(item)}
                      disabled={occurrenceStatus === "submitting"}
                    >
                      Skip this date
                    </button>{" "}
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => handleModifyOccurrence(item)}
                      disabled={occurrenceStatus === "submitting"}
                    >
                      Save as modified
                    </button>
                  </div>
                )}
              </li>
            ),
          )}
        </ul>
      )}

      <form onSubmit={handleCreate} className="stacked-form" noValidate>
        <EventFields idPrefix="event" form={createForm} onChange={setCreateForm} />
        {createError && (
          <p className="status-banner error" role="alert">
            {createError}
          </p>
        )}
        <button type="submit" className="primary" disabled={createStatus === "submitting"}>
          {createStatus === "submitting" ? "Adding…" : "Add event"}
        </button>
      </form>
    </section>
  );
}
