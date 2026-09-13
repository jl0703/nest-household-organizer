"use client";

import { useState, type FormEvent } from "react";
import type {
  ChildProfile,
  Chore,
  ChoreAssigneeType,
  ChoreOccurrence,
  HouseholdMember,
  RecurrenceFrequency,
} from "@/lib/types";

interface ChoresPanelProps {
  householdId: string;
  initialChores: Chore[];
  members: HouseholdMember[];
  childProfiles: ChildProfile[];
  currentUserId: string;
}

interface ChoreFormState {
  title: string;
  assigneeType: ChoreAssigneeType;
  assigneeUserId: string;
  assigneeChildId: string;
  firstDueDate: string;
  recurrenceFrequency: RecurrenceFrequency;
  recurrenceInterval: string;
  recurrenceEndDate: string;
}

const emptyForm: ChoreFormState = {
  title: "",
  assigneeType: "adult",
  assigneeUserId: "",
  assigneeChildId: "",
  firstDueDate: "",
  recurrenceFrequency: "none",
  recurrenceInterval: "1",
  recurrenceEndDate: "",
};

function choreToFormState(chore: Chore): ChoreFormState {
  return {
    title: chore.title,
    assigneeType: chore.assigneeType,
    assigneeUserId: chore.assigneeUserId ?? "",
    assigneeChildId: chore.assigneeChildId ?? "",
    firstDueDate: "",
    recurrenceFrequency: chore.recurrenceFrequency,
    recurrenceInterval: String(chore.recurrenceInterval),
    recurrenceEndDate: chore.recurrenceEndDate ?? "",
  };
}

function validateChoreForm(form: ChoreFormState, requireFirstDueDate: boolean): string | null {
  if (!form.title.trim()) return "Enter a title for the chore.";
  if (form.assigneeType === "adult" && !form.assigneeUserId) return "Choose the adult responsible for this chore.";
  if (form.assigneeType === "child" && !form.assigneeChildId) return "Choose the child responsible for this chore.";
  if (requireFirstDueDate && !form.firstDueDate) return "Choose the first due date.";
  if (form.recurrenceFrequency !== "none" && Number(form.recurrenceInterval) <= 0) {
    return "Repeat every must be a positive number.";
  }
  return null;
}

function buildCreateBody(form: ChoreFormState) {
  return {
    title: form.title.trim(),
    assigneeType: form.assigneeType,
    assigneeUserId: form.assigneeType === "adult" ? form.assigneeUserId : undefined,
    assigneeChildId: form.assigneeType === "child" ? form.assigneeChildId : undefined,
    firstDueDate: form.firstDueDate,
    recurrenceFrequency: form.recurrenceFrequency,
    recurrenceInterval: Number(form.recurrenceInterval),
    recurrenceEndDate: form.recurrenceEndDate || undefined,
  };
}

function buildUpdateBody(form: ChoreFormState) {
  return {
    title: form.title.trim(),
    assigneeType: form.assigneeType,
    assigneeUserId: form.assigneeType === "adult" ? form.assigneeUserId : undefined,
    assigneeChildId: form.assigneeType === "child" ? form.assigneeChildId : undefined,
    recurrenceFrequency: form.recurrenceFrequency,
    recurrenceInterval: Number(form.recurrenceInterval),
    recurrenceEndDate: form.recurrenceEndDate || undefined,
  };
}

function fetchErrorMessage(status: number, fallback: string): string {
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You don't have access to this household's chores.";
  if (status === 404) return "That chore could not be found.";
  return fallback;
}

function memberLabel(member: HouseholdMember, currentUserId: string) {
  const short = member.userId.slice(0, 8);
  return member.userId === currentUserId ? `You (${short})` : `Member ${short}`;
}

interface ChoreFieldsProps {
  idPrefix: string;
  form: ChoreFormState;
  members: HouseholdMember[];
  childProfiles: ChildProfile[];
  currentUserId: string;
  showFirstDueDate: boolean;
  onChange: (updater: (current: ChoreFormState) => ChoreFormState) => void;
}

