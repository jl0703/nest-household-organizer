"use client";

import { useState, type FormEvent } from "react";
import type { ShoppingItem, ShoppingList } from "@/lib/types";

interface ShoppingListsPanelProps {
  householdId: string;
  initialShoppingLists: ShoppingList[];
}

interface ItemFormState {
  name: string;
  quantity: string;
  category: string;
}

const emptyItemForm: ItemFormState = { name: "", quantity: "", category: "" };

function itemToFormState(item: ShoppingItem): ItemFormState {
  return { name: item.name, quantity: item.quantity ?? "", category: item.category ?? "" };
}

function validateListName(name: string): string | null {
  if (!name.trim()) return "Enter a name for the shopping list.";
  return null;
}

function validateItemForm(form: ItemFormState): string | null {
  if (!form.name.trim()) return "Enter a name for the item.";
  return null;
}

function buildItemBody(form: ItemFormState) {
  return {
    name: form.name.trim(),
    quantity: form.quantity.trim() || undefined,
    category: form.category.trim() || undefined,
  };
}

function fetchErrorMessage(status: number, fallback: string): string {
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You don't have access to this household's shopping lists.";
  if (status === 404) return "That shopping list could not be found.";
  return fallback;
}

interface ItemFieldsProps {
  idPrefix: string;
  form: ItemFormState;
  onChange: (updater: (current: ItemFormState) => ItemFormState) => void;
}

/** Shared name/quantity/category fields for both the add-item and edit-item forms. */
function ItemFields({ idPrefix, form, onChange }: ItemFieldsProps) {
  return (
    <>
      <div className="field">
        <label htmlFor={`${idPrefix}-name`}>Item name</label>
        <input
          id={`${idPrefix}-name`}
          type="text"
          required
          maxLength={200}
          value={form.name}
          onChange={(event) => onChange((current) => ({ ...current, name: event.target.value }))}
        />
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-quantity`}>Quantity (optional)</label>
        <input
          id={`${idPrefix}-quantity`}
          type="text"
          value={form.quantity}
          onChange={(event) => onChange((current) => ({ ...current, quantity: event.target.value }))}
        />
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-category`}>Category (optional)</label>
        <input
          id={`${idPrefix}-category`}
          type="text"
          value={form.category}
          onChange={(event) => onChange((current) => ({ ...current, category: event.target.value }))}
        />
      </div>
    </>
  );
}

