import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ShoppingListsPanel } from "./shopping-lists-panel";
import type { ShoppingItem, ShoppingList } from "@/lib/types";

const baseList: ShoppingList = {
  id: "list-1",
  householdId: "household-1",
  name: "Groceries",
  createdBy: "user-1",
  createdAt: "2026-01-01T00:00:00Z",
};

const baseItem: ShoppingItem = {
  id: "item-1",
  listId: "list-1",
  name: "Milk",
  quantity: "1 gallon",
  category: "Dairy",
  checked: false,
  createdBy: "user-1",
  createdAt: "2026-01-01T00:00:00Z",
};

function renderPanel(initialShoppingLists: ShoppingList[] = []) {
  return render(<ShoppingListsPanel householdId="household-1" initialShoppingLists={initialShoppingLists} />);
}

async function expandList() {
  fireEvent.click(screen.getByRole("button", { name: /^items$/i }));
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
}

describe("ShoppingListsPanel", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("shows a validation error and does not submit when the list name is blank", async () => {
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: /add list/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/enter a name for the shopping list/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("submits a new shopping list to the BFF route with the exact posted body", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify(baseList), { status: 201, headers: { "Content-Type": "application/json" } }),
    );

    renderPanel();

    fireEvent.change(screen.getByLabelText(/new list name/i), { target: { value: "Groceries" } });
    fireEvent.click(screen.getByRole("button", { name: /add list/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/households/household-1/shopping-lists");
    expect(JSON.parse(init.body as string)).toEqual({ name: "Groceries" });

    expect(await screen.findByText("Groceries")).toBeInTheDocument();
  });

  it("deletes a shopping list", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(new Response(null, { status: 204 }));

    renderPanel([baseList]);

    fireEvent.click(screen.getByRole("button", { name: /remove groceries/i }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith("/api/households/household-1/shopping-lists/list-1", { method: "DELETE" }),
    );
    await waitFor(() => expect(screen.queryByText("Groceries")).not.toBeInTheDocument());
  });

  it("shows a validation error and does not submit when the item name is blank", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } }),
    );

    renderPanel([baseList]);
    await expandList();

    fireEvent.click(screen.getByRole("button", { name: /add item/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/enter a name for the item/i);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("adds an item to the BFF route with the exact posted body", async () => {
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(
        new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(baseItem), { status: 201, headers: { "Content-Type": "application/json" } }),
      );

    renderPanel([baseList]);
    await expandList();

    fireEvent.change(screen.getByLabelText(/item name/i), { target: { value: "Milk" } });
    fireEvent.change(screen.getByLabelText(/quantity/i), { target: { value: "1 gallon" } });
    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: "Dairy" } });
    fireEvent.click(screen.getByRole("button", { name: /add item/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[1];
    expect(url).toBe("/api/households/household-1/shopping-lists/list-1/items");
    expect(JSON.parse(init.body as string)).toEqual({ name: "Milk", quantity: "1 gallon", category: "Dairy" });

    expect(await screen.findByText("Milk")).toBeInTheDocument();
  });

  it("toggles an item's checked state, preserving name/quantity/category", async () => {
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(
        new Response(JSON.stringify([baseItem]), { status: 200, headers: { "Content-Type": "application/json" } }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ...baseItem, checked: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    renderPanel([baseList]);
    await expandList();
    expect(await screen.findByText("Milk")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /mark milk checked/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[1];
    expect(url).toBe("/api/households/household-1/shopping-lists/list-1/items/item-1");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body as string)).toEqual({
      name: "Milk",
      quantity: "1 gallon",
      category: "Dairy",
      checked: true,
    });

    expect(await screen.findByText("Milk")).toHaveClass("done");
  });

  it("edits an item's name, quantity, and category", async () => {
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(
        new Response(JSON.stringify([baseItem]), { status: 200, headers: { "Content-Type": "application/json" } }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ...baseItem, name: "Oat milk", quantity: "2 cartons", category: "Dairy-free" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    renderPanel([baseList]);
    await expandList();
    expect(await screen.findByText("Milk")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^edit$/i }));
    fireEvent.change(screen.getByLabelText(/item name/i, { selector: "#edit-item-item-1-name" }), {
      target: { value: "Oat milk" },
    });
    fireEvent.change(screen.getByLabelText(/quantity/i, { selector: "#edit-item-item-1-quantity" }), {
      target: { value: "2 cartons" },
    });
    fireEvent.change(screen.getByLabelText(/category/i, { selector: "#edit-item-item-1-category" }), {
      target: { value: "Dairy-free" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[1];
    expect(url).toBe("/api/households/household-1/shopping-lists/list-1/items/item-1");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body as string)).toEqual({
      name: "Oat milk",
      quantity: "2 cartons",
      category: "Dairy-free",
      checked: false,
    });

    expect(await screen.findByText("Oat milk")).toBeInTheDocument();
  });

  it("deletes an item", async () => {
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(
        new Response(JSON.stringify([baseItem]), { status: 200, headers: { "Content-Type": "application/json" } }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    renderPanel([baseList]);
    await expandList();
    expect(await screen.findByText("Milk")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /remove milk/i }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith("/api/households/household-1/shopping-lists/list-1/items/item-1", {
        method: "DELETE",
      }),
    );
    await waitFor(() => expect(screen.queryByText("Milk")).not.toBeInTheDocument());
  });
});