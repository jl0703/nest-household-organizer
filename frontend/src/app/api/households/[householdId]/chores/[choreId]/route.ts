import type { NextRequest } from "next/server";
import { backendFetch } from "@/lib/api/backend";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ householdId: string; choreId: string }> },
) {
  const { householdId, choreId } = await params;
  const body = await request.json();
  return backendFetch(`/households/${householdId}/chores/${choreId}`, { method: "PUT", body });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ householdId: string; choreId: string }> },
) {
  const { householdId, choreId } = await params;
  return backendFetch(`/households/${householdId}/chores/${choreId}`, { method: "DELETE" });
}
