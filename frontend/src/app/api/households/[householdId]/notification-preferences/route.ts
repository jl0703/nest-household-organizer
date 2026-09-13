import type { NextRequest } from "next/server";
import { backendFetch } from "@/lib/api/backend";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ householdId: string }> },
) {
  const { householdId } = await params;
  return backendFetch(`/households/${householdId}/notification-preferences`);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ householdId: string }> },
) {
  const { householdId } = await params;
  const body = await request.json();
  return backendFetch(`/households/${householdId}/notification-preferences`, { method: "PUT", body });
}
