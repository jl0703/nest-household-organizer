import type { NextRequest } from "next/server";
import { backendFetch } from "@/lib/api/backend";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ householdId: string; listId: string; itemId: string }> },
) {
  const { householdId, listId, itemId } = await params;
  const body = await request.json();
  return backendFetch(`/households/${householdId}/shopping-lists/${listId}/items/${itemId}`, {
    method: "PUT",
    body,
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ householdId: string; listId: string; itemId: string }> },
) {
  const { householdId, listId, itemId } = await params;
  return backendFetch(`/households/${householdId}/shopping-lists/${listId}/items/${itemId}`, {
    method: "DELETE",
  });
}