export function ShoppingListsPanel({ householdId, initialShoppingLists }: ShoppingListsPanelProps) {
  const [lists, setLists] = useState<ShoppingList[]>(initialShoppingLists);

  const [createName, setCreateName] = useState("");
  const [createStatus, setCreateStatus] = useState<"idle" | "submitting">("idle");
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editListName, setEditListName] = useState("");
  const [editListStatus, setEditListStatus] = useState<"idle" | "submitting">("idle");
  const [editListError, setEditListError] = useState<string | null>(null);

  const [deletingListId, setDeletingListId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [expandedListId, setExpandedListId] = useState<string | null>(null);
  const [items, setItems] = useState<Record<string, ShoppingItem[]>>({});
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);

  const [addItemForm, setAddItemForm] = useState<ItemFormState>(emptyItemForm);
  const [addItemStatus, setAddItemStatus] = useState<"idle" | "submitting">("idle");

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemForm, setEditItemForm] = useState<ItemFormState>(emptyItemForm);
  const [editItemStatus, setEditItemStatus] = useState<"idle" | "submitting">("idle");

  const [togglingItemId, setTogglingItemId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  async function fetchItems(listId: string) {
    setItemsLoading(true);
    setItemError(null);
    try {
      const response = await fetch(`/api/households/${householdId}/shopping-lists/${listId}/items`);
      if (!response.ok) {
        setItemError(fetchErrorMessage(response.status, "We couldn't load items for that list."));
        return;
      }
      const list = (await response.json()) as ShoppingItem[];
      setItems((current) => ({ ...current, [listId]: list }));
    } catch {
      setItemError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setItemsLoading(false);
    }
  }

  async function toggleExpanded(list: ShoppingList) {
    if (expandedListId === list.id) {
      setExpandedListId(null);
      return;
    }
    setExpandedListId(list.id);
    setItemError(null);
    setEditingItemId(null);
    setAddItemForm(emptyItemForm);
    if (!items[list.id]) {
      await fetchItems(list.id);
    }
  }

  async function handleCreateList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateListName(createName);
    if (validationError) {
      setCreateError(validationError);
      return;
    }

    setCreateError(null);
    setCreateStatus("submitting");

    try {
      const response = await fetch(`/api/households/${householdId}/shopping-lists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName.trim() }),
      });

      if (!response.ok) {
        setCreateError(fetchErrorMessage(response.status, "We couldn't create that shopping list. Please try again."));
        return;
      }

      const created = (await response.json()) as ShoppingList;
      setLists((current) => [...current, created]);
      setCreateName("");
    } catch {
      setCreateError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setCreateStatus("idle");
    }
  }

  function startEditingList(list: ShoppingList) {
    setEditingListId(list.id);
    setEditListName(list.name);
    setEditListError(null);
  }

  function cancelEditingList() {
    setEditingListId(null);
    setEditListError(null);
  }

  async function handleUpdateList(listToUpdate: ShoppingList, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateListName(editListName);
    if (validationError) {
      setEditListError(validationError);
      return;
    }

    setEditListError(null);
    setEditListStatus("submitting");

    try {
      const response = await fetch(`/api/households/${householdId}/shopping-lists/${listToUpdate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editListName.trim() }),
      });

      if (!response.ok) {
        setEditListError(fetchErrorMessage(response.status, "We couldn't rename that list. Please try again."));
        return;
      }

      const updated = (await response.json()) as ShoppingList;
      setLists((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setEditingListId(null);
    } catch {
      setEditListError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setEditListStatus("idle");
    }
  }

  async function handleDeleteList(listToDelete: ShoppingList) {
    setDeleteError(null);
    setDeletingListId(listToDelete.id);
    try {
      const response = await fetch(`/api/households/${householdId}/shopping-lists/${listToDelete.id}`, {
        method: "DELETE",
      });
      if (response.ok || response.status === 204) {
        setLists((current) => current.filter((item) => item.id !== listToDelete.id));
        if (expandedListId === listToDelete.id) setExpandedListId(null);
        return;
      }
      setDeleteError(fetchErrorMessage(response.status, "We couldn't delete that list. Please try again."));
    } catch {
      setDeleteError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setDeletingListId(null);
    }
  }

  async function handleAddItem(listId: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateItemForm(addItemForm);
    if (validationError) {
      setItemError(validationError);
      return;
    }

    setItemError(null);
    setAddItemStatus("submitting");

    try {
      const response = await fetch(`/api/households/${householdId}/shopping-lists/${listId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildItemBody(addItemForm)),
      });

      if (!response.ok) {
        setItemError(fetchErrorMessage(response.status, "We couldn't add that item. Please try again."));
        return;
      }

      const created = (await response.json()) as ShoppingItem;
      setItems((current) => ({ ...current, [listId]: [...(current[listId] ?? []), created] }));
      setAddItemForm(emptyItemForm);
    } catch {
      setItemError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setAddItemStatus("idle");
    }
  }

  function startEditingItem(item: ShoppingItem) {
    setEditingItemId(item.id);
    setEditItemForm(itemToFormState(item));
    setItemError(null);
  }

  function cancelEditingItem() {
    setEditingItemId(null);
    setItemError(null);
  }

  async function updateItem(listId: string, item: ShoppingItem, body: ReturnType<typeof buildItemBody> & { checked: boolean }) {
    const response = await fetch(`/api/households/${householdId}/shopping-lists/${listId}/items/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(fetchErrorMessage(response.status, "We couldn't update that item. Please try again."));
    }

    const updated = (await response.json()) as ShoppingItem;
    setItems((current) => ({
      ...current,
      [listId]: (current[listId] ?? []).map((existing) => (existing.id === updated.id ? updated : existing)),
    }));
    return updated;
  }

  async function handleToggleItem(listId: string, item: ShoppingItem) {
    setItemError(null);
    setTogglingItemId(item.id);
    try {
      await updateItem(listId, item, {
        name: item.name,
        quantity: item.quantity ?? undefined,
        category: item.category ?? undefined,
        checked: !item.checked,
      });
    } catch (err) {
      setItemError(err instanceof Error ? err.message : "We couldn't reach the server. Check your connection and try again.");
    } finally {
      setTogglingItemId(null);
    }
  }

  async function handleUpdateItem(listId: string, item: ShoppingItem, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateItemForm(editItemForm);
    if (validationError) {
      setItemError(validationError);
      return;
    }

    setItemError(null);
    setEditItemStatus("submitting");

    try {
      await updateItem(listId, item, { ...buildItemBody(editItemForm), checked: item.checked });
      setEditingItemId(null);
    } catch (err) {
      setItemError(err instanceof Error ? err.message : "We couldn't reach the server. Check your connection and try again.");
    } finally {
      setEditItemStatus("idle");
    }
  }

  async function handleDeleteItem(listId: string, item: ShoppingItem) {
    setItemError(null);
    setDeletingItemId(item.id);
    try {
      const response = await fetch(`/api/households/${householdId}/shopping-lists/${listId}/items/${item.id}`, {
        method: "DELETE",
      });
      if (response.ok || response.status === 204) {
        setItems((current) => ({
          ...current,
          [listId]: (current[listId] ?? []).filter((existing) => existing.id !== item.id),
        }));
        return;
      }
      setItemError(fetchErrorMessage(response.status, "We couldn't delete that item. Please try again."));
    } catch {
      setItemError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setDeletingItemId(null);
    }
  }

  return (
    <section className="panel" aria-labelledby="shopping-lists-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">SATURDAY MARKET</p>
          <h2 id="shopping-lists-heading">Shopping lists</h2>
        </div>
        <span className="count">{lists.length}</span>
      </div>

      {deleteError && (
        <p className="status-banner error" role="alert">
          {deleteError}
        </p>
      )}

      {lists.length === 0 ? (
        <p className="empty-state">No shopping lists yet.</p>
      ) : (
        <ul className="shopping-list">
          {lists.map((list) =>
            editingListId === list.id ? (
              <li key={list.id} className="shopping-list-editing">
                <form onSubmit={(formEvent) => handleUpdateList(list, formEvent)} className="stacked-form" noValidate>
                  <div className="field">
                    <label htmlFor={`edit-list-${list.id}-name`}>List name</label>
                    <input
                      id={`edit-list-${list.id}-name`}
                      type="text"
                      required
                      maxLength={120}
                      value={editListName}
                      onChange={(event) => setEditListName(event.target.value)}
                    />
                  </div>
                  {editListError && (
                    <p className="status-banner error" role="alert">
                      {editListError}
                    </p>
                  )}
                  <button type="submit" className="primary" disabled={editListStatus === "submitting"}>
                    {editListStatus === "submitting" ? "Saving…" : "Save changes"}
                  </button>{" "}
                  <button type="button" className="secondary" onClick={cancelEditingList}>
                    Cancel
                  </button>
                </form>
              </li>
            ) : (
              <li key={list.id}>
                <div className="shopping-list-main">
                  <span>{list.name}</span>
                </div>
                <div className="shopping-list-actions">
                  <button type="button" className="icon-button" onClick={() => toggleExpanded(list)}>
                    {expandedListId === list.id ? "Hide items" : "Items"}
                  </button>
                  <button type="button" className="icon-button" onClick={() => startEditingList(list)}>
                    Rename
                  </button>
                  <button
                    type="button"
                    className="icon-button danger"
                    onClick={() => handleDeleteList(list)}
                    disabled={deletingListId === list.id}
                    aria-label={`Remove ${list.name}`}
                  >
                    {deletingListId === list.id ? "Removing…" : "Remove"}
                  </button>
                </div>

                {expandedListId === list.id && (
                  <div className="shopping-item-panel">
                    {itemError && (
                      <p className="status-banner error" role="alert">
                        {itemError}
                      </p>
                    )}
                    {itemsLoading && !items[list.id] ? (
                      <p className="empty-state">Loading items…</p>
                    ) : (items[list.id] ?? []).length === 0 ? (
                      <p className="empty-state">No items yet.</p>
                    ) : (
                      <ul className="shopping-item-list">
                        {(items[list.id] ?? []).map((item) =>
                          editingItemId === item.id ? (
                            <li key={item.id} className="shopping-item-editing">
                              <form
                                onSubmit={(formEvent) => handleUpdateItem(list.id, item, formEvent)}
                                className="stacked-form"
                                noValidate
                              >
                                <ItemFields
                                  idPrefix={`edit-item-${item.id}`}
                                  form={editItemForm}
                                  onChange={setEditItemForm}
                                />
                                <button type="submit" className="primary" disabled={editItemStatus === "submitting"}>
                                  {editItemStatus === "submitting" ? "Saving…" : "Save changes"}
                                </button>{" "}
                                <button type="button" className="secondary" onClick={cancelEditingItem}>
                                  Cancel
                                </button>
                              </form>
                            </li>
                          ) : (
                            <li key={item.id}>
                              <button
                                type="button"
                                className={`check ${item.checked ? "complete" : ""}`}
                                aria-label={`Mark ${item.name} ${item.checked ? "unchecked" : "checked"}`}
                                onClick={() => handleToggleItem(list.id, item)}
                                disabled={togglingItemId === item.id}
                              >
                                {item.checked && "✓"}
                              </button>
                              <span className={item.checked ? "done" : ""}>
                                {item.name}
                                {(item.quantity || item.category) && (
                                  <small>{[item.quantity, item.category].filter(Boolean).join(" · ")}</small>
                                )}
                              </span>
                              <div className="shopping-item-actions">
                                <button type="button" className="icon-button" onClick={() => startEditingItem(item)}>
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="icon-button danger"
                                  onClick={() => handleDeleteItem(list.id, item)}
                                  disabled={deletingItemId === item.id}
                                  aria-label={`Remove ${item.name}`}
                                >
                                  {deletingItemId === item.id ? "Removing…" : "Remove"}
                                </button>
                              </div>
                            </li>
                          ),
                        )}
                      </ul>
                    )}

                    <form onSubmit={(formEvent) => handleAddItem(list.id, formEvent)} className="stacked-form" noValidate>
                      <ItemFields idPrefix={`add-item-${list.id}`} form={addItemForm} onChange={setAddItemForm} />
                      <button type="submit" className="primary" disabled={addItemStatus === "submitting"}>
                        {addItemStatus === "submitting" ? "Adding…" : "Add item"}
                      </button>
                    </form>
                  </div>
                )}
              </li>
            ),
          )}
        </ul>
      )}

      <form onSubmit={handleCreateList} className="stacked-form" noValidate>
        <div className="field">
          <label htmlFor="shopping-list-name">New list name</label>
          <input
            id="shopping-list-name"
            type="text"
            required
            maxLength={120}
            value={createName}
            onChange={(event) => setCreateName(event.target.value)}
          />
        </div>
        {createError && (
          <p className="status-banner error" role="alert">
            {createError}
          </p>
        )}
        <button type="submit" className="primary" disabled={createStatus === "submitting"}>
          {createStatus === "submitting" ? "Adding…" : "Add list"}
        </button>
      </form>
    </section>
  );
}