/** Shared title/assignee/recurrence fields for both the create and edit forms. */
function ChoreFields({
  idPrefix,
  form,
  members,
  childProfiles,
  currentUserId,
  showFirstDueDate,
  onChange,
}: ChoreFieldsProps) {
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
        <label htmlFor={`${idPrefix}-assignee-type`}>Assign to</label>
        <select
          id={`${idPrefix}-assignee-type`}
          value={form.assigneeType}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              assigneeType: event.target.value as ChoreAssigneeType,
              assigneeUserId: "",
              assigneeChildId: "",
            }))
          }
        >
          <option value="adult">An adult</option>
          <option value="child">A child</option>
        </select>
      </div>
      {form.assigneeType === "adult" ? (
        <div className="field">
          <label htmlFor={`${idPrefix}-assignee-user`}>Adult</label>
          <select
            id={`${idPrefix}-assignee-user`}
            required
            value={form.assigneeUserId}
            onChange={(event) =>
              onChange((current) => ({ ...current, assigneeUserId: event.target.value }))
            }
          >
            <option value="">Choose a member…</option>
            {members.map((member) => (
              <option key={member.id} value={member.userId}>
                {memberLabel(member, currentUserId)}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="field">
          <label htmlFor={`${idPrefix}-assignee-child`}>Child</label>
          <select
            id={`${idPrefix}-assignee-child`}
            required
            value={form.assigneeChildId}
            onChange={(event) =>
              onChange((current) => ({ ...current, assigneeChildId: event.target.value }))
            }
          >
            <option value="">Choose a child…</option>
            {childProfiles.map((child) => (
              <option key={child.id} value={child.id}>
                {child.displayName}
              </option>
            ))}
          </select>
        </div>
      )}
      {showFirstDueDate && (
        <div className="field">
          <label htmlFor={`${idPrefix}-first-due-date`}>First due date</label>
          <input
            id={`${idPrefix}-first-due-date`}
            type="date"
            required
            value={form.firstDueDate}
            onChange={(event) => onChange((current) => ({ ...current, firstDueDate: event.target.value }))}
          />
        </div>
      )}
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

export function ChoresPanel({ householdId, initialChores, members, childProfiles, currentUserId }: ChoresPanelProps) {
  const [chores, setChores] = useState<Chore[]>(initialChores);

  const [createForm, setCreateForm] = useState<ChoreFormState>(emptyForm);
  const [createStatus, setCreateStatus] = useState<"idle" | "submitting">("idle");
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingChoreId, setEditingChoreId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ChoreFormState>(emptyForm);
  const [editStatus, setEditStatus] = useState<"idle" | "submitting">("idle");
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingChoreId, setDeletingChoreId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [expandedChoreId, setExpandedChoreId] = useState<string | null>(null);
  const [occurrences, setOccurrences] = useState<Record<string, ChoreOccurrence[]>>({});
  const [occurrencesLoading, setOccurrencesLoading] = useState(false);
  const [occurrenceError, setOccurrenceError] = useState<string | null>(null);
  const [actingOccurrenceId, setActingOccurrenceId] = useState<string | null>(null);

  function assigneeLabel(chore: Chore): string {
    if (chore.assigneeType === "adult") {
      const member = members.find((item) => item.userId === chore.assigneeUserId);
      return member ? memberLabel(member, currentUserId) : "Unknown adult";
    }
    const child = childProfiles.find((item) => item.id === chore.assigneeChildId);
    return child ? child.displayName : "Unknown child";
  }

  async function fetchOccurrences(choreId: string) {
    setOccurrencesLoading(true);
    setOccurrenceError(null);
    try {
      const response = await fetch(`/api/households/${householdId}/chores/${choreId}/occurrences`);
      if (!response.ok) {
        setOccurrenceError(fetchErrorMessage(response.status, "We couldn't load occurrences for that chore."));
        return;
      }
      const list = (await response.json()) as ChoreOccurrence[];
      setOccurrences((current) => ({ ...current, [choreId]: list }));
    } catch {
      setOccurrenceError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setOccurrencesLoading(false);
    }
  }

  async function toggleOccurrences(chore: Chore) {
    if (expandedChoreId === chore.id) {
      setExpandedChoreId(null);
      return;
    }
    setExpandedChoreId(chore.id);
    setOccurrenceError(null);
    if (!occurrences[chore.id]) {
      await fetchOccurrences(chore.id);
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateChoreForm(createForm, true);
    if (validationError) {
      setCreateError(validationError);
      return;
    }

    setCreateError(null);
    setCreateStatus("submitting");

    try {
      const response = await fetch(`/api/households/${householdId}/chores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildCreateBody(createForm)),
      });

      if (!response.ok) {
        setCreateError(fetchErrorMessage(response.status, "We couldn't create that chore. Please try again."));
        return;
      }

      const created = (await response.json()) as Chore;
      setChores((current) => [...current, created]);
      setCreateForm(emptyForm);
    } catch {
      setCreateError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setCreateStatus("idle");
    }
  }

  function startEditing(chore: Chore) {
    setEditingChoreId(chore.id);
    setEditForm(choreToFormState(chore));
    setEditError(null);
  }

  function cancelEditing() {
    setEditingChoreId(null);
    setEditError(null);
  }

  async function handleUpdate(choreToUpdate: Chore, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateChoreForm(editForm, false);
    if (validationError) {
      setEditError(validationError);
      return;
    }

    setEditError(null);
    setEditStatus("submitting");

    try {
      const response = await fetch(`/api/households/${householdId}/chores/${choreToUpdate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildUpdateBody(editForm)),
      });

      if (!response.ok) {
        setEditError(fetchErrorMessage(response.status, "We couldn't update that chore. Please try again."));
        return;
      }

      const updated = (await response.json()) as Chore;
      setChores((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setEditingChoreId(null);
    } catch {
      setEditError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setEditStatus("idle");
    }
  }

  async function handleDelete(choreToDelete: Chore) {
    setDeleteError(null);
    setDeletingChoreId(choreToDelete.id);
    try {
      const response = await fetch(`/api/households/${householdId}/chores/${choreToDelete.id}`, {
        method: "DELETE",
      });
      if (response.ok || response.status === 204) {
        setChores((current) => current.filter((item) => item.id !== choreToDelete.id));
        if (expandedChoreId === choreToDelete.id) setExpandedChoreId(null);
        return;
      }
      setDeleteError(fetchErrorMessage(response.status, "We couldn't delete that chore. Please try again."));
    } catch {
      setDeleteError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setDeletingChoreId(null);
    }
  }

  async function handleOccurrenceAction(choreId: string, occurrence: ChoreOccurrence, action: "complete" | "skip") {
    setOccurrenceError(null);
    setActingOccurrenceId(occurrence.id);
    try {
      const response = await fetch(
        `/api/households/${householdId}/chores/occurrences/${occurrence.id}/${action}`,
        { method: "POST" },
      );
      if (!response.ok) {
        setOccurrenceError(
          fetchErrorMessage(
            response.status,
            `We couldn't ${action === "complete" ? "complete" : "skip"} that occurrence. Please try again.`,
          ),
        );
        return;
      }
      // The complete/skip endpoints only return the acted-on occurrence, not
      // any newly generated next occurrence, so re-fetch the full list.
      await fetchOccurrences(choreId);
    } catch {
      setOccurrenceError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setActingOccurrenceId(null);
    }
  }

  return (
    <section className="panel" aria-labelledby="chores-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">GET IT DONE</p>
          <h2 id="chores-heading">Chores</h2>
        </div>
        <span className="count">{chores.length}</span>
      </div>

      {deleteError && (
        <p className="status-banner error" role="alert">
          {deleteError}
        </p>
      )}

      {chores.length === 0 ? (
        <p className="empty-state">No chores yet.</p>
      ) : (
        <ul className="chore-list">
          {chores.map((item) =>
            editingChoreId === item.id ? (
              <li key={item.id} className="chore-list-editing">
                <form onSubmit={(formEvent) => handleUpdate(item, formEvent)} className="stacked-form" noValidate>
                  <ChoreFields
                    idPrefix={`edit-${item.id}`}
                    form={editForm}
                    members={members}
                    childProfiles={childProfiles}
                    currentUserId={currentUserId}
                    showFirstDueDate={false}
                    onChange={setEditForm}
                  />
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
                <div className="chore-list-main">
                  <span>
                    {item.title}
                    <small>{assigneeLabel(item)}</small>
                  </span>
                  {item.recurrenceFrequency !== "none" && (
                    <span className="role-badge">{item.recurrenceFrequency}</span>
                  )}
                </div>
                <div className="chore-list-actions">
                  <button type="button" className="icon-button" onClick={() => toggleOccurrences(item)}>
                    {expandedChoreId === item.id ? "Hide occurrences" : "Occurrences"}
                  </button>
                  <button type="button" className="icon-button" onClick={() => startEditing(item)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="icon-button danger"
                    onClick={() => handleDelete(item)}
                    disabled={deletingChoreId === item.id}
                    aria-label={`Remove ${item.title}`}
                  >
                    {deletingChoreId === item.id ? "Removing…" : "Remove"}
                  </button>
                </div>

                {expandedChoreId === item.id && (
                  <div className="occurrence-panel">
                    {occurrenceError && (
                      <p className="status-banner error" role="alert">
                        {occurrenceError}
                      </p>
                    )}
                    {occurrencesLoading && !occurrences[item.id] ? (
                      <p className="empty-state">Loading occurrences…</p>
                    ) : (occurrences[item.id] ?? []).length === 0 ? (
                      <p className="empty-state">No occurrences yet.</p>
                    ) : (
                      <ul className="occurrence-list">
                        {(occurrences[item.id] ?? []).map((occurrence) => (
                          <li key={occurrence.id}>
                            <span>{occurrence.dueDate}</span>
                            <span className="role-badge">{occurrence.status}</span>
                            {occurrence.status === "pending" && (
                              <>
                                <button
                                  type="button"
                                  className="icon-button"
                                  onClick={() => handleOccurrenceAction(item.id, occurrence, "complete")}
                                  disabled={actingOccurrenceId === occurrence.id}
                                >
                                  {actingOccurrenceId === occurrence.id ? "Working…" : "Complete"}
                                </button>
                                <button
                                  type="button"
                                  className="icon-button"
                                  onClick={() => handleOccurrenceAction(item.id, occurrence, "skip")}
                                  disabled={actingOccurrenceId === occurrence.id}
                                >
                                  {actingOccurrenceId === occurrence.id ? "Working…" : "Skip"}
                                </button>
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            ),
          )}
        </ul>
      )}

      <form onSubmit={handleCreate} className="stacked-form" noValidate>
        <ChoreFields
          idPrefix="chore"
          form={createForm}
          members={members}
          childProfiles={childProfiles}
          currentUserId={currentUserId}
          showFirstDueDate
          onChange={setCreateForm}
        />
        {createError && (
          <p className="status-banner error" role="alert">
            {createError}
          </p>
        )}
        <button type="submit" className="primary" disabled={createStatus === "submitting"}>
          {createStatus === "submitting" ? "Adding…" : "Add chore"}
        </button>
      </form>
    </section>
  );
}
