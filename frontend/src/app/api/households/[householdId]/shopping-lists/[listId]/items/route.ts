import type { NextRequest } from "next/server";
import { backendFetch } from "@/lib/api/backend";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ householdId: string; listId: string }> },
) {
  const { householdId, listId } = await params;
  return backendFetch(`/households/${householdId}/shopping-lists/${listId}/items`);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ householdId: string; listId: string }> },
) {
  const { householdId, listId } = await params;
  const body = await request.json();
  return backendFetch(`/households/${householdId}/shopping-lists/${listId}/items`, { method: "POST", body });